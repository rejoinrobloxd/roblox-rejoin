#!/bin/bash

# ⚙️ Cấu hình
TMP_PATH="./.rejoin-cache.js"
RAW_URL="https://raw.githubusercontent.com/NhinQuanhLanCuoi9999/roblox-rejoin/main/rejoin.js"
LOADER_PATH="/data/data/com.termux/files/usr/bin/loader"

# ♻️ Xoá loader cũ nếu có
if [ -f "$LOADER_PATH" ]; then
  echo "♻️ Đang xoá loader cũ ở $LOADER_PATH..."
  rm -f "$LOADER_PATH" && echo "✅ Đã xoá loader cũ!" || echo "⚠️ Không thể xoá loader cũ!"
fi

# 🛠️ Tạo loader mới mỗi lần chạy
echo "🛠️ Đang tạo loader mới ở $LOADER_PATH..."
cp "$0" "$LOADER_PATH" && chmod +x "$LOADER_PATH"
echo "✅ Loader đã được cập nhật lại!"
echo "👉 Từ lần sau chỉ cần gõ: loader"

# 🔥 Xoá cache cũ nếu có
if [ -f "$TMP_PATH" ]; then
  rm -f "$TMP_PATH" && echo "🧹 Đã xoá cache cũ!" || echo "⚠️ Không thể xoá cache cũ!"
fi

# 🌐 Tải file mới từ GitHub
echo "🌍 Đang tải file từ GitHub..."
curl -fsSL -H "Cache-Control: no-cache" "$RAW_URL" -o "$TMP_PATH"

if [ $? -ne 0 ]; then
  echo "❌ Lỗi khi tải file!"
  exit 1
fi

# 🔐 Cấp quyền cho thư mục home
chmod u+rw ~ && echo "✅ Đã cấp quyền đọc/ghi cho ~" || echo "⚠️ Không thể chỉnh quyền cho thư mục ~"

# 🧠 Kiểm tra Node.js
NODE_PATH="/data/data/com.termux/files/usr/bin/node"
if [ ! -x "$NODE_PATH" ]; then
  # 👇 Cài which để tránh lỗi
  pkg install -y which > /dev/null 2>&1
  NODE_PATH=$(which node)
fi

if [ -z "$NODE_PATH" ]; then
  echo "📦 Node.js chưa có, đang cài đặt..."
  pkg update -y && pkg upgrade -y
  pkg install -y nodejs

  NODE_PATH=$(which node)
  if [ -z "$NODE_PATH" ]; then
    echo "❌ Không thể cài Node.js"
    exit 1
  else
    echo "✅ Node.js đã được cài xong!"
  fi
fi

# 🚀 Chạy script bằng Node
echo "🚀 Đang chạy script bằng Node..."
"$NODE_PATH" "$TMP_PATH"
