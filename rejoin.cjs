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
const CONFIG_PATH = path.join(__dirname, "multi_configs.json");
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
      console.log("Wake lock bật ⚡");
    } catch {
      console.warn("Không bật được wake lock 😅");
    }
  }

  // FIX: Thêm async và execSync để đồng bộ
  static async killApp(packageName) {
    try {
      console.log(`💀 [${packageName}] Đang kill app...`);
      execSync(`am force-stop ${packageName}`, { stdio: 'pipe' });
      console.log(`✅ [${packageName}] Đã kill thành công!`);
      // Đợi 1 giây để đảm bảo app đã đóng hoàn toàn
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (e) {
      console.error(`❌ [${packageName}] Lỗi khi kill app: ${e.message}`);
    }
  }

  // FIX: Thêm async và execSync
  static async launch(placeId, linkCode = null, packageName) {
    const url = linkCode
      ? `roblox://placeID=${placeId}&linkCode=${linkCode}`
      : `roblox://placeID=${placeId}`;
    
    console.log(`🚀 [${packageName}] Đang mở: ${url}`);
    if (linkCode) console.log(`✨ [${packageName}] Đã join bằng linkCode: ${linkCode}`);

    let activity;
    if (packageName === "com.roblox.client") {
      activity = "com.roblox.client.ActivityProtocolLaunch";
    } else if (packageName === "com.roblox.client.vnggames") {
      activity = "com.roblox.client.ActivityProtocolLaunch";
    } else {
      activity = "com.roblox.client.ActivityProtocolLaunch";
    }

    const command = `am start -n ${packageName}/${activity} -a android.intent.action.VIEW -d "${url}" --activity-clear-top`;
    
    try {
      execSync(command, { stdio: 'pipe' });
      console.log(`✅ [${packageName}] Launch command executed!`);
    } catch (e) {
      console.error(`❌ [${packageName}] Launch failed: ${e.message}`);
    }
  }

  static ask(rl, msg) {
    return new Promise((r) => rl.question(msg, r));
  }

  static saveMultiConfigs(configs) {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(configs, null, 2));
      console.log(`💾 Đã lưu multi configs tại ${CONFIG_PATH}`);
    } catch (e) {
      console.error(`❌ Không thể lưu configs: ${e.message}`);
    }
  }

  static loadMultiConfigs() {
    if (!fs.existsSync(CONFIG_PATH)) return {};
    try {
      const raw = fs.readFileSync(CONFIG_PATH);
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  static detectAllRobloxPackages() {
    const packages = {};
    
    try {
      const result = execSync("pm list packages | grep com.roblox", { encoding: 'utf8' });
      const lines = result.split('\n').filter(line => line.includes('com.roblox'));
      
      lines.forEach(line => {
        const match = line.match(/package:(com\.roblox[^\s]+)/);
        if (match) {
          const packageName = match[1];
          let displayName = packageName;
          
          if (packageName === 'com.roblox.client') {
            displayName = 'Roblox Quốc tế 🌍';
          } else if (packageName === 'com.roblox.client.vnggames') {
            displayName = 'Roblox VNG 🇻🇳';
          } else {
            displayName = `Roblox Custom (${packageName}) 🎮`;
          }
          
          packages[packageName] = {
            packageName,
            displayName
          };
        }
      });
    } catch (e) {
      console.error(`❌ Lỗi khi quét packages: ${e.message}`);
    }

    return packages;
  }

  static getRobloxCookie(packageName) {
    console.log(`🍪 [${packageName}] Đang lấy cookie ROBLOSECURITY...`);
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
        console.error(`❌ [${packageName}] Không thể đọc cookie bằng cả 2 cách.`);
        return null;
      }
    }

    const match = raw.match(/\.ROBLOSECURITY_([^\s\/]+)/);
    if (!match) {
      console.error(`❌ [${packageName}] Không tìm được cookie ROBLOSECURITY!`);
      return null;
    }

    let cookieValue = match[1].trim();
    if (!cookieValue.startsWith("_")) cookieValue = "_" + cookieValue;
    return `.ROBLOSECURITY=${cookieValue}`;
  }

  static async curlPastebinVisits() {
    try {
      const res = await axios.get("https://pastebin.com/Q9yk1GNq");
      const html = res.data;
      // Sửa lại regex: chỉ cần escape đúng cho regex literal
      const match = html.match(/<div class="visits"[^>]*>\s*([\d,.]+)\s*<\/div>/);
      if (match && match[1]) {
        return match[1].replace(/,/g, '');
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}

class GameLauncher {
  // FIX: Thêm async và await cho killApp/launch
  static async handleGameLaunch(shouldLaunch, placeId, linkCode, packageName, rejoinOnly = false) {
    if (shouldLaunch) {
      console.log(`🎯 [${packageName}] Starting launch process...`);
      
      if (!rejoinOnly) {
        // Đồng bộ kill app trước
        await Utils.killApp(packageName);
      } else {
        console.log(`⚠️ [${packageName}] RejoinOnly mode - không kill app`);
      }

      // Sau đó mới launch
      await Utils.launch(placeId, linkCode, packageName);
      
      console.log(`✅ [${packageName}] Launch process completed!`);
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
      console.log(`✅ Lấy info thành công cho ${name}!`);
      return this.userId;
    } catch (e) {
      console.error(`❌ Lỗi xác thực người dùng:`, e.message);
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
      "1": ["126884695634066", "Grow-a-Garden 🌱"],
      "2": ["2753915549", "Blox-Fruits 🍇"],
      "3": ["6284583030", "Pet-Simulator-X 🐾"],
      "4": ["126244816328678", "DIG ⛏️"],
      "5": ["116495829188952", "Dead-Rails-Alpha 🚂"],
      "6": ["8737602449", "PLS-DONATE 💰"],
      "0": ["custom", "Tùy chỉnh ⚙️"],
    };
  }

  async chooseGame(rl) {
    console.log(`\n🎮 Chọn game:`);
    for (let k in this.GAMES) {
      console.log(`${k}. ${this.GAMES[k][1]} (${this.GAMES[k][0]})`);
    }

    const ans = (await Utils.ask(rl, "Nhập số: ")).trim();

    if (ans === "0") {
      const sub = (await Utils.ask(rl, "0.1 ID thủ công | 0.2 Link private redirect: ")).trim();
      if (sub === "1") {
        const pid = (await Utils.ask(rl, "Nhập Place ID: ")).trim();
        return { placeId: pid, name: "Tùy chỉnh ⚙️", linkCode: null };
      }
      if (sub === "2") {
        console.log("\n📎 Dán link redirect sau khi vào private server.");
        while (true) {
          const link = await Utils.ask(rl, "\nDán link redirect đã chuyển hướng: ");
          const m = link.match(/\/games\/(\d+)[^?]*\?[^=]*=([\w-]+)/);
          if (!m) {
            console.log(`❌ Link không hợp lệ!`);
            continue;
          }
          return {
            placeId: m[1],
            name: "Private Server 🔒",
            linkCode: m[2],
          };
        }
      }
      throw new Error(`❌ Không hợp lệ!`);
    }

    if (this.GAMES[ans]) {
      return {
        placeId: this.GAMES[ans][0],
        name: this.GAMES[ans][1],
        linkCode: null,
      };
    }

    throw new Error(`❌ Không hợp lệ!`);
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
        status: "Không rõ ❓",
        info: "Không lấy được trạng thái hoặc thiếu rootPlaceId",
        shouldLaunch: true, // Always try to rejoin when presence is unclear
        rejoinOnly: false
      };
    }

    // User is offline or away
    if (presence.userPresenceType === 0 || presence.userPresenceType === 1) {
      return {
        status: "Offline 💤", 
        info: "User offline! Tiến hành rejoin! 🚀",
        shouldLaunch: true, // Always rejoin when offline
        rejoinOnly: false
      };
    }

    // User is not in game (online but not playing)
    if (presence.userPresenceType !== 2) {
      return {
        status: "Không online 😴",
        info: "User không trong game. Đã mở lại game! 🎮",
        shouldLaunch: true, // Always rejoin when not in game
        rejoinOnly: false
      };
    }

    // User is in game but wrong place
    if (!presence.rootPlaceId || presence.rootPlaceId.toString() !== targetRootPlaceId.toString()) {
      return {
        status: "Sai map 🗺️",
        info: `User đang trong game nhưng sai rootPlaceId (${presence.rootPlaceId}). Đã rejoin đúng map! 🎯`,
        shouldLaunch: true,
        rejoinOnly: true
      };
    }

    // User is in correct game
    return {
      status: "Online ✅",
      info: "Đang ở đúng game 🎮",
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

    const totalGB = (totalMem / (1024 ** 3)).toFixed(2);
    const usedGB = (usedMem / (1024 ** 3)).toFixed(2);

    return {
      cpuUsage,
      ramUsage: `${usedGB}GB/${totalGB}GB`
    };
  }

  static renderTitle() {
    const fallbackTitle = `
╔══════════════════════════════════════╗
║        🚀  DAWN REJOIN 🚀           ║
║    Bản quyền thuộc về The Real Dawn  ║
╚══════════════════════════════════════╝`;

    try {
      const title = figlet.textSync("Multi Dawn", {
        font: "Small",
        horizontalLayout: "fitted",
        verticalLayout: "fitted"
      });

      return boxen(title + "\nBản quyền thuộc về The Real Dawn", {
        padding: 1,
        borderColor: "cyan",
        borderStyle: "round",
        align: "center"
      });
    } catch (e) {
      return fallbackTitle;
    }
  }

  static calculateOptimalColumnWidths() {
    const terminalWidth = process.stdout.columns || 120;
    const availableWidth = terminalWidth - 10;

    const minWidths = {
      package: 15,
      user: 8,
      status: 8,
      info: 15,
      time: 8,
      delay: 6
    };

    const totalMinWidth = Object.values(minWidths).reduce((sum, width) => sum + width, 0);

    if (availableWidth <= totalMinWidth) {
      return {
        package: 14,
        user: 6,
        status: 6,
        info: 12,
        time: 6,
        delay: 4
      };
    }

    const extraSpace = availableWidth - totalMinWidth;

    return {
      package: minWidths.package + Math.floor(extraSpace * 0.28),
      user: minWidths.user + Math.floor(extraSpace * 0.18),
      status: minWidths.status + Math.floor(extraSpace * 0.12),
      info: minWidths.info + Math.floor(extraSpace * 0.3),
      time: minWidths.time + Math.floor(extraSpace * 0.06),
      delay: minWidths.delay + Math.floor(extraSpace * 0.06)
    };
  }

  static renderMultiInstanceTable(instances) {
    const stats = this.getSystemStats();
    const colWidths = this.calculateOptimalColumnWidths();

    const cpuRamLine = `💻 CPU: ${stats.cpuUsage}% | 🧠 RAM: ${stats.ramUsage} | 🔥 Instances: ${instances.length}`;

    const table = new Table({
      head: ["Package", "User", "Status", "Info", "Time", "Delay"],
      colWidths: [
        colWidths.package,
        colWidths.user,
        colWidths.status,
        colWidths.info,
        colWidths.time,
        colWidths.delay
      ],
      wordWrap: true,
      style: {
        head: ["cyan"],
        border: ["gray"]
      }
    });

    instances.forEach(instance => {
      let packageDisplay;
      if (instance.packageName === 'com.roblox.client') {
        packageDisplay = 'Global 🌍';
      } else if (instance.packageName === 'com.roblox.client.vnggames') {
        packageDisplay = 'VNG 🇻🇳';
      } else {
        packageDisplay = instance.packageName;
      }

      const rawUsername = instance.config.username || instance.user.username || 'Unknown';
      const username = rawUsername.length > 3 ?
        '*'.repeat(rawUsername.length - 3) + rawUsername.slice(-3) :
        rawUsername;

      const delaySeconds = Number(instance.countdownSeconds) || 0;

      table.push([
        packageDisplay,
        username,
        instance.status,
        instance.info,
        new Date().toLocaleTimeString(),
        this.formatCountdown(delaySeconds)
      ]);
    });

    return `${cpuRamLine}\n${table.toString()}`;
  }

  static formatCountdown(seconds) {
    return seconds >= 60
      ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
      : `${seconds}s`;
  }

  static displayConfiguredPackages(configs) {
    const colWidths = this.calculateOptimalColumnWidths();

    const table = new Table({
      head: ["STT", "Package", "Username", "Game", "Delay"],
      colWidths: [5, 20, 15, 20, 8],
      style: {
        head: ["cyan"],
        border: ["gray"]
      }
    });

    let index = 1;
    for (const [packageName, config] of Object.entries(configs)) {
      let packageDisplay;
      if (packageName === 'com.roblox.client') {
        packageDisplay = 'Global 🌍';
      } else if (packageName === 'com.roblox.client.vnggames') {
        packageDisplay = 'VNG 🇻🇳';
      } else {
        packageDisplay = packageName;
      }

      const maskedUsername = config.username.length > 3 ?
        '*'.repeat(config.username.length - 3) + config.username.slice(-3) :
        config.username;

      table.push([
        index.toString(),
        packageDisplay,
        maskedUsername,
        config.gameName || 'Unknown',
        `${config.delaySec}s`
      ]);
      index++;
    }

    return table.toString();
  }
}

class MultiRejoinTool {
  constructor() {
    this.instances = [];
    this.isRunning = false;
  }

  async start() {
    Utils.ensureRoot();
    Utils.enableWakeLock();

    console.clear();
    let visitCount = null;
    try {
      visitCount = await Utils.curlPastebinVisits();
    } catch {}
    try {
      console.log(UIRenderer.renderTitle());
    } catch (e) {
      console.log(`
╔══════════════════════════════════════╗
║        🚀   DAWN REJOIN   🚀        ║
║    Bản quyền thuộc về The Real Dawn  ║
╚══════════════════════════════════════╝`);
    }
    if (visitCount) {
      console.log(`\nTổng lượt chạy: ${visitCount}`);
    }
    console.log("\n🎯 Multi-Instance Roblox Rejoin Tool");
    console.log("1. 🚀 Bắt đầu auto rejoin");
    console.log("2. ⚙️ Setup packages");

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const choice = await Utils.ask(rl, "\nChọn option (1-2): ");

    if (choice.trim() === "1") {
      await this.startAutoRejoin(rl);
      rl.close();
    } else if (choice.trim() === "2") {
      await this.setupPackages(rl);
      rl.close();
    } else {
      console.log("❌ Lựa chọn không hợp lệ!");
      rl.close();
      // Quay lại menu thay vì exit
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.start();
    }
  }

  async setupPackages(rl) {
    console.log("\n🔍 Đang quét tất cả packages Roblox...");
    const packages = Utils.detectAllRobloxPackages();
    
    if (Object.keys(packages).length === 0) {
      console.log("❌ Không tìm thấy package Roblox nào!");
      return;
    }

    console.log("\n📦 Tìm thấy các packages:");
    console.log("0. 🚀 Setup tất cả packages");
    const packageList = [];
    Object.values(packages).forEach((pkg, index) => {
      console.log(`${index + 1}. ${pkg.displayName} (${pkg.packageName})`);
      packageList.push({ packageName: Object.keys(packages)[index], packageInfo: pkg });
    });

    const choice = await Utils.ask(rl, "\nChọn packages để setup (0 để setup tất cả, hoặc số cách nhau bởi khoảng trắng): ");
    let selectedPackages = [];

    if (choice.trim() === "0") {
      selectedPackages = packageList;
      console.log("🚀 Sẽ setup tất cả packages!");
    } else {
      const indices = choice
        .trim()
        .split(/\s+/)
        .map(str => parseInt(str) - 1)
        .filter(i => i >= 0 && i < packageList.length);

      if (indices.length === 0) {
        console.log("❌ Lựa chọn không hợp lệ!");
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.setupPackages(rl);
        return;
      }

      selectedPackages = indices.map(i => packageList[i]);
      console.log(`🎯 Sẽ setup các packages:`);
      selectedPackages.forEach((pkg, i) => {
        console.log(`  - ${i + 1}. ${pkg.packageInfo.displayName}`);
      });
    }

    const configs = Utils.loadMultiConfigs();
    
    for (const { packageName, packageInfo } of selectedPackages) {
      console.clear();
      console.log(UIRenderer.renderTitle());
      console.log(`\n⚙️ Cấu hình cho ${packageInfo.displayName}`);
      
      const cookie = Utils.getRobloxCookie(packageName);
      if (!cookie) {
        console.log(`❌ Không lấy được cookie cho ${packageName}, bỏ qua...`);
        continue;
      }

      const user = new RobloxUser(null, null, cookie);
      const userId = await user.fetchAuthenticatedUser();
      
      if (!userId) {
        console.log(`❌ Không lấy được user info cho ${packageName}, bỏ qua...`);
        continue;
      }

      console.log(`👤 Username: ${user.username}`);
      console.log(`🆔 User ID: ${userId}`);

      const selector = new GameSelector();
      const game = await selector.chooseGame(rl);

      let delaySec;
      while (true) {
        const input = parseInt(await Utils.ask(rl, "⏱️ Delay check (giây, 15-120): ")) || 1;
        if (input >= 15 && input <= 120) {
          delaySec = input;
          break;
        }
        console.log("❌ Giá trị không hợp lệ! Vui lòng nhập lại.");
      }

      configs[packageName] = {
        username: user.username,
        userId,
        placeId: game.placeId,
        gameName: game.name,
        linkCode: game.linkCode,
        delaySec,
        packageName
      };

      console.log(`✅ Đã cấu hình xong cho ${packageInfo.displayName}!`);
    }

    Utils.saveMultiConfigs(configs);
    console.log("\n✅ Setup hoàn tất!");
    
    // Quay lại menu chính thay vì exit
    console.log("\n⏳ Đang quay lại menu chính...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.start(); // Gọi lại menu chính
  }

async startAutoRejoin(rl) {
  const configs = Utils.loadMultiConfigs();

  if (Object.keys(configs).length === 0) {
    console.log("❌ Chưa có config nào! Vui lòng chạy setup packages trước.");
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.start();
    return;
  }

  console.log("\n📋 Danh sách packages đã cấu hình:");
  console.log(UIRenderer.displayConfiguredPackages(configs));

  console.log("\n🎯 Chọn packages để chạy:");
  console.log("0. 🚀 Chạy tất cả packages");

  let index = 1;
  const packageList = [];
  for (const [packageName, config] of Object.entries(configs)) {
    let packageDisplay;
    if (packageName === 'com.roblox.client') {
      packageDisplay = 'Global 🌍';
    } else if (packageName === 'com.roblox.client.vnggames') {
      packageDisplay = 'VNG 🇻🇳';
    } else {
      packageDisplay = packageName;
    }

    console.log(`${index}. ${packageDisplay} (${config.username})`);
    packageList.push(packageName);
    index++;
  }

  const choice = await Utils.ask(rl, "\nNhập lựa chọn (0 để chạy tất cả, hoặc số cách nhau bởi khoảng trắng): ");
  let selectedPackages = [];

  if (choice.trim() === "0") {
    selectedPackages = Object.keys(configs);
    console.log("🚀 Sẽ chạy tất cả packages!");
  } else {
    const indices = choice
      .trim()
      .split(/\s+/)
      .map(str => parseInt(str) - 1)
      .filter(i => i >= 0 && i < packageList.length);

    if (indices.length === 0) {
      console.log("❌ Lựa chọn không hợp lệ!");
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.startAutoRejoin(rl);
      return;
    }

    selectedPackages = indices.map(i => packageList[i]);
    console.log(`🎯 Sẽ chạy các packages:`);
    selectedPackages.forEach((pkg, i) => {
      console.log(`  - ${i + 1}. ${pkg}`);
    });
  }

  console.log("\n🚀 Khởi tạo multi-instance rejoin...");
  await this.initializeSelectedInstances(selectedPackages, configs);
}
  // NEW: Method để khởi tạo chỉ các packages được chọn
  async initializeSelectedInstances(selectedPackages, configs) {
    // Initialize instances chỉ cho các packages được chọn
    for (const packageName of selectedPackages) {
      const config = configs[packageName];
      const cookie = Utils.getRobloxCookie(packageName);
      
      if (!cookie) {
        console.log(`❌ Không lấy được cookie cho ${packageName}, bỏ qua...`);
        continue;
      }

      const user = new RobloxUser(config.username, config.userId, cookie);
      const statusHandler = new StatusHandler();

      this.instances.push({
        packageName,
        user,
        config,
        statusHandler,
        status: "Khởi tạo... 🔄",
        info: "Đang chuẩn bị...",
        countdown: "00s",
        lastCheck: 0,
        presenceType: "Unknown"
      });
    }

    if (this.instances.length === 0) {
      console.log("❌ Không có instance nào khả dụng!");
      return;
    }

    console.log(`✅ Đã khởi tạo ${this.instances.length} instances!`);
    console.log("⏳ Bắt đầu auto rejoin trong 3 giây...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    this.isRunning = true;
    await this.runMultiInstanceLoop();
  }

async runMultiInstanceLoop() {
  let renderCounter = 0;

  while (this.isRunning) {
    const now = Date.now();

    for (const instance of this.instances) {
      const { config, user, statusHandler } = instance;
      const delayMs = config.delaySec * 1000;

      const timeSinceLastCheck = now - instance.lastCheck;

      // Đếm ngược còn bao nhiêu giây nữa thì check lại
      const timeLeft = Math.max(0, delayMs - timeSinceLastCheck);
      instance.countdownSeconds = Math.ceil(timeLeft / 1000);

      // Nếu đủ thời gian thì check
      if (timeSinceLastCheck >= delayMs) {
        const presence = await user.getPresence();

        // Ghi lại type để hiển thị
        let presenceTypeDisplay = "Unknown";
        if (presence && presence.userPresenceType !== undefined) {
          presenceTypeDisplay = presence.userPresenceType.toString();
        }

        const analysis = statusHandler.analyzePresence(presence, config.placeId);

        if (analysis.shouldLaunch) {
          GameLauncher.handleGameLaunch(
            analysis.shouldLaunch,
            config.placeId,
            config.linkCode,
            config.packageName,
            analysis.rejoinOnly
          );
          statusHandler.updateJoinStatus(analysis.shouldLaunch);
        }

        instance.status = analysis.status;
        instance.info = analysis.info;
        instance.presenceType = presenceTypeDisplay;
        instance.lastCheck = now;
      }

      // Nếu chưa check lần nào hoặc chưa set presenceType thì giữ "Unknown"
      if (!instance.presenceType) {
        instance.presenceType = "Unknown";
      }
    }

    if (renderCounter % 5 === 0) {
      console.clear();
      try {
        console.log(UIRenderer.renderTitle());
      } catch (e) {
      console.log(`
╔══════════════════════════════════════╗
║        🚀   DAWN REJOIN   🚀        ║
║    Bản quyền thuộc về The Real Dawn  ║
╚══════════════════════════════════════╝`);
      }

      console.log(UIRenderer.renderMultiInstanceTable(this.instances));

      if (this.instances.length > 0) {
        console.log("\n🔍 Debug (Instance 1):");
        console.log(`Package: ${this.instances[0].packageName}`);
        console.log(`Last Check: ${new Date(this.instances[0].lastCheck).toLocaleTimeString()}`);
      }

      console.log("\n💡 Nhấn Ctrl+C để dừng chương trình");
    }

    renderCounter++;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Đang dừng chương trình...');
  console.log('👋 Cảm ơn bạn đã sử dụng Dawn Rejoin Tool!');
  process.exit(0);
});

// Main execution
(async () => {
  const tool = new MultiRejoinTool();
  await tool.start();
})();