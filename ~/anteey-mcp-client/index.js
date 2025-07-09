#!/usr/bin/env node

const http = require('http')
const readline = require('readline')

// 从环境变量获取 API 密钥和基础 URL
const API_KEY = process.env.ANTEEY_MCP_API_KEY || 'anteey_QGUMHja0qrLPt8bXRuHT2oryXuKEHtxR'
// Anteey MCP 服务器地址
const ANTEEY_MCP_URL = process.env.ANTEEY_MCP_BASE_URL || 'http://localhost:43211/api/mcp'

// 创建 readline 接口用于读取标准输入
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
})

console.error('Anteey MCP 客户端已启动')
console.error(`使用 API 密钥: ${API_KEY}`)
console.error(`使用 API 地址: ${ANTEEY_MCP_URL}`)

// 监听标准输入的每一行
rl.on('line', async (line) => {
  try {
    console.error(`收到请求: ${line}`)
    if (!line.trim()) {
      console.error('收到空输入，忽略')
      return
    }

    // 检查是否是 JSON-RPC 错误消息
    if (line.includes('"jsonrpc":"2.0"') && line.includes('"error"')) {
      console.error('收到 JSON-RPC 错误消息，忽略')
      return
    }

    // 解析 JSON 请求
    const request = JSON.parse(line)

    // 处理 JSON-RPC 请求
    if (request.jsonrpc === '2.0') {
      await handleJsonRpcRequest(request)
      return
    }

    // 处理传统请求
    if (request.type === 'query' || request.action === 'query') {
      // 处理查询请求 (兼容 Raycast 和 Cursor)
      const query = request.query || request.text || ''
      await handleQuery(query)
    } else if (request.action === 'search') {
      // 处理 Cursor 的搜索请求
      const query = request.text || ''
      await handleQuery(query)
    } else {
      console.error(`不支持的请求类型: ${request.type || request.action}`)
      sendResponse({ error: `不支持的请求类型: ${request.type || request.action}` })
    }
  } catch (error) {
    console.error('处理请求时出错:', error)
    // 尝试以 JSON-RPC 格式发送错误
    try {
      sendJsonRpcError(null, -32603, error.message || '内部错误')
    } catch (e) {
      // 如果失败，使用传统格式
      sendResponse({ error: error.message || '处理请求时出错' })
    }
  }
})

// 处理 JSON-RPC 请求
async function handleJsonRpcRequest(request) {
  const { id, method, params } = request

  try {
    console.error(`处理 JSON-RPC 请求: method=${method}, id=${id}`)

    // 处理初始化请求
    if (method === 'initialize') {
      sendJsonRpcResponse(id, {
        capabilities: {
          search: true
        }
      })
      return
    }

    // 处理搜索请求
    if (method === 'search') {
      const query = params?.query || ''
      console.error(`搜索查询: ${query}`)
      const notes = await searchNotes(query)
      console.error(`找到 ${notes.length} 条笔记`)

      sendJsonRpcResponse(id, {
        items: notes.map((note) => ({
          id: note.id,
          title: note.title || '无标题笔记',
          subtitle: note.cardType,
          text: {
            value: note.content || '',
            type: 'markdown'
          },
          accessoryTitle: new Date(parseInt(note.updatedAt)).toLocaleDateString(),
          actions: [
            {
              title: '打开笔记',
              type: 'open',
              target: `anteey://open?noteId=${note.id}`
            }
          ]
        }))
      })
      return
    }

    // 处理未知方法
    console.error(`未知方法: ${method}`)
    sendJsonRpcError(id, -32601, `方法不存在: ${method}`)
  } catch (error) {
    console.error(`处理 JSON-RPC 请求出错:`, error)
    sendJsonRpcError(id, -32603, error.message || '内部错误')
  }
}

// 发送 JSON-RPC 响应
function sendJsonRpcResponse(id, result) {
  const response = {
    jsonrpc: '2.0', // 使用双引号而不是单引号
    id,
    result
  }
  console.error(`发送 JSON-RPC 响应: ${JSON.stringify(response).substring(0, 100)}...`)
  console.log(JSON.stringify(response))
}

// 发送 JSON-RPC 错误
function sendJsonRpcError(id, code, message) {
  const response = {
    jsonrpc: '2.0', // 使用双引号而不是单引号
    id,
    error: {
      code,
      message
    }
  }
  console.error(`发送 JSON-RPC 错误: ${JSON.stringify(response)}`)
  console.log(JSON.stringify(response))
}

// 处理查询请求
async function handleQuery(query) {
  try {
    console.error(`查询: ${query}`)

    // 调用 Anteey MCP API
    const notes = await searchNotes(query)
    console.error(`找到 ${notes.length} 条笔记`)

    // 将笔记转换为 MCP 格式并发送响应
    sendResponse({
      results: notes.map((note) => ({
        title: note.title || '无标题笔记',
        content: note.content || '',
        url: `anteey://open?noteId=${note.id}`
      }))
    })
  } catch (error) {
    console.error('查询笔记时出错:', error)
    sendResponse({ error: error.message || '查询笔记时出错' })
  }
}

// 调用 Anteey MCP API 搜索笔记
function searchNotes(query) {
  return new Promise((resolve, reject) => {
    const url = `${ANTEEY_MCP_URL}/notes/search?query=${encodeURIComponent(query)}`
    console.error(`请求 URL: ${url}`)

    const req = http.get(
      url,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`
        }
      },
      (res) => {
        let data = ''

        res.on('data', (chunk) => {
          data += chunk
        })

        res.on('end', () => {
          if (res.statusCode !== 200) {
            console.error(`API 请求失败: ${res.statusCode}`)
            console.error(`响应内容: ${data}`)
            reject(new Error(`API 请求失败: ${res.statusCode}`))
            return
          }

          try {
            const response = JSON.parse(data)
            if (!response.success) {
              reject(new Error(response.error || '未知错误'))
              return
            }
            resolve(response.data || [])
          } catch (error) {
            console.error('解析 API 响应时出错:', error)
            reject(error)
          }
        })
      }
    )

    req.on('error', (error) => {
      console.error('API 请求出错:', error)
      reject(error)
    })

    req.end()
  })
}

// 发送响应到标准输出
function sendResponse(response) {
  console.error(`发送传统响应: ${JSON.stringify(response).substring(0, 100)}...`)
  console.log(JSON.stringify(response))
}

// 初始测试，确认 API 连接正常
async function testConnection() {
  try {
    console.error('测试 API 连接...')
    const url = `${ANTEEY_MCP_URL}/status`

    http
      .get(
        url,
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`
          }
        },
        (res) => {
          let data = ''

          res.on('data', (chunk) => {
            data += chunk
          })

          res.on('end', () => {
            console.error(`API 状态响应: ${res.statusCode}`)
            console.error(`响应内容: ${data}`)
            if (res.statusCode === 200) {
              console.error('API 连接正常')
            } else {
              console.error('API 连接异常')
            }
          })
        }
      )
      .on('error', (error) => {
        console.error('API 连接测试失败:', error)
      })
  } catch (error) {
    console.error('测试 API 连接时出错:', error)
  }
}

// 处理进程终止
process.on('SIGINT', () => {
  console.error('收到 SIGINT，正在退出...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.error('收到 SIGTERM，正在退出...')
  process.exit(0)
})

// 测试 API 连接
testConnection()

// 不要在启动时发送任何响应，等待 Raycast 的请求
// 注释掉原来的初始响应
// sendJsonRpcResponse(0, { status: 'ready' })
