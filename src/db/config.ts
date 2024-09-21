// src/db/config.ts

import knex, { Knex } from 'knex'
import path from 'path'
import { app } from 'electron'

// 检查是否为开发环境
const isDev = process.env.NODE_ENV === 'development'

let dbPath: string
let db: Knex

export function initializeDb() {
  // 设置数据库路径
  dbPath = isDev
    ? path.join(__dirname, 'dev_database.sqlite')
    : path.join(app.getPath('userData'), 'antinet.sqlite')

  const config = {
    client: 'better-sqlite3',
    connection: {
      filename: dbPath
    },
    useNullAsDefault: true
  }

  db = knex(config)
}
initializeDb()

export { db, dbPath }
