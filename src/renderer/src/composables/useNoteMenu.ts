import { watchEffect } from 'vue'
import { useEventBus } from '@vueuse/core'
import {
  Info,
  Star,
  Copy,
  History,
  DeleteOne,
  RightBar,
  Refresh,
  CopyLink,
  Export as ExportIcon,
  SettingTwo,
  Share,
  AdjacentItem,
  StorageCardOne,
  MagicWand,
  ListAlphabet,
  Sapling,
  ViewGridCard,
  AddItem,
  BranchOne
} from '@icon-park/vue-next'

import { useUIStore } from '../stores/UIStore'
import { ref, computed } from 'vue'
import { useNoteStore } from '../stores/noteStore'
import { useRoute, useRouter } from 'vue-router'
import type { Note } from '@shared/types'
import { message } from '../utils/message'
import { useFlashcardStore } from '../stores/flashcardStore'
import { useNoteVersionStore } from '../stores/noteVersionStore'
import { useNoteAIProcessStore } from '../stores/noteAIProcessStore'
import { useKnowledgeTreeStore } from '../stores/knowledgeTreeStore'

interface NoteMenuParams {
  noteId: string
  menuItems?: string[] // 新增：用于指定要显示的菜单项
}

export function useNoteMenu(params: NoteMenuParams) {
  const noteStore = useNoteStore()
  const uiStore = useUIStore()

  const showConfirmModal = ref(false)
  const route = useRoute()
  const router = useRouter()
  const isPopupMenuVisible = ref(false)
  const isStarred = ref(false)
  const flashcardStore = useFlashcardStore()
  // 在 useNoteMenu 函数中添加状态
  const isFlashcard = ref(false)
  const versionStore = useNoteVersionStore()
  const isConfirmingPermanentDelete = ref(false)
  let permanentDeleteTimeout: number | null = null

  const noteAIProcessStore = useNoteAIProcessStore()
  const knowledgeTreeStore = useKnowledgeTreeStore()
  const isProcessing = ref(false)

  // 添加索引状态
  const isIndexed = ref(false)

  // 关闭弹出菜单
  const closePopupMenu = () => {
    isPopupMenuVisible.value = false
  }
  // 分享笔记
  const handleShare = async () => {
    await noteStore.handleShare(params.noteId)
    closePopupMenu()
  }
  // 分享视图
  const handleShareView = async () => {
    await noteStore.handleShareView(params.noteId)
    closePopupMenu()
  }

  // 将笔记标记为闪卡
  const handleConvertToFlashcard = async () => {
    try {
      if (!isFlashcard.value) {
        await flashcardStore.convertToFlashcard(params.noteId)
        message.success('已将笔记标记为闪卡')
      } else {
        await flashcardStore.removeFlashcard(params.noteId)
        message.success('已取消闪卡标记')
      }
      isFlashcard.value = !isFlashcard.value
      closePopupMenu()
    } catch (error) {
      console.error('操作闪卡失败:', error)
      message.error('操作失败')
    }
  }

  // 复制笔记引用链接
  const handleCopyNoteLink = () => {
    const noteAddress = noteStore.getNoteAddress(params.noteId)
    const noteLink = `[${noteAddress}](note://${params.noteId})`
    navigator.clipboard.writeText(noteLink)
    console.log('已复制笔记链接:', noteLink)
  }

  // 添加或移除星标收藏
  const handleStar = () => {
    if (!isStarred.value) {
      console.log('添加星标收藏')
      noteStore.addStarToNote(params.noteId)
    } else {
      console.log('移除星标收藏')
      noteStore.removeStarFromNote(params.noteId)
    }
    // 立即更新 isStarred 的值
    isStarred.value = !isStarred.value
  }
  watchEffect(async () => {
    // 获取完整的笔记信息来更新状态
    if (params.noteId) {
      const note = await noteStore.fetchNote(params.noteId)
      if (note) {
        isStarred.value = note.isStarred || false
        isFlashcard.value = note.isFlashcard || false
        isIndexed.value = note.isIndexed || false // 添加索引状态
      }
    }
  })

  // 添加或移除右侧显示
  const handleAddToRightSidebar = async () => {
    await noteStore.addNoteToRightSidebar(params.noteId)
    await uiStore.openRightSidebarWithTab('multi')
    noteStore.closeNoteEditor()
  }

  //闪卡笔记暂存到右侧
  const handleFlashcardToRightSidebar = async () => {
    console.log('闪卡笔记暂存到右侧', params.noteId)
    await noteStore.addNoteToRightSidebar(params.noteId)
  }

  // 复制笔记
  const handleCopy = () => {
    console.log('复制笔记', params.noteId)
  }

  // 显示历史记录
  const handleShowHistory = () => {
    console.log('显示历史记录', params.noteId)
    versionStore.openVersionModal(params.noteId)
  }

  // 删除笔记
  const isConfirmingDelete = ref(false)
  const isDeleting = ref(false)
  let deleteTimeout: number | null = null

  const handleDelete = async () => {
    if (isDeleting.value) return false

    if (!isConfirmingDelete.value) {
      isConfirmingDelete.value = true
      deleteTimeout = window.setTimeout(() => {
        isConfirmingDelete.value = false
      }, 3000) // 3秒后重置确认状态
      return false
    } else {
      if (deleteTimeout !== null) {
        clearTimeout(deleteTimeout)
        deleteTimeout = null
      }

      isDeleting.value = true
      try {
        const result = await noteStore.moveToTrash(params.noteId)
        if (result) {
          console.log('笔记已移至回收站')
          noteStore.closeNoteEditor()

          const eventBus = useEventBus('note-deleted')
          // 触发笔记删除事件
          eventBus.emit()

          // 通过路由判断，如果在NoteExpandEditor页面，则跳转到Timeline页面
          if (route.name === 'NoteExpandEditor') {
            router.push('/timeline')
          }
          return true
        } else {
          console.error('移动笔记到回收站失败')
          return false
        }
      } catch (error) {
        console.error('删除笔记时出错:', error)
        return false
      } finally {
        isDeleting.value = false
        isConfirmingDelete.value = false
        closePopupMenu() // 确保在所有情况下都会关闭弹出菜单
      }
    }
  }

  const resetDeleteState = () => {
    isConfirmingDelete.value = false
    isDeleting.value = false
    isConfirmingPermanentDelete.value = false
    if (deleteTimeout !== null) {
      clearTimeout(deleteTimeout)
      deleteTimeout = null
    }
    if (permanentDeleteTimeout !== null) {
      clearTimeout(permanentDeleteTimeout)
      permanentDeleteTimeout = null
    }
  }

  // 导出单个笔记
  const handleExportNote = async () => {
    try {
      const result = await window.electronAPI.export.exportNote(params.noteId)
      message.success(`笔记已导出到: ${result.fileName}`)
      closePopupMenu()
    } catch (error) {
      console.error('导出笔记失败:', error)
      message.error('导出失败')
    }
  }

  // 批量导出笔记
  const handleBulkExport = async () => {
    try {
      const result = await window.electronAPI.export.exportAllNotes()
      message.success(`所有笔记已导出到: ${result.fileName}`)
      closePopupMenu()
    } catch (error) {
      console.error('批量导出笔记失败:', error)
      message.error('批量导出失败')
    }
  }

  // 设置
  const handleSettings = () => {
    uiStore.openSettingsPage()
    closePopupMenu()
  }
  // 从笔记内容中提取第一行文本
  function extractFirstLineText(content: any): string {
    // 检查 content 是否存在且有内容
    if (
      content &&
      content.content &&
      content.content[0] &&
      content.content[0].content &&
      content.content[0].content[0] &&
      content.content[0].content[0].text
    ) {
      return content.content[0].content[0].text
    }
    return '无标题'
  }

  // 生成笔记引用
  function generateNoteReference(note: Note): string {
    // 获取笔记地址和第一行文本
    const address = note.address || ''
    const firstLineText = extractFirstLineText(note.content)

    // 组合标题：地址 + 第一行文本
    const title = `${address} ${firstLineText}`.trim()

    // 返回引用格式
    return `[[${note.id}:${title}]]`
  }

  // 复制引用
  const handleCopyQuote = async () => {
    // 1. 先通过 noteId 获取完整的笔记数据
    const note = await noteStore.fetchNoteById(params.noteId)
    if (!note) {
      console.error('笔记不存在')
      return
    }
    // 2. 生成并复制引用
    const reference = generateNoteReference(note)
    await navigator.clipboard.writeText(reference)
    // 3. 提示用户
    message.success('引用已复制')
  }

  // 添加 AI 处理方法
  const handleAIProcess = async () => {
    if (isProcessing.value) return

    try {
      isProcessing.value = true
      await noteAIProcessStore.triggerProcessing(params.noteId)
      message.success('AI 处理完成')
      closePopupMenu()
    } catch (error) {
      console.error('AI 处理失败:', error)
      message.error('AI 处理失败')
    } finally {
      isProcessing.value = false
    }
  }

  // 添加处理索引的方法
  const handleToggleIndex = async () => {
    try {
      await noteStore.toggleNoteIndex(params.noteId)
      isIndexed.value = !isIndexed.value
      message.success(isIndexed.value ? '已添加到索引' : '已从索引中移除')
      closePopupMenu()
    } catch (error) {
      console.error('切换索引状态失败:', error)
      message.error('操作失败')
    }
  }

  // 在知识树中查看节点
  const handleViewInTree = () => {
    router.push({
      name: 'KnowledgeTreeNode',
      params: { address: params.noteId }
    })
  }

  // 在卡片盒中查看节点
  const handleViewInCardbox = () => {
    if (params.noteId) {
      router.push({
        name: 'cardbox',
        query: {
          mode: 'context',
          noteId: params.noteId
        }
      })
    }
    closePopupMenu()
  }

  //复制编码地址
  const handleCopyAddress = async () => {
    await noteStore.copyNoteAddress(params.noteId)
    closePopupMenu()
  }

  // 添加同级节点处理函数
  async function handleAddSibling() {
    if (params.noteId) {
      try {
        const newNote = await knowledgeTreeStore.createAdjacentNote(params.noteId, 'below')
        const lastCreatedNote = await noteStore.fetchNote(newNote.id)
        if (lastCreatedNote) {
          // 先设置 lastCreatedNote
          noteStore.lastCreatedNote = lastCreatedNote
          // 触发笔记创建事件
          const eventBus = useEventBus('note-created')
          eventBus.emit(lastCreatedNote)
          // 触发笔记更新事件
          const noteUpdatedBus = useEventBus<Note>('note-updated')
          noteUpdatedBus.emit(lastCreatedNote)
          // 最后打开编辑器
          noteStore.openNoteEditor(newNote.id)
        }
      } catch (error) {
        console.error('添加同级节点失败:', error)
      }
    }
    closePopupMenu()
  }

  // 添加子节点处理函数
  async function handleAddChild() {
    if (params.noteId) {
      try {
        const newNote = await knowledgeTreeStore.createAdjacentNote(params.noteId, 'child')
        const lastCreatedNote = await noteStore.fetchNote(newNote.id)
        if (lastCreatedNote) {
          // 先设置 lastCreatedNote
          noteStore.lastCreatedNote = lastCreatedNote
          // 触发笔记创建事件
          const eventBus = useEventBus('note-created')
          eventBus.emit(lastCreatedNote)
          // 触发笔记更新事件
          const noteUpdatedBus = useEventBus<Note>('note-updated')
          noteUpdatedBus.emit(lastCreatedNote)
          // 最后打开编辑器
          noteStore.openNoteEditor(newNote.id)
        }
      } catch (error) {
        console.error('添加子节点失败:', error)
      }
    }
    closePopupMenu()
  }
  const allMenuItems: any = computed(() => ({
    info: { name: 'info', label: '卡片信息', icon: Info, action: handleShare },
    viewInTree: {
      name: 'viewInTree',
      label: '知识树查看',
      icon: Sapling,
      action: handleViewInTree
    },
    viewInCardbox: {
      name: 'viewInCardbox',
      label: '卡片盒翻阅',
      icon: ViewGridCard,
      action: handleViewInCardbox
    },
    copyAddress: {
      name: 'copyAddress',
      label: '复制编码地址',
      icon: Copy,
      action: handleCopyAddress
    },
    addSibling: {
      name: 'addSibling',
      label: '添加同级卡片',
      icon: AddItem,
      action: handleAddSibling
    },
    addChild: {
      name: 'addChild',
      label: '添加子级卡片',
      icon: BranchOne,
      action: handleAddChild
    },

    star: {
      name: 'star',
      label: '星标收藏',
      icon: Star,
      action: handleStar,
      fill: isStarred.value ? 'var(--color-primary)' : 'var(--color-icon-primary)'
    },
    sidebar: {
      name: 'sidebar',
      label: '右侧显示',
      icon: RightBar,
      action: handleAddToRightSidebar
    },
    flashcardSidebar: {
      name: 'flashcardSidebar',
      label: '稍后查看',
      icon: RightBar,
      action: handleFlashcardToRightSidebar
    },
    copy: { name: 'copy', label: '复制', icon: Copy, action: handleCopy },
    history: { name: 'history', label: '历史记录', icon: History, action: handleShowHistory },
    delete: {
      name: 'delete',
      label: isConfirmingDelete.value ? '确认删除' : '删除',
      icon: DeleteOne,
      action: handleDelete,
      isDangerous: isConfirmingDelete.value,
      fill: isConfirmingDelete.value ? '#ff4d4f' : 'var(--color-icon-primary)'
    },

    copyNoteLink: {
      name: 'copyNoteLink',
      label: '拷贝链接',
      icon: CopyLink,
      action: handleCopyNoteLink
    },
    exportNote: {
      name: 'exportNote',
      label: '导出',
      icon: ExportIcon,
      action: handleExportNote
    },
    bulkExport: {
      name: 'bulkExport',
      label: '批量导出',
      icon: ExportIcon,
      action: handleBulkExport
    },
    settings: {
      name: 'settings',
      label: '设置',
      icon: SettingTwo,
      action: handleSettings
    },
    share: {
      name: 'share',
      label: '分享',
      icon: Share,
      action: handleShareView
    },
    shareView: {
      name: 'shareView',
      label: '分享视图',
      icon: Share,
      action: handleShareView
    },
    copyQuote: {
      name: 'copyQuote',
      label: '复制引用',
      icon: AdjacentItem,
      action: handleCopyQuote
    },
    convertToFlashcard: {
      name: 'convertToFlashcard',
      label: isFlashcard.value ? '取消闪卡' : '标记闪卡',
      icon: StorageCardOne,
      action: handleConvertToFlashcard,
      fill: isFlashcard.value ? 'var(--color-primary)' : 'var(--color-icon-primary)'
    },
    historyVersion: {
      name: 'historyVersion',
      label: '历史版本',
      icon: History,
      action: handleShowHistory
    },
    // 添加恢复笔记功能
    restore: {
      name: 'restore',
      label: '恢复笔记',
      icon: Refresh,
      action: async () => {
        try {
          await noteStore.restoreFromTrash(params.noteId)
          message.success('笔记已恢复')
          closePopupMenu()
          const eventBus = useEventBus('note-restored')
          eventBus.emit()
        } catch (error) {
          console.error('恢复笔记失败:', error)
          message.error('恢复失败')
        }
      }
    },
    // 添加永久删除功能
    permanentDelete: {
      name: 'permanentDelete',
      label: isConfirmingPermanentDelete.value ? '确认删除' : '永久删除',
      icon: DeleteOne,
      action: async () => {
        if (isConfirmingPermanentDelete.value) {
          try {
            await noteStore.permanentlyDelete(params.noteId)
            message.success('笔记已永久删除')
            closePopupMenu()
            const eventBus = useEventBus('note-permanent-deleted')
            eventBus.emit()
            return true
          } catch (error) {
            console.error('永久删除笔记失败:', error)
            message.error('删除失败')
            return false
          } finally {
            isConfirmingPermanentDelete.value = false
            if (permanentDeleteTimeout) {
              clearTimeout(permanentDeleteTimeout)
              permanentDeleteTimeout = null
            }
          }
        } else {
          isConfirmingPermanentDelete.value = true
          permanentDeleteTimeout = window.setTimeout(() => {
            isConfirmingPermanentDelete.value = false
          }, 3000)
          return false
        }
      },
      isDangerous: isConfirmingPermanentDelete.value,
      fill: isConfirmingPermanentDelete.value ? '#ff4d4f' : 'var(--color-icon-primary)'
    },
    // 添加 AI 处理菜单项
    aiProcess: {
      name: 'aiProcess',
      label: isProcessing.value ? 'AI 处理中...' : '投喂AI',
      icon: MagicWand,
      action: handleAIProcess,
      disabled: isProcessing.value,
      fill: isProcessing.value ? 'var(--color-primary)' : 'var(--color-icon-primary)'
    },
    // 添加索引菜单项
    toggleIndex: {
      name: 'toggleIndex',
      label: isIndexed.value ? '取消索引' : '添加索引',
      icon: ListAlphabet,
      action: handleToggleIndex,
      fill: isIndexed.value ? 'var(--color-primary)' : 'var(--color-icon-primary)'
    }
  }))

  // 根据参数生成菜单项
  const menuItems = computed(() => {
    let items: any[] = []
    if (params.menuItems && params.menuItems.length > 0) {
      items = params.menuItems
        .map((itemName) => {
          if (itemName === 'divider') {
            return {
              name: 'divider',
              divider: true
            }
          }
          return allMenuItems.value[itemName]
        })
        .filter(Boolean)
    } else {
      items = Object.values(allMenuItems.value)
    }

    // 确保 delete 项随 isConfirmingDelete 状态更新
    items = items.map((item: any) => {
      if (item?.name === 'delete') {
        return {
          ...item,
          label: isConfirmingDelete.value ? '确认删除' : '删除',
          isDangerous: isConfirmingDelete.value,
          fill: isConfirmingDelete.value ? '#ff4d4f' : 'var(--color-icon-primary)'
        }
      }
      return item
    })

    return items.length > 0 ? items : Object.values(allMenuItems.value)
  })

  return {
    menuItems,
    resetDeleteState,
    isConfirmingDelete, // 暴露这个状态，以便在需要时可以在外部访问
    handleDelete,
    showConfirmModal,
    handleBulkExport,
    isProcessing // 导出处理状态
  }
}
