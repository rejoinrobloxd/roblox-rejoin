// filepath: bootstrap/ensurePackages.js
import { execSync } from "child_process";

export function ensurePackages() {
  const required = ["axios", "cli-table3", "figlet", "boxen"];
  const missing = [];

  for (const pkg of required) {
    try {
      require.resolve(pkg);
    } catch {
      missing.push(pkg);
    }
  }

  if (missing.length > 0) {
    console.log("🔧 Cài thiếu package. Đang cài:", missing.join(", "));

    // Gán lại PATH thủ công phòng trường hợp chạy trong su không có npm
    const customPath = process.env.PATH || "";
    const termuxPath = "/data/data/com.termux/files/usr/bin";
    const fullPath = customPath.includes(termuxPath)
      ? customPath
      : `${customPath}:${termuxPath}`;

    try {
      execSync(`npm install ${missing.join(" ")}`, {
        stdio: "inherit",
        env: { ...process.env, PATH: fullPath },
      });
    } catch (e) {
      console.error("❌ Không thể cài package:", e.message);
      process.exit(1);
    }
  }
}
