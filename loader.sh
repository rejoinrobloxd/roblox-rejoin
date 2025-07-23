#!/bin/bash

# ⚙️ Cấu hình
REPO_URL="https://github.com/NhinQuanhLanCuoi9999/roblox-rejoin"
REPO_DIR="$HOME/roblox-rejoin"
WORK_DIR="$REPO_DIR/main/src"
LOADER_PATH="/data/data/com.termux/files/usr/bin/loader"

# 🧠 Tạo alias 'loader' nếu chưa có
if [ ! -f "$LOADER_PATH" ]; then
    echo "🛠️ Đang tạo lệnh 'loader' để dùng cho lần sau..."
    cp "$0" "$LOADER_PATH" && chmod +x "$LOADER_PATH"
    if [ $? -eq 0 ]; then
        echo "✅ Đã tạo lệnh 'loader' thành công! Lần sau chỉ cần gõ: loader"
    else
        echo "❌ Không thể tạo lệnh 'loader', vui lòng chạy bằng tay!"
    fi
fi

# 📦 Kiểm tra & cài git nếu chưa có
if ! command -v git &> /dev/null; then
    echo "📦 Git chưa có, đang cài đặt..."
    pkg update -y && pkg install -y git
    if [ $? -ne 0 ]; then
        echo "❌ Không thể cài đặt git!"
        exit 1
    fi
fi

# ⬇️ Clone hoặc cập nhật repo
if [ ! -d "$REPO_DIR/.git" ]; then
    echo "🌱 Đang clone repo về lần đầu..."
    git clone "$REPO_URL" "$REPO_DIR"
    if [ $? -ne 0 ]; then
        echo "❌ Clone thất bại!"
        exit 1
    fi
else
    echo "🔁 Đã có repo, đang pull bản mới..."
    cd "$REPO_DIR"
    git reset --hard
    git pull
fi

# 🔍 Kiểm tra Node.js
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

# 🧠 Cài đặt alias cho su nếu có
SU_PATH=$(which su)
if [ -n "$SU_PATH" ]; then
    echo "🔧 Gán alias node cho su..."
    echo "alias node='$NODE_PATH'" >> ~/.bashrc
    echo "export PATH=\"$(dirname $NODE_PATH):\$PATH\"" >> ~/.bashrc
    source ~/.bashrc 2>/dev/null || true
fi

# 🚀 Chạy main.js trong repo
cd "$WORK_DIR"

# 📦 Tự động cài package nếu chưa có node_modules
if [ ! -d "$REPO_DIR/node_modules" ]; then
    echo "📦 Chưa có thư viện, đang chạy npm install..."
    cd "$REPO_DIR"
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Lỗi khi cài npm package!"
        exit 1
    fi
    echo "✅ Đã cài xong npm packages!"
fi

# 👉 Quay lại folder src và chạy main.js
cd "$WORK_DIR"
echo "🚀 Đang chạy main.js từ repo..."
"$NODE_PATH" main.js
