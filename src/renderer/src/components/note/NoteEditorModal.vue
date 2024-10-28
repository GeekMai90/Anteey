<!-- src/components/NoteEditorModal.vue -->
<template>
  <Modal
    v-model="isEditorOpen"
    @outside-click="handleOutsideClick"
    @after-enter="focusNoteEditorInput"
  >
    <NoteEditor ref="noteEditorRef" :noteId="currentNote?.id || ''" @close="closeNoteEditor" />
  </Modal>
</template>

<script setup lang="ts">
import { shallowRef, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useNoteStore } from '@renderer/stores/note-store'
import Modal from '@renderer/components/common/Modal.vue'
import NoteEditor from '@renderer/components/note/NoteEditor.vue'
import { storeToRefs } from 'pinia'

const noteStore = useNoteStore()
// 使用 storeToRefs 解构，保持响应性
const { isEditorOpen, currentNote } = storeToRefs(noteStore)
const { closeNoteEditor } = noteStore

const noteEditorRef = shallowRef<InstanceType<typeof NoteEditor> | null>(null)

// 处理点击外部关闭
const handleOutsideClick = () => {
  closeNoteEditor()
}

// 窗口打开时聚焦编辑器
const focusNoteEditorInput = () => {
  nextTick(() => {
    noteEditorRef.value?.focusEditor()
  })
}

// ESC 相关逻辑可以抽离成一个组合式函数
const useDoubleEsc = (callback: () => void) => {
  const lastEscTime = ref(0)
  const ESC_INTERVAL = 300

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isEditorOpen.value) {
      const currentTime = new Date().getTime()
      if (currentTime - lastEscTime.value <= ESC_INTERVAL) {
        callback()
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
}

// 使用组合式函数
useDoubleEsc(closeNoteEditor)
</script>

<style scoped>
.note-editor-modal {
  background-color: transparent; /* 移除背景色 */
  border-radius: 12px;
  overflow: hidden; /* 确保内容不会溢出圆角 */
}
</style>
