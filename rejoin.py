import requests
import subprocess
import time
import re
import sys

GAMES = {
    "1": ["126884695634066", "Grow-a-Garden"],
    "2": ["2753915549", "Blox-Fruits"],
    "3": ["6284583030", "Pet-Simulator-X"],
    "4": ["126244816328678", "DIG"],
    "5": ["116495829188952", "Dead-Rails-Alpha"],
    "6": ["8737602449", "PLS-DONATE"],
    "0": ["custom", "🔧 Tùy chỉnh"]
}


def enable_wake_lock():
    try:
        subprocess.call(["termux-wake-lock"])
        print("💤 Wake lock đã bật (chống sleep)")
    except Exception:
        print("⚠️ Không bật được wake lock")


def get_user_id(username):
    try:
        res = requests.post("https://users.roblox.com/v1/usernames/users", json={
            "usernames": [username],
            "excludeBannedUsers": False
        })
        return res.json().get("data", [{}])[0].get("id")
    except Exception as e:
        print("❌ Không lấy được user ID:", str(e))
        return None


def get_presence(user_id):
    try:
        res = requests.post("https://presence.roblox.com/v1/presence/users", json={
            "userIds": [user_id]
        })
        return res.json().get("userPresences", [{}])[0]
    except Exception:
        return None


def kill_app():
    subprocess.call(["am", "force-stop", "com.roblox.client"])


def launch(place_id, link_code=None):
    url = f"roblox://placeID={place_id}"
    if link_code:
        url += f"&linkCode={link_code}"
    subprocess.call(["am", "start", "-a", "android.intent.action.VIEW", "-d", url])


def is_running():
    try:
        pid = subprocess.check_output(["pidof", "com.roblox.client"]).decode().strip()
        return len(pid) > 0
    except subprocess.CalledProcessError:
        return False


def choose_game():
    print("🎮 Chọn game:")
    for key in GAMES:
        print(f"{key}. {GAMES[key][1]} ({GAMES[key][0]})")
    ans = input("Nhập số: ").strip()

    if ans == "0":
        sub = input("0.1 ID thủ công | 0.2 Link private: ").strip()
        if sub == "1":
            pid = input("🔢 Nhập Place ID: ").strip()
            return {"placeId": pid, "name": "Tùy chỉnh", "linkCode": None}
        elif sub == "2":
            link = input("🔗 Dán link private server: ")
            match = re.search(r"/games/(\d+).*privateServerLinkCode=([\w-]+)", link)
            if not match:
                raise Exception("❌ Link không hợp lệ!")
            return {"placeId": match[1], "name": "Private Server", "linkCode": match[2]}
        else:
            raise Exception("❌ Không hợp lệ")
    elif ans in GAMES:
        return {"placeId": GAMES[ans][0], "name": GAMES[ans][1], "linkCode": None}
    else:
        raise Exception("❌ Không hợp lệ")


def main():
    enable_wake_lock()
    print("== Rejoin Tool (Python version) ==")

    username = input("👤 Nhập username Roblox: ").strip()
    user_id = get_user_id(username)

    if not user_id:
        print("❌ Không tìm thấy user ID")
        return

    print(f"✅ User ID: {user_id}")
    game = choose_game()
    delay_min = int(input("⏱️ Delay check (phút): "))
    delay_ms = max(1, delay_min) * 60

    print(f"👤 {username} | 🎮 {game['name']} ({game['placeId']})")
    print(f"🔁 Auto-check mỗi {delay_min} phút")

    joined_at = 0
    has_launched = False

    while True:
        presence = get_presence(user_id)
        now = time.time()
        msg = ""

        if not presence:
            msg = "⚠️ Không lấy được trạng thái"
        elif presence.get("userPresenceType") != 2:
            msg = "👋 User không online"

            if not has_launched or now - joined_at > 30:
                kill_app()
                launch(game['placeId'], game['linkCode'])
                joined_at = now
                has_launched = True
                msg += " → Đã mở lại game!"
            else:
                msg += " (đợi thêm chút để tránh spam)"
        elif str(presence.get("placeId")) != str(game['placeId']):
            msg = f"⚠️ Đang ở sai game ({presence.get('placeId')})"

            if now - joined_at > 30:
                kill_app()
                launch(game['placeId'], game['linkCode'])
                joined_at = now
                has_launched = True
                msg += " → Rejoin lại!"
            else:
                msg += " (chờ delay để tránh spam)"
        else:
            msg = "✅ Đang đúng game rồi!"
            joined_at = now
            has_launched = True

        print(f"[{time.strftime('%X')}] {msg}")

        time.sleep(delay_ms if msg.startswith("✅") else 5)


if __name__ == "__main__":
    main()