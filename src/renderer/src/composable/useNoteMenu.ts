import { computed, ref } from 'vue'
import { Info, Star, Copy, History, DeleteOne, RightBar, Refresh } from '@icon-park/vue-next'
import { useNoteStore } from '../stores/noteStores'
import { useWhiteboardStore } from '../stores/whiteboardStores'

interface NoteMenuParams {
  noteId: string
  whiteboardNoteId?: string
  menuItems?: string[] // 新增：用于指定要显示的菜单项
  onRestoreDefaultHeight?: () => void // 新增：用于处理恢复默认高度的回调函数
}

export function useNoteMenu(params: NoteMenuParams) {
  const noteStore = useNoteStore()
  const whiteboardStore = useWhiteboardStore()

  const isPopupMenuVisible = ref(false)

  const isStarred = computed(() => {
    return noteStore.notes.find((note) => note.id === params.noteId)?.isStarred || false
  })

  const togglePopupMenu = () => {
    isPopupMenuVisible.value = !isPopupMenuVisible.value
    console.log(isPopupMenuVisible.value)
  }

  const closePopupMenu = () => {
    isPopupMenuVisible.value = false
  }

  const handleShare = () => {
    console.log('分享笔记', params.noteId)
  }

  const handleStar = () => {
    if (!isStarred.value) {
      console.log('添加星标收藏')
      noteStore.addStarToNote(params.noteId)
    } else {
      console.log('移除星标收藏')
      noteStore.removeStarFromNote(params.noteId)
    }
    closePopupMenu()
  }

  const handleShowSidebar = () => {
    noteStore.addNoteToRightSidebar(params.noteId)
  }

  const handleCopy = () => {
    console.log('复制笔记', params.noteId)
  }

  const handleShowHistory = () => {
    console.log('显示历史记录', params.noteId)
  }

  const handleDelete = async () => {
    try {
      const success = await noteStore.moveToTrash(params.noteId)
      if (success) {
        console.log('笔记已移至回收站')
        noteStore.closeNoteEditor()
        return true
      } else {
        console.error('移动笔记到回收站失败')
        return false
      }
    } catch (error) {
      console.error('删除笔记时出错:', error)
      return false
    }
  }

  const handleTrashFromWhiteboard = () => {
    console.log('移出白板', params.whiteboardNoteId)
    if (params.whiteboardNoteId) {
      whiteboardStore.deleteWhiteboardNote(params.whiteboardNoteId)
    }
    closePopupMenu()
  }

  const handleRestoreDefaultHeight = () => {
    if (params.onRestoreDefaultHeight) {
      params.onRestoreDefaultHeight()
    }
    closePopupMenu()
  }

  const allMenuItems: any = computed(() => ({
    info: { name: 'info', label: '卡片信息', icon: Info, action: handleShare },
    star: {
      name: 'star',
      label: '星标收藏',
      icon: Star,
      action: handleStar,
      fill: isStarred.value ? 'var(--color-primary)' : 'var(--color-icon-default)'
    },
    sidebar: {
      name: 'sidebar',
      label: '在侧边栏中打开',
      icon: RightBar,
      action: handleShowSidebar
    },
    copy: { name: 'copy', label: '复制', icon: Copy, action: handleCopy },
    history: { name: 'history', label: '历史记录', icon: History, action: handleShowHistory },
    delete: {
      name: 'delete',
      label: '删除',
      icon: DeleteOne,
      action: handleDelete,
      isDangerous: true
    },
    trashFromWhiteboard: {
      name: 'trashFromWhiteboard',
      label: '移出白板',
      icon: DeleteOne,
      action: handleTrashFromWhiteboard,
      isDangerous: true
    },
    restoreDefaultHeight: {
      name: 'restoreDefaultHeight',
      label: '恢复默认高度',
      icon: Refresh,
      action: handleRestoreDefaultHeight
    }
  }))

  const menuItems = computed(() => {
    let items
    if (params.menuItems && params.menuItems.length > 0) {
      items = params.menuItems.map((itemName) => allMenuItems.value[itemName]).filter(Boolean)
    } else {
      items = Object.values(allMenuItems.value).filter((item: any) => {
        if (item.name === 'trashFromWhiteboard' || item.name === 'restoreDefaultHeight') {
          return !!params.whiteboardNoteId
        }
        return true
      })
    }
    console.log('Computed menuItems:', items)
    return items.length > 0 ? items : Object.values(allMenuItems.value)
  })

  return {
    menuItems,
    togglePopupMenu,
    closePopupMenu
  }
}
