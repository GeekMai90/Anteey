import express from 'express'
import cors from 'cors'
import { BrowserWindow } from 'electron'
import { createNoteViaApi } from '../../services/notes/notesService'
import mcpRoutes from './mcpRoutes'
import log from 'electron-log'
import os from 'os'
import http from 'http'

// 声明全局 mainWindow 类型
declare global {
  // eslint-disable-next-line no-var
  var mainWindow: BrowserWindow | null
}

// 创建 Express 应用实例
const server = express()
const API_PORT = 43211 // 选择一个固定端口

// 中间件
server.use(express.json({ limit: '50mb' }))

// 更详细的CORS配置
server.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-KEY'],
    credentials: false
  })
)

// 添加额外的头部设置
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY')

  // 记录所有请求（仅在需要调试时启用）
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    log.info(`收到请求: ${req.method} ${req.url}`, {
      headers: req.headers,
      body: req.method === 'POST' ? req.body : undefined
    })
  }

  next()
})

// 注册MCP路由
server.use('/api/mcp', mcpRoutes)
log.info('MCP API路由已注册')

// 添加健康检查端点
server.get('/health', (_req: express.Request, res: express.Response): void => {
  res.setHeader('Content-Type', 'application/json')
  res.status(200)
  res.end(
    JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Anteey MCP API',
      version: '1.0.0',
      uptime: process.uptime()
    })
  )
})

// 添加根路径响应
server.get('/', (_req: express.Request, res: express.Response): void => {
  res.setHeader('Content-Type', 'application/json')
  res.status(200)
  res.end(
    JSON.stringify({
      message: 'Anteey MCP API Server',
      status: 'running',
      endpoints: {
        health: '/health',
        mcp: '/api/mcp/*',
        notes: '/api/notes'
      }
    })
  )
})

// API路由
server.post('/api/notes', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { content } = req.body
    console.log('API服务器→ 收到创建笔记请求:', content.slice(0, 100) + '...')

    if (!content || typeof content !== 'string') {
      console.log('API服务器→ 内容验证失败')
      res.setHeader('Content-Type', 'application/json')
      res.status(400)
      res.end(
        JSON.stringify({
          success: false,
          error: '内容不能为空且必须是字符串'
        })
      )
      return
    }

    const note = await createNoteViaApi(content)
    console.log('API服务器→ 笔记创建成功，ID:', note.id)

    // 通过IPC通知渲染进程
    console.log('API服务器→ 准备发送IPC事件')
    if (global.mainWindow) {
      console.log('API服务器→ 准备发送的笔记数据:', note)
      global.mainWindow.webContents.send('note-created', {
        type: 'note-created',
        data: note
      })
      console.log('API服务器→ IPC事件已发送')
    } else {
      console.warn('API服务器→ mainWindow不存在，无法发送IPC事件')
    }

    res.setHeader('Content-Type', 'application/json')
    res.status(200)
    res.end(
      JSON.stringify({
        success: true,
        data: note
      })
    )
  } catch (error) {
    console.error('API服务器→ 创建笔记失败:', error)
    res.setHeader('Content-Type', 'application/json')
    res.status(500)
    res.end(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '创建笔记失败'
      })
    )
  }
})

export function startApiServer() {
  return new Promise<void>((resolve, reject) => {
    // 添加错误处理
    server.on('error', (error: any) => {
      log.error('API服务器启动失败:', error)
      console.error('API服务器启动失败:', error)

      if (error.code === 'EADDRINUSE') {
        log.error(`端口 ${API_PORT} 已被占用`)
        console.error(`端口 ${API_PORT} 已被占用`)
        reject(new Error(`端口 ${API_PORT} 已被占用`))
      } else if (error.code === 'EACCES') {
        log.error(`没有权限绑定端口 ${API_PORT}`)
        console.error(`没有权限绑定端口 ${API_PORT}`)
        reject(new Error(`没有权限绑定端口 ${API_PORT}`))
      } else {
        reject(error)
      }
    })

    // 尝试启动服务器
    const serverInstance = server.listen(API_PORT, '127.0.0.1', () => {
      const address = serverInstance.address()
      const actualPort = typeof address === 'object' && address ? address.port : API_PORT

      console.log(`API服务器成功启动在 http://127.0.0.1:${actualPort}`)
      log.info(`API服务器成功启动在 http://127.0.0.1:${actualPort}`)
      log.info('MCP API服务已准备就绪，可接受外部连接')

      // 记录网络接口信息
      try {
        const networkInterfaces = os.networkInterfaces()
        log.info('可用网络接口:', JSON.stringify(networkInterfaces, null, 2))

        // 检查localhost是否可访问
        setTimeout(() => {
          const testReq = http.get(`http://127.0.0.1:${actualPort}/health`, () => {
            log.info('健康检查成功，API服务器可正常访问')
          })

          testReq.on('error', (err: any) => {
            log.error('健康检查失败:', err)
          })

          testReq.setTimeout(5000, () => {
            log.warn('健康检查超时')
            testReq.destroy()
          })
        }, 1000)
      } catch (err) {
        log.warn('获取网络接口信息失败:', err)
      }

      resolve()
    })

    // 设置服务器超时
    serverInstance.timeout = 30000 // 30秒超时

    // 设置keep-alive
    serverInstance.keepAliveTimeout = 65000
    serverInstance.headersTimeout = 66000

    // 优雅关闭处理
    const gracefulShutdown = () => {
      log.info('正在关闭API服务器...')
      serverInstance.close(() => {
        log.info('API服务器已关闭')
      })
    }

    process.on('SIGTERM', gracefulShutdown)
    process.on('SIGINT', gracefulShutdown)
  })
}
