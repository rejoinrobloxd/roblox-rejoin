#!/bin/bash
# ⚙️ Cấu hình
TMP_PATH="./.rejoin-cache.js"
RAW_URL="https://raw.githubusercontent.com/NhinQuanhLanCuoi9999/roblox-rejoin/main/rejoin.js"
LOADER_PATH="/data/data/com.termux/files/usr/bin/loader"

# 🧠 Auto setup command 'loader' nếu chưa có
if [ ! -f "$LOADER_PATH" ]; then
    echo "🛠️ Đang tạo lệnh 'loader' để dùng cho lần sau..."
    cp "$0" "$LOADER_PATH" && chmod +x "$LOADER_PATH"
    if [ $? -eq 0 ]; then
        echo "✅ Đã tạo lệnh 'loader' thành công! Lần sau chỉ cần gõ: loader"
    else
        echo "❌ Không thể tạo lệnh 'loader', vui lòng chạy bằng tay!"
    fi
fi

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

# 🔥 Tự động gán node vào su
echo "🚀 Đang setup node cho su..."
SU_PATH=$(which su)
if [ -n "$SU_PATH" ]; then
    echo "📝 Tạo alias node cho su..."
    echo "alias node='$NODE_PATH'" >> ~/.bashrc
    echo "alias node='$NODE_PATH'" >> ~/.zshrc 2>/dev/null || true

    echo "🔧 Cập nhật PATH cho su..."
    echo "export PATH=\"$(dirname $NODE_PATH):\$PATH\"" >> ~/.bashrc
    echo "export PATH=\"$(dirname $NODE_PATH):\$PATH\"" >> ~/.zshrc 2>/dev/null || true

    source ~/.bashrc 2>/dev/null || true
    echo "✅ Node đã được gán vào su thành công! 🎉"
else
    echo "⚠️ Không tìm thấy su, nhưng vẫn có thể dùng node bình thường"
fi

# 🚀 Chạy script bằng Node
echo "🚀 Đang chạy script bằng Node..."
"$NODE_PATH" "$TMP_PATH"
