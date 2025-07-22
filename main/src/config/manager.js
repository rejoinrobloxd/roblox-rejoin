
import {
  loadConfig,
  printConfig,
  detectRobloxVersions,
  ask
} from '../utils/index.js';

class ConfigManager {
  static async handleExistingConfig(rl) {
    const saved = loadConfig();
    if (!saved) return null;

    const versions = detectRobloxVersions();
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

    printConfig(saved);
    const useOld = (await ask(rl, "Dùng lại config trước đó? (y/N): ")).trim().toLowerCase();
    
    if (useOld === "y") {
      return saved;
    }
    return null;
  }

  static async getDelayFromUser(rl) {
    while (true) {
      const delaySec = parseInt(await ask(rl, "Delay check (giây, 15-120): ")) || 1;
      if (delaySec >= 15 && delaySec <= 120) {
        return delaySec;
      }
      console.log("Giá trị không hợp lệ! Vui lòng nhập lại.");
    }
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
}

export default ConfigManager;