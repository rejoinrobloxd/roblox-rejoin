import { killApp, launch } from '../utils/index.js';

class GameLauncher {
  static handleGameLaunch(shouldLaunch, placeId, linkCode, packageName, rejoinOnly = false) {
    if (shouldLaunch) {
      if (!rejoinOnly) {
        killApp(packageName);
      } else {
        console.log("⚠️ [RejoinOnly] Không kill app, mở bằng roblox:// trực tiếp.");
      }

      launch(placeId, linkCode, packageName);
    }
  }
}

export default GameLauncher;
