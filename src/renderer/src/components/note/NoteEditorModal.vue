<!-- src/components/NoteEditorModal.vue -->
<template>
  <Modal
    v-model="noteStore.isEditorOpen"
    @outside-click="handleOutsideClick"
    @after-enter="focusNoteEditorInput"
  >
    <NoteEditor ref="noteEditorRef" :noteId="noteStore.currentNoteId || ''" @close="handleClose" />
  </Modal>
</template>

<script setup lang="ts">
import { shallowRef, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStores'
import Modal from '@renderer/components/common/Modal.vue'
import NoteEditor from '@renderer/components/note/NoteEditor.vue'

// console.log('NoteEditorModal.vue 组件加载')

const noteStore = useNoteStore()
const noteEditorRef = shallowRef<InstanceType<typeof NoteEditor> | null>(null)

// 处理关闭事件
const handleClose = async () => {
  noteStore.closeNoteEditor()
}

const handleOutsideClick = async () => {
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
const handleKeyDown = async (event: KeyboardEvent) => {
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

<style scoped>
.note-editor-modal {
  background-color: transparent; /* 移除背景色 */
  border-radius: 12px;
  overflow: hidden; /* 确保内容不会溢出圆角 */
}
</style>
