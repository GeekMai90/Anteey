# MCP功能开发需求文档

## 1. 功能概述

### 1.1 背景介绍

MCP（Multimodal Context Preservation）是Claude提出的多模态上下文保存功能，允许AI助手与应用程序进行更深度的集成。在Anteey中实现MCP功能，可以让其他AI助手（如Raycast、Cursor等）通过API访问Anteey的笔记内容作为上下文，极大地扩展Anteey的使用场景和价值。

### 1.2 功能目标

- 将Anteey作为MCP服务提供者，允许外部AI助手调用Anteey的笔记内容
- 提供安全、高效的API接口，支持笔记内容的检索和获取
- 实现API密钥管理，确保数据访问的安全性
- 支持多种查询方式，包括关键词搜索、标签过滤、卡片类型过滤等

## 2. 系统架构

### 2.1 整体架构

```
┌────────────────┐       ┌────────────────┐       ┌────────────────┐
│                │       │                │       │                │
│  外部AI助手    │ ──────▶│  Anteey MCP   │ ──────▶│  Anteey 数据库 │
│ (Raycast等)    │       │  API服务       │       │                │
│                │       │                │       │                │
└────────────────┘       └────────────────┘       └────────────────┘
```

### 2.2 技术栈

- 服务端: Node.js + Express
- 数据库: SQLite (BetterSQLite3)
- 认证: API密钥认证
- 通信: HTTP REST API

## 3. 功能需求

### 3.1 API接口

#### 3.1.1 认证接口

- **验证API密钥**
  - 路径: `/api/mcp/auth/verify`
  - 方法: `POST`
  - 请求体: `{ "apiKey": "string" }`
  - 响应: `{ "valid": boolean, "expires": string }`

#### 3.1.2 笔记查询接口

- **搜索笔记**

  - 路径: `/api/mcp/notes/search`
  - 方法: `GET`
  - 参数:
    - `query`: 搜索关键词
    - `limit`: 返回结果数量限制
    - `offset`: 分页偏移量
    - `tags`: 标签过滤（逗号分隔）
    - `cardTypes`: 卡片类型过滤（逗号分隔）
    - `cardBoxId`: 卡片盒ID过滤
    - `startDate`: 开始日期过滤
    - `endDate`: 结束日期过滤
  - 响应: 笔记列表

- **获取单个笔记**

  - 路径: `/api/mcp/notes/:id`
  - 方法: `GET`
  - 参数: 笔记ID
  - 响应: 单个笔记详情

- **获取最近更新的笔记**
  - 路径: `/api/mcp/notes/recent`
  - 方法: `GET`
  - 参数: `limit` (可选，默认10)
  - 响应: 最近更新的笔记列表

#### 3.1.3 元数据接口

- **获取标签列表**

  - 路径: `/api/mcp/tags`
  - 方法: `GET`
  - 响应: 标签列表

- **获取卡片盒列表**
  - 路径: `/api/mcp/cardboxes`
  - 方法: `GET`
  - 响应: 卡片盒列表

### 3.2 管理功能

#### 3.2.1 API密钥管理

- 创建API密钥
- 查看API密钥列表
- 停用/启用API密钥
- 删除API密钥

#### 3.2.2 访问控制

- 设置API访问权限（可读/可写）
- 设置API访问范围（全部笔记/特定卡片盒/特定标签）
- 设置API访问频率限制

#### 3.2.3 访问日志

- 记录API调用日志
- 查看API调用统计信息

## 4. 数据模型

### 4.1 API密钥表

```sql
CREATE TABLE mcp_api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  createdAt DATETIME NOT NULL,
  lastUsedAt DATETIME,
  isActive BOOLEAN NOT NULL DEFAULT 1
);
```

### 4.2 API访问权限表

```sql
CREATE TABLE mcp_api_permissions (
  id TEXT PRIMARY KEY,
  apiKeyId TEXT NOT NULL,
  scope TEXT NOT NULL, -- 'all', 'cardbox', 'tag'
  resourceId TEXT,     -- cardBoxId或tagId，当scope不是'all'时使用
  createdAt DATETIME NOT NULL,
  FOREIGN KEY (apiKeyId) REFERENCES mcp_api_keys(id) ON DELETE CASCADE
);
```

### 4.3 API访问日志表

```sql
CREATE TABLE mcp_api_logs (
  id TEXT PRIMARY KEY,
  apiKeyId TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  statusCode INTEGER NOT NULL,
  responseTime INTEGER NOT NULL,
  timestamp DATETIME NOT NULL,
  FOREIGN KEY (apiKeyId) REFERENCES mcp_api_keys(id) ON DELETE CASCADE
);
```

## 5. 技术实现

### 5.1 核心服务

#### 5.1.1 MCP服务模块

- `src/services/mcp/mcpService.ts`: MCP核心服务实现
  - API密钥管理
  - 笔记内容处理
  - 权限验证

#### 5.1.2 API路由模块

- `src/main/api/mcpRoutes.ts`: MCP API路由实现
  - 路由定义
  - 请求处理
  - 响应格式化

### 5.2 安全措施

- API密钥认证
- 请求频率限制
- 数据访问权限控制
- 敏感信息过滤

### 5.3 性能优化

- 查询结果缓存
- 批量数据处理
- 响应压缩

## 6. 用户界面

### 6.1 设置页面

- API密钥管理界面

  - 创建、查看、停用、删除API密钥
  - 设置API访问权限

- 访问日志查看界面
  - 查看API调用记录
  - 查看API使用统计

### 6.2 文档页面

- API使用说明
- 示例代码
- 常见问题解答

## 7. 开发计划

### 7.1 阶段一：基础功能实现

- [x] 创建MCP服务模块
- [ ] 实现API密钥管理
- [ ] 实现笔记内容处理
- [ ] 创建API路由

### 7.2 阶段二：安全与权限

- [ ] 实现API密钥认证
- [ ] 实现访问权限控制
- [ ] 实现请求频率限制
- [ ] 实现访问日志记录

### 7.3 阶段三：用户界面

- [ ] 设计并实现API密钥管理界面
- [ ] 设计并实现访问权限设置界面
- [ ] 设计并实现访问日志查看界面

### 7.4 阶段四：测试与优化

- [ ] 编写单元测试
- [ ] 进行集成测试
- [ ] 进行性能测试
- [ ] 优化API响应速度
- [ ] 优化内存使用

### 7.5 阶段五：文档与发布

- [ ] 编写API使用文档
- [ ] 编写示例代码
- [ ] 准备发布说明
- [ ] 正式发布

## 8. 集成示例

### 8.1 与Raycast集成

```typescript
// Raycast扩展示例代码
import { getPreferenceValues } from '@raycast/api'

const preferences = getPreferenceValues()
const apiKey = preferences.anteeyApiKey

async function fetchNotes(query: string) {
  const response = await fetch(
    `http://localhost:43211/api/mcp/notes/search?query=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    }
  )
  return await response.json()
}
```

### 8.2 与Cursor集成

```typescript
// Cursor扩展示例代码
async function getAnteeyContext(query: string) {
  const apiKey = process.env.ANTEEY_API_KEY

  const response = await fetch(
    `http://localhost:43211/api/mcp/notes/search?query=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    }
  )

  const data = await response.json()
  return data.map((note) => note.content).join('\n\n')
}
```

## 9. 注意事项与限制

- API服务仅在Anteey应用运行时可用
- 需要考虑数据隐私和安全问题
- 需要处理富文本到纯文本的转换
- 需要处理大量笔记内容的性能问题

## 10. 未来扩展

- 支持更多的查询方式
- 支持笔记内容的写入操作
- 支持更多的外部应用集成
- 支持WebSocket实时更新
- 支持云端API服务
