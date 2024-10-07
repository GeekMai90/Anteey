// src/composables/useGlobalHotkeys.ts
import { onMounted, onUnmounted } from 'vue'
import hotkeys from 'hotkeys-js'
import { useNoteStore } from '../stores/noteStores'

export function useGlobalHotkeys() {
  const noteStore = useNoteStore()

  const setupHotkeys = () => {
    hotkeys('ctrl+n, command+n', (event) => {
      event.preventDefault()
      noteStore.createAndOpenNewNote()
    })
    // 添加搜索快捷键
    hotkeys('ctrl+s, command+s', (event) => {
      event.preventDefault()
      noteStore.openSearchModal()
    })
  }

  onMounted(() => {
    setupHotkeys()
  })

  onUnmounted(() => {
    hotkeys.unbind()
  })
}
