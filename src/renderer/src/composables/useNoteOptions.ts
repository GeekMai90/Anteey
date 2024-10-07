// src/composables/useNoteOptions.ts
import { ref } from 'vue'
import { useNoteStore } from '../stores/noteStores'

export function useNoteOptions(noteId: string) {
  const noteStore = useNoteStore()

  const isOptionsMenuVisible = ref(false)

  const toggleOptionsMenu = () => {
    isOptionsMenuVisible.value = !isOptionsMenuVisible.value
    console.log(isOptionsMenuVisible.value)
  }

  const closeOptionsMenu = () => {
    isOptionsMenuVisible.value = false
  }

  const handleShare = () => {
    console.log('分享笔记', noteId)
    closeOptionsMenu()
  }

  const handleStar = () => {
    console.log('收藏笔记', noteId)
    closeOptionsMenu()
  }

  const handleShowSidebar = () => {
    noteStore.addNoteToRightSidebar(noteId)
    closeOptionsMenu()
  }

  const handleCopy = () => {
    console.log('复制笔记', noteId)
    closeOptionsMenu()
  }

  const handleShowHistory = () => {
    console.log('显示历史记录', noteId)
    closeOptionsMenu()
  }

  const moveToTrash = async () => {
    console.log('useNoteOptions→ moveToTrash function called')
    try {
      const success = await noteStore.moveToTrash(noteId)
      if (success) {
        console.log('useNoteOptions→ Note moved to trash successfully')
        noteStore.closeNoteEditor()
        // 可以在这里添加一个成功的通知
        return true
      } else {
        console.error('useNoteOptions→ Failed to move note to trash')
        // 可以在这里添加一个失败的通知
        return false
      }
    } catch (error) {
      console.error('useNoteOptions→ Error in moveToTrash:', error)
      // 可以在这里添加一个错误的通知
      return false
    }
  }

  return {
    isOptionsMenuVisible,
    toggleOptionsMenu,
    closeOptionsMenu,
    handleShare,
    handleStar,
    handleShowSidebar,
    handleCopy,
    handleShowHistory,
    // handleDelete,
    moveToTrash
  }
}
