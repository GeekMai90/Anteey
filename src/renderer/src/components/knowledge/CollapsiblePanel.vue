<template>
  <div class="collapsible-panel" :style="{ height: modelValue ? `${panelHeight}px` : '0' }">
    <div class="drag-handle" @mousedown="startDrag"></div>
    <button class="panel-toggle-btn" @click="togglePanel">
      <span class="toggle-icon">
        <Minus theme="outline" :stroke-width="3" />
      </span>
    </button>
    <div class="panel-content">
      <div class="table-container">
        <NoteTable :notes="tableNotes" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Minus } from '@icon-park/vue-next'
import NoteTable from './NoteTable.vue'
import type { Note, TableNote } from '@shared/types/note'
import { computed, onMounted, ref } from 'vue'

const props = defineProps<{
  modelValue: boolean
  notes: Note[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const panelHeight = ref(300) // 默认高度

// 从 localStorage 读取状态和高度
onMounted(() => {
  const savedState = localStorage.getItem('collapsiblePanelState')
  const savedHeight = localStorage.getItem('collapsiblePanelHeight')

  if (savedState !== null) {
    emit('update:modelValue', savedState === 'true')
  }

  if (savedHeight !== null) {
    panelHeight.value = parseInt(savedHeight)
  }
})

const togglePanel = () => {
  const newState = !props.modelValue
  emit('update:modelValue', newState)
  localStorage.setItem('collapsiblePanelState', String(newState))
}

// 拖动相关
const startDrag = (e: MouseEvent) => {
  e.preventDefault()

  const startY = e.clientY
  const startHeight = panelHeight.value

  const doDrag = (e: MouseEvent) => {
    const delta = startY - e.clientY
    const newHeight = Math.max(200, Math.min(800, startHeight + delta))
    panelHeight.value = newHeight
    localStorage.setItem('collapsiblePanelHeight', String(newHeight))
  }

  const stopDrag = () => {
    document.removeEventListener('mousemove', doDrag)
    document.removeEventListener('mouseup', stopDrag)
  }

  document.addEventListener('mousemove', doDrag)
  document.addEventListener('mouseup', stopDrag)
}

const tableNotes = computed<TableNote[]>(() => {
  return props.notes.map((note) => ({
    noteId: note.id,
    address: note.address,
    title: note.title,
    referenceCount: note.references.outgoing.length,
    referencedCount: note.references.incoming.length,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    references: note.references.outgoing.map((ref) => ({
      noteId: ref.targetNoteId || '',
      address: ref.metadata.address,
      title: ref.metadata.title
    })),
    referencedBy: note.references.incoming.map((ref) => ({
      noteId: ref.sourceNoteId || '',
      address: ref.metadata.address,
      title: ref.metadata.title
    }))
  }))
})
</script>

<style scoped>
.collapsible-panel {
  width: 100%;
  border-top: 1px solid var(--color-border-default);
  transition: height 0.1s ease;
  overflow: visible;
  position: relative;
}

.drag-handle {
  position: absolute;
  top: -3px;
  left: 0;
  right: 0;
  height: 6px;
  cursor: row-resize;
  background: transparent;
  z-index: 100;
}

.drag-handle:hover {
  background: var(--color-primary-light);
}

.drag-handle:active {
  background: var(--color-primary);
}

.panel-toggle-btn {
  position: absolute;
  top: -13px;
  left: 50%;
  transform: translate(-50%, 0);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  padding: 4px 12px;
  cursor: pointer;
  z-index: 101;
  width: 64px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.4;
}

.panel-toggle-btn:hover {
  background: var(--color-primary-light);
  color: var(--color-primary);
  opacity: 1;
}

:deep(.i-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

:deep(svg) {
  width: 16px;
  height: 16px;
}

.panel-content {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.table-container {
  flex: 1;
  overflow: hidden;
  padding: 0;
}
</style>
