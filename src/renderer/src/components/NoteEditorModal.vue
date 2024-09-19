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
import { shallowRef, nextTick } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStores'
import Modal from '@renderer/components/Modal.vue'
import NoteEditor from '@renderer/components/NoteEditor.vue'

const noteStore = useNoteStore()
const noteEditorRef = shallowRef<InstanceType<typeof NoteEditor> | null>(null)

const handleOutsideClick = () => {
  noteStore.closeNoteEditor()
}

// 窗口打开时聚焦地址输入框
const focusNoteEditorInput = () => {
  nextTick(() => {
    noteEditorRef.value?.focusAddressInput()
  })
}
</script>

<style scoped></style>
