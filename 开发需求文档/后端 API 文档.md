# Anteey Account API 文档

## 用户模块 (users)

### 创建用户

- 路径: POST /users
- 描述: 创建新用户
- 请求体:
  ```json
  {
    "email": "user@example.com",
    "username": "username",
    "password": "password123"
  }
  ```
- 响应: 200 OK
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "licenseType": "free",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z"
  }
  ```

### 修改用户名

- 路径: PUT /users/username
- 描述: 修改当前用户的用户名
- 认证: Bearer Token
- 请求体:
  ```json
  {
    "username": "new_username"
  }
  ```
- 响应: 200 OK
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "username": "new_username",
    "licenseType": "free",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "lastLoginAt": "2024-01-01T00:00:00Z",
    "lastLoginIp": "127.0.0.1"
  }
  ```
- 错误响应:
  - 400 Bad Request: 用户名长度必须在3-20个字符之间
  - 409 Conflict: 该用户名已被使用
  - 401 Unauthorized: 未登录或 token 已过期

### 修改邮箱

- 路径: PUT /users/email
- 描述: 修改当前用户的邮箱
- 认证: Bearer Token
- 请求体:
  ```json
  {
    "email": "new.email@example.com",
    "password": "current_password"
  }
  ```
- 响应: 200 OK
  ```json
  {
    "id": "uuid",
    "email": "new.email@example.com",
    "username": "username",
    "licenseType": "free",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "lastLoginAt": "2024-01-01T00:00:00Z",
    "lastLoginIp": "127.0.0.1"
  }
  ```
- 错误响应:
  - 400 Bad Request: 无效的邮箱格式
  - 409 Conflict: 该邮箱已被使用
  - 401 Unauthorized: 密码错误或 token 已过期

### 请求更换邮箱

- 路径: POST /users/email/request-change
- 描述: 发起更换邮箱请求，向新邮箱发送验证码
- 认证: Bearer Token
- 请求体:
  ```json
  {
    "newEmail": "new.email@example.com",
    "password": "current_password"
  }
  ```
- 响应: 200 OK

### 验证新邮箱

- 路径: POST /users/email/verify
- 描述: 验证新邮箱的验证码并完成邮箱更换
- 认证: Bearer Token
- 请求体:
  ```json
  {
    "code": "123456"
  }
  ```
- 响应: 200 OK

### 删除账号

- 路径: DELETE /users/account
- 描述: 删除当前用户的账号及所有相关数据
- 认证: Bearer Token
- 响应: 200 OK
  ```json
  {
    "message": "账号已成功删除"
  }
  ```
- 错误响应:
  - 401 Unauthorized: 未登录或 token 已过期
  - 500 Internal Server Error: 删除失败

注意事项：

- 此操作会永久删除用户的所有数据，包括：
  - 用户账号信息
  - 设备记录
  - 登录历史
  - 操作日志
- 删除后无法恢复
- 删除后所有设备将立即失效

## 认证模块 (auth)

### 用户登录

- 路径: POST /auth/login
- 描述: 用户登录获取令牌
- 请求体:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "ipAddress": "127.0.0.1",
    "deviceType": "desktop",
    "deviceName": "My MacBook",
    "deviceIdentifier": "unique_device_id"
  }
  ```
- 响应: 200 OK
  ```json
  {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "licenseType": "free",
      "maxDevices": 1,
      "licenseExpiredAt": null
    }
  }
  ```
- 错误响应:
  - 401 Unauthorized: 邮箱或密码错误
  - 403 Forbidden: 已达到最大设备数限制（仅针对 desktop 类型设备）

注意事项：

1. 网页登录(deviceType=web)不受设备数量限制
2. 桌面应用登录(deviceType=desktop)会受到许可证的设备数量限制
3. 建议桌面应用在本地保存 deviceIdentifier，保持设备标识的一致性
4. deviceName 如果不提供，服务器会自动生成

### 刷新令牌

- 路径: POST /auth/refresh
- 描述: 使用刷新令牌获取新的访问令牌
- 请求体:
  ```json
  {
    "refresh_token": "refresh_token"
  }
  ```
- 响应: 200 OK
  ```json
  {
    "access_token": "new_jwt_token",
    "refresh_token": "new_refresh_token"
  }
  ```

### 用户登出

- 路径: POST /auth/logout
- 描述: 用户登出，可选择登出指定设备
- 认证: Bearer Token
- 请求体:
  ```json
  {
    "deviceId": "device_uuid" // 可选
  }
  ```
- 响应: 200 OK

### 修改密码

- 路径: POST /auth/change-password
- 描述: 修改用户密码
- 认证: Bearer Token
- 请求体:
  ```json
  {
    "currentPassword": "old_password",
    "newPassword": "new_password"
  }
  ```
- 响应: 200 OK

### 请求重置密码

- 路径: POST /auth/request-password-reset
- 描述: 发送密码重置邮件
- 请求体:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- 响应: 200 OK

### 重置密码

- 路径: POST /auth/reset-password
- 描述: 使用重置令牌重置密码
- 请求体:
  ```json
  {
    "token": "reset_token",
    "newPassword": "new_password"
  }
  ```
- 响应: 200 OK

### 检查服务状态

- 路径: GET /auth/status
- 描述: 检查服务状态和认证状态
- 认证: 可选 Bearer Token
- 响应: 200 OK
  ```json
  {
    "status": "ok",
    "serverTime": "2024-01-19T00:33:32.863Z",
    "authenticated": true // 如果提供了有效token
  }
  ```
- 错误响应:
  - 401 Unauthorized: token无效（但服务正常）

### 验证认证状态

- 路径: GET /auth/verify
- 描述: 验证当前认证状态
- 认证: Bearer Token
- 响应: 200 OK
  ```json
  {
    "valid": true,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "licenseType": "free",
      "maxDevices": 1,
      "licenseExpiredAt": null,
      "lastVerified": "2024-01-19T00:33:32.863Z"
    }
  }
  ```
- 错误响应:
  - 401 Unauthorized: 未认证或认证已过期
  - 401 Unauthorized: 用户不存在或已被禁用
  - 401 Unauthorized: 许可证已过期

## 设备模块 (devices)

### 获取用户设备列表

- 路径: GET /devices
- 描述: 获取当前用户的所有设备
- 认证: Bearer Token
- 响应: 200 OK
  ```json
  [
    {
      "id": "uuid",
      "deviceName": "My Device",
      "deviceIdentifier": "device_id",
      "ipAddress": "127.0.0.1",
      "location": "City, Country",
      "isActive": true,
      "isOnline": true,
      "lastLoginAt": "2024-01-01T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
  ```

### 获取设备详情

- 路径: GET /devices/:id
- 描述: 获取指定设备的详细信息
- 认证: Bearer Token
- 响应: 200 OK

### 删除设备

- 路径: DELETE /devices/identifier/:deviceIdentifier
- 描述: 通过设备标识符删除指定设备
- 认证: Bearer Token
- 响应: 200 OK

### 重命名设备

- 路径: PUT /devices/:id/rename
- 描述: 重命名指定设备
- 认证: Bearer Token
- 请求体:
  ```json
  {
    "name": "New Device Name"
  }
  ```
- 响应: 200 OK

## 许可证模块 (license)

### 升级许可证

- 路径: POST /license/upgrade
- 描述: 升级用户许可证（仅管理员）
- 认证: Bearer Token + Admin
- 请求体:
  ```json
  {
    "userId": "user_uuid",
    "licenseType": "desktop_permanent",
    "expiredAt": "2025-01-01T00:00:00Z",
    "maxDevices": 5
  }
  ```
- 响应: 200 OK

### 更新用户消费金额

- 路径: POST /license/update-spent
- 描述: 更新用户消费金额（仅管理员）
- 认证: Bearer Token + Admin
- 请求体:
  ```json
  {
    "userId": "user_uuid",
    "amount": 99.99
  }
  ```
- 响应: 200 OK
  ```json
  {
    "id": "user_uuid",
    "email": "user@example.com",
    "username": "username",
    "totalSpent": 199.98, // 累计消费金额
    "licenseType": "desktop_permanent",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z"
  }
  ```
- 错误响应:
  - 400 Bad Request: 用户不存在
  - 403 Forbidden: 需要管理员权限

### 获取许可证历史

- 路径: GET /license/history
- 描述: 获取许可证变更历史
- 认证: Bearer Token
- 响应: 200 OK

### 降级为免费用户

- 路径: POST /license/downgrade
- 描述: 将用户降级为免费用户（仅管理员）
- 认证: Bearer Token + Admin
- 请求体:
  ```json
  {
    "userId": "user_uuid"
  }
  ```
- 响应: 200 OK

## 管理后台模块 (admin)

### 查询用户列表

- 路径: GET /admin/users
- 描述: 查询用户列表（支持分页、搜索、筛选）
- 认证: Bearer Token + Admin
- 查询参数:
  - keyword: 搜索关键词
  - licenseType: 许可证类型
  - isActive: 是否启用
  - page: 页码
  - pageSize: 每页数量
- 响应: 200 OK

### 获取统计数据

- 路径: GET /admin/statistics
- 描述: 获取系统统计数据
- 认证: Bearer Token + Admin
- 响应: 200 OK

  ```json
  {
    "users": {
      "total": 1000, // 总用户数
      "newToday": 50, // 今日新增
      "newThisMonth": 300, // 本月新增
      "activeToday": 200, // 今日活跃
      "activeThisMonth": 800, // 本月活跃
      "activeLastMonth": 750 // 上月活跃（用于计算环比）
    },

    "devices": {
      "total": 2000, // 总设备数
      "online": 500, // 在线设备数
      "activeToday": 300, // 今日活跃设备
      "activeThisMonth": 1200 // 本月活跃设备
    },

    "licenses": [
      {
        "type": "free", // 许可证类型
        "count": 800, // 用户数量
        "revenue": 0 // 该类型总收入
      },
      {
        "type": "desktop_permanent", // 许可证类型
        "count": 200, // 用户数量
        "revenue": 19800 // 该类型总收入
      }
    ],

    "revenue": {
      "total": 19800, // 总收入
      "today": 990, // 今日收入
      "thisMonth": 5000, // 本月收入
      "lastMonth": 4500, // 上月收入（用于计算环比）
      "monthly": [
        // 最近12个月的收入趋势
        {
          "month": "2024-01", // 月份，格式：YYYY-MM
          "amount": 5000, // 收入金额
          "userCount": 50 // 付费用户数
        }
      ]
    },

    "userGrowth": [
      // 用户增长趋势（最近12个月）
      {
        "month": "2024-01", // 月份，格式：YYYY-MM
        "total": 1000, // 总用户数
        "new": 300, // 新增用户数
        "active": 800 // 活跃用户数
      }
    ]
  }
  ```

- 错误响应:
  - 403 Forbidden: 需要管理员权限

### 启用/禁用用户

- 路径: POST /admin/users/:id/toggle-status
- 描述: 启用或禁用用户
- 认证: Bearer Token + Admin
- 请求体:
  ```json
  {
    "isActive": true
  }
  ```
- 响应: 200 OK

### 获取收入统计

- 路径: GET /admin/revenue
- 描述: 获取许可证收入统计
- 认证: Bearer Token + Admin
- 查询参数:
  - startDate: 开始日期
  - endDate: 结束日期
- 响应: 200 OK

### 导出用户数据

- 路径: GET /admin/export/users
- 描述: 导出用户数据为Excel文件
- 认证: Bearer Token + Admin
- 响应: Excel文件下载

### 导出统计数据

- 路径: GET /admin/export/statistics
- 描述: 导出统计数据为Excel文件
- 认证: Bearer Token + Admin
- 响应: Excel文件下载

### 删除用户

- 路径: DELETE /admin/users/:id
- 描述: 删除指定用户及其所有相关数据（仅管理员）
- 认证: Bearer Token + Admin
- 参数:
  - id: 用户ID (路径参数)
- 响应: 200 OK
  ```json
  {
    "message": "用户删除成功"
  }
  ```
- 错误响应:
  - 403 Forbidden: 需要管理员权限或尝试删除管理员账号
  - 404 Not Found: 用户不存在
