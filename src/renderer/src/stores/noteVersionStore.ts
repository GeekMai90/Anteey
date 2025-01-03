import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { NoteVersion } from '@shared/types'
import { CardType } from '@shared/types'

export const useNoteVersionStore = defineStore('noteVersion', () => {
  // ==================== 状态 ====================
  const versions = ref<NoteVersion[]>([])
  const currentVersion = ref<NoteVersion | null>(null)
  const totalCount = ref(0)
  const isVersionModalOpen = ref(false)
  const currentNoteId = ref<string | null>(null)

  // ==================== 操作方法 ====================
  // 创建版本
  const createNoteVersion = async (
    noteId: string,
    content: any,
    address: string,
    cardType: CardType,
    createdAt: Date
  ) => {
    try {
      await window.electronAPI.createNoteVersion({ noteId, content, address, cardType, createdAt })
    } catch (error) {
      console.error('创建版本失败:', error)
      throw error
    }
  }
  // 获取笔记的版本列表
  const fetchNoteVersions = async (noteId: string, limit = 10, offset = 0) => {
    try {
      currentNoteId.value = noteId
      const fetchedVersions = await window.electronAPI.getNoteVersions({
        noteId,
        limit,
        offset
      })
      versions.value = fetchedVersions

      // 获取总数
      totalCount.value = await window.electronAPI.getNoteVersionCount(noteId)

      return fetchedVersions
    } catch (error) {
      console.error('获取笔记版本列表失败:', error)
      throw error
    }
  }

  // 获取指定版本
  const fetchNoteVersion = async (noteId: string, versionId: string) => {
    try {
      const version = await window.electronAPI.getNoteVersion(noteId, versionId)
      if (version) {
        currentVersion.value = version
      }
      return version
    } catch (error) {
      console.error('获取笔记版本失败:', error)
      throw error
    }
  }

  // 恢复到指定版本
  const restoreVersion = async (noteId: string, versionId: string) => {
    try {
      await window.electronAPI.restoreNoteVersion(noteId, versionId)
      // 恢复后刷新版本列表
      await fetchNoteVersions(noteId)
    } catch (error) {
      console.error('恢复笔记版本失败:', error)
      throw error
    }
  }

  // 获取最新版本
  const fetchLatestVersion = async (noteId: string) => {
    try {
      const version = await window.electronAPI.getLatestVersion(noteId)
      if (version) {
        currentVersion.value = version
      }
      return version
    } catch (error) {
      console.error('获取最新版本失败:', error)
      throw error
    }
  }

  // 获取版本时间范围
  const fetchVersionTimeRange = async (noteId: string) => {
    try {
      return await window.electronAPI.getVersionTimeRange(noteId)
    } catch (error) {
      console.error('获取版本时间范围失败:', error)
      throw error
    }
  }

  // 模态框控制
  const openVersionModal = (noteId: string) => {
    console.log('打开版本模态框', noteId)
    currentNoteId.value = noteId
    isVersionModalOpen.value = true
    // 打开模态框时自动加载版本列表
    fetchNoteVersions(noteId)
  }

  const closeVersionModal = () => {
    isVersionModalOpen.value = false
    currentVersion.value = null
  }

  // 清理状态
  const clearState = () => {
    versions.value = []
    currentVersion.value = null
    totalCount.value = 0
    currentNoteId.value = null
  }

  return {
    // 状态
    versions,
    currentVersion,
    totalCount,
    isVersionModalOpen,
    currentNoteId,

    // 方法
    fetchNoteVersions,
    fetchNoteVersion,
    restoreVersion,
    fetchLatestVersion,
    fetchVersionTimeRange,
    openVersionModal,
    closeVersionModal,
    clearState,
    createNoteVersion
  }
})
