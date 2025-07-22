
import { killApp, launch } from '../utils/index.js';

class GameLauncher {
  static handleGameLaunch(shouldLaunch, placeId, linkCode, packageName) {
    if (shouldLaunch) {
      killApp(packageName);
      launch(placeId, linkCode, packageName);
    }
  }
}

export default GameLauncher;