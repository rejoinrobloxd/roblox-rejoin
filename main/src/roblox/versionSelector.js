class RobloxVersionSelector {
  static async selectVersion(rl) {
    const versions = Utils.detectRobloxVersions();
    
    if (Object.keys(versions).length === 0) {
      console.error("Không tìm thấy Roblox nào được cài đặt!");
      process.exit(1);
    }

    if (Object.keys(versions).length === 1) {
      const versionKey = Object.keys(versions)[0];
      const version = versions[versionKey];
      console.log(`Chỉ tìm thấy: ${version.displayName}`);
      return {
        robloxVersion: versionKey,
        packageName: version.packageName
      };
    }

    console.log("\nTìm thấy các phiên bản Roblox:");
    let index = 1;
    const versionList = [];
    
    for (const [key, version] of Object.entries(versions)) {
      console.log(`${index}. ${version.displayName} (${version.packageName})`);
      versionList.push({ key, ...version });
      index++;
    }

    while (true) {
      const choice = await Utils.ask(rl, "\nChọn phiên bản Roblox (nhập số): ");
      const choiceNum = parseInt(choice.trim());
      
      if (choiceNum >= 1 && choiceNum <= versionList.length) {
        const selected = versionList[choiceNum - 1];
        console.log(`Đã chọn: ${selected.displayName}`);
        return {
          robloxVersion: selected.key,
          packageName: selected.packageName
        };
      }
      
      console.log("Lựa chọn không hợp lệ! Vui lòng thử lại.");
    }
  }
}

export default RobloxVersionSelector;