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
        shouldLaunch: false,
        rejoinOnly: false
      };
    }

    // Nếu offline hoặc kiểu 1 (not in game)
    if (presence.userPresenceType === 0 || presence.userPresenceType === 1) {
      const shouldLaunch = !this.hasLaunched || now - this.joinedAt > 30000;

      // Nếu kiểu 1: dùng roblox:// luôn để rejoin, không cần kill app
      const rejoinOnly = presence.userPresenceType === 1;

      return {
        status: presence.userPresenceType === 0 ? "Offline" : "Online (chưa vào game)",
        info: rejoinOnly
          ? `User online nhưng chưa vào game.`
          : `User offline! ${shouldLaunch ? 'Tiến hành rejoin! 🚀' : 'Đợi thêm chút để tránh spam ⏰'}`,
        shouldLaunch,
        rejoinOnly
      };
    }

    if (presence.userPresenceType !== 2) {
      const shouldLaunch = !this.hasLaunched || now - this.joinedAt > 30000;
      return {
        status: "Không online",
        info: `User không trong game${shouldLaunch ? '. Đã mở lại game! 🎮' : ' (đợi thêm chút để tránh spam) ⏰'}`,
        shouldLaunch,
        rejoinOnly: false
      };
    }

    if (!presence.rootPlaceId || presence.rootPlaceId.toString() !== targetRootPlaceId.toString()) {
      return {
        status: "Sai map",
        info: `User đang trong game nhưng sai rootPlaceId (${presence.rootPlaceId}). Đã rejoin đúng map! 🎯`,
        shouldLaunch: true,
        rejoinOnly: false
      };
    }

    return {
      status: "Online ✅",
      info: "Đang ở đúng game.",
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

export default StatusHandler;
