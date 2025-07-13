#!/usr/bin/env node

const axios = require("axios");
const readline = require("readline");
const fs = require("fs");
const { execSync, exec } = require("child_process");

const CONFIG_PATH = "./config.json";

class Utils {
  static ensurePackages() {
    ["axios"].forEach((pkg) => {
      try { require.resolve(pkg); }
      catch {
        console.log(`📦 Đang cài package thiếu: ${pkg}`);
        execSync(`npm install ${pkg}`, { stdio: "inherit" });
      }
    });
  }

  static ensureRoot() {
    try {
      const uid = execSync("id -u").toString().trim();
      if (uid !== "0") {
        const node = execSync("which node").toString().trim();
        console.log("🔐 Cần root, chuyển qua su...");
        execSync(`su -c "${node} ${__filename}"`, { stdio: "inherit" });
        process.exit(0);
      }
    } catch (e) {
      console.error("❌ Không thể chạy root:", e.message);
      process.exit(1);
    }
  }

  static enableWakeLock() {
    try {
      exec("termux-wake-lock");
      console.log("💤 Wake lock bật");
    } catch {
      console.warn("⚠️ Không bật wake lock");
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
    if (linkCode) console.log(`🔗 Đã join bằng linkCode: ${linkCode}`);
    exec(`am start -a android.intent.action.VIEW -d "${url}"`);
  }

  static ask(rl, msg) {
    return new Promise(r => rl.question(msg, r));
  }

  static saveConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log("💾 Đã lưu config!");
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
    console.log("\n📂 Cấu hình trước đó:");
    console.log(`👤 Username: ${cfg.username}`);
    console.log(`🆔 UserID: ${cfg.userId}`);
    console.log(`🎮 Game: ${cfg.gameName} (${cfg.placeId})`);
    if (cfg.linkCode) console.log(`🔗 Private link code: ${cfg.linkCode}`);
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
        excludeBannedUsers: false
      });
      this.userId = r.data.data?.[0]?.id || null;
      return this.userId;
    } catch (e) {
      console.error("❌ Lấy userID lỗi:", e.message);
      return null;
    }
  }

  async getPresence() {
    try {
      const r = await axios.post("https://presence.roblox.com/v1/presence/users", {
        userIds: [this.userId]
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
      "5": ["116495829188952", "Dead-Rails-Alpha"],
      "6": ["8737602449", "PLS-DONATE"],
      "0": ["custom", "🔧 Tùy chỉnh"]
    };
  }

  async chooseGame(rl) {
    console.log("🎮 Chọn game:");
    for (let k in this.GAMES) {
      console.log(`${k}. ${this.GAMES[k][1]} (${this.GAMES[k][0]})`);
    }

    const ans = (await Utils.ask(rl, "Nhập số: ")).trim();

    if (ans === "0") {
      const sub = (await Utils.ask(rl, "0.1 ID thủ công | 0.2 Link private redirect: ")).trim();
      if (sub === "1") {
        const pid = (await Utils.ask(rl, "🔢 Nhập Place ID: ")).trim();
        return { placeId: pid, name: "Tùy chỉnh", linkCode: null };
      }
      if (sub === "2") {
        console.log("\n💡 Hướng dẫn: Dán link redirect sau khi vào private server.");
        while (true) {
          const link = await Utils.ask(rl, "\n🔗 Dán link redirect đã chuyển hướng: ");
          const m = link.match(/\/games\/(\d+)[^?]*\?[^=]*=([\w-]+)/);
          if (!m) {
            console.log("❌ Link không hợp lệ!");
            continue;
          }
          return {
            placeId: m[1],
            name: "Private Server",
            linkCode: m[2],
          };
        }
      }
      throw new Error("❌ Không hợp lệ!");
    }

    if (this.GAMES[ans]) {
      return {
        placeId: this.GAMES[ans][0],
        name: this.GAMES[ans][1],
        linkCode: null
      };
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
    Utils.ensurePackages();
    Utils.ensureRoot();
    Utils.enableWakeLock();

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    console.clear();
    console.log("== Rejoin Tool (Node.js version) ==");

    const saved = Utils.loadConfig();
    let username, userId, placeId, gameName, linkCode, delayMin;

    if (saved) {
      Utils.printConfig(saved);
      const useOld = (await Utils.ask(rl, "📝 Dùng lại config trước đó? (y/N): ")).trim().toLowerCase();
      if (useOld === "y") {
        username = saved.username;
        userId = saved.userId;
        placeId = saved.placeId;
        gameName = saved.gameName;
        linkCode = saved.linkCode;
        delayMin = saved.delayMin;
        rl.close();
        return this.finishSetup(username, userId, placeId, gameName, linkCode, delayMin);
      }
    }

    username = await Utils.ask(rl, "👤 Nhập username Roblox: ");
    const user = new RobloxUser(username.trim());
    userId = await user.fetchUserId();
    if (!userId) {
      console.error("❌ Không tìm thấy user ID");
      rl.close();
      return;
    }
    console.log(`✅ User ID: ${userId}`);

    const selector = new GameSelector();
    const game = await selector.chooseGame(rl);

    delayMin = parseInt(await Utils.ask(rl, "⏱️ Delay check (phút): ")) || 1;
    rl.close();

    Utils.saveConfig({
      username: username.trim(),
      userId: userId,
      placeId: game.placeId,
      gameName: game.name,
      linkCode: game.linkCode,
      delayMin
    });

    return this.finishSetup(username.trim(), userId, game.placeId, game.name, game.linkCode, delayMin);
  }

  async finishSetup(username, userId, placeId, gameName, linkCode, delayMin) {
    this.user = new RobloxUser(username, userId);
    this.game = {
      placeId,
      name: gameName,
      linkCode
    };
    this.delayMs = Math.max(1, delayMin) * 60 * 1000;

    console.clear();
    console.log(`👤 ${username} (🆔 ${userId}) | 🎮 ${this.game.name} (${this.game.placeId})`);
    console.log(`🔁 Auto-check mỗi ${delayMin} phút`);

    await this.loop();
  }

  async loop() {
    while (true) {
      const presence = await this.user.getPresence();
      const now = Date.now();
      let msg = "";

      console.debug("[DEBUG]", JSON.stringify(presence, null, 2));

      if (!presence) {
        msg = "⚠️ Không lấy được trạng thái";
      } else if (presence.userPresenceType !== 2) {
        msg = "👋 User không online";
        if (!this.hasLaunched || now - this.joinedAt > 30000) {
          Utils.killApp();
          Utils.launch(this.game.placeId, this.game.linkCode);
          this.joinedAt = now;
          this.hasLaunched = true;
          msg += " → Đã mở lại game!";
        } else {
          msg += " (đợi thêm chút để tránh spam)";
        }
      } else {
        msg = "✅ Đang trong game";
        this.joinedAt = now;
        this.hasLaunched = true;
      }

      console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
      await new Promise(r => setTimeout(r, this.delayMs));
    }
  }
}

(async () => {
  const tool = new RejoinTool();
  await tool.start();
})();
