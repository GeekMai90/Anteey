# AntiThink

AntiThink 是一个基于卢曼卡片盒笔记法理念的现代化桌面笔记应用。

## 技术栈

### 前端

- Vue 3 + TypeScript
- Pinia (状态管理)
- Vue Router
- TipTap (富文本编辑器)

### 桌面端

- Electron
- SQLite (BetterSQLite3)

### 闪卡算法

- ts-fsrs (Free Spaced Repetition Scheduler)

## 项目特性

- 📝 卡片式笔记管理
- 🔗 双向链接支持
- 📊 知识图谱可视化
- 🎨 白板功能
- ⏰ 时间块管理
- 📚 闪卡复习系统
- 💾 自动备份
- ☁️ WebDAV 同步
- 🔍 全文检索
- 📱 响应式设计

## 项目结构

```
src/
├── db/ # 数据库相关
├── main/ # Electron 主进程
├── preload/ # 预加载脚本
├── renderer/ # 渲染进程 (Vue 应用)
├── services/ # 业务服务层
└── shared/ # 共享类型定义
```

## 开发指南

### 环境准备

1. Node.js 16+
2. pnpm 包管理器
3. 推荐的 IDE: VSCode + 相关插件

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

### 构建应用

```bash
Windows
pnpm run build:proxyWinFinal
macOS
pnpm run build:proxyMacFinal
Linux
pnpm run build:proxyLinuxFinal
```

## 核心功能模块

### 1. 笔记系统

- 支持富文本编辑
- 双向链接
- 标签管理
- 版本历史

### 2. 白板功能

- 多种元素类型：卡片、文本、图片
- 自由拖拽与缩放
- 元素连接
- 分组管理

### 3. 时间管理

- 时间块记录
- 天气心情跟踪
- 时间线视图

### 4. 数据同步与备份

- WebDAV 同步
- 自动备份
- 版本管理

## 编码规范

### Vue 组件

- 使用 Composition API
- TypeScript 类型定义
- 组件命名采用 PascalCase
- 文件名采用 PascalCase

### 状态管理

- 使用 Pinia 进行状态管理
- 按功能模块拆分 Store
- 使用组合式函数管理复杂逻辑

### 数据库操作

- 使用 BetterSQLite3
- 统一的服务层封装
- 事务处理
- 错误处理与日志记录

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交变更
4. 推送到分支
5. 创建 Pull Request

## 许可证

[待补充]

## 联系方式

- 官网：https://www.antithink.cc
