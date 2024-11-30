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
          wal_autocheckpoint: 2000, // 增加检查点间隔，减少写入次数
          cache_size: -64000, // 增加缓存大小到 64MB (-64000 KB)
          page_size: 4096, // 优化页面大小
          temp_store: 'MEMORY', // 临时表存储在内存中
          mmap_size: 268435456, // 设置内存映射大小为 256MB
          foreign_keys: 'ON' // 显式启用外键约束
        }
      }
    },
    pool: {
      min: 1, // 减少最小连接数，因为 SQLite 是单文件数据库
      max: 10, // 降低最大连接数，避免过多连接竞争
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 15000,
      idleTimeoutMillis: 15000, // 降低空闲超时
      reapIntervalMillis: 5000, // 增加清理间隔
      createRetryIntervalMillis: 200,
      propagateCreateError: false
    },
    useNullAsDefault: true,
    // 添加查询日志（仅在开发环境）
    debug: isDev,
    // 添加连接后的配置
    afterCreate: (conn: any, done: any) => {
      // 设置内存管理
      conn.pragma('optimize')
      conn.pragma('analysis_limit=1000')
      conn.pragma('threads=4') // 如果 CPU 核心数大于 4，可以适当增加
      done(null, conn)
    }
  }

  db = knex(config)
}

initializeDb()

export { db, dbPath }
