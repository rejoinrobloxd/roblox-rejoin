const { execSync, exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");
const Table = require("cli-table3");
const figlet = require("figlet");
const boxen = require("boxen").default || boxen;

const CONFIG_PATH = path.join(__dirname, "config.json");

class Utils {
  static ensurePackages() {
    const requiredPackages = ["axios", "cli-table3", "figlet", "boxen"];

    requiredPackages.forEach((pkg) => {
      try {
        require.resolve(pkg);
      } catch {
        console.log(`Installing missing package: ${pkg}`);
        try {
          execSync(`npm install ${pkg}`, { stdio: "inherit" });
        } catch (e) {
          console.error(`Error installing ${pkg}:`, e.message);
          process.exit(1);
        }
      }
    });
  }

  static saveConfig(config) {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      console.log(`Config saved at ${CONFIG_PATH}`);
    } catch (e) {
      console.error(`Unable to save config: ${e.message}`);
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
    console.log("\nPrevious configuration:");
    console.log(`Username: ${cfg.username}`);
    console.log(`UserID: ${cfg.userId}`);
    console.log(`Game: ${cfg.gameName} (${cfg.placeId})`);
    console.log(`Roblox Version: ${cfg.robloxVersion === 'international' ? 'International' : 'VNG'} (${cfg.packageName})`);
    if (cfg.linkCode) console.log(`Private link code: ${cfg.linkCode}`);
    console.log(`Delay: ${cfg.delaySec} seconds\n`);
  }

  static formatCountdown(seconds) {
    return seconds >= 60 
      ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` 
      : `${seconds}s`;
  }

  static getTerminalSize() {
    return {
      width: process.stdout.columns || 80,
      height: process.stdout.rows || 24
    };
  }
}

module.exports = Utils;