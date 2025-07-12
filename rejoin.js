#!/usr/bin/env node

const axios = require("axios");
const readline = require("readline");
const { execSync, exec } = require("child_process");

function ensurePackages() {
  ["axios"].forEach((pkg) => {
    try { require.resolve(pkg) }
    catch {
      console.log(`📦 Đang cài package thiếu: ${pkg}`);
      execSync(`npm install ${pkg}`, { stdio: "inherit" });
    }
  });
}

function ensureRoot() {
  try {
    const uid = execSync("id -u").toString().trim();
    if (uid !== "0") {
      const node = execSync("which node").toString().trim();
      console.log("🔐 Cần root, chuyển qua su...");
      execSync(`su -c "${node} ${__filename}"`, { stdio: "inherit" });
      process.exit(0);
    }
  } catch (e) {
    console.error("❌ Không thể chạy root:", e.message);
    process.exit(1);
  }
}

function enableWakeLock() {
  try { exec("termux-wake-lock"); console.log("💤 Wake lock bật") }
  catch { console.warn("⚠️ Không bật wake lock") }
}

async function getUserId(u) {
  try {
    const r = await axios.post("https://users.roblox.com/v1/usernames/users", {
      usernames: [u], excludeBannedUsers: false
    });
    return r.data.data?.[0]?.id || null;
  } catch (e) {
    console.error("❌ Lấy userID lỗi:", e.message);
    return null;
  }
}

async function getPresence(id) {
  try {
    const r = await axios.post("https://presence.roblox.com/v1/presence/users", { userIds: [id] });
    return r.data.userPresences?.[0];
  } catch { return null }
}

function killApp() { exec("am force-stop com.roblox.client") }

function launch(placeId, linkCode = null) {
  const url = linkCode
    ? `roblox://placeID=${placeId}&linkCode=${linkCode}`
    : `roblox://placeID=${placeId}`;
  console.log(`🚀 Đang mở: ${url}`);
  if (linkCode) console.log(`🔗 Đã join bằng linkCode: ${linkCode}`);
  exec(`am start -a android.intent.action.VIEW -d "${url}"`);
}

const GAMES = {
  "1": ["126884695634066","Grow-a-Garden"],
  "2": ["2753915549","Blox-Fruits"],
  "3": ["6284583030","Pet-Simulator-X"],
  "4": ["126244816328678","DIG"],
  "5": ["116495829188952","Dead-Rails-Alpha"],
  "6": ["8737602449","PLS-DONATE"],
  "0": ["custom","🔧 Tùy chỉnh"],
};

function question(rl,msg){ return new Promise(r=>rl.question(msg,r)) }

async function chooseGame(rl) {
  console.log("🎮 Chọn game:");
  for (let k in GAMES) console.log(`${k}. ${GAMES[k][1]} (${GAMES[k][0]})`);

  const ans = (await question(rl,"Nhập số: ")).trim();
  if (ans === "0") {
    const sub = (await question(rl,"0.1 ID thủ công | 0.2 Link private redirect: ")).trim();
    if (sub === "1") {
      const pid = (await question(rl,"🔢 Nhập Place ID: ")).trim();
      return { placeId: pid, name: "Tùy chỉnh", linkCode: null };
    }
  if (sub === "2") {
    console.log("\n💡 Hướng dẫn: Copy link private server gốc từ Roblox, dán vào trình duyệt.\n→ Khi nó tự redirect sang trang có dạng 'roblox.com/games/<place-id>/<tên game>?privateServerLinkCode=<code>', hãy copy link đó rồi dán vào đây.");
    const link = await question(rl, "\n🔗 Dán link redirect đã chuyển hướng: ");
    const m = link.match(/\/games\/(\d+)[^?]*\?[^=]*=([\w-]+)/);
      if (!m) throw new Error("❌ Link không hợp lệ! Phải là dạng redirect");

  return {
    placeId: m[1],
    name: "Private Server",
    linkCode: m[2],
  };
}
    throw new Error("❌ Không hợp lệ!");
  }

  if (GAMES[ans]) {
    return { placeId: GAMES[ans][0], name: GAMES[ans][1], linkCode: null };
  }

  throw new Error("❌ Không hợp lệ!");
}

(async () => {
  ensurePackages();
  ensureRoot();
  enableWakeLock();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.clear();
  console.log("== Rejoin Tool (Node.js version) ==");

  const username = await question(rl, "👤 Nhập username Roblox: ");
  const userId = await getUserId(username.trim());
  if (!userId) {
    console.error("❌ Không tìm thấy user ID");
    rl.close();
    return;
  }
  console.log(`✅ User ID: ${userId}`);

  const game = await chooseGame(rl);
  const delayMin = parseInt(await question(rl, "⏱️ Delay check (phút): "));
  rl.close();

  const delayMs = Math.max(1, delayMin) * 60 * 1000;
  console.clear();
  console.log(`👤 ${username} | 🎮 ${game.name} (${game.placeId})`);
  console.log(`🔁 Auto-check mỗi ${delayMin} phút`);

  let joinedAt = 0;
  let hasLaunched = false;

  while (true) {
    const presence = await getPresence(userId);
    const now = Date.now();
    let msg = "";

    console.debug("[DEBUG]", JSON.stringify(presence, null, 2));

    if (!presence) {
      msg = "⚠️ Không lấy được trạng thái";
    } else if (presence.userPresenceType !== 2) {
      msg = "👋 User không online";
      if (!hasLaunched || now - joinedAt > 30_000) {
        killApp();
        launch(game.placeId, game.linkCode);
        joinedAt = now;
        hasLaunched = true;
        msg += " → Đã mở lại game!";
      } else {
        msg += " (đợi thêm chút để tránh spam)";
      }
    } else if (!presence.placeId) {
      msg = `⏳ Chưa có thông tin game (placeId=null), đợi thêm...`;
    } else if (`${presence.placeId}` !== `${game.placeId}`) {
      msg = `⚠️ Đang ở sai game (${presence.placeId})`;
      if (now - joinedAt > 30_000) {
        killApp();
        launch(game.placeId, game.linkCode);
        joinedAt = now;
        hasLaunched = true;
        msg += " → Rejoin lại!";
      } else {
        msg += " (chờ delay để tránh spam)";
      }
    } else {
      msg = "✅ Đang đúng game rồi!";
      joinedAt = now;
      hasLaunched = true;
    }

    console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
})();
