#!/bin/bash

# 设置 Surge 代理
export https_proxy=http://127.0.0.1:8234
export http_proxy=http://127.0.0.1:8234
export all_proxy=socks5://127.0.0.1:8235

# 运行您的打包命令
npm run build && electron-builder --mac  # 或者您使用的其他打包命令，比如 electron-builder