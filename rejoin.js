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

  static killApp() {
    exec("am force-stop com.roblox.client");
  }

  static launch(placeId, linkCode = null) {
    const url = linkCode
      ? `roblox://placeID=${placeId}&linkCode=${linkCode}`
      : `roblox://placeID=${placeId}`;
    console.log(`Đang mở: ${url}`);
    if (linkCode) console.log(`Đã join bằng linkCode: ${linkCode}`);
    exec(`am start -a android.intent.action.VIEW -d "${url}"`);
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
    if (cfg.linkCode) console.log(`Private link code: ${cfg.linkCode}`);
    console.log(`Delay: ${cfg.delaySec} giây\n`);
  }

  static getRobloxCookie() {
    console.log(`Đang lấy cookie ROBLOSECURITY...`);
    let raw;
    try {
      raw = execSync(
        `cat /data/data/com.roblox.client/app_webview/Default/Cookies | strings | grep ROBLOSECURITY`
      ).toString();
    } catch {
      try {
        raw = execSync(
          `su -c sh -c 'cat /data/data/com.roblox.client/app_webview/Default/Cookies | strings | grep ROBLOSECURITY'`
        ).toString();
      } catch (err) {
        console.error(`Không thể đọc cookie bằng cả 2 cách.`);
        process.exit(1);
      }
    }

    const match = raw.match(/\.ROBLOSECURITY_([^\s\/]+)/);
    if (!match) {
      console.error(`Không tìm được cookie ROBLOSECURITY!`);
      process.exit(1);
    }

    let cookieValue = match[1].trim();
    if (!cookieValue.startsWith("_")) cookieValue = "_" + cookieValue;
    return `.ROBLOSECURITY=${cookieValue}`;
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

// 🚀 Tách logic status ra class riêng
class StatusHandler {
  constructor() {
    this.hasLaunched = false;
    this.joinedAt = 0;
  }

  analyzePresence(presence, targetPlaceId) {
    const now = Date.now();
    
    if (!presence || presence.userPresenceType === undefined) {
      return {
        status: "Không rõ",
        info: "Không lấy được trạng thái hoặc thiếu placeId",
        shouldLaunch: false
      };
    }

    if (presence.userPresenceType !== 2) {
      const shouldLaunch = !this.hasLaunched || now - this.joinedAt > 30000;
      return {
        status: "Offline",
        info: `User không online hoặc chưa vào game${shouldLaunch ? '. Đã mở lại game!' : ' (đợi thêm chút để tránh spam)'}`,
        shouldLaunch
      };
    }

    if (!presence.placeId || presence.placeId.toString() !== targetPlaceId.toString()) {
      return {
        status: "Sai map",
        info: `User đang trong game nhưng sai placeId (${presence.placeId}). Đã rejoin đúng map!`,
        shouldLaunch: true
      };
    }

    return {
      status: "Online",
      info: "Đang ở đúng game!",
      shouldLaunch: false
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

  static renderTable(username, status, info, countdown) {
    const table = new Table({
      head: ["Username", "Trạng thái", "Thông tin", "Time", "Delay còn lại"],
      colWidths: [20, 18, 50, 18, 20],
      wordWrap: true,
      style: { head: ["cyan"], border: ["gray"] }
    });

    table.push([
      username,
      status,
      info,
      new Date().toLocaleTimeString(),
      countdown
    ]);

    return table.toString();
  }

  static formatCountdown(seconds) {
    return seconds >= 60 
      ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` 
      : `${seconds}s`;
  }
}


class GameLauncher {
  static handleGameLaunch(shouldLaunch, placeId, linkCode) {
    if (shouldLaunch) {
      Utils.killApp();
      Utils.launch(placeId, linkCode);
    }
  }
}


class ConfigManager {
  static async handleExistingConfig(rl) {
    const saved = Utils.loadConfig();
    if (!saved) return null;

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
      const cookie = Utils.getRobloxCookie();
      return this.initializeWithConfig(existingConfig, cookie);
    }

    
    const config = await this.setupNewConfig(rl);
    rl.close();

    const cookie = Utils.getRobloxCookie();
    return this.initializeWithConfig(config, cookie);
  }

  async setupNewConfig(rl) {
    const cookie = Utils.getRobloxCookie();
    const user = new RobloxUser(null, null, cookie);
    const userId = await user.fetchAuthenticatedUser();
    
    if (!userId) {
      console.error("Không tìm thấy user ID");
      return;
    }

    console.log(`Username: ${user.username}`);
    console.log(`User ID: ${userId}`);

    const selector = new GameSelector();
    const game = await selector.chooseGame(rl);
    const delaySec = await ConfigManager.getDelayFromUser(rl);

    const config = {
      username: user.username,
      userId,
      placeId: game.placeId,
      gameName: game.name,
      linkCode: game.linkCode,
      delaySec
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

    console.clear();
    console.log(`${config.username} (${config.userId}) | ${this.game.name} (${this.game.placeId})`);

    await this.startMonitoring();
  }

  async startMonitoring() {
    while (true) {
      const presence = await this.user.getPresence();
      const analysis = this.statusHandler.analyzePresence(presence, this.game.placeId);
      
      
      GameLauncher.handleGameLaunch(analysis.shouldLaunch, this.game.placeId, this.game.linkCode);
      this.statusHandler.updateJoinStatus(analysis.shouldLaunch);

      
      await this.runCountdown(analysis.status, analysis.info, presence);
    }
  }

  async runCountdown(status, info, presence) {
    const delaySec = Math.floor(this.delayMs / 1000);
    
    for (let i = delaySec; i >= 0; i--) {
      const countdownStr = UIRenderer.formatCountdown(i);

      console.clear();
      console.log(UIRenderer.renderTitle());
      console.log(UIRenderer.renderTable(this.user.username, status, info, countdownStr));
      console.log("\nDebug JSON:\n" + JSON.stringify(presence, null, 2));

      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}


(async () => {
  const tool = new RejoinTool();
  await tool.start();
})();