#!/bin/bash

# 设置代理
export https_proxy=http://127.0.0.1:8234
export http_proxy=http://127.0.0.1:8234
export all_proxy=socks5://127.0.0.1:8235

echo "正在设置代理..."
echo "HTTP 代理: $http_proxy"
echo "HTTPS 代理: $https_proxy"
echo "SOCKS 代理: $all_proxy"

# 清理缓存
echo "清理缓存..."
rm -rf node_modules/.cache

# 安装依赖
echo "安装依赖..."
pnpm install

# 打包 Windows 版本
echo "===== 开始构建 Windows 版本 ====="
# 重新构建原生模块
echo "重新构建原生模块..."
npm rebuild better-sqlite3 --platform=win32 --arch=x64

npm run build && electron-builder --win \
  --config.asarUnpack="node_modules/{@xenova,@themaximalist,better-sqlite3}/**/*" \
  --config.asarUnpack="**/*.node"

echo "Windows 版本打包完成！"

# 打包 Mac X64 版本
echo "===== 开始构建 Mac X64 版本 ====="

npm run build && electron-builder --mac --x64 --config.dmg.artifactName="Anteey-\${version}-x64.\${ext}"

echo "Mac X64 版本打包完成！"

# 打包 Mac Arm64 版本
echo "===== 开始构建 Mac Arm64 版本 ====="

npm run build && electron-builder --mac --arm64 --config.dmg.artifactName="Anteey-\${version}-arm64.\${ext}"

echo "Mac Arm64 版本打包完成！"

# 清除代理设置
unset https_proxy
unset http_proxy
unset all_proxy

echo "===== 所有平台版本打包完成！=====" 