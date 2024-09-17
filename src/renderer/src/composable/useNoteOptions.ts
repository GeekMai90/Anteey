// src/composables/useNoteOptions.ts
import { ref } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStores'

export function useNoteOptions(noteId: string, onDeleteSuccess?: () => void) {
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

  // const handleDelete = async () => {
  //   try {
  //     await noteStore.deleteNote(noteId);
  //     console.log("删除成功");
  //     if (onDeleteSuccess) {
  //       onDeleteSuccess();
  //     }
  //     closeOptionsMenu();
  //     noteStore.closeNoteEditor();
  //     await noteStore.fetchNotes();
  //   } catch (error) {
  //     console.error("删除失败", error);
  //   }
  // };
  const handleDelete = async () => {
    try {
      await noteStore.moveToTrash(noteId)
      console.log('笔记已移动到回收站')
      if (onDeleteSuccess) {
        onDeleteSuccess()
      }
      closeOptionsMenu()
      noteStore.closeNoteEditor()
      await noteStore.fetchNotes()
    } catch (error) {
      console.error('移动到回收站失败', error)
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
    handleDelete
  }
}
