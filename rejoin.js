#!/usr/bin/env node

const axios = require("axios");
const readline = require("readline");
const fs = require("fs");
const { execSync, exec } = require("child_process");
const path = require("path");

// 🚨 BẮT BUỘC DÙNG process.env.HOME CHO TERMUX
const HOME_DIR = process.env.HOME || "/data/data/com.termux/files/home";
console.log(`🔍 HOME_DIR = ${HOME_DIR}`);  // debug xem HOME_DIR có đúng không

const CONFIG_DIR = path.join(HOME_DIR, ".config", "rejoin-tool");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

class Utils {
  static ask(rl, msg) {
    return new Promise((r) => rl.question(msg, r));
  }

  static saveConfig(config) {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        console.log(`📁 Tạo thư mục config: ${CONFIG_DIR}`);
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
      console.log(`💾 Đã lưu config tại: ${CONFIG_PATH}`);
    } catch (e) {
      console.error(`❌ Save config FAIL: ${e.message}`);
      console.error(`📛 Path debug: ${CONFIG_PATH}`);
    }
  }

  static loadConfig() {
    try {
      if (!fs.existsSync(CONFIG_PATH)) {
        console.log(`ℹ️ Không tìm thấy config ở: ${CONFIG_PATH}`);
        return null;
      }
      const raw = fs.readFileSync(CONFIG_PATH, "utf8");
      console.log(`✅ Đã load config từ: ${CONFIG_PATH}`);
      return JSON.parse(raw);
    } catch (e) {
      console.error(`❌ Load config FAIL: ${e.message}`);
      return null;
    }
  }

  static killApp() {
    exec("am force-stop com.roblox.client");
  }

  static launch(placeId, linkCode = null) {
    const url = linkCode
      ? `roblox://placeID=${placeId}&linkCode=${linkCode}`
      : `roblox://placeID=${placeId}`;
    console.log(`🚀 Đang mở: ${url}`);
    exec(`am start -a android.intent.action.VIEW -d "${url}"`);
  }

  static enableWakeLock() {
    try {
      exec("termux-wake-lock");
      console.log("💤 Wake lock bật");
    } catch {
      console.warn("⚠️ Wake lock không bật được");
    }
  }

  static printConfig(cfg) {
    console.log("\n📂 Cấu hình trước đó:");
    console.log(`👤 Username: ${cfg.username}`);
    console.log(`🆔 UserID: ${cfg.userId}`);
    console.log(`🎮 Game: ${cfg.gameName} (${cfg.placeId})`);
    if (cfg.linkCode) console.log(`🔗 LinkCode: ${cfg.linkCode}`);
    console.log(`⏱️ Delay: ${cfg.delayMin} phút\n`);
  }
}

class RobloxUser {
  constructor(username, userId = null) {
    this.username = username;
    this.userId = userId;
  }
  async fetchUserId() {
    try {
      const r = await axios.post("https://users.roblox.com/v1/usernames/users", {
        usernames: [this.username],
        excludeBannedUsers: false,
      });
      this.userId = r.data.data?.[0]?.id;
      return this.userId;
    } catch (e) {
      console.error("❌ Lấy userID lỗi:", e.message);
      return null;
    }
  }
  async getPresence() {
    try {
      const r = await axios.post("https://presence.roblox.com/v1/presence/users", {
        userIds: [this.userId],
      });
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
      "5": ["116495828188952", "Dead-Rails-Alpha"],
      "6": ["8737602449", "PLS-DONATE"],
      "0": ["custom", "🔧 Tùy chỉnh"],
    };
  }
  async chooseGame(rl) {
    console.log("🎮 Chọn game:");
    for (let k in this.GAMES) {
      console.log(`${k}. ${this.GAMES[k][1]} (${this.GAMES[k][0]})`);
    }
    const ans = (await Utils.ask(rl, "Nhập số: ")).trim();
    if (ans === "0") {
      const sub = (await Utils.ask(rl, "0.1 ID thủ công | 0.2 Link private server: ")).trim();
      if (sub === "1") {
        const pid = (await Utils.ask(rl, "🔢 Nhập Place ID: ")).trim();
        return { placeId: pid, name: "Tùy chỉnh", linkCode: null };
      }
      if (sub === "2") {
        console.log("💡 Dán link private server:");
        while (true) {
          const link = await Utils.ask(rl, "🔗 Link: ");
          const m = link.match(/\/games\/(\d+)[^?]*\?[^=]*=([\w-]+)/);
          if (!m) return console.log("❌ Link không hợp lệ!");
          return { placeId: m[1], name: "Private", linkCode: m[2] };
        }
      }
      throw new Error("❌ Không hợp lệ!");
    }
    if (this.GAMES[ans]) {
      return { placeId: this.GAMES[ans][0], name: this.GAMES[ans][1], linkCode: null };
    }
    throw new Error("❌ Không hợp lệ!");
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
    Utils.enableWakeLock();
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    console.clear();
    console.log("== Rejoin Tool (Node.js version) ==");

    const saved = Utils.loadConfig();
    let u, id, pid, gname, lcode, dmin;

    if (saved) {
      Utils.printConfig(saved);
      const reuse = (await Utils.ask(rl, "Dùng lại config? (y/N): ")).trim().toLowerCase();
      if (reuse === "y") {
        rl.close();
        return this.finishSetup(saved.username, saved.userId, saved.placeId, saved.gameName, saved.linkCode, saved.delayMin);
      }
    }

    u = await Utils.ask(rl, "👤 Username Roblox: ");
    const user = new RobloxUser(u.trim());
    id = await user.fetchUserId();
    if (!id) return rl.close();

    console.log(`✅ UserID: ${id}`);

    const selector = new GameSelector();
    const game = await selector.chooseGame(rl);

    dmin = parseInt(await Utils.ask(rl, "⏱️ Delay (phút): ")) || 1;
    rl.close();

    Utils.saveConfig({
      username: u.trim(),
      userId: id,
      placeId: game.placeId,
      gameName: game.name,
      linkCode: game.linkCode,
      delayMin: dmin,
    });

    return this.finishSetup(u.trim(), id, game.placeId, game.name, game.linkCode, dmin);
  }

  async finishSetup(u, id, pid, gname, lcode, dmin) {
    this.user = new RobloxUser(u, id);
    this.game = { placeId: pid, name: gname, linkCode: lcode };
    this.delayMs = Math.max(1, dmin) * 60 * 1000;

    console.clear();
    console.log(`👤 ${u} (ID ${id}) | 🎮 ${gname} (${pid})`);
    console.log(`🔁 Auto-check mỗi ${dmin} phút`);

    while (true) {
      const presence = await this.user.getPresence();
      const now = Date.now();
      let msg;
      if (!presence) msg = "⚠️ Không lấy được trạng thái";
      else if (presence.userPresenceType !== 2) {
        msg = "👋 User offline";
        if (!this.hasLaunched || now - this.joinedAt > 30000) {
          Utils.killApp();
          Utils.launch(pid, lcode);
          this.joinedAt = now;
          this.hasLaunched = true;
          msg += " → Đã mở lại!";
        }
      } else {
        msg = "✅ Đang trong game";
        this.joinedAt = now;
        this.hasLaunched = true;
      }
      console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
      await new Promise((r) => setTimeout(r, this.delayMs));
    }
  }
}

(async () => {
  const tool = new RejoinTool();
  await tool.start();
})();
