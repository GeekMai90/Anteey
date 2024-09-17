<!-- src/components/GlobalUIManager.vue -->
<template>
  <Teleport to="body">
    <div v-if="noteOptions.isOptionsMenuVisible" class="global-overlay" @click="handleOverlayClick">
      <NoteOptionsMenu
        :style="optionsMenuStyle"
        @share="noteOptions.handleShare"
        @star="noteOptions.handleStar"
        @show-sidebar="noteOptions.handleShowSidebar"
        @copy="noteOptions.handleCopy"
        @show-history="noteOptions.handleShowHistory"
        @delete="noteOptions.handleDelete"
        @close="noteOptions.closeOptionsMenu"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import NoteOptionsMenu from '@renderer/components/NoteOptionsMenu.vue'
import { useNoteOptions } from '@renderer/composable/useNoteOptions'

const currentNoteId = ref<string | undefined>(undefined)
const optionsMenuStyle = ref({})

const noteOptions = reactive(useNoteOptions(''))

const openOptionsMenu = (event: MouseEvent, noteId: string) => {
  currentNoteId.value = noteId
  Object.assign(noteOptions, useNoteOptions(noteId))

  noteOptions.toggleOptionsMenu()

  const rect = (event.target as HTMLElement).getBoundingClientRect()
  optionsMenuStyle.value = {
    position: 'fixed', // 改为 fixed 定位
    top: `${rect.bottom}px`,
    left: `${rect.left}px`
  }
}

const handleOverlayClick = (event: MouseEvent) => {
  // 检查点击是否发生在菜单外部
  if ((event.target as HTMLElement).classList.contains('global-overlay')) {
    noteOptions.closeOptionsMenu()
  }
}

// 添加 ESC 键关闭功能
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && noteOptions.isOptionsMenuVisible) {
    noteOptions.closeOptionsMenu()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

defineExpose({
  openOptionsMenu,
  closeOptionsMenu: () => noteOptions.closeOptionsMenu()
})
</script>

<style scoped>
.global-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: transparent;
  z-index: 1000;
}
</style>
