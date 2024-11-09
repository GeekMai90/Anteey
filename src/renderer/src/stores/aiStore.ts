import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ipcRenderer } from 'electron'
import log from 'electron-log'

export const useAIStore = defineStore('ai', () => {
  const isFaissInitialized = ref(false)
  const isInitializing = ref(false)
  const initError = ref<string | null>(null)

  // 初始化 FAISS
  const initializeFaiss = async () => {
    if (isFaissInitialized.value || isInitializing.value) return

    try {
      isInitializing.value = true
      initError.value = null

      const result = await ipcRenderer.invoke('faiss:initialize')
      if (result.success) {
        isFaissInitialized.value = true
        log.info('FAISS 初始化成功')
      } else {
        initError.value = result.error
        log.error('FAISS 初始化失败:', result.error)
      }
    } catch (error) {
      initError.value = (error as Error).message
      log.error('FAISS 初始化出错:', error)
    } finally {
      isInitializing.value = false
    }
  }

  // 检查 FAISS 状态
  const checkFaissStatus = async () => {
    try {
      const { isReady } = await ipcRenderer.invoke('faiss:status')
      isFaissInitialized.value = isReady
      return isReady
    } catch (error) {
      log.error('检查 FAISS 状态失败:', error)
      return false
    }
  }

  return {
    isFaissInitialized,
    isInitializing,
    initError,
    initializeFaiss,
    checkFaissStatus
  }
})
