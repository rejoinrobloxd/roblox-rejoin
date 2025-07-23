import { execSync } from "child_process";
import fs from "fs";

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

    const npmCache = "/data/data/com.termux/files/usr/tmp/.npm-cache";
    const PATH = `${process.env.PATH}:/data/data/com.termux/files/usr/bin`;

    // 🔁 Xoá cache lỗi nếu có
    if (fs.existsSync(npmCache)) {
      try {
        fs.rmSync(npmCache, { recursive: true, force: true });
        console.log("🧹 Đã xoá cache npm lỗi");
      } catch (e) {
        console.error("❌ Không thể xoá cache:", e.message);
      }
    }
    fs.mkdirSync(npmCache, { recursive: true });

    try {
      execSync(
        `npm install ${missing.join(" ")} --prefer-offline --no-audit --no-fund`,
        {
          stdio: "inherit",
          env: {
            ...process.env,
            PATH,
            npm_config_cache: npmCache,
          },
        }
      );
    } catch (e) {
      console.error("❌ Không thể cài package:", e.message);
      process.exit(1);
    }
  }
}
