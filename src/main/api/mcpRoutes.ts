/**
 * @file mcpRoutes.ts
 * @description MCP (Multimodal Context Preservation) API路由
 * 实现外部AI助手通过API访问Anteey笔记内容的路由处理
 */

import express from 'express'
import * as mcpService from '../../services/mcp/mcpService'
import log from 'electron-log'

// 创建路由实例
const router = express.Router()

// 中间件：API密钥验证
const validateApiKey = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> => {
  try {
    // 从请求头中获取API密钥
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: '未提供有效的API密钥'
      })
      return
    }

    const apiKey = authHeader.substring(7) // 去掉 "Bearer " 前缀

    // 验证API密钥
    const isValid = await mcpService.validateApiKey(apiKey)

    if (!isValid) {
      res.status(401).json({
        success: false,
        error: 'API密钥无效或已过期'
      })
      return
    }

    // 验证通过，继续处理请求
    next()
  } catch (error) {
    log.error('API密钥验证失败:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    })
  }
}

// 中间件：请求日志记录
const logRequest = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void => {
  // 记录请求开始时间
  const start = Date.now()

  // 记录请求信息
  log.info(`MCP API请求: ${req.method} ${req.path}`, {
    query: req.query,
    params: req.params,
    ip: req.ip
  })

  // 在响应结束时记录时间
  res.on('finish', () => {
    const duration = Date.now() - start
    log.info(`MCP API响应: ${req.method} ${req.path}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`
    })
  })

  next()
}

// 应用中间件
router.use(logRequest)
router.use(validateApiKey)

// 验证API密钥接口
router.post('/auth/verify', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { apiKey } = req.body

    if (!apiKey) {
      res.setHeader('Content-Type', 'application/json')
      res.status(400)
      res.end(
        JSON.stringify({
          success: false,
          error: '缺少API密钥'
        })
      )
      return
    }

    const isValid = await mcpService.validateApiKey(apiKey)

    res.setHeader('Content-Type', 'application/json')
    res.status(200)
    res.end(
      JSON.stringify({
        valid: isValid,
        expires: null // 目前不支持过期时间
      })
    )
  } catch (error) {
    log.error('验证API密钥失败:', error)
    res.setHeader('Content-Type', 'application/json')
    res.status(500)
    res.end(
      JSON.stringify({
        success: false,
        error: '服务器内部错误'
      })
    )
  }
})

// 搜索笔记接口
router.get('/notes/search', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    // 解析查询参数
    const query = (req.query.query as string) || ''
    const limit = parseInt(req.query.limit as string) || 10
    const offset = parseInt(req.query.offset as string) || 0

    // 解析标签和卡片类型参数（逗号分隔的字符串）
    const tags = req.query.tags ? (req.query.tags as string).split(',') : []
    const cardTypes = req.query.cardTypes ? (req.query.cardTypes as string).split(',') : []

    // 其他过滤参数
    const cardBoxId = req.query.cardBoxId as string
    const startDate = req.query.startDate as string
    const endDate = req.query.endDate as string

    // 调用服务方法进行搜索
    const notes = await mcpService.searchNotes({
      query,
      limit,
      offset,
      tags,
      cardTypes,
      cardBoxId,
      startDate,
      endDate
    })

    res.setHeader('Content-Type', 'application/json')
    res.status(200)
    res.end(
      JSON.stringify({
        success: true,
        data: notes,
        meta: {
          count: notes.length,
          limit,
          offset
        }
      })
    )
  } catch (error) {
    log.error('搜索笔记失败:', error)
    res.setHeader('Content-Type', 'application/json')
    res.status(500)
    res.end(
      JSON.stringify({
        success: false,
        error: '搜索笔记时出错'
      })
    )
  }
})

// 获取最近更新的笔记接口
router.get('/notes/recent', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10

    // 调用服务方法获取最近更新的笔记
    const notes = await mcpService.searchNotes({
      limit,
      offset: 0
    })

    res.setHeader('Content-Type', 'application/json')
    res.status(200)
    res.end(
      JSON.stringify({
        success: true,
        data: notes,
        meta: {
          count: notes.length,
          limit
        }
      })
    )
  } catch (error) {
    log.error('获取最近笔记失败:', error)
    res.setHeader('Content-Type', 'application/json')
    res.status(500)
    res.end(
      JSON.stringify({
        success: false,
        error: '获取最近笔记时出错'
      })
    )
  }
})

// 获取单个笔记接口
router.get('/notes/:id', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const noteId = req.params.id

    if (!noteId) {
      res.setHeader('Content-Type', 'application/json')
      res.status(400)
      res.end(
        JSON.stringify({
          success: false,
          error: '缺少笔记ID'
        })
      )
      return
    }

    const note = await mcpService.getNoteById(noteId)

    if (!note) {
      res.setHeader('Content-Type', 'application/json')
      res.status(404)
      res.end(
        JSON.stringify({
          success: false,
          error: '笔记不存在'
        })
      )
      return
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
    log.error('获取笔记失败:', error)
    res.setHeader('Content-Type', 'application/json')
    res.status(500)
    res.end(
      JSON.stringify({
        success: false,
        error: '获取笔记时出错'
      })
    )
  }
})

// 获取服务状态接口
router.get('/status', async (_req: express.Request, res: express.Response): Promise<void> => {
  try {
    const status = await mcpService.getServiceStatus()

    // 设置响应头
    res.setHeader('Content-Type', 'application/json')
    res.status(200)

    // 发送响应
    res.end(
      JSON.stringify({
        success: true,
        data: status
      })
    )
  } catch (error) {
    log.error('获取服务状态失败:', error)

    // 设置错误响应头
    res.setHeader('Content-Type', 'application/json')
    res.status(500)

    // 发送错误响应
    res.end(
      JSON.stringify({
        success: false,
        error: '获取服务状态时出错'
      })
    )
  }
})

// 导出路由
export default router
