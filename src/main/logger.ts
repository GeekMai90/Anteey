import log from 'electron-log'
import { app } from 'electron'
import path from 'path'

// 配置日志
log.initialize({ preload: true })

// 设置日志级别
log.transports.file.level = 'debug'
log.transports.console.level = 'debug'

// 设置日志格式
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}'

// 设置日志文件路径
if (app) {
  log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs/main.log')
}

export default log
