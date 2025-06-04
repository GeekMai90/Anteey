import { db } from '../../db/config'
import type { BackupSettings, BackupHistory } from '@shared/types'
import fs from 'fs'
import path from 'path'
import { dbPath } from '../../db/config'
import { app } from 'electron'

// 检查是否为开发环境
const isDev = process.env.NODE_ENV === 'development'

// 获取数据库路径
function getDbPath(): string {
  if (isDev) {
    // 开发环境：项目根目录的 devDb 文件夹
    const projectRoot = path.resolve(__dirname, '..', '..')
    const devDbDir = path.join(projectRoot, 'devDb')
    return path.join(devDbDir, 'dev_database.sqlite')
  } else {
    // 生产环境：在 antinet/UserData 文件夹下
    const antinetPath = app.getPath('userData')
    const userDataPath = path.join(antinetPath, 'UserData')
    return path.join(userDataPath, 'antinet.sqlite')
  }
}

export const backupService = {
  // 获取备份设置
  async getBackupSettings(): Promise<BackupSettings | null> {
    const settings = await db('backup_settings').first()
    if (!settings) return null
    return {
      ...settings,
      auto_backup: Boolean(settings.auto_backup)
    }
  },

  // 更新备份设置
  async updateBackupSettings(settings: Partial<BackupSettings>): Promise<void> {
    const current = await this.getBackupSettings()
    if (!current) {
      await db('backup_settings').insert({
        backup_path: settings.backup_path,
        auto_backup: settings.auto_backup,
        updated_at: new Date()
      })
    } else {
      const updateData: any = {
        updated_at: new Date()
      }

      if (settings.backup_path !== undefined) {
        updateData.backup_path = settings.backup_path
      }
      if (settings.auto_backup !== undefined) {
        updateData.auto_backup = settings.auto_backup
      }

      await db('backup_settings').update(updateData)
    }
  },

  // 获取备份历史
  async getBackupHistory(): Promise<BackupHistory[]> {
    return await db('backup_history').orderBy('created_at', 'desc').limit(15)
  },

  // 添加备份记录
  async addBackupHistory(history: Omit<BackupHistory, 'id' | 'created_at'>): Promise<void> {
    await db('backup_history').insert({
      backup_file_path: history.backup_file_path,
      backup_file_name: history.backup_file_name,
      backup_size: history.backup_size,
      created_at: new Date().toISOString()
    })
  },

  // 清理过期备份记录
  async cleanupOldBackups(): Promise<void> {
    const fifteenDaysAgo = new Date()
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)

    // 获取需要删除的备份记录
    const oldBackups = await db('backup_history')
      .where('created_at', '<', fifteenDaysAgo)
      .select('backup_file_path')

    // 删除实际备份文件
    for (const backup of oldBackups) {
      try {
        if (fs.existsSync(backup.backup_file_path)) {
          fs.unlinkSync(backup.backup_file_path)
        }
      } catch (error) {
        console.error('删除旧备份文件失败:', backup.backup_file_path, error)
      }
    }

    // 删除数据库记录
    await db('backup_history').where('created_at', '<', fifteenDaysAgo).delete()
  },

  // 清理超过数量限制的备份
  async cleanupExcessBackups(maxBackups = 15): Promise<void> {
    // 获取所有备份，按创建时间降序排序
    const allBackups = await db('backup_history')
      .orderBy('created_at', 'desc')
      .select('id', 'backup_file_path')

    // 如果备份数量超过限制，删除多余的备份
    if (allBackups.length > maxBackups) {
      const backupsToDelete = allBackups.slice(maxBackups)

      // 删除实际备份文件
      for (const backup of backupsToDelete) {
        try {
          if (fs.existsSync(backup.backup_file_path)) {
            fs.unlinkSync(backup.backup_file_path)
          }
        } catch (error) {
          console.error('删除多余备份文件失败:', backup.backup_file_path, error)
        }
      }

      // 删除数据库记录
      const idsToDelete = backupsToDelete.map((backup) => backup.id)
      await db('backup_history').whereIn('id', idsToDelete).delete()
    }
  },

  // 清空所有备份历史
  async clearBackupHistory(): Promise<void> {
    // 获取所有备份记录
    const allBackups = await db('backup_history').select('backup_file_path')

    // 删除所有备份文件
    for (const backup of allBackups) {
      try {
        if (fs.existsSync(backup.backup_file_path)) {
          fs.unlinkSync(backup.backup_file_path)
        }
      } catch (error) {
        console.error('删除备份文件失败:', backup.backup_file_path, error)
      }
    }

    // 删除所有数据库记录
    await db('backup_history').delete()
  },

  // 执行备份操作
  async performBackup(isAutoBackup = false): Promise<{
    path: string
    fileName: string
    size: number
  } | null> {
    const settings = await this.getBackupSettings()
    if (!settings?.backup_path) {
      return null
    }

    // 如果是自动备份，需要检查自动备份是否启用
    if (isAutoBackup && !settings.auto_backup) {
      return null
    }

    // 确保备份目录存在
    if (!fs.existsSync(settings.backup_path)) {
      fs.mkdirSync(settings.backup_path, { recursive: true })
    }

    const timestamp = new Date()
      .toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
      .replace(/[/:\s]/g, '-')
    const backupFileName = `antinet-backup-${timestamp}.db`
    const backupFilePath = path.join(settings.backup_path, backupFileName)

    // 复制数据库文件
    fs.copyFileSync(dbPath, backupFilePath)

    // 获取文件大小
    const stats = fs.statSync(backupFilePath)

    // 添加备份记录
    await this.addBackupHistory({
      backup_file_path: backupFilePath,
      backup_file_name: backupFileName,
      backup_size: stats.size
    })

    // 清理旧备份
    await this.cleanupOldBackups()

    // 清理超过数量限制的备份
    await this.cleanupExcessBackups()

    return {
      path: backupFilePath,
      fileName: backupFileName,
      size: stats.size
    }
  },

  // 检查是否需要自动备份
  async shouldAutoBackup(): Promise<boolean> {
    const settings = await this.getBackupSettings()
    return Boolean(settings?.auto_backup && settings?.backup_path)
  },

  // 恢复备份
  async restoreBackup(backupPath: string): Promise<void> {
    // 验证备份文件是否存在
    if (!fs.existsSync(backupPath)) {
      throw new Error('备份文件不存在')
    }

    // 获取当前环境的数据库路径
    const currentDbPath = getDbPath()

    // 确保目标目录存在
    const dbDir = path.dirname(currentDbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    // 关闭数据库连接
    await db.destroy()

    try {
      // 复制备份文件到当前环境的数据库位置
      fs.copyFileSync(backupPath, currentDbPath)

      // 重新初始化数据库连接
      await db.initialize()
    } catch (error) {
      throw new Error('恢复备份失败：' + (error as Error).message)
    }
  }
}
