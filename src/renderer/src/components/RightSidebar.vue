<template>
  <div class="right-sidebar" :style="{ width: `${sidebarWidth}px` }">
    <div class="resize-handle" @mousedown="startResize"></div>
    <div class="sidebar-header">
      <div class="toolbar-section left"></div>
      <div class="toolbar-section right">
        <div class="clear-button" @click="clearSidebarNotes">
          <div class="icon">
            <Clear theme="outline" size="20" fill="#b6b6b6" :stroke-width="3" />
          </div>
        </div>
      </div>
    </div>
    <div class="sidebar-content">
      <div v-for="note in sidebarNotes" :key="note.id" class="sidebar-note">
        <div class="note-content">
          <RightSidebarNoteEditor
            ref="noteEditorRef"
            :noteId="note.id"
            @close="noteStore.closeNoteEditor"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStores'
import RightSidebarNoteEditor from './RightSidebarNoteEditor.vue'
import { Clear } from '@icon-park/vue-next'

const props = defineProps<{
  initialWidth?: number
}>()

const emit = defineEmits(['resize'])

const noteStore = useNoteStore()

const sidebarWidth = ref(props.initialWidth || 400)
const sidebarNotes = computed(() => noteStore.rightSidebarNotes)
const clearSidebarNotes = () => {
  noteStore.clearRightSidebarNotes()
}

const startResize = (e: MouseEvent) => {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = sidebarWidth.value

  const resize = (e: MouseEvent) => {
    const diff = startX - e.clientX
    const newWidth = Math.max(400, Math.min(600, startWidth + diff))
    sidebarWidth.value = newWidth
    emit('resize', newWidth)
  }

  const stopResize = () => {
    window.removeEventListener('mousemove', resize)
    window.removeEventListener('mouseup', stopResize)
  }

  window.addEventListener('mousemove', resize)
  window.addEventListener('mouseup', stopResize)
}

watch(sidebarWidth, (newWidth) => {
  emit('resize', newWidth)
})
</script>

<style scoped lang="scss">
.right-sidebar {
  height: 100vh;
  background-color: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: relative;

  .resize-handle {
    position: absolute;
    top: 0;
    left: -5px;
    width: 10px;
    height: 100%;
    cursor: col-resize;
    z-index: 1;
  }

  .sidebar-header {
    padding: 0 10px; // 使用padding来控制高度，而不是固定高度
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 40px; // 使用最小高度而不是固定高度
    box-sizing: border-box;
    .toolbar-section {
      display: flex;
      align-items: center;
      position: relative;
      display: flex;
      align-items: center;
      border: none;
      background: none;
      cursor: pointer;
      transition: all 0.2s ease;
      border-radius: 6px;
      padding: 4px 4px;
      margin: 2px;

      .icon {
        background: none;
        border: none;
        cursor: pointer;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        padding: 0;

        // &:hover:not(:disabled) {
        //   background-color: rgba(0, 0, 0, 0.05);
        // }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        :deep(.i-icon) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        :deep(svg) {
          width: 18px;
          height: 18px;
        }
      }

      .name {
        flex-grow: 0;
        text-align: left;
        color: var(--color-text-primary);
        font-size: 13px;
        font-weight: 400;
        margin-left: 6px;
        white-space: nowrap;
        writing-mode: horizontal-tb;
      }

      &:hover {
        background-color: var(--color-hover-button);
      }

      &:active {
        background-color: rgba(0, 0, 0, 0.1);
      }
    }
  }

  .search-bar {
    padding: 10px;

    input {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background-color: var(--color-bg-input);
      color: var(--color-text-primary);

      &::placeholder {
        color: var(--color-text-secondary);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
      }
    }
  }

  .sidebar-content {
    flex-grow: 1;
    overflow-y: auto;
    padding: 10px 15px;
  }

  .sidebar-note {
    margin-bottom: 10px;
    border-radius: 4px;
    overflow: hidden;

    .note-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      border-top: 1px solid var(--color-border);
      background-color: var(--color-bg-secondary);

      .info-icon {
        color: var(--color-text-secondary);
      }

      .show-button {
        padding: 5px 10px;
        background-color: var(--color-bg-button);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        color: var(--color-text-button);
        transition: background-color 0.2s ease;

        &:hover {
          background-color: var(--color-bg-button-hover);
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .right-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    width: 100% !important;
  }
}
</style>
