<template>
  <div class="multi-notes">
    <div class="toolbar"></div>

    <div class="notes-container">
      <div
        v-for="note in sidebarNotes"
        :key="note.id"
        class="note-item"
        :draggable="isDraggable"
        @dragstart="(e) => handleDragStart(e, note)"
      >
        <RightSidebarNoteEditor :noteId="note.id" @close="noteStore.closeNoteEditor" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import RightSidebarNoteEditor from '@renderer/components/rightSidebar/RightSidebarNoteEditor.vue'
// import { Clear } from '@icon-park/vue-next'
import type { Note } from '@shared/types'
import { useRoute } from 'vue-router'

const route = useRoute()
const noteStore = useNoteStore()
const sidebarNotes = computed(() => noteStore.rightSidebarNotes)

// 根据路由判断是否可拖动
const isDraggable = computed(() => {
  return route.name === 'MindboardDetail'
})

const handleDragStart = (event: DragEvent, note: Note) => {
  // 如果不在思维板详情页面，则不执行拖动
  if (!isDraggable.value) return

  if (!event.dataTransfer) return

  event.dataTransfer.setData('application/json', JSON.stringify({ id: note.id }))
  event.dataTransfer.effectAllowed = 'copy'

  // 创建拖动时的视觉效果
  const dragImage = document.createElement('div')
  dragImage.style.cssText = `
    position: absolute;
    width: 200px;
    height: 50px;
    background: var(--color-bg-note-card);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 10px;
    opacity: 0.8;
    pointer-events: none;
    display: flex;
    align-items: center;
  `
  dragImage.textContent = note.address || '无编码地址'
  document.body.appendChild(dragImage)

  event.dataTransfer.setDragImage(dragImage, 100, 25)

  setTimeout(() => {
    document.body.removeChild(dragImage)
  }, 0)
}
</script>

<style lang="scss" scoped>
.multi-notes {
  height: 100%;
  display: flex;
  flex-direction: column;

  .toolbar {
    // padding: 8px;
    display: flex;
    justify-content: flex-end;
    // border-bottom: 1px solid var(--color-border);

    .clear-button {
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;

      &:hover {
        background-color: var(--color-hover-bg);
      }
    }
  }

  .notes-container {
    flex: 1;
    overflow-y: auto;
    padding: 12px;

    .note-item {
      margin-bottom: 16px;
      //默认鼠标样式
      cursor: default;

      //当可以拖动时，鼠标样式为小手
      &[draggable='true'] {
        cursor: grab;

        &:active {
          cursor: grabbing;
        }
      }

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}
</style>
