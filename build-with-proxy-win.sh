#!/bin/bash

# 设置代理
export https_proxy=http://127.0.0.1:8234
export http_proxy=http://127.0.0.1:8234
export all_proxy=socks5://127.0.0.1:8235

echo "正在设置代理..."
echo "HTTP 代理: $http_proxy"
echo "HTTPS 代理: $https_proxy"
echo "SOCKS 代理: $all_proxy"

# 清理之前的构建
echo "清理之前的构建..."
rm -rf dist
rm -rf node_modules/.cache

# 重新安装依赖
echo "重新安装依赖..."
pnpm install

# 重新构建原生模块
echo "重新构建原生模块..."
npm rebuild sharp --platform=win32 --arch=x64
npm rebuild better-sqlite3 --platform=win32 --arch=x64

# 运行构建
echo "开始构建..."
npm run build && electron-builder --win \
  --config.asarUnpack="node_modules/{sharp,@xenova,@themaximalist,better-sqlite3}/**/*" \
  --config.asarUnpack="**/*.node"

# 构建完成后清理代理设置
unset https_proxy
unset http_proxy
unset all_proxy

echo "构建完成！"