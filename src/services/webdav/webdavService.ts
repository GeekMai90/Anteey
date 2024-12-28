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
import { WebDAVConfig, SyncState } from '../../renderer/src/types/WebDAV'
import { db } from '../../db/config'
import { encrypt, decrypt } from '../utils/crypto'

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

    const updateData = {
      ...config,
      id,
      enabled: config.enabled ?? false,
      serverType: config.serverType || 'jianguoyun',
      syncInterval: config.syncInterval || 15,
      autoSync: config.autoSync ?? false,
      syncDirection: config.syncDirection || 'bidirectional',
      syncFileTypes: config.syncFileTypes
        ? JSON.stringify(config.syncFileTypes)
        : JSON.stringify(['all']),
      updatedAt: now,
      password: config.password ? encrypt(config.password) : undefined
    }

    const existingConfig = await db('webdav_config').first()
    if (existingConfig) {
      await db('webdav_config').update(updateData)
    } else {
      await db('webdav_config').insert({
        ...updateData,
        createdAt: now
      })
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

  // 执行同步
  async sync(): Promise<void> {
    try {
      this.updateState({ status: 'syncing', progress: 0 })

      // 0. 确保远程根目录存在
      const client = await this.getClient()
      if (!(await client.exists('/antinet'))) {
        await client.createDirectory('/antinet')
      }

      // 1. 同步数据库
      this.updateState({ currentFile: 'antinet.sqlite', progress: 25 })
      await this.syncDatabase()

      // 2. 同步图片文件夹
      this.updateState({ currentFile: 'images/', progress: 50 })
      await this.syncImages()

      this.updateState({ status: 'completed', progress: 100 })
    } catch (error: unknown) {
      this.updateState({
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      })
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
    for (const file of localFiles) {
      const remotePath = path.join(remoteImagesPath, file.name).replace(/\\/g, '/')
      if (!remoteFiles.has(file.name) || file.mtime > remoteFiles.get(file.name)!) {
        await this.uploadFile(file.path, remotePath)
      }
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
}

export const webdavService = new WebDAVService()
