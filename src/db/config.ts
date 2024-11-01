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

  console.log('数据库路径:', dbPath)

  const config = {
    client: 'better-sqlite3',
    connection: {
      filename: dbPath,
      options: {
        pragma: {
          journal_mode: 'WAL', // 启用 WAL 模式
          busy_timeout: 5000, // 设置锁等待超时
          synchronous: 'NORMAL', // 写入策略（NORMAL 比 FULL 快）
          wal_autocheckpoint: 1000 // 每 1000 页自动检查点
        }
      }
    },
    useNullAsDefault: true
  }

  db = knex(config)
}

initializeDb()

export { db, dbPath }
