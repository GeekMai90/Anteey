// src/composables/useGlobalHotkeys.ts
import { onMounted, onUnmounted } from 'vue'
import hotkeys from 'hotkeys-js'
import { useNoteStore } from '@renderer/stores/noteStores'

export function useGlobalHotkeys() {
  const noteStore = useNoteStore()

  const setupHotkeys = () => {
    hotkeys('ctrl+n, alt+n', (event) => {
      event.preventDefault()
      noteStore.createAndOpenNewNote()
    })
    // 添加搜索快捷键
    hotkeys('ctrl+k, command+k', (event) => {
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
