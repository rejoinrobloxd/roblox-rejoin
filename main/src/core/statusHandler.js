class StatusHandler {
  constructor() {
    this.hasLaunched = false;
    this.joinedAt = 0;
  }

  analyzePresence(presence, targetRootPlaceId) {
    const now = Date.now();

    if (!presence || presence.userPresenceType === undefined) {
      return {
        status: "Không rõ",
        info: "Không lấy được trạng thái hoặc thiếu rootPlaceId",
        shouldLaunch: false
      };
    }

    if (presence.userPresenceType === 0 || presence.userPresenceType === 1) {
      const shouldLaunch = !this.hasLaunched || now - this.joinedAt > 30000;
      return {
        status: "Offline",
        info: `User offline! ${shouldLaunch ? 'Tiến hành rejoin! 🚀' : 'Đợi thêm chút để tránh spam ⏰'}`,
        shouldLaunch
      };
    }

    if (presence.userPresenceType !== 2) {
      const shouldLaunch = !this.hasLaunched || now - this.joinedAt > 30000;
      return {
        status: "Không online",
        info: `User không trong game${shouldLaunch ? '. Đã mở lại game! 🎮' : ' (đợi thêm chút để tránh spam) ⏰'}`,
        shouldLaunch
      };
    }

    if (!presence.rootPlaceId || presence.rootPlaceId.toString() !== targetRootPlaceId.toString()) {
      return {
        status: "Sai map",
        info: `User đang trong game nhưng sai rootPlaceId (${presence.rootPlaceId}). Đã rejoin đúng map! 🎯`,
        shouldLaunch: true
      };
    }

    return {
      status: "Online ✅",
      info: "Đang ở đúng game.",
      shouldLaunch: false
    };
  }

  updateJoinStatus(shouldLaunch) {
    if (shouldLaunch) {
      this.joinedAt = Date.now();
      this.hasLaunched = true;
    }
  }
}

export default StatusHandler;