// 添加类型定义
interface FileStat {
  filename: string
  basename: string
  lastmod: string
  size: number
  type: string
  props?: {
    getlastmodified?: string
    ['d:getlastmodified']?: string
  }
}

interface ResponseDataDetailed<T> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
}

// 导入顺序调整
import { EventEmitter } from 'events'
import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { WebDAVConfig, SyncState, SyncHistory } from '../../renderer/src/types/WebDAV'
import { db } from '../../db/config'
import { encrypt, decrypt } from '../utils/crypto'
import { dialog } from 'electron'

// WebDAV 模块动态导入
let webdavModule: any = null
async function getWebDAVModule() {
  if (!webdavModule) {
    webdavModule = await import('webdav')
  }
  return webdavModule
}

export class WebDAVService extends EventEmitter {
  private client: any = null
  private syncState: SyncState = {
    status: 'idle',
    progress: 0
  }
  private autoSyncTimer: NodeJS.Timeout | null = null

  constructor() {
    super()
  }

  // 获取配置
  async getConfig(): Promise<WebDAVConfig | null> {
    const config = await db('webdav_config').first()
    if (!config) return null

    // 解析 JSON 字符串
    const syncFileTypes = config.syncFileTypes ? JSON.parse(config.syncFileTypes) : ['all']

    return {
      ...config,
      password: decrypt(config.password), // 解密密码
      syncFileTypes // 解析后的数组
    }
  }

  // 更新配置
  async updateConfig(config: Partial<WebDAVConfig>): Promise<WebDAVConfig> {
    const id = config.id || uuidv4()
    const now = new Date()

    // 先获取现有配置
    const existingConfig = await db('webdav_config').first()

    const updateData = {
      ...(existingConfig || {}), // 保留现有配置
      ...config, // 合并新配置
      id,
      updatedAt: now,
      // 只在提供新值时才更新这些字段
      enabled: config.enabled ?? existingConfig?.enabled ?? false,
      serverType: config.serverType || existingConfig?.serverType || 'jianguoyun',
      syncInterval: config.syncInterval ?? existingConfig?.syncInterval ?? 15,
      autoSync: config.autoSync ?? existingConfig?.autoSync ?? false,
      syncDirection: config.syncDirection || existingConfig?.syncDirection || 'bidirectional',
      syncFileTypes: config.syncFileTypes
        ? JSON.stringify(config.syncFileTypes)
        : existingConfig?.syncFileTypes || JSON.stringify(['all']),
      password: config.password ? encrypt(config.password) : existingConfig?.password
    }

    if (existingConfig) {
      await db('webdav_config').update(updateData)
    } else {
      await db('webdav_config').insert({
        ...updateData,
        createdAt: now
      })
    }

    // 根据新配置更新自动同步状态
    if (config.autoSync !== undefined || config.syncInterval !== undefined) {
      await this.startAutoSync()
    }

    return this.getConfig() as Promise<WebDAVConfig>
  }

  // 测试连接
  async testConnection(config: Partial<WebDAVConfig>): Promise<boolean> {
    try {
      if (!config.url || !config.username || !config.password) {
        console.error('WebDAV 配置不完整')
        return false
      }

      const { createClient } = await getWebDAVModule()
      const client = createClient(config.url, {
        username: config.username,
        password: config.password
      })

      // 尝试列出根目录内容
      await client.getDirectoryContents('/')
      return true
    } catch (error) {
      console.error('WebDAV 连接测试失败:', error)
      return false
    }
  }

  // 添加记录同步历史的方法
  private async addSyncHistory(
    type: 'auto' | 'manual',
    status: 'success' | 'failed',
    error?: string
  ) {
    try {
      await db('webdav_sync_history').insert({
        id: uuidv4(),
        timestamp: new Date(),
        type,
        status,
        details: JSON.stringify({
          error,
          syncedFiles: status === 'success' ? 1 : 0 // 这里可以统计实际同步的文件数
        })
      })
    } catch (err) {
      console.error('记录同步历史失败:', err)
    }
  }

  // 获取同步历史
  async getSyncHistory(): Promise<SyncHistory[]> {
    const history = await db('webdav_sync_history').orderBy('timestamp', 'desc').limit(10) // 只显示最近10条记录
    return history
  }

  // 修改 sync 方法，添加历史记录
  async sync(type: 'auto' | 'manual' = 'manual'): Promise<void> {
    try {
      this.updateState({ status: 'syncing', progress: 0 })

      // 0. 确保远程根目录存在
      const client = await this.getClient()
      this.updateState({ status: 'syncing', progress: 10, message: '检查远程目录...' })
      if (!(await client.exists('/antinet'))) {
        await client.createDirectory('/antinet')
      }

      // 检查是否是首次同步
      const isFirstSync = !(await db('webdav_sync_history').first())
      const remoteExists = await client.exists('/antinet/antinet.sqlite')

      // 如果是首次同步且远程已有数据，优先使用远程数据
      if (isFirstSync && remoteExists) {
        const shouldUseRemote = await this.confirmUseRemoteData()
        if (shouldUseRemote) {
          this.updateState({ status: 'syncing', progress: 30, message: '下载数据库...' })
          await this.downloadDatabase()
          this.updateState({ status: 'syncing', progress: 60, message: '下载图片...' })
          await this.downloadImages()
          this.updateState({ status: 'completed', progress: 100, message: '同步完成' })
          await this.addSyncHistory(type, 'success')
          return
        }
      }

      // 正常同步流程
      this.updateState({ status: 'syncing', progress: 30, message: '同步数据库...' })
      await this.syncDatabase()
      this.updateState({ status: 'syncing', progress: 60, message: '同步图片...' })
      await this.syncImages()

      this.updateState({ status: 'completed', progress: 100, message: '同步完成' })
      await this.addSyncHistory(type, 'success')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.updateState({
        status: 'error',
        error: errorMessage,
        message: '同步失败'
      })
      await this.addSyncHistory(type, 'failed', errorMessage)
      throw error
    }
  }

  // 同步数据库文件
  private async syncDatabase(): Promise<void> {
    const client = await this.getClient()
    const localPath = path.join(this.getLocalBasePath(), 'antinet.sqlite')
    const remotePath = '/antinet/antinet.sqlite'

    try {
      const localStat = await fs.stat(localPath)
      const remoteExists = await client.exists(remotePath)

      if (!remoteExists) {
        await this.uploadFile(localPath, remotePath)
      } else {
        const remoteInfo = await client.stat(remotePath)
        const remoteTime = new Date(this.getLastModified(remoteInfo))

        if (localStat.mtime > remoteTime) {
          await this.uploadFile(localPath, remotePath)
        } else {
          await this.downloadFile(remotePath, localPath)
        }
      }
    } catch (error) {
      console.error('同步数据库文件失败:', error)
      throw error
    }
  }

  // 同步图片文件夹
  private async syncImages(): Promise<void> {
    const client = await this.getClient()
    const localImagesPath = path.join(this.getLocalBasePath(), 'images')
    const remoteImagesPath = '/antinet/images'

    // 确保本地和远程目录都存在
    try {
      await fs.access(localImagesPath)
    } catch {
      await fs.mkdir(localImagesPath, { recursive: true })
    }

    // 确保远程目录存在
    if (!(await client.exists(remoteImagesPath))) {
      await client.createDirectory(remoteImagesPath)
    }

    // 获取本地和远程文件列表
    const localFiles = await this.getLocalImageFiles()
    const remoteFiles = await this.getRemoteImageFiles()

    // 同步文件
    let completed = 0
    const total = localFiles.length

    for (const file of localFiles) {
      const remotePath = path.join(remoteImagesPath, file.name).replace(/\\/g, '/')
      if (!remoteFiles.has(file.name) || file.mtime > remoteFiles.get(file.name)!) {
        this.updateState({
          status: 'syncing',
          progress: 60 + Math.floor((completed / total) * 30),
          message: `同步图片 (${completed + 1}/${total}): ${file.name}`
        })
        await this.uploadFile(file.path, remotePath)
      }
      completed++
    }
  }

  // 工具方法
  private async getClient(): Promise<any> {
    if (this.client) return this.client

    const config = await this.getConfig()
    if (!config) throw new Error('WebDAV 配置不存在')

    const { createClient } = await getWebDAVModule()
    this.client = createClient(config.url, {
      username: config.username,
      password: config.password
    })

    return this.client
  }

  private getLocalBasePath(): string {
    return path.join(app.getPath('userData'), 'UserData')
  }

  private updateState(update: Partial<SyncState>): void {
    this.syncState = { ...this.syncState, ...update }
    this.notifyStateChange()
  }

  private notifyStateChange(): void {
    this.emit('sync-state-changed', this.syncState)
  }

  private async uploadFile(localPath: string, remotePath: string): Promise<void> {
    const client = await this.getClient()
    const content = await fs.readFile(localPath)
    await client.putFileContents(remotePath, content)
  }

  private async downloadFile(remotePath: string, localPath: string): Promise<void> {
    const client = await this.getClient()
    const content = await client.getFileContents(remotePath, { format: 'binary' })

    // 处理不同类型的返回值
    let buffer: Buffer
    if (content instanceof ArrayBuffer) {
      buffer = Buffer.from(content)
    } else if (Buffer.isBuffer(content)) {
      buffer = content
    } else if (typeof content === 'string') {
      buffer = Buffer.from(content)
    } else {
      // 处理 ResponseDataDetailed 类型
      const data = (content as ResponseDataDetailed<any>).data
      if (data instanceof ArrayBuffer) {
        buffer = Buffer.from(data)
      } else if (Buffer.isBuffer(data)) {
        buffer = data
      } else {
        buffer = Buffer.from(String(data))
      }
    }

    await fs.writeFile(localPath, buffer)
  }

  private async getLocalImageFiles(): Promise<Array<{ name: string; path: string; mtime: Date }>> {
    const imagesPath = path.join(this.getLocalBasePath(), 'images')
    const files = await fs.readdir(imagesPath)

    return Promise.all(
      files.map(async (name) => {
        const filePath = path.join(imagesPath, name)
        const stat = await fs.stat(filePath)
        return {
          name,
          path: filePath,
          mtime: stat.mtime
        }
      })
    )
  }

  private async getRemoteImageFiles(): Promise<Map<string, Date>> {
    const client = await this.getClient()
    const response = await client.getDirectoryContents('/antinet/images')
    const files = Array.isArray(response) ? response : response.data

    return new Map(
      files.map((file: FileStat) => [
        path.basename(file.filename),
        new Date(this.getLastModified(file))
      ])
    )
  }

  private getLastModified(fileInfo: FileStat | ResponseDataDetailed<FileStat>): string {
    if ('data' in fileInfo) {
      const data = fileInfo.data
      return (
        data.lastmod ||
        data.props?.getlastmodified ||
        data.props?.['d:getlastmodified'] ||
        new Date().toISOString()
      )
    }

    return (
      fileInfo.lastmod ||
      fileInfo.props?.getlastmodified ||
      fileInfo.props?.['d:getlastmodified'] ||
      new Date().toISOString()
    )
  }

  // 添加确认对话框
  private async confirmUseRemoteData(): Promise<boolean> {
    return new Promise((resolve) => {
      const options: Electron.MessageBoxOptions = {
        type: 'question' as const,
        buttons: ['使用远程数据', '使用本地数据'],
        defaultId: 0,
        title: '同步确认',
        message: '检测到云端已有数据，如何处理？',
        detail:
          '选择"使用远程数据"将下载云端数据覆盖本地数据。\n选择"使用本地数据"将上传本地数据覆盖云端数据。'
      }

      dialog.showMessageBox(options).then(({ response }) => {
        resolve(response === 0)
      })
    })
  }

  // 添加专门的下载方法
  private async downloadDatabase(): Promise<void> {
    // const client = await this.getClient()
    const localPath = path.join(this.getLocalBasePath(), 'antinet.sqlite')
    const remotePath = '/antinet/antinet.sqlite'

    // 备份本地数据库
    const backupPath = `${localPath}.backup`
    await fs.copyFile(localPath, backupPath)

    try {
      await this.downloadFile(remotePath, localPath)
    } catch (error) {
      // 如果下载失败，恢复备份
      await fs.copyFile(backupPath, localPath)
      throw error
    } finally {
      // 清理备份
      await fs.unlink(backupPath).catch(() => {})
    }
  }

  private async downloadImages(): Promise<void> {
    const client = await this.getClient()
    const localImagesPath = path.join(this.getLocalBasePath(), 'images')
    const remoteImagesPath = '/antinet/images'

    // 确保本地目录存在
    try {
      await fs.access(localImagesPath)
    } catch {
      await fs.mkdir(localImagesPath, { recursive: true })
    }

    // 获取远程文件列表
    const response = await client.getDirectoryContents(remoteImagesPath)
    const files = Array.isArray(response) ? response : response.data

    // 下载所有图片
    let completed = 0
    const total = files.length

    for (const file of files) {
      const localPath = path.join(localImagesPath, path.basename(file.filename))
      const remotePath = path
        .join(remoteImagesPath, path.basename(file.filename))
        .replace(/\\/g, '/')
      this.updateState({
        status: 'syncing',
        progress: 60 + Math.floor((completed / total) * 30),
        message: `下载图片 (${completed + 1}/${total}): ${path.basename(file.filename)}`
      })
      await this.downloadFile(remotePath, localPath)
      completed++
    }
  }

  // 启动自动同步
  async startAutoSync(): Promise<void> {
    const config = await this.getConfig()
    if (!config || !config.autoSync) return

    // 清除已有的定时器
    this.stopAutoSync()

    // 设置新的定时器
    const interval = config.syncInterval || 15
    this.autoSyncTimer = setInterval(
      async () => {
        try {
          await this.sync('auto')
        } catch (error) {
          console.error('自动同步失败:', error)
        }
      },
      interval * 60 * 1000
    ) // 转换为毫秒
  }

  // 停止自动同步
  stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer)
      this.autoSyncTimer = null
    }
  }
}

export const webdavService = new WebDAVService()
