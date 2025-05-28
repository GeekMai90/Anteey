# API 使用文档 - 快速创建笔记接口

## 概述

本文档描述了 Anteey 应用的本地 API，允许其他应用通过 HTTP 请求快速创建笔记。该 API 在 Anteey 应用运行时可用，提供简单、高效的笔记创建能力。

## API 端点

基础URL: http://127.0.0.1:43211
端点: /api/notes
方法: POST
内容类型: application/json

### 请求格式

{
"content": "这是一段文本内容\n这是第二段内容"
}

### 请求参数

| 参数名  | 类型   | 必填 | 描述                                     |
| ------- | ------ | ---- | ---------------------------------------- |
| content | string | 是   | 笔记内容，可包含换行符（\n）分隔的多段落 |

响应格式
{
"success": true,
"data": {
"id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
"type": "note",
"address": "闪念-202503291732",
"cardType": "Draftcard",
"content": { /_ 笔记内容对象 _/ },
"createdAt": "2025-03-29T17:32:10.123Z",
"updatedAt": "2025-03-29T17:32:10.123Z",
}
}

错误响应
{
"success": false,
"error": "内容不能为空且必须是字符串"
}

## 使用示例

### JavaScript 示例

fetch('http://127.0.0.1:43211/api/notes', {
method: 'POST',
headers: {
'Content-Type': 'application/json'
},
body: JSON.stringify({
content: '这是通过API创建的笔记\n这是第二段内容'
})
})
.then(response => response.json())
.then(data => console.log('创建成功:', data))
.catch(error => console.error('创建失败:', error));
