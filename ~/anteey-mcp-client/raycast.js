#!/usr/bin/env node

const http = require('http')
const readline = require('readline')
const { URL } = require('url')

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

// 记录活动请求
const activeRequests = new Map()

console.error('Anteey MCP 客户端已启动 (Raycast 版)')
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

    // 解析 JSON 请求
    const request = JSON.parse(line)

    // 确保这是一个 JSON-RPC 请求
    if (!request.jsonrpc || request.jsonrpc !== '2.0') {
      console.error('非 JSON-RPC 2.0 请求，忽略')
      return
    }

    const { id, method, params } = request

    // 处理取消请求
    if (method === '$/cancelRequest') {
      const cancelId = params?.id
      if (cancelId && activeRequests.has(cancelId)) {
        console.error(`取消请求: ${cancelId}`)
        const controller = activeRequests.get(cancelId)
        controller.abort()
        activeRequests.delete(cancelId)

        // 发送成功响应
        console.log(
          JSON.stringify({
            jsonrpc: '2.0',
            id: id,
            result: null
          })
        )
      } else {
        // 即使找不到请求也返回成功响应
        console.error(`未找到要取消的请求: ${cancelId}`)
        console.log(
          JSON.stringify({
            jsonrpc: '2.0',
            id: id,
            result: null
          })
        )
      }
      return
    }

    console.error(`处理 JSON-RPC 请求: method=${method}, id=${id}`)

    // 处理初始化请求
    if (method === 'initialize') {
      console.log(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: {
              name: 'anteey-mcp-server',
              version: '1.1.1',
              vendor: 'Anteey Team'
            },
            capabilities: {
              tools: {},
              prompts: {},
              resources: {}
            }
          }
        })
      )
      return
    }

    // 处理工具列表请求
    if (method === 'tools/list') {
      console.log(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id,
          result: {
            tools: [
              {
                name: 'search_notes',
                description: '搜索Anteey笔记',
                inputSchema: {
                  type: 'object',
                  properties: {
                    query: {
                      type: 'string',
                      description: '搜索查询'
                    }
                  },
                  required: ['query']
                }
              }
            ]
          }
        })
      )
      return
    }

    // 处理工具调用请求
    if (method === 'tools/call') {
      const toolName = params?.name
      const args = params?.arguments || {}

      if (toolName === 'search_notes') {
        const query = args.query || ''
        console.error(`搜索查询: ${query}`)

        try {
          // 创建 AbortController 用于取消请求
          const controller = new AbortController()
          activeRequests.set(id, controller)

          const notes = await searchNotes(query, controller.signal)
          console.error(`找到 ${notes.length} 条笔记`)

          // 请求完成，从活动请求中移除
          activeRequests.delete(id)

          // 如果请求已被取消，不要发送响应
          if (controller.signal.aborted) {
            console.error(`请求 ${id} 已被取消，不发送响应`)
            return
          }

          console.log(
            JSON.stringify({
              jsonrpc: '2.0',
              id: id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: `找到 ${notes.length} 条笔记:\n\n${notes
                      .map(
                        (note) =>
                          `**${note.title || '无标题笔记'}** (${note.cardType})\n${note.content?.substring(0, 200) || ''}${note.content?.length > 200 ? '...' : ''}`
                      )
                      .join('\n\n')}`
                  }
                ]
              }
            })
          )
        } catch (error) {
          // 请求出错，从活动请求中移除
          activeRequests.delete(id)

          // 如果是请求被取消，返回特定错误码
          if (error.name === 'AbortError') {
            console.error('请求被取消')
            console.log(
              JSON.stringify({
                jsonrpc: '2.0',
                id: id,
                error: {
                  code: -32800,
                  message: '请求已取消'
                }
              })
            )
            return
          }

          console.error('搜索笔记时出错:', error)
          console.log(
            JSON.stringify({
              jsonrpc: '2.0',
              id: id,
              error: {
                code: -32603,
                message: error.message || '搜索笔记时出错'
              }
            })
          )
        }
        return
      }

      // 未知工具
      console.log(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id,
          error: {
            code: -32601,
            message: `未知工具: ${toolName}`
          }
        })
      )
      return
    }

    // 处理搜索请求（保留向后兼容性）
    if (method === 'search') {
      const query = params?.query || ''
      console.error(`搜索查询: ${query}`)

      try {
        // 创建 AbortController 用于取消请求
        const controller = new AbortController()
        activeRequests.set(id, controller)

        const notes = await searchNotes(query, controller.signal)
        console.error(`找到 ${notes.length} 条笔记`)

        // 请求完成，从活动请求中移除
        activeRequests.delete(id)

        // 如果请求已被取消，不要发送响应
        if (controller.signal.aborted) {
          console.error(`请求 ${id} 已被取消，不发送响应`)
          return
        }

        console.log(
          JSON.stringify({
            jsonrpc: '2.0',
            id: id,
            result: {
              items: notes.map((note) => ({
                id: note.id,
                title: note.title || '无标题笔记',
                subtitle: note.cardType,
                text: {
                  value: note.content || '',
                  type: 'markdown'
                },
                accessoryTitle: new Date(note.updatedAt).toLocaleDateString(),
                actions: [
                  {
                    title: '打开笔记',
                    type: 'open',
                    target: `anteey://open?noteId=${note.id}`
                  }
                ]
              }))
            }
          })
        )
      } catch (error) {
        // 请求出错，从活动请求中移除
        activeRequests.delete(id)

        // 如果是请求被取消，返回特定错误码
        if (error.name === 'AbortError') {
          console.error('请求被取消')
          console.log(
            JSON.stringify({
              jsonrpc: '2.0',
              id: id,
              error: {
                code: -32800,
                message: '请求已取消'
              }
            })
          )
          return
        }

        console.error('搜索笔记时出错:', error)
        console.log(
          JSON.stringify({
            jsonrpc: '2.0',
            id: id,
            error: {
              code: -32603,
              message: error.message || '搜索笔记时出错'
            }
          })
        )
      }

      return
    }

    // 处理未知方法
    console.error(`未知方法: ${method}`)
    console.log(
      JSON.stringify({
        jsonrpc: '2.0',
        id: id,
        error: {
          code: -32601,
          message: `方法不存在: ${method}`
        }
      })
    )
  } catch (error) {
    console.error('处理请求时出错:', error)
    // 尝试发送 JSON-RPC 错误响应
    try {
      console.log(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32603,
            message: error.message || '内部错误'
          }
        })
      )
    } catch (e) {
      console.error('发送错误响应时出错:', e)
    }
  }
})

// 调用 Anteey MCP API 搜索笔记
function searchNotes(query, signal) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(`${ANTEEY_MCP_URL}/notes/search`)
      urlObj.searchParams.append('query', query)

      console.error(`请求 URL: ${urlObj.toString()}`)

      // 使用传入的 signal
      const options = {
        headers: {
          Authorization: `Bearer ${API_KEY}`
        },
        signal
      }

      const req = http.get(urlObj, options, (res) => {
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
      })

      req.on('error', (error) => {
        console.error('API 请求出错:', error)
        reject(error)
      })

      req.end()
    } catch (error) {
      console.error('创建请求时出错:', error)
      reject(error)
    }
  })
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
          },
          timeout: 3000 // 添加超时
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
      .on('timeout', () => {
        console.error('API 连接测试超时')
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
