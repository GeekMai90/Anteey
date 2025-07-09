import express from 'express'
import cors from 'cors'
import { BrowserWindow } from 'electron'
import { createNoteViaApi } from '../../services/notes/notesService'
import mcpRoutes from './mcpRoutes'
import log from 'electron-log'

// 声明全局 mainWindow 类型
declare global {
  // eslint-disable-next-line no-var
  var mainWindow: BrowserWindow | null
}

// 创建 Express 应用实例
const server = express()
const API_PORT = 43211 // 选择一个固定端口

// 中间件
server.use(express.json())
server.use(cors({ origin: '*' }))

// 注册MCP路由
server.use('/api/mcp', mcpRoutes)
log.info('MCP API路由已注册')

// API路由
server.post('/api/notes', (req: express.Request, res: express.Response): void => {
  try {
    const { content } = req.body
    console.log('API服务器→ 收到创建笔记请求:', content.slice(0, 100) + '...')

    if (!content || typeof content !== 'string') {
      console.log('API服务器→ 内容验证失败')
      res.status(400).json({
        success: false,
        error: '内容不能为空且必须是字符串'
      })
      return
    }

    createNoteViaApi(content)
      .then((note) => {
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

        res.json({
          success: true,
          data: note
        })
      })
      .catch((error) => {
        console.error('API服务器→ 创建笔记失败:', error)
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : '创建笔记失败'
        })
      })
  } catch (error) {
    console.error('API服务器→ 处理异常:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
})

export function startApiServer() {
  server.listen(API_PORT, '127.0.0.1', () => {
    console.log(`API服务器运行在 http://127.0.0.1:${API_PORT}`)
    log.info(`API服务器运行在 http://127.0.0.1:${API_PORT}`)
  })
}
