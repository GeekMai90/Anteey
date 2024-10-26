<!-- src/components/NoteEditorModal.vue -->
<template>
  <Modal
    v-model="noteStore.isEditorOpen"
    @outside-click="handleOutsideClick"
    @after-enter="focusNoteEditorInput"
  >
    <NoteEditor
      ref="noteEditorRef"
      :noteId="noteStore.currentNoteId || ''"
      @close="noteStore.closeNoteEditor"
    />
  </Modal>
</template>

<script setup lang="ts">
import { shallowRef, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStores'
import Modal from '@renderer/components/common/Modal.vue'
import NoteEditor from '@renderer/components/NoteEditor.vue'

console.log('NoteEditorModal.vue 组件加载')

const noteStore = useNoteStore()
const noteEditorRef = shallowRef<InstanceType<typeof NoteEditor> | null>(null)

const handleOutsideClick = () => {
  noteStore.closeNoteEditor()
}

// 窗口打开时聚焦地址输入框
const focusNoteEditorInput = () => {
  nextTick(() => {
    noteEditorRef.value?.focusEditor()
  })
}

// 添加新的变量来跟踪 ESC 键按下的时间
const lastEscTime = ref(0)
const ESC_INTERVAL = 300 // 连续按 ESC 的时间间隔（毫秒）

// 连按两次 ESC 键关闭
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && noteStore.isEditorOpen) {
    const currentTime = new Date().getTime()
    if (currentTime - lastEscTime.value <= ESC_INTERVAL) {
      noteStore.closeNoteEditor()
    } else {
      lastEscTime.value = currentTime
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped></style>
