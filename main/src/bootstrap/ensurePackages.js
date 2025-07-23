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
    try {
      execSync(`npm install ${missing.join(" ")}`, { stdio: "inherit" });
    } catch (e) {
      console.error("❌ Không thể cài package:", e.message);
      process.exit(1);
    }
  }
}
