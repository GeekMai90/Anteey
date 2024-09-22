// src/db/migrations/migrations.ts

import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export async function runMigrations() {
  let migrationsDir: string

  if (app.isPackaged) {
    // 生产环境
    migrationsDir = path.join(app.getAppPath(), 'db', 'migrations')
  } else {
    // 开发环境
    migrationsDir = path.join(__dirname)
  }

  console.log('Migrations directory:', migrationsDir)

  if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations directory not found: ${migrationsDir}`)
    return
  }

  const files = fs.readdirSync(migrationsDir).sort()

  for (const file of files) {
    if (file.endsWith('.ts') || file.endsWith('.js')) {
      if (file === 'migrations.ts' || file === 'migrations.js') continue // 跳过当前文件

      try {
        const migrationPath = path.join(migrationsDir, file)
        console.log(`Attempting to execute migration: ${migrationPath}`)
        // 使用动态导入而不是 require
        const migration = await import(migrationPath)

        if (typeof migration.up === 'function') {
          await migration.up()
          console.log(`执行了迁移: ${file}`)
        } else {
          console.warn(`Migration ${file} does not have an 'up' function`)
        }
      } catch (error) {
        console.error(`Error executing migration ${file}:`, error)
      }
    }
  }
}
