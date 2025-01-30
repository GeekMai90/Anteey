import { app } from 'electron'
import schedule from 'node-schedule'
import { batchUpdateVectors } from '../../services/notes/notesService'
import log from 'electron-log' // 日志工具

export function setupScheduledTasks() {
  // 每天上午 10 点运行向量更新
  const vectorUpdateJob = schedule.scheduleJob('0 10 * * *', async () => {
    try {
      log.info('开始执行定时向量更新任务')
      await batchUpdateVectors()
      log.info('定时向量更新任务完成')
    } catch (error) {
      log.error('定时向量更新任务失败:', error)
    }
  })

  // 当应用退出时，取消所有定时任务
  app.on('before-quit', () => {
    log.info('应用退出，取消定时任务')
    vectorUpdateJob.cancel()
  })
}
