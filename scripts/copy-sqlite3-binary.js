const fs = require('fs')
const path = require('path')

const sourceDir = path.join(__dirname, '..', 'node_modules', 'better-sqlite3', 'build', 'Release')
const targetDir = path.join(__dirname, '..', 'build', 'better-sqlite3')

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

const sourceFile = path.join(sourceDir, 'better_sqlite3.node')
const targetFile = path.join(targetDir, 'better_sqlite3.node')

fs.copyFileSync(sourceFile, targetFile)
console.log(`Copied ${sourceFile} to ${targetFile}`)
