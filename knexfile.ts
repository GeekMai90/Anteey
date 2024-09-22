import type { Knex } from 'knex'
import path from 'path'

const projectRoot = path.resolve(__dirname)
const devDbDir = path.join(projectRoot, '.dev')
const dbPath = path.join(devDbDir, 'dev_database.sqlite')

const config: Knex.Config = {
  client: 'better-sqlite3',
  connection: {
    filename: dbPath
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, 'src', 'db', 'migrations')
  }
}

module.exports = config
