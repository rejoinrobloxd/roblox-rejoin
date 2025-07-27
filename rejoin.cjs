#!/usr/bin/env node
const { execSync, exec } = require("child_process");
function ensurePackages() {
  const requiredPackages = ["axios", "cli-table3", "figlet", "boxen"];

  requiredPackages.forEach((pkg) => {
    try {
      require.resolve(pkg);
    } catch {
      console.log(`Đang cài package thiếu: ${pkg}`);
      try {
        execSync(`npm install ${pkg}`, { stdio: "inherit" });
      } catch (e) {
        console.error(`Lỗi khi cài ${pkg}:`, e.message);
        process.exit(1);
      }
    }
  });
}
ensurePackages();

const axios = require("axios");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const os = require("os");
const Table = require("cli-table3");
const CONFIG_PATH = path.join(__dirname, "config.json");
const util = require("util");
const figlet = require("figlet");
const _boxen = require("boxen");
const boxen = _boxen.default || _boxen;

class Utils {
  static ensureRoot() {
    try {
      const uid = execSync("id -u").toString().trim();
      if (uid !== "0") {
        const node = execSync("which node").toString().trim();
        console.log("Cần quyền root, chuyển qua su...");
        execSync(`su -c "${node} ${__filename}"`, { stdio: "inherit" });
        process.exit(0);
      }
    } catch (e) {
      console.error("Không thể chạy với quyền root:", e.message);
      process.exit(1);
    }
  }

  static enableWakeLock() {
    try {
      exec("termux-wake-lock");
      console.log("Wake lock bật");
    } catch {
      console.warn("Không bật wake lock");
    }
  }

  static killApp(packageName) {
    exec(`am force-stop ${packageName}`);
  }

  static launch(placeId, linkCode = null, packageName) {
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

  const command = `am start -n ${packageName}/${activity} -a android.intent.action.VIEW -d "${url}" --activity-clear-top`;
  exec(command);
}

  static ask(rl, msg) {
    return new Promise((r) => rl.question(msg, r));
  }

  static saveConfig(config) {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      console.log(`Đã lưu config tại ${CONFIG_PATH}`);
    } catch (e) {
      console.error(`Không thể lưu config: ${e.message}`);
    }
  }

  static loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    try {
      const raw = fs.readFileSync(CONFIG_PATH);
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static printConfig(cfg) {
    console.log("\nCấu hình trước đó:");
    console.log(`Username: ${cfg.username}`);
    console.log(`UserID: ${cfg.userId}`);
    console.log(`Game: ${cfg.gameName} (${cfg.placeId})`);
    console.log(`Roblox Version: ${cfg.robloxVersion === 'international' ? 'Quốc tế' : 'VNG'} (${cfg.packageName})`);
    if (cfg.linkCode) console.log(`Private link code: ${cfg.linkCode}`);
    console.log(`Delay: ${cfg.delaySec} giây\n`);
  }

  static detectRobloxVersions() {
    const versions = {};
    
    try {
      // Check for international Roblox
      execSync("pm list packages | grep com.roblox.client", { stdio: 'pipe' });
      versions.international = {
        packageName: "com.roblox.client",
        displayName: "Roblox Quốc tế"
      };
    } catch {
      // International version not found
    }

    try {
      // Check for VNG Roblox
      execSync("pm list packages | grep com.roblox.client.vnggames", { stdio: 'pipe' });
      versions.vng = {
        packageName: "com.roblox.client.vnggames",
        displayName: "Roblox VNG"
      };
    } catch {
      // VNG version not found
    }

    return versions;
  }

  static getRobloxCookie(packageName) {
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
}

class RobloxVersionSelector {
  static async selectVersion(rl) {
    const versions = Utils.detectRobloxVersions();
    
    if (Object.keys(versions).length === 0) {
      console.error("Không tìm thấy Roblox nào được cài đặt!");
      process.exit(1);
    }

    if (Object.keys(versions).length === 1) {
      // Only one version found, auto-select
      const versionKey = Object.keys(versions)[0];
      const version = versions[versionKey];
      console.log(`Chỉ tìm thấy: ${version.displayName}`);
      return {
        robloxVersion: versionKey,
        packageName: version.packageName
      };
    }

    // Multiple versions found, let user choose
    console.log("\nTìm thấy các phiên bản Roblox:");
    let index = 1;
    const versionList = [];
    
    for (const [key, version] of Object.entries(versions)) {
      console.log(`${index}. ${version.displayName} (${version.packageName})`);
      versionList.push({ key, ...version });
      index++;
    }

    while (true) {
      const choice = await Utils.ask(rl, "\nChọn phiên bản Roblox (nhập số): ");
      const choiceNum = parseInt(choice.trim());
      
      if (choiceNum >= 1 && choiceNum <= versionList.length) {
        const selected = versionList[choiceNum - 1];
        console.log(`Đã chọn: ${selected.displayName}`);
        return {
          robloxVersion: selected.key,
          packageName: selected.packageName
        };
      }
      
      console.log("Lựa chọn không hợp lệ! Vui lòng thử lại.");
    }
  }
}

class RobloxUser {
  constructor(username, userId = null, cookie = null) {
    this.username = username;
    this.userId = userId;
    this.cookie = cookie;
  }

  async fetchAuthenticatedUser() {
    try {
      const res = await axios.get("https://users.roblox.com/v1/users/authenticated", {
        headers: {
          Cookie: this.cookie,
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; Termux)",
          Accept: "application/json",
        },
      });

      const { name, id } = res.data;
      this.username = name;
      this.userId = id;
      console.log(`Lấy info thành công!`);
      return this.userId;
    } catch (e) {
      console.error(`Lỗi xác thực người dùng:`, e.message);
      return null;
    }
  }

  async getPresence() {
    try {
      const r = await axios.post(
        "https://presence.roproxy.com/v1/presence/users",
        { userIds: [this.userId] },
        {
          headers: {
            Cookie: this.cookie,
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; Termux)",
            Accept: "application/json",
          },
        }
      );
      return r.data.userPresences?.[0];
    } catch {
      return null;
    }
  }
}

class GameSelector {
  constructor() {
    this.GAMES = {
      "1": ["126884695634066", "Grow-a-Garden"],
      "2": ["2753915549", "Blox-Fruits"],
      "3": ["6284583030", "Pet-Simulator-X"],
      "4": ["126244816328678", "DIG"],
      "5": ["116495829188952", "Dead-Rails-Alpha"],
      "6": ["8737602449", "PLS-DONATE"],
      "0": ["custom", "Tùy chỉnh"],
    };
  }

  async chooseGame(rl) {
    console.log(`Chọn game:`);
    for (let k in this.GAMES) {
      console.log(`${k}. ${this.GAMES[k][1]} (${this.GAMES[k][0]})`);
    }

    const ans = (await Utils.ask(rl, "Nhập số: ")).trim();

    if (ans === "0") {
      const sub = (await Utils.ask(rl, "0.1 ID thủ công | 0.2 Link private redirect: ")).trim();
      if (sub === "1") {
        const pid = (await Utils.ask(rl, "Nhập Place ID: ")).trim();
        return { placeId: pid, name: "Tùy chỉnh", linkCode: null };
      }
      if (sub === "2") {
        console.log("\nDán link redirect sau khi vào private server.");
        while (true) {
          const link = await Utils.ask(rl, "\nDán link redirect đã chuyển hướng: ");
          const m = link.match(/\/games\/(\d+)[^?]*\?[^=]*=([\w-]+)/);
          if (!m) {
            console.log(`Link không hợp lệ!`);
            continue;
          }
          return {
            placeId: m[1],
            name: "Private Server",
            linkCode: m[2],
          };
        }
      }
      throw new Error(`Không hợp lệ!`);
    }

    if (this.GAMES[ans]) {
      return {
        placeId: this.GAMES[ans][0],
        name: this.GAMES[ans][1],
        linkCode: null,
      };
    }

    throw new Error(`Không hợp lệ!`);
  }
}

class StatusHandler {
  constructor() {
    this.hasLaunched = false;
    this.joinedAt = 0;
  }

  analyzePresence(presence, targetRootPlaceId) {
    const now = Date.now();

    if (!presence || presence.userPresenceType === undefined) {
      return {
        status: "Không rõ",
        info: "Không lấy được trạng thái hoặc thiếu rootPlaceId",
        shouldLaunch: false,
        rejoinOnly: false
      };
    }

    // Check nếu user offline (userPresenceType = 0 hoặc 1)
    if (presence.userPresenceType === 0 || presence.userPresenceType === 1) {
      const shouldLaunch = !this.hasLaunched || now - this.joinedAt > 30000;
      return {
        status: "Offline",
        info: `User offline! ${shouldLaunch ? 'Tiến hành rejoin! 🚀' : 'Đợi thêm chút để tránh spam ⏰'}`,
        shouldLaunch,
        rejoinOnly: false // Offline thì kill app và mở lại bình thường
      };
    }

    // Logic cho userPresenceType = 2 (đang chơi game)
    if (presence.userPresenceType !== 2) {
      const shouldLaunch = !this.hasLaunched || now - this.joinedAt > 30000;
      return {
        status: "Không online",
        info: `User không trong game${shouldLaunch ? '. Đã mở lại game! 🎮' : ' (đợi thêm chút để tránh spam) ⏰'}`,
        shouldLaunch,
        rejoinOnly: false
      };
    }

    if (!presence.rootPlaceId || presence.rootPlaceId.toString() !== targetRootPlaceId.toString()) {
      return {
        status: "Sai map",
        info: `User đang trong game nhưng sai rootPlaceId (${presence.rootPlaceId}). Đã rejoin đúng map! 🎯`,
        shouldLaunch: true,
        rejoinOnly: true // Đang trong game khác, chỉ rejoin không kill
      };
    }

    return {
      status: "Online ✅",
      info: "Đang ở đúng game.",
      shouldLaunch: false,
      rejoinOnly: false
    };
  }

  updateJoinStatus(shouldLaunch) {
    if (shouldLaunch) {
      this.joinedAt = Date.now();
      this.hasLaunched = true;
    }
  }
}


class UIRenderer {
static getSystemStats() {
  const cpus = os.cpus();
  const idle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
  const total = cpus.reduce((acc, cpu) => {
    return acc + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq + cpu.times.idle;
  }, 0);

  const cpuUsage = (100 - (idle / total) * 100).toFixed(1);

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // Hiển thị chuẩn xác hơn, ví dụ: 1.13GB/1.45GB
  const totalGB = (totalMem / (1024 ** 3)).toFixed(2);
  const usedGB = (usedMem / (1024 ** 3)).toFixed(2);

  return {
    cpuUsage,
    ramUsage: `${usedGB}GB/${totalGB}GB`
  };
}


  static renderTitle() {
    const title = figlet.textSync("Dawn Rejoin", {
      font: "Standard",
      horizontalLayout: "default",
      verticalLayout: "default"
    });

    return boxen(title, {
      padding: 1,
      borderColor: "cyan",
      borderStyle: "double",
      align: "center"
    });
  }

  static getTerminalSize() {
    return {
      width: process.stdout.columns || 80,
      height: process.stdout.rows || 24
    };
  }

  static calculateColumnWidths(terminalWidth) {
    // Reserve space for borders and padding
    const availableWidth = terminalWidth - 10;
    
    // Minimum widths for each column
    const minWidths = {
      username: 12,
      status: 10,
      info: 20,
      time: 12,
      countdown: 12
    };

    // If terminal is too narrow, use compact mode
    if (availableWidth < 70) {
      return {
        username: Math.max(8, Math.floor(availableWidth * 0.2)),
        status: Math.max(8, Math.floor(availableWidth * 0.15)),
        info: Math.max(15, Math.floor(availableWidth * 0.4)),
        time: Math.max(8, Math.floor(availableWidth * 0.15)),
        countdown: Math.max(8, Math.floor(availableWidth * 0.1))
      };
    }

    // Normal responsive calculation
    const totalMinWidth = Object.values(minWidths).reduce((sum, width) => sum + width, 0);
    const extraSpace = availableWidth - totalMinWidth;

    if (extraSpace > 0) {
      // Distribute extra space proportionally
      return {
        username: minWidths.username + Math.floor(extraSpace * 0.15),
        status: minWidths.status + Math.floor(extraSpace * 0.1),
        info: minWidths.info + Math.floor(extraSpace * 0.5),
        time: minWidths.time + Math.floor(extraSpace * 0.15),
        countdown: minWidths.countdown + Math.floor(extraSpace * 0.1)
      };
    }

    return minWidths;
  }

static renderTable(username, status, info, countdown, robloxVersion) {
  const { width: terminalWidth } = this.getTerminalSize();
  const colWidths = this.calculateColumnWidths(terminalWidth);
  const stats = this.getSystemStats();

  const cpuRamLine = `| CPU: ${stats.cpuUsage}% | RAM: ${stats.ramUsage} |`;
  const centeredCpuRamLine = cpuRamLine.padStart(
    Math.floor((terminalWidth + cpuRamLine.length) / 2)
  );

  const table = new Table({
    head: ["User", "Status", "Info", "Time", "Delay"],
    colWidths: [
      colWidths.username,
      colWidths.status,
      colWidths.info,
      colWidths.time,
      colWidths.countdown
    ],
    wordWrap: true,
    style: {
      head: ["cyan"],
      border: ["gray"]
    }
  });

  const userInfo = `${username}\n(${robloxVersion === 'international' ? 'Quốc tế' : 'VNG'})`;

  table.push([
    userInfo,
    status,
    info,
    new Date().toLocaleTimeString(),
    countdown
  ]);

  return `${centeredCpuRamLine}\n${table.toString()}`;
}

  static renderCompactTable(username, status, info, countdown, robloxVersion) {
    // For very small screens, still use table but with smaller columns
    const { width: terminalWidth } = this.getTerminalSize();
    
    if (terminalWidth < 50) {
      const table = new Table({
        head: ["Field", "Value"],
        colWidths: [12, terminalWidth - 20],
        wordWrap: true,
        style: { 
          head: ["cyan"], 
          border: ["gray"]
        }
      });

      table.push(
        ["User", `${username} (${robloxVersion === 'international' ? 'Quốc tế' : 'VNG'})`],
        ["Status", status],
        ["Info", info],
        ["Time", new Date().toLocaleTimeString()],
        ["Delay", countdown]
      );

      return table.toString();
    }

    return this.renderTable(username, status, info, countdown, robloxVersion);
  }

  static formatCountdown(seconds) {
    return seconds >= 60 
      ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` 
      : `${seconds}s`;
  }

  // Auto-detect best rendering method
  static smartRender(username, status, info, countdown, robloxVersion) {
    const { width: terminalWidth } = this.getTerminalSize();
    
    if (terminalWidth < 50) {
      return this.renderCompactTable(username, status, info, countdown, robloxVersion);
    }
    
    return this.renderTable(username, status, info, countdown, robloxVersion);
  }
}

class GameLauncher {
  static handleGameLaunch(shouldLaunch, placeId, linkCode, packageName, rejoinOnly = false) {
    if (shouldLaunch) {
      if (!rejoinOnly) {
        Utils.killApp(packageName);
      } else {
        console.log("⚠️ [RejoinOnly] Không kill app, mở bằng roblox:// trực tiếp.");
      }

      Utils.launch(placeId, linkCode, packageName);
    }
  }
}

class ConfigManager {
  static async handleExistingConfig(rl) {
    const saved = Utils.loadConfig();
    if (!saved) return null;

    // Check if the saved package is still available
    const versions = Utils.detectRobloxVersions();
    let packageStillExists = false;
    
    for (const [key, version] of Object.entries(versions)) {
      if (version.packageName === saved.packageName) {
        packageStillExists = true;
        break;
      }
    }

    if (!packageStillExists) {
      console.log(`\nPhiên bản Roblox đã lưu (${saved.packageName}) không còn tồn tại!`);
      return null;
    }

    Utils.printConfig(saved);
    const useOld = (await Utils.ask(rl, "Dùng lại config trước đó? (y/N): ")).trim().toLowerCase();
    
    if (useOld === "y") {
      return saved;
    }
    return null;
  }

  static async getDelayFromUser(rl) {
    while (true) {
      const delaySec = parseInt(await Utils.ask(rl, "Delay check (giây, 15-120): ")) || 1;
      if (delaySec >= 15 && delaySec <= 120) {
        return delaySec;
      }
      console.log("Giá trị không hợp lệ! Vui lòng nhập lại.");
    }
  }
}

class RejoinTool {
  constructor() {
    this.user = null;
    this.game = null;
    this.delayMs = 60000;
    this.statusHandler = new StatusHandler();
    this.robloxVersion = null;
    this.packageName = null;
  }

  async start() {
    Utils.ensureRoot();
    Utils.enableWakeLock();

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    console.clear();
    console.log("== Rejoin Tool (Node.js version) ==");

    const existingConfig = await ConfigManager.handleExistingConfig(rl);
    if (existingConfig) {
      rl.close();
      const cookie = Utils.getRobloxCookie(existingConfig.packageName);
      return this.initializeWithConfig(existingConfig, cookie);
    }

    const config = await this.setupNewConfig(rl);
    rl.close();

    const cookie = Utils.getRobloxCookie(config.packageName);
    return this.initializeWithConfig(config, cookie);
  }

  async setupNewConfig(rl) {
    // Select Roblox version first
    const versionInfo = await RobloxVersionSelector.selectVersion(rl);
    this.robloxVersion = versionInfo.robloxVersion;
    this.packageName = versionInfo.packageName;

    const cookie = Utils.getRobloxCookie(this.packageName);
    const user = new RobloxUser(null, null, cookie);
    const userId = await user.fetchAuthenticatedUser();
    
    if (!userId) {
      console.error("Không tìm thấy user ID");
      return;
    }

    console.log(`Username: ${user.username}`);
    console.log(`User ID: ${userId}`);
    console.log(`Roblox Version: ${this.robloxVersion === 'international' ? 'Quốc tế' : 'VNG'}`);

    const selector = new GameSelector();
    const game = await selector.chooseGame(rl);
    const delaySec = await ConfigManager.getDelayFromUser(rl);

    const config = {
      username: user.username,
      userId,
      placeId: game.placeId,
      gameName: game.name,
      linkCode: game.linkCode,
      delaySec,
      robloxVersion: this.robloxVersion,
      packageName: this.packageName
    };

    Utils.saveConfig(config);
    return config;
  }

  async initializeWithConfig(config, cookie) {
    this.user = new RobloxUser(config.username, config.userId, cookie);
    this.game = {
      placeId: config.placeId,
      name: config.gameName,
      linkCode: config.linkCode,
    };
    this.delayMs = Math.max(15000, config.delaySec * 1000);
    this.robloxVersion = config.robloxVersion;
    this.packageName = config.packageName;

    console.clear();
    console.log(`${config.username} (${config.userId}) | ${this.game.name} (${this.game.placeId})`);
    console.log(`Roblox: ${this.robloxVersion === 'international' ? 'Quốc tế' : 'VNG'} (${this.packageName})`);

    await this.startMonitoring();
  }

  async startMonitoring() {
    while (true) {
      const presence = await this.user.getPresence();
      const analysis = this.statusHandler.analyzePresence(presence, this.game.placeId);
      
      if (analysis.shouldLaunch) {
        GameLauncher.handleGameLaunch(
          analysis.shouldLaunch,
          this.game.placeId,
          this.game.linkCode,
          this.packageName,
          analysis.rejoinOnly
        );
        this.statusHandler.updateJoinStatus(analysis.shouldLaunch);
      }

      await this.runCountdown(analysis.status, analysis.info, presence);
    }
  }

  async runCountdown(status, info, presence) {
    const delaySec = Math.floor(this.delayMs / 1000);
    
    for (let i = delaySec; i >= 0; i--) {
      const countdownStr = UIRenderer.formatCountdown(i);

      console.clear();
      console.log(UIRenderer.renderTitle());
      console.log(UIRenderer.smartRender(this.user.username, status, info, countdownStr, this.robloxVersion));
      console.log("\nDebug JSON:\n" + JSON.stringify(presence, null, 2));

      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

(async () => {
  const tool = new RejoinTool();
  await tool.start();
})();