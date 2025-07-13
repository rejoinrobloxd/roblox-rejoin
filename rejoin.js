#!/usr/bin/env node

const axios = require("axios");
const readline = require("readline");
const { execSync, exec } = require("child_process");
const fs = require("fs");
const path = require("path");

class Utils {
  static configPath = path.join(__dirname, "config.json");

  static ensurePackages() {
    ["axios"].forEach((pkg) => {
      try { require.resolve(pkg); } 
      catch {
        console.log(`Đang cài package thiếu: ${pkg}`);
        execSync(`npm install ${pkg}`, { stdio: "inherit" });
      }
    });
  }

  static ensureRoot() {
    try {
      const uid = execSync("id -u").toString().trim();
      if (uid !== "0") {
        const node = execSync("which node").toString().trim();
        console.log("Cần root, chuyển qua su...");
        execSync(`su -c "${node} ${__filename}"`, { stdio: "inherit" });
        process.exit(0);
      }
    } catch (e) {
      console.error("Không thể chạy root:", e.message);
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
    console.clear();
    console.log(`Đang mở: ${url}`);
    if (linkCode) console.log(`Đã join bằng linkCode: ${linkCode}`);
    exec(`am start -a android.intent.action.VIEW -d "${url}"`);
  }

  static ask(rl, msg) {
    return new Promise(r => rl.question(msg, r));
  }

  static saveConfig(data) {
    fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2));
    console.log("Đã lưu config.");
  }

  static loadConfig() {
    if (!fs.existsSync(this.configPath)) return null;
    try {
      const raw = fs.readFileSync(this.configPath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}

class RobloxUser {
  constructor(username) {
    this.username = username;
    this.userId = null;
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
      console.error("Lấy userID lỗi:", e.message);
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
      "0": ["custom", "Tùy chỉnh"]
    };
  }

  async chooseGame(rl) {
    console.log("Chọn game:\n");
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
        console.clear();
        console.log("Hướng dẫn: Copy link private server từ Roblox và dán vào trình duyệt.");
        console.log("→ Sau khi được redirect, copy link có dạng:");
        console.log("  https://www.roblox.com/games/<place-id>/<tên>?privateServerLinkCode=<code>\n");
        while (true) {
          const link = await Utils.ask(rl, "Dán link redirect đã chuyển hướng: ");
          const m = link.match(/\/games\/(\d+)[^?]*\?[^=]*=([\w-]+)/);
          if (!m) {
            console.log("Link không hợp lệ! Phải là dạng redirect.");
            console.log("Ví dụ: https://www.roblox.com/games/123456789/abc?privateServerLinkCode=abcdef\n");
            continue;
          }
          return {
            placeId: m[1],
            name: "Private Server",
            linkCode: m[2],
          };
        }
      }
      throw new Error("Không hợp lệ!");
    }

    if (this.GAMES[ans]) {
      return {
        placeId: this.GAMES[ans][0],
        name: this.GAMES[ans][1],
        linkCode: null
      };
    }

    throw new Error("Không hợp lệ!");
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
    console.log("=== REJOIN TOOL ===\n");

    const prevConfig = Utils.loadConfig();
    let useOld = false;

    if (prevConfig) {
      console.clear();
      console.log("Config trước đó:\n");
      console.log(JSON.stringify(prevConfig, null, 2));
      const answer = await Utils.ask(rl, "Dùng lại config? (y/n): ");
      useOld = answer.trim().toLowerCase() === "y";
    }

    if (useOld) {
      this.user = new RobloxUser(prevConfig.username);
      this.game = {
        placeId: prevConfig.placeId,
        name: prevConfig.name || "Unknown",
        linkCode: prevConfig.linkCode || null
      };
      this.delayMs = Math.max(1, prevConfig.delayMin) * 60 * 1000;
    } else {
      const username = await Utils.ask(rl, "Nhập username Roblox: ");
      this.user = new RobloxUser(username.trim());

      const userId = await this.user.fetchUserId();
      if (!userId) {
        console.error("Không tìm thấy user ID");
        rl.close();
        return;
      }

      console.clear();
      console.log(`User ID: ${userId}\n`);

      const selector = new GameSelector();
      this.game = await selector.chooseGame(rl);

      const delayMin = parseInt(await Utils.ask(rl, "Delay check (phút): "));
      this.delayMs = Math.max(1, delayMin) * 60 * 1000;

      Utils.saveConfig({
        username: this.user.username,
        placeId: this.game.placeId,
        name: this.game.name,
        linkCode: this.game.linkCode,
        delayMin
      });
    }

    rl.close();

    console.clear();
    console.log(`User: ${this.user.username}`);
    console.log(`Game: ${this.game.name} (${this.game.placeId})`);
    console.log(`Tự động kiểm tra mỗi ${this.delayMs / 60000} phút\n`);

    await this.loop();
  }

  async loop() {
    while (true) {
      const presence = await this.user.getPresence();
      const now = Date.now();
      let msg = "";

      if (!presence) {
        msg = "Không lấy được trạng thái";
      } else if (presence.userPresenceType !== 2) {
        msg = "User không online";
        if (!this.hasLaunched) {
          Utils.killApp();
          Utils.launch(this.game.placeId, this.game.linkCode);
          this.joinedAt = now;
          this.hasLaunched = true;
          msg += " → Đã mở lại game!";
        } else {
          msg += " (đang chờ check lại)";
        }
      } else {
        msg = "Đang trong game";
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
