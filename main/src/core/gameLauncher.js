class GameLauncher {
  static handleGameLaunch(shouldLaunch, placeId, linkCode, packageName) {
    if (shouldLaunch) {
      Utils.killApp(packageName);
      Utils.launch(placeId, linkCode, packageName);
    }
  }
}