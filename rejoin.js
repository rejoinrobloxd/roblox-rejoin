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

class RejoinTool {
  constructor() {
    this.user = null;
    this.game = null;
    this.delayMs = 60000;
    this.hasLaunched = false;
    this.joinedAt = 0;
  }

  async start() {
    Utils.ensureRoot();
    Utils.enableWakeLock();

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    console.clear();
    console.log("== Rejoin Tool (Node.js version) ==");

    const saved = Utils.loadConfig();
    let username, userId, placeId, gameName, linkCode, delaySec;

    if (saved) {
      Utils.printConfig(saved);
      const useOld = (await Utils.ask(rl, "Dùng lại config trước đó? (y/N): ")).trim().toLowerCase();
      if (useOld === "y") {
        username = saved.username;
        userId = saved.userId;
        placeId = saved.placeId;
        gameName = saved.gameName;
        linkCode = saved.linkCode;
        delaySec = saved.delaySec;
        rl.close();
        const cookie = Utils.getRobloxCookie();
        return this.finishSetup(username, userId, placeId, gameName, linkCode, delaySec, cookie);
      }
    }

    const cookie = Utils.getRobloxCookie();
    const user = new RobloxUser(null, null, cookie);
    userId = await user.fetchAuthenticatedUser();
    if (!userId) {
      console.error("Không tìm thấy user ID");
      rl.close();
      return;
    }
    username = user.username;
    console.log(`Username: ${username}`);
    console.log(`User ID: ${userId}`);

    const selector = new GameSelector();
    const game = await selector.chooseGame(rl);

    
    while (true) {
      delaySec = parseInt(await Utils.ask(rl, "Delay check (giây, 15-120): ")) || 1;
      if (delaySec >= 15 && delaySec <= 120) break;
      console.log("Giá trị không hợp lệ! Vui lòng nhập lại.");
    }
    rl.close();

    Utils.saveConfig({
      username,
      userId,
      placeId: game.placeId,
      gameName: game.name,
      linkCode: game.linkCode,
      delaySec: delaySec,
    });

    return this.finishSetup(username, userId, game.placeId, game.name, game.linkCode, delaySec, cookie);
  }

  async finishSetup(username, userId, placeId, gameName, linkCode, delaySec, cookie) {
    this.user = new RobloxUser(username, userId, cookie);
    this.game = {
      placeId,
      name: gameName,
      linkCode,
    };
    this.delayMs = Math.max(15000, delaySec * 1000);

    console.clear();
    console.log(` ${username} ( ${userId}) |  ${this.game.name} (${this.game.placeId})`);
    console.log(`Auto-check mỗi ${Math.ceil(delaySec / 60)} phút`);

    await this.loop();
  }



async loop() {
  while (true) {
    const presence = await this.user.getPresence();
    const delaySec = Math.floor(this.delayMs / 1000);

    // Xác định status, info như mọi lần...
    let status = "";
    let info = "";
    const now = Date.now();
    const timeStr = new Date().toLocaleTimeString();

    if (!presence || presence.userPresenceType === undefined) {
      status = `Không rõ`;
      info = `Không lấy được trạng thái hoặc thiếu placeId`;
    } else if (presence.userPresenceType !== 2) {
      status = `Offline`;
      info = `User không online hoặc chưa vào game`;
      if (!this.hasLaunched || now - this.joinedAt > 30000) {
        Utils.killApp();
        Utils.launch(this.game.placeId, this.game.linkCode);
        this.joinedAt = now;
        this.hasLaunched = true;
        info += `.Đã mở lại game!`;
      } else {
        info += ` (đợi thêm chút để tránh spam)`;
      }
    } else if (
      !presence.placeId ||
      presence.placeId.toString() !== this.game.placeId.toString()
    ) {
      status = `Sai map`;
      info = `User đang trong game nhưng sai placeId (${presence.placeId})`;
      Utils.killApp();
      Utils.launch(this.game.placeId, this.game.linkCode);
      this.joinedAt = now;
      this.hasLaunched = true;
      info += `Đã rejoin đúng map!`;
    } else {
      status = `Online`;
      info = `Đang ở đúng game!`;
      this.joinedAt = now;
      this.hasLaunched = true;
    }

    
    for (let i = delaySec; i >= 0; i--) {
      const countdownStr = i >= 60
        ? `${Math.floor(i / 60)}m ${i % 60}s`
        : `${i}s`;

      console.clear();

      
      const title = figlet.textSync("Dawn Rejoin", {
        font: "Standard",
        horizontalLayout: "default",
        verticalLayout: "default"
      });

      
      const boxedTitle = boxen(title, {
        padding: 1,
        borderColor: "cyan",
        borderStyle: "double",
        align: "center"
      });

      console.log(boxedTitle);

      
      const table = new Table({
        head: ["Username","Trạng thái","Thông tin","Time","Delay còn lại"],
        colWidths: [20,18,50,18,20],
        wordWrap: true,
        style: { head: ["cyan"], border: ["gray"] }
      });

      table.push([
        this.user.username,
        status,
        info,
        new Date().toLocaleTimeString(),
        countdownStr
      ]);

      console.log(table.toString());
      console.log("\nDebug JSON:\n" + JSON.stringify(presence, null, 2));

      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}


}

(async () => {
  const tool = new RejoinTool();
  await tool.start();
})();
