<!-- src/components/NoteEditorModal.vue -->
<template>
  <Modal
    v-model="noteStore.isEditorOpen"
    @outside-click="handleOutsideClick"
    @after-enter="focusNoteEditorInput"
  >
    <NoteEditor
      ref="noteEditorRef"
      :noteId="noteStore.currentNoteId || undefined"
      @close="noteStore.closeNoteEditor"
      @save="handleNoteSaved"
    />
  </Modal>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStores'
import Modal from '@renderer/components/Modal.vue'
import NoteEditor from '@renderer/components/NoteEditor.vue'
import { Note } from '@renderer/types/Note'

const noteStore = useNoteStore()
const noteEditorRef = ref<InstanceType<typeof NoteEditor> | null>(null)

const handleOutsideClick = () => {
  noteEditorRef.value?.handleAutoSave()
}

const handleNoteSaved = (savedNote: Note) => {
  noteStore.closeNoteEditor()
  console.log(savedNote)
  // 可以在这里添加一些保存成功后的逻辑，比如显示一个通知
}

// 窗口打开时聚焦地址输入框
const focusNoteEditorInput = () => {
  nextTick(() => {
    noteEditorRef.value?.focusAddressInput()
  })
}
</script>

<style scoped></style>
