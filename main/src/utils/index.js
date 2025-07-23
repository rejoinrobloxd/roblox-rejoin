// Detect installed Roblox versions (Android)
export function detectRobloxVersions() {
  const versions = {};
  try {
    execSync("pm list packages | grep com.roblox.client", { stdio: 'pipe' });
    versions.international = {
      packageName: "com.roblox.client",
      displayName: "Roblox Quốc tế"
    };
  } catch {}
  try {
    execSync("pm list packages | grep com.roblox.client.vnggames", { stdio: 'pipe' });
    versions.vng = {
      packageName: "com.roblox.client.vnggames",
      displayName: "Roblox VNG"
    };
  } catch {}
  return versions;
}

// Ask a question using readline
export function ask(rl, msg) {
  return new Promise((r) => rl.question(msg, r));
}
// Kill an Android app by package name
export function killApp(packageName) {
  exec(`am force-stop ${packageName}`);
}

export function launch(placeId, linkCode = null, packageName) {
  const url = linkCode
    ? `roblox://placeID=${placeId}&linkCode=${linkCode}`
    : `roblox://placeID=${placeId}`;
  console.log(`Đang mở: ${url} (${packageName})`);
  if (linkCode) console.log(`Đã join bằng linkCode: ${linkCode}`);

  // Ép đúng activity theo bản Roblox
  let activity;
  if (packageName === "com.roblox.client") {
    activity = "com.roblox.client.ActivityProtocolLaunch";
  } else if (packageName === "com.roblox.client.vnggames") {
    activity = "com.roblox.client.ActivityProtocolLaunch";
  } else {
    console.error(`Không rõ activity cho package: ${packageName}`);
    return;
  }

  const command = `am start -n ${packageName}/${activity} -a android.intent.action.VIEW -d "${url}"`;
  exec(command);
}

// Ensure the script is running as root (for Termux/Android)
export function ensureRoot() {
  try {
    const uid = execSync("id -u").toString().trim();
    if (uid !== "0") {
      const node = execSync("which node").toString().trim();
      console.log("Cần quyền root, chuyển qua su...");
      execSync(`su -c "${node} ${process.argv[1]}"`, { stdio: "inherit" });
      process.exit(0);
    }
  } catch (e) {
    console.error("Không thể chạy với quyền root:", e.message);
    process.exit(1);
  }
}

// Enable wake lock on Termux (Android)
export function enableWakeLock() {
  try {
    exec("termux-wake-lock");
    console.log("Wake lock bật");
  } catch {
    console.warn("Không bật wake lock");
  }
}

// Get ROBLOSECURITY cookie from Roblox app data (Android)
export function getRobloxCookie(packageName) {
  console.log(`Đang lấy cookie ROBLOSECURITY từ ${packageName}...`);
  let raw;
  try {
    raw = execSync(
      `cat /data/data/${packageName}/app_webview/Default/Cookies | strings | grep ROBLOSECURITY`
    ).toString();
  } catch {
    try {
      raw = execSync(
        `su -c sh -c 'cat /data/data/${packageName}/app_webview/Default/Cookies | strings | grep ROBLOSECURITY'`
      ).toString();
    } catch (err) {
      console.error(`Không thể đọc cookie từ ${packageName} bằng cả 2 cách.`);
      process.exit(1);
    }
  }

  const match = raw.match(/\.ROBLOSECURITY_([^\s\/]+)/);
  if (!match) {
    console.error(`Không tìm được cookie ROBLOSECURITY từ ${packageName}!`);
    process.exit(1);
  }

  let cookieValue = match[1].trim();
  if (!cookieValue.startsWith("_")) cookieValue = "_" + cookieValue;
  return `.ROBLOSECURITY=${cookieValue}`;
}

import { execSync, exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import axios from "axios";
import Table from "cli-table3";
import figlet from "figlet";
import _boxen from "boxen";
const boxen = _boxen.default || _boxen;
const CONFIG_PATH = path.join(path.dirname(new URL(import.meta.url).pathname), "config.json");

export function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log(`Config saved at ${CONFIG_PATH}`);
  } catch (e) {
    console.error(`Unable to save config: ${e.message}`);
  }
}

export function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  try {
    const raw = fs.readFileSync(CONFIG_PATH);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function printConfig(cfg) {
  console.log("\nPrevious configuration:");
  console.log(`Username: ${cfg.username}`);
  console.log(`UserID: ${cfg.userId}`);
  console.log(`Game: ${cfg.gameName} (${cfg.placeId})`);
  console.log(`Roblox Version: ${cfg.robloxVersion === 'international' ? 'International' : 'VNG'} (${cfg.packageName})`);
  if (cfg.linkCode) console.log(`Private link code: ${cfg.linkCode}`);
  console.log(`Delay: ${cfg.delaySec} seconds\n`);
}

export function formatCountdown(seconds) {
  return seconds >= 60 
    ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` 
    : `${seconds}s`;
}

export function getTerminalSize() {
  return {
    width: process.stdout.columns || 80,
    height: process.stdout.rows || 24
  };
}