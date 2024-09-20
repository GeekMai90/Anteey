// src/db/config.ts

import knex from 'knex'
import path from 'path'
import { app } from 'electron'

const userDataPath = app.getPath('userData')
const dbPath = path.join(userDataPath, 'antinet.sqlite')

const config = {
  client: 'better-sqlite3',
  connection: {
    filename: dbPath
  },
  useNullAsDefault: true
}

export const db = knex(config)
