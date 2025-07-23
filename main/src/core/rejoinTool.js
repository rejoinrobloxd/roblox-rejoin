// filepath: /roblox-rejoin/roblox-rejoin/src/core/rejoinTool.js
import readline from 'readline';
import {
  ensurePackages,
  saveConfig,
  loadConfig,
  printConfig,
  formatCountdown,
  getTerminalSize,
  ensureRoot,
  enableWakeLock,
  getRobloxCookie
} from '../utils/index.js';
import RobloxUser from '../roblox/user.js';
import GameSelector from '../roblox/gameSelector.js';
import ConfigManager from '../config/manager.js';
import StatusHandler from './statusHandler.js';
import GameLauncher from './gameLauncher.js';
import RobloxVersionSelector from '../roblox/versionSelector.js';
import UIRenderer from '../ui/renderer.js';

class RejoinTool {
  constructor() {
    ensurePackages();
    this.user = null;
    this.game = null;
    this.delayMs = 60000;
    this.statusHandler = new StatusHandler();
    this.robloxVersion = null;
    this.packageName = null;
  }

  async start() {
    ensureRoot();
    enableWakeLock();

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    console.clear();
    console.log("== Rejoin Tool (Node.js version) ==");

    const existingConfig = await ConfigManager.handleExistingConfig(rl);
    if (existingConfig) {
      rl.close();
      const cookie = getRobloxCookie(existingConfig.packageName);
      return this.initializeWithConfig(existingConfig, cookie);
    }

    const config = await this.setupNewConfig(rl);
    rl.close();
    if (!config) return;
    const cookie = getRobloxCookie(config.packageName);
    return this.initializeWithConfig(config, cookie);
  }

  async setupNewConfig(rl) {
    const versionInfo = await RobloxVersionSelector.selectVersion(rl);
    this.robloxVersion = versionInfo.robloxVersion;
    this.packageName = versionInfo.packageName;

    const cookie = getRobloxCookie(this.packageName);
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

    saveConfig(config);
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
      
      GameLauncher.handleGameLaunch(analysis.shouldLaunch, this.game.placeId, this.game.linkCode, this.packageName);
      this.statusHandler.updateJoinStatus(analysis.shouldLaunch);

      await this.runCountdown(analysis.status, analysis.info, presence);
    }
  }

  async runCountdown(status, info, presence) {
    const delaySec = Math.floor(this.delayMs / 1000);
    
    for (let i = delaySec; i >= 0; i--) {
      const countdownStr = formatCountdown(i);

      console.clear();
      console.log(UIRenderer.renderTitle());
      console.log(UIRenderer.smartRender(this.user.username, status, info, countdownStr, this.robloxVersion));
      console.log("\nDebug JSON:\n" + JSON.stringify(presence, null, 2));

      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

export default RejoinTool;