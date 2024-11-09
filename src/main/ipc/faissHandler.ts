import { ipcMain } from 'electron'
import { SemanticVectorizer } from '../../renderer/src/utils/semanticVector'
import log from 'electron-log'

export function setupFaissHandlers(): void {
  // 初始化 FAISS
  ipcMain.handle('faiss:initialize', async () => {
    try {
      const vectorizer = SemanticVectorizer.getInstance()
      await vectorizer.initializeFaiss()
      log.info('FAISS 初始化成功')
      return { success: true }
    } catch (error) {
      log.error('FAISS 初始化失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 检查 FAISS 状态
  ipcMain.handle('faiss:status', () => {
    const vectorizer = SemanticVectorizer.getInstance()
    return { isReady: vectorizer.isFaissReady() }
  })
}
