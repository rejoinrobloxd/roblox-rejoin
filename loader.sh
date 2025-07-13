#!/bin/bash


TMP_PATH="./.rejoin-cache.js"
RAW_URL="https://raw.githubusercontent.com/NhinQuanhLanCuoi9999/roblox-rejoin/main/rejoin.js"
LOADER_PATH="/data/data/com.termux/files/usr/bin/loader"

if [ ! -f "$LOADER_PATH" ]; then
  echo "Đang tạo loader lần đầu ở $LOADER_PATH..."


  cp "$0" "$LOADER_PATH" && chmod +x "$LOADER_PATH"

  echo "✅ Loader đã được tạo và set quyền thực thi!"
  echo "👉 Từ lần sau chỉ cần gõ: loader"
  exit 0
fi


if [ -f "$TMP_PATH" ]; then
  rm -f "$TMP_PATH" && echo "🧹 Đã xoá cache cũ!" || echo "⚠️ Không thể xoá cache cũ!"
fi


echo "🌍 Đang tải file từ GitHub..."
curl -fsSL "$RAW_URL" -o "$TMP_PATH"

if [ $? -ne 0 ]; then
  echo "❌ Lỗi khi tải file!"
  exit 1
fi


chmod u+rw ~ && echo "✅ Đã cấp quyền đọc/ghi cho ~" || echo "⚠️ Không thể chỉnh quyền cho thư mục ~"


NODE_PATH="/data/data/com.termux/files/usr/bin/node"

if [ ! -x "$NODE_PATH" ]; then
  NODE_PATH=$(which node)
fi

if [ -z "$NODE_PATH" ]; then
  echo "❌ Không tìm thấy Node.js! Cài lẹ đi bạn ơi."
  exit 1
fi

echo "🚀 Đang chạy script bằng Node..."
"$NODE_PATH" "$TMP_PATH"
