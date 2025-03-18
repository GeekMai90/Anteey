import { EventEmitter } from 'events'
import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { S3Config, S3SyncState, S3SyncHistory } from '@shared/types'
import { db } from '../../db/config'
import { encrypt, decrypt } from '../utils/crypto'
import { dialog } from 'electron'
import type {
  S3Client,
  ListObjectsV2CommandOutput,
  _Object as S3Object,
  GetObjectCommandOutput,
  HeadObjectCommandOutput,
  S3ClientConfig
} from '@aws-sdk/client-s3'
import { Readable } from 'stream'

// S3 模块动态导入
let s3Module: typeof import('@aws-sdk/client-s3') | null = null
async function getS3Module() {
  if (!s3Module) {
    s3Module = await import('@aws-sdk/client-s3')
  }
  return s3Module
}

export class S3Service extends EventEmitter {
  private client: S3Client | null = null
  private syncState: S3SyncState = {
    status: 'idle',
    progress: 0,
    type: 'manual'
  }
  private autoSyncTimer: NodeJS.Timeout | null = null
  private readonly DB_IDLE_CHECK_INTERVAL = 1000 // 检查数据库空闲状态的间隔（毫秒）
  private readonly DB_IDLE_TIMEOUT = 3000 // 数据库空闲超过3秒才认为是真正空闲

  private lastDbAccessTime: number = 0
  private dbIdleCheckTimer: NodeJS.Timeout | null = null
  private dbBusyCount: number = 0
  private isSyncing: boolean = false // 添加同步状态标志

  constructor() {
    super()
    this.initDbActivityMonitor()
    // 初始化完成后启动自动同步
    this.initAutoSync()
  }

  // 初始化数据库活动监控
  private initDbActivityMonitor(): void {
    // 监听查询开始
    db.on('query', () => {
      this.dbBusyCount++
      this.lastDbAccessTime = Date.now()
    })

    // 监听查询结束
    db.on('query-response', () => {
      this.dbBusyCount = Math.max(0, this.dbBusyCount - 1)
      if (this.dbBusyCount === 0) {
        this.lastDbAccessTime = Date.now()
      }
    })

    // 监听查询错误
    db.on('query-error', () => {
      this.dbBusyCount = Math.max(0, this.dbBusyCount - 1)
      if (this.dbBusyCount === 0) {
        this.lastDbAccessTime = Date.now()
      }
    })
  }

  // 检查数据库是否空闲
  private async isDatabaseIdle(): Promise<boolean> {
    return new Promise((resolve) => {
      const checkIdle = () => {
        // 检查是否有正在进行的查询
        if (this.dbBusyCount > 0) {
          this.dbIdleCheckTimer = setTimeout(checkIdle, this.DB_IDLE_CHECK_INTERVAL)
          return
        }

        // 检查最后访问时间
        const idleTime = Date.now() - this.lastDbAccessTime
        if (idleTime >= this.DB_IDLE_TIMEOUT) {
          resolve(true)
        } else {
          this.dbIdleCheckTimer = setTimeout(checkIdle, this.DB_IDLE_CHECK_INTERVAL)
        }
      }

      checkIdle()
    })
  }

  // 获取配置
  async getConfig(): Promise<S3Config | null> {
    const config = await db('s3_config').first()
    if (!config) return null

    // 解析 JSON 字符串
    const syncFileTypes = config.syncFileTypes ? JSON.parse(config.syncFileTypes) : ['all']

    return {
      ...config,
      secretAccessKey: decrypt(config.secretAccessKey), // 解密密钥
      syncFileTypes
    }
  }

  // 获取所有提供商的配置
  async getAllProviderConfigs(): Promise<Record<string, any>> {
    try {
      // 获取所有提供商的配置
      const configs = await db('s3_provider_configs').select('*')

      // 转换为 { [provider]: config } 格式
      const result: Record<string, any> = {}

      configs.forEach((config) => {
        result[config.provider] = {
          ...config,
          secretAccessKey: decrypt(config.secretAccessKey)
        }
      })

      // 添加当前活动的配置
      const currentConfig = await this.getConfig()
      if (currentConfig) {
        result[currentConfig.provider] = {
          ...currentConfig
        }
      }

      return result
    } catch (error) {
      console.error('获取所有提供商配置失败:', error)
      return {}
    }
  }

  // 更新配置
  async updateConfig(
    config: Partial<S3Config>,
    options: { restartSync?: boolean } = {}
  ): Promise<S3Config> {
    try {
      // 设置默认选项
      const finalOptions = {
        restartSync: false,
        ...(options || {})
      }

      console.log('s3Service → 开始更新配置:', { config, options: finalOptions })

      const id = config.id || uuidv4()
      const now = new Date()

      // 先获取现有配置
      const existingConfig = await db('s3_config').first()
      console.log('s3Service → 获取到现有配置:', { existingConfig: !!existingConfig })

      // 如果提供商发生了变化，我们需要保存当前提供商的配置
      if (existingConfig && existingConfig.provider) {
        try {
          // 检查是否已有该提供商的配置
          const providerConfig = await db('s3_provider_configs')
            .where('provider', existingConfig.provider)
            .first()

          // 保存当前的配置到提供商特定的表中
          const providerData = {
            id: providerConfig?.id || uuidv4(),
            provider: existingConfig.provider,
            region: existingConfig.region,
            bucket: existingConfig.bucket,
            accessKeyId: existingConfig.accessKeyId,
            secretAccessKey: existingConfig.secretAccessKey,
            endpoint: existingConfig.endpoint,
            updatedAt: now,
            createdAt: providerConfig?.createdAt || now
          }

          if (providerConfig) {
            await db('s3_provider_configs').where('id', providerConfig.id).update(providerData)
          } else {
            await db('s3_provider_configs').insert(providerData)
          }
          console.log('s3Service → 已保存现有提供商配置')
        } catch (providerError) {
          console.error('s3Service → 保存提供商配置失败:', providerError)
          // 继续执行，不要因为这个错误中断整个过程
        }
      }

      // 如果新的提供商有保存的配置，则加载它
      if (config.provider && config.provider !== existingConfig?.provider) {
        try {
          const newProviderConfig = await db('s3_provider_configs')
            .where('provider', config.provider)
            .first()

          if (newProviderConfig) {
            // 将保存的提供商配置合并到当前配置中
            config = {
              ...config,
              region: config.region || newProviderConfig.region,
              bucket: config.bucket || newProviderConfig.bucket,
              accessKeyId: config.accessKeyId || newProviderConfig.accessKeyId,
              secretAccessKey: config.secretAccessKey || decrypt(newProviderConfig.secretAccessKey),
              endpoint: config.endpoint || newProviderConfig.endpoint
            }
            console.log('s3Service → 已加载新提供商的配置')
          }
        } catch (newProviderError) {
          console.error('s3Service → 加载新提供商配置失败:', newProviderError)
          // 继续执行，不要因为这个错误中断整个过程
        }
      }

      const updateData = {
        ...(existingConfig || {}),
        ...config,
        id,
        updatedAt: now,
        enabled: config.enabled ?? existingConfig?.enabled ?? false,
        provider: config.provider || existingConfig?.provider || 'aws',
        syncInterval: config.syncInterval ?? existingConfig?.syncInterval ?? 15,
        autoSync: config.autoSync ?? existingConfig?.autoSync ?? false,
        syncDirection: config.syncDirection || existingConfig?.syncDirection || 'bidirectional',
        syncFileTypes: config.syncFileTypes
          ? JSON.stringify(config.syncFileTypes)
          : existingConfig?.syncFileTypes || JSON.stringify(['all']),
        secretAccessKey: config.secretAccessKey
          ? encrypt(config.secretAccessKey)
          : existingConfig?.secretAccessKey
      }

      try {
        if (existingConfig) {
          await db('s3_config').update(updateData)
          console.log('s3Service → 已更新配置')
        } else {
          await db('s3_config').insert({
            ...updateData,
            createdAt: now
          })
          console.log('s3Service → 已创建新配置')
        }
      } catch (dbError) {
        console.error('s3Service → 数据库操作失败:', dbError)
        throw new Error(
          `数据库操作失败: ${dbError instanceof Error ? dbError.message : String(dbError)}`
        )
      }

      // 只有在明确指定时才重启自动同步
      if (finalOptions.restartSync === true) {
        try {
          console.log('s3Service → 重启自动同步')
          await this.startAutoSync()
        } catch (syncError) {
          console.error('s3Service → 重启自动同步失败:', syncError)
          // 不要因为自动同步失败而中断整个过程
        }
      } else {
        console.log('s3Service → 跳过重启自动同步')
      }

      const finalConfig = await this.getConfig()
      console.log('s3Service → 配置更新完成')
      return finalConfig as S3Config
    } catch (error) {
      console.error('s3Service → 更新配置发生异常:', error)
      throw error
    }
  }

  // 测试连接
  async testConnection(config: Partial<S3Config>): Promise<boolean> {
    if (!config.region || !config.bucket || !config.accessKeyId || !config.secretAccessKey) {
      throw new Error('S3 配置不完整')
    }

    const client = await this.createS3Client(config)

    try {
      // 尝试列出存储桶内容
      const { ListObjectsV2Command } = await getS3Module()
      await client.send(
        new ListObjectsV2Command({
          Bucket: config.bucket,
          MaxKeys: 1
        })
      )
      return true
    } catch (error: any) {
      // 如果错误是 NoSuchKey，说明连接成功但存储桶为空
      if (error.name === 'NoSuchKey') {
        return true
      }
      throw error
    }
  }

  // 添加记录同步历史的方法
  private async addSyncHistory(
    type: 'auto' | 'manual',
    status: 'success' | 'failed',
    error?: string
  ) {
    try {
      const config = await this.getConfig()
      await db('s3_sync_history').insert({
        id: uuidv4(),
        timestamp: new Date(),
        type,
        status,
        details: JSON.stringify({
          error,
          syncedFiles: status === 'success' ? 1 : 0,
          syncDirection: config?.syncDirection,
          provider: config?.provider
        }),
        createdAt: new Date()
      })
    } catch (err) {
      console.error('记录同步历史失败:', err)
    }
  }

  // 获取同步历史
  async getSyncHistory(): Promise<S3SyncHistory[]> {
    const history = await db('s3_sync_history').orderBy('timestamp', 'desc').limit(10)
    return history.map((item) => ({
      ...item,
      details: JSON.parse(item.details)
    }))
  }

  // 同步方法
  async sync(type: 'auto' | 'manual' = 'manual'): Promise<void> {
    // 如果已经在同步中，则返回
    if (this.isSyncing) {
      console.log('s3Service → 已有同步正在进行，忽略本次同步请求')
      return
    }

    this.isSyncing = true // 设置同步状态为进行中
    const syncStartTime = Date.now()
    console.log(`s3Service → 开始${type}同步，时间: ${new Date().toISOString()}`)

    try {
      // 开始同步时先停止自动同步定时器，避免在执行过程中被重复触发
      if (this.autoSyncTimer) {
        console.log('s3Service → 暂停自动同步定时器，等待当前同步完成')
        clearInterval(this.autoSyncTimer)
        this.autoSyncTimer = null
      }

      this.updateState({
        status: 'syncing',
        progress: 0,
        type,
        message: '等待数据库空闲...'
      })

      // 等待数据库空闲
      await this.isDatabaseIdle()
      console.log('s3Service → 数据库空闲，开始同步操作')

      this.updateState({
        status: 'syncing',
        progress: 10,
        type,
        message: '开始同步...'
      })

      // 原有的同步逻辑
      await this.getClient()
      console.log('s3Service → S3客户端已创建，检查远程目录')

      this.updateState({ status: 'syncing', progress: 10, message: '检查远程目录...' })

      const isFirstSync = !(await db('s3_sync_history').first())
      const remoteExists = await this.checkRemoteExists('antinet/antinet.sqlite')
      console.log(
        `s3Service → 远程文件检查结果: 首次同步=${isFirstSync}, 远程文件存在=${remoteExists}`
      )

      if (isFirstSync && remoteExists) {
        const shouldUseRemote = await this.confirmUseRemoteData()
        console.log(`s3Service → 用户选择: 使用远程数据=${shouldUseRemote}`)

        if (shouldUseRemote) {
          this.updateState({ status: 'syncing', progress: 30, message: '下载数据库...' })
          console.log('s3Service → 开始下载远程数据库')
          await this.downloadDatabase()

          this.updateState({ status: 'syncing', progress: 60, message: '下载图片...' })
          console.log('s3Service → 开始下载远程图片')
          await this.downloadImages()

          this.updateState({ status: 'completed', progress: 100, message: '同步完成' })
          console.log('s3Service → 首次同步完成，使用远程数据')
          await this.addSyncHistory(type, 'success')

          // 如果是自动同步模式，同步完成后恢复定时器
          if (type === 'auto') {
            await this.resumeAutoSyncTimer()
          }

          const totalTime = Date.now() - syncStartTime
          console.log(`s3Service → ${type}同步完成，总耗时: ${totalTime}ms`)
          return
        }
      }

      this.updateState({ status: 'syncing', progress: 30, message: '同步数据库...' })
      console.log('s3Service → 开始同步数据库文件')
      await this.syncDatabase()

      this.updateState({ status: 'syncing', progress: 60, message: '同步图片...' })
      console.log('s3Service → 开始同步图片文件')
      await this.syncImages()

      // 确保同步完成状态被正确设置
      this.updateState({ status: 'completed', progress: 100, message: '同步完成' })
      console.log('s3Service → 所有文件同步完成')
      await this.addSyncHistory(type, 'success')

      // 如果是自动同步模式，同步完成后恢复定时器
      if (type === 'auto') {
        await this.resumeAutoSyncTimer()
      }

      const totalTime = Date.now() - syncStartTime
      console.log(`s3Service → ${type}同步完成，总耗时: ${totalTime}ms`)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`s3Service → 同步失败: ${errorMessage}`, error)

      this.updateState({
        status: 'error',
        error: errorMessage,
        type,
        message: '同步失败'
      })
      await this.addSyncHistory(type, 'failed', errorMessage)
      throw error
    } finally {
      // 清理定时器
      if (this.dbIdleCheckTimer) {
        clearTimeout(this.dbIdleCheckTimer)
        this.dbIdleCheckTimer = null
      }

      const totalTime = Date.now() - syncStartTime
      console.log(
        `s3Service → ${type}同步${this.syncState.status === 'error' ? '失败' : '完成'}，总耗时: ${totalTime}ms`
      )
      this.isSyncing = false // 重置同步状态
    }
  }

  // 同步数据库文件
  private async syncDatabase(): Promise<void> {
    await this.getClient() // 确保连接正常
    const localPath = path.join(this.getLocalBasePath(), 'antinet.sqlite')
    const remotePath = 'antinet/antinet.sqlite'

    try {
      const localStat = await fs.stat(localPath)
      const remoteExists = await this.checkRemoteExists(remotePath)

      if (!remoteExists) {
        await this.uploadFile(localPath, remotePath)
      } else {
        const remoteInfo = await this.getRemoteFileInfo(remotePath)
        const remoteTime = new Date(remoteInfo.LastModified!)

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
    await this.getClient() // 确保连接正常
    const config = await this.getConfig()
    if (!config) throw new Error('S3 配置不存在')

    const localImagesPath = path.join(this.getLocalBasePath(), 'images')
    const remoteImagesPath = 'antinet/images'

    // 确保本地目录存在
    try {
      await fs.access(localImagesPath)
    } catch {
      await fs.mkdir(localImagesPath, { recursive: true })
    }

    // 获取本地和远程文件列表
    const localFiles = await this.getLocalImageFiles()
    const remoteFiles = await this.getRemoteImageFiles()

    // 创建文件映射
    const localFileMap = new Map(localFiles.map((f) => [f.name, f]))
    const remoteFileNames = Array.from(remoteFiles.keys())

    // 根据同步方向处理文件
    const syncDirection = config.syncDirection || 'bidirectional'

    // 计算需要处理的文件
    let filesToDelete: string[] = []
    let filesToDownload: string[] = []

    if (syncDirection === 'upload' || syncDirection === 'bidirectional') {
      filesToDelete = remoteFileNames.filter((fileName) => !localFileMap.has(fileName))
    }

    if (syncDirection === 'download') {
      filesToDownload = remoteFileNames.filter((fileName) => !localFileMap.has(fileName))
    } else if (syncDirection === 'bidirectional') {
      filesToDownload = remoteFileNames.filter((fileName) => {
        const localFile = localFileMap.get(fileName)
        const remoteModTime = remoteFiles.get(fileName)
        return localFile && remoteModTime && remoteModTime > localFile.mtime
      })
    }

    // 计算总任务数
    const totalTasks = localFiles.length + filesToDownload.length + filesToDelete.length
    let completedTasks = 0

    // 1. 处理本地文件上传
    if (syncDirection === 'upload' || syncDirection === 'bidirectional') {
      for (const file of localFiles) {
        const remotePath = `${remoteImagesPath}/${file.name}`
        const remoteModTime = remoteFiles.get(file.name)

        if (!remoteModTime || file.mtime > remoteModTime) {
          this.updateState({
            status: 'syncing',
            progress: 60 + Math.floor((completedTasks / totalTasks) * 30),
            message: `上传图片: ${file.name}`
          })
          await this.uploadFile(file.path, remotePath)
        }
        completedTasks++
      }
    }

    // 2. 处理需要下载的文件
    for (const fileName of filesToDownload) {
      const localPath = path.join(localImagesPath, fileName)
      const remotePath = `${remoteImagesPath}/${fileName}`

      this.updateState({
        status: 'syncing',
        progress: 60 + Math.floor((completedTasks / totalTasks) * 30),
        message: `下载图片: ${fileName}`
      })
      await this.downloadFile(remotePath, localPath)
      completedTasks++
    }

    // 3. 处理需要删除的远程文件
    for (const fileName of filesToDelete) {
      const remotePath = `${remoteImagesPath}/${fileName}`
      this.updateState({
        status: 'syncing',
        progress: 60 + Math.floor((completedTasks / totalTasks) * 30),
        message: `删除远程图片: ${fileName}`
      })
      await this.deleteRemoteFile(remotePath)
      completedTasks++
    }
  }

  // 工具方法
  private async getClient(): Promise<S3Client> {
    const config = await this.getConfig()
    if (!config) throw new Error('S3 配置不存在')

    // 每次获取客户端时都创建新的实例，以确保使用最新的配置
    this.client = null
    this.client = await this.createS3Client(config)
    return this.client
  }

  private async createS3Client(config: Partial<S3Config>): Promise<S3Client> {
    const { S3Client } = await getS3Module()

    const clientConfig: S3ClientConfig = {
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId!,
        secretAccessKey: config.secretAccessKey!
      }
    }

    // 根据不同的服务提供商构建 endpoint
    if (config.provider === 'aliyun') {
      // 阿里云 OSS 的 endpoint 格式：https://oss-cn-beijing.aliyuncs.com
      clientConfig.endpoint = `https://${config.region}.aliyuncs.com`
      clientConfig.forcePathStyle = false // 阿里云 OSS 使用虚拟主机样式
    } else if (config.provider === 'tencent') {
      // 腾讯云 COS 的正确端点格式
      // 不需要在这里指定完整域名，SDK 会自动处理
      clientConfig.endpoint = `https://cos.${config.region}.myqcloud.com`
      clientConfig.forcePathStyle = false // 腾讯云 COS 必须使用虚拟主机样式
    } else if (config.provider === 'binfenyun') {
      // 缤纷云 S3 服务，使用固定端点
      clientConfig.endpoint = `https://s3.bitiful.net`
      clientConfig.forcePathStyle = true // 使用路径样式访问
      // 缤纷云只有一个区域
      clientConfig.region = 'cn-east-1'
    }

    return new S3Client(clientConfig)
  }

  private getLocalBasePath(): string {
    return path.join(app.getPath('userData'), 'UserData')
  }

  private updateState(update: Partial<S3SyncState>): void {
    const type = update.type || this.syncState.type
    this.syncState = {
      ...this.syncState,
      ...update,
      type
    }
    this.notifyStateChange()
  }

  private notifyStateChange(): void {
    this.emit('sync-state-changed', this.syncState)
  }

  private async uploadFile(localPath: string, remotePath: string): Promise<void> {
    const client = await this.getClient()
    const config = await this.getConfig()
    if (!config) throw new Error('S3 配置不存在')

    const { PutObjectCommand } = await getS3Module()
    const content = await fs.readFile(localPath)

    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: remotePath,
        Body: content
      })
    )
  }

  private async downloadFile(remotePath: string, localPath: string): Promise<void> {
    const client = await this.getClient()
    const config = await this.getConfig()
    if (!config) throw new Error('S3 配置不存在')

    try {
      const { GetObjectCommand } = await getS3Module()
      const response = (await client.send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: remotePath
        })
      )) as GetObjectCommandOutput

      if (!response.Body) {
        throw new Error(`下载文件失败：${remotePath} 响应体为空`)
      }

      // 将 response.Body 转换为 Readable 流
      const stream = Readable.from(response.Body as any)
      const chunks: Buffer[] = []

      // 使用事件监听方式处理流
      await new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        stream.on('end', resolve)
        stream.on('error', (err) =>
          reject(new Error(`下载文件 ${remotePath} 失败: ${err.message}`))
        )
      })

      const buffer = Buffer.concat(chunks)
      await fs.writeFile(localPath, buffer)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`下载文件 ${remotePath} 失败: ${errorMessage}`)
    }
  }

  private async deleteRemoteFile(remotePath: string): Promise<void> {
    const client = await this.getClient()
    const config = await this.getConfig()
    if (!config) throw new Error('S3 配置不存在')

    const { DeleteObjectCommand } = await getS3Module()
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: remotePath
      })
    )
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
    const config = await this.getConfig()
    if (!config) throw new Error('S3 配置不存在')

    const { ListObjectsV2Command } = await getS3Module()
    const response = (await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: 'antinet/images/'
      })
    )) as ListObjectsV2CommandOutput

    return new Map(
      response.Contents?.filter((file: S3Object) => file.Key !== 'antinet/images/').map(
        (file: S3Object) => [path.basename(file.Key!), new Date(file.LastModified!)]
      ) || []
    )
  }

  private async checkRemoteExists(remotePath: string): Promise<boolean> {
    try {
      const client = await this.getClient()
      const config = await this.getConfig()
      if (!config) throw new Error('S3 配置不存在')

      const { HeadObjectCommand } = await getS3Module()
      await client.send(
        new HeadObjectCommand({
          Bucket: config.bucket,
          Key: remotePath
        })
      )
      return true
    } catch (error) {
      return false
    }
  }

  private async getRemoteFileInfo(remotePath: string): Promise<HeadObjectCommandOutput> {
    const client = await this.getClient()
    const config = await this.getConfig()
    if (!config) throw new Error('S3 配置不存在')

    const { HeadObjectCommand } = await getS3Module()
    return await client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: remotePath
      })
    )
  }

  // 添加确认对话框
  private async confirmUseRemoteData(): Promise<boolean> {
    return new Promise((resolve) => {
      const options: Electron.MessageBoxOptions = {
        type: 'question',
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
    const localPath = path.join(this.getLocalBasePath(), 'antinet.sqlite')
    const remotePath = 'antinet/antinet.sqlite'

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
    const localImagesPath = path.join(this.getLocalBasePath(), 'images')
    const remoteImagesPath = 'antinet/images'

    // 确保本地目录存在
    try {
      await fs.access(localImagesPath)
    } catch {
      await fs.mkdir(localImagesPath, { recursive: true })
    }

    // 获取远程文件列表
    const remoteFiles = await this.getRemoteImageFiles()

    // 下载所有图片
    let completed = 0
    const total = remoteFiles.size

    for (const [fileName] of remoteFiles) {
      const localPath = path.join(localImagesPath, fileName)
      const remotePath = `${remoteImagesPath}/${fileName}`

      this.updateState({
        status: 'syncing',
        progress: 60 + Math.floor((completed / total) * 30),
        message: `下载图片 (${completed + 1}/${total}): ${fileName}`
      })

      await this.downloadFile(remotePath, localPath)
      completed++
    }
  }

  // 启动自动同步
  async startAutoSync(): Promise<void> {
    try {
      // 清除已有的定时器
      this.stopAutoSync()

      const config = await this.getConfig()
      if (!config) {
        console.log('未找到 S3 配置，不启动自动同步')
        return
      }

      if (!config.autoSync) {
        console.log('自动同步未启用')
        return
      }

      // 获取同步间隔（分钟）
      const interval = config.syncInterval || 15
      console.log(`启动自动同步，间隔：${interval}分钟，原始值：${config.syncInterval}`)

      // 立即执行一次同步
      console.log('执行首次同步...')
      await this.sync('auto')

      // 设置新的定时器（转换为毫秒）
      const intervalMs = interval * 60 * 1000 // 直接转换为毫秒，确保使用正确的间隔值
      console.log(`设置定时器，间隔（毫秒）：${intervalMs}`)

      this.autoSyncTimer = setInterval(async () => {
        try {
          const currentConfig = await this.getConfig()
          if (!currentConfig?.autoSync) {
            console.log('自动同步已禁用，停止定时器')
            this.stopAutoSync()
            return
          }

          console.log(`执行定时同步...当前时间: ${new Date().toISOString()}`)
          await this.sync('auto')
        } catch (error) {
          console.error('自动同步失败:', error)
        }
      }, intervalMs)

      // 保持定时器引用
      if (this.autoSyncTimer?.unref) {
        this.autoSyncTimer.unref()
      }
    } catch (error) {
      console.error('启动自动同步失败:', error)
      this.stopAutoSync()
    }
  }

  // 停止自动同步
  stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer)
      this.autoSyncTimer = null
    }
  }

  // 清理资源
  destroy(): void {
    this.stopAutoSync()
    if (this.dbIdleCheckTimer) {
      clearTimeout(this.dbIdleCheckTimer)
      this.dbIdleCheckTimer = null
    }
  }

  // 初始化自动同步
  private async initAutoSync(): Promise<void> {
    try {
      const config = await this.getConfig()
      if (config?.autoSync) {
        console.log('应用启动，检测到自动同步已启用，开始同步...')
        await this.startAutoSync()
      }
    } catch (error) {
      console.error('初始化自动同步失败:', error)
    }
  }

  // 恢复自动同步定时器
  private async resumeAutoSyncTimer(): Promise<void> {
    try {
      const config = await this.getConfig()
      if (config?.autoSync) {
        // 获取同步间隔（分钟）
        const interval = config.syncInterval || 15
        console.log(
          `s3Service → 恢复自动同步定时器，间隔：${interval}分钟，原始值：${config.syncInterval}`
        )

        // 设置新的定时器（转换为毫秒）
        const intervalMs = interval * 60 * 1000 // 直接转换分钟为毫秒，确保使用正确的间隔
        console.log(`s3Service → 设置定时器间隔为${intervalMs}毫秒`)

        this.autoSyncTimer = setInterval(async () => {
          try {
            const currentConfig = await this.getConfig()
            if (!currentConfig?.autoSync) {
              console.log('自动同步已禁用，停止定时器')
              this.stopAutoSync()
              return
            }

            console.log(`执行定时同步...当前时间: ${new Date().toISOString()}`)
            await this.sync('auto')
          } catch (error) {
            console.error('自动同步失败:', error)
          }
        }, intervalMs)

        // 保持定时器引用
        if (this.autoSyncTimer?.unref) {
          this.autoSyncTimer.unref()
        }
      }
    } catch (error) {
      console.error('恢复自动同步定时器失败:', error)
    }
  }
}

export const s3Service = new S3Service()
