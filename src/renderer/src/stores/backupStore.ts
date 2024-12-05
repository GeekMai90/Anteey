import { defineStore } from 'pinia'
import type { BackupSettings, BackupHistory } from '../types/backup'
import { ref } from 'vue'

export const useBackupStore = defineStore('backup', () => {
  const settings = ref<BackupSettings | null>(null)
  const history = ref<BackupHistory[]>([])
  const isLoading = ref(false)

  async function getSettings() {
    settings.value = await window.electronAPI.getBackupSettings()
  }

  async function getHistory() {
    history.value = await window.electronAPI.getBackupHistory()
  }

  async function updateSettings(newSettings: Partial<BackupSettings>) {
    await window.electronAPI.updateBackupSettings(newSettings)
    await getSettings()
  }

  async function selectBackupDirectory() {
    const path = await window.electronAPI.selectBackupDirectory()
    if (path) {
      await updateSettings({ backup_path: path })
    }
    return path
  }

  async function createBackup() {
    isLoading.value = true
    try {
      const result = await window.electronAPI.createBackup()
      await getHistory()
      return result
    } finally {
      isLoading.value = false
    }
  }

  async function selectBackupFile() {
    return await window.electronAPI.selectBackupFile()
  }

  async function restoreBackup(backupPath: string) {
    isLoading.value = true
    try {
      await window.electronAPI.restoreBackup(backupPath)
      // 重新加载页面以应用恢复的数据
      window.location.reload()
    } finally {
      isLoading.value = false
    }
  }

  return {
    settings,
    history,
    isLoading,
    getSettings,
    getHistory,
    updateSettings,
    selectBackupDirectory,
    createBackup,
    selectBackupFile,
    restoreBackup
  }
})
