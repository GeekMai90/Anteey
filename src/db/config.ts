//src/db/config.ts
import knex, { Knex } from 'knex'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'

// 检查是否为开发环境
const isDev = process.env.NODE_ENV === 'development'

let dbPath: string
let db: Knex

export function initializeDb() {
  // 设置数据库路径
  if (isDev) {
    // 在开发模式下，将数据库文件放在项目根目录的 .dev 文件夹中
    const projectRoot = path.resolve(__dirname, '..', '..')
    const devDbDir = path.join(projectRoot, 'devDb')

    // 确保 .dev 目录存在
    if (!fs.existsSync(devDbDir)) {
      fs.mkdirSync(devDbDir, { recursive: true })
    }

    dbPath = path.join(devDbDir, 'dev_database.sqlite')
  } else {
    // dbPath = path.join(app.getPath('userData'), 'antinet.sqlite')
    // 生产环境: 在 antinet 文件夹下创建 UserData 文件夹
    const antinetPath = app.getPath('userData')
    const userDataPath = path.join(antinetPath, 'UserData')
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }
    dbPath = path.join(userDataPath, 'antinet.sqlite')
  }

  const config = {
    client: 'better-sqlite3',
    connection: {
      filename: dbPath,
      options: {
        pragma: {
          journal_mode: 'WAL',
          busy_timeout: 5000, // 降低锁等待超时，避免长时间阻塞
          synchronous: 'NORMAL',
          wal_autocheckpoint: 1000, // 降低检查点间隔，更频繁地写入
          cache_size: -128000, // 增加缓存到 128MB
          page_size: 8192, // 增加页面大小
          mmap_size: 536870912, // 增加内存映射到 512MB
          read_uncommitted: 'ON', // 允许读未提交，提高并发性
          recursive_triggers: 'OFF', // 关闭递归触发器
          secure_delete: 'OFF', // 关闭安全删除
          foreign_keys: 'ON' // 显式启用外键约束
        }
      }
    },
    pool: {
      min: 1, // 减少最小连接数，因为 SQLite 是单文件数据库
      max: 5, // 减少最大连接数
      acquireTimeoutMillis: 20000, // 减少获取超时
      createTimeoutMillis: 10000,
      idleTimeoutMillis: 10000, // 降低空闲超时
      reapIntervalMillis: 1000, // 增加清理间隔
      createRetryIntervalMillis: 200,
      propagateCreateError: false
    },
    useNullAsDefault: true,
    // 添加查询日志（仅在开发环境）
    // debug: isDev,
    // 添加连接后的配置
    afterCreate: (conn: any, done: any) => {
      // SQLite 只支持 SERIALIZABLE 隔离级别
      conn.pragma('optimize')
      conn.pragma('analysis_limit=1000')
      conn.pragma('threads=4')
      done(null, conn)
    }
  }

  db = knex(config)
}

initializeDb()

export { db, dbPath }
