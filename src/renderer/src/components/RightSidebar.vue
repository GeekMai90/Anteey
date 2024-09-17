<template>
  <div class="right-sidebar" :style="{ width: `${sidebarWidth}px` }">
    <div class="resize-handle" @mousedown="startResize"></div>
    <div class="sidebar-header">
      <h3>右侧边栏</h3>
      <button @click="closeSidebar">关闭</button>
    </div>
    <div class="search-bar">
      <input type="text" placeholder="搜索、添加卡片或粘贴网页链接" />
    </div>
    <div class="sidebar-content">
      <div v-for="note in sidebarNotes" :key="note.id" class="sidebar-note">
        <div class="note-header">
          <span class="collapse-icon">▼</span>
          <span class="note-id">{{ note.address }}</span>
        </div>
        <div class="note-content">
          <h4>{{ note.address }}</h4>
          <TipTapEditor
            v-model:content="note.content"
            :editable="true"
            :enable-drag-handle="false"
            @update:content="updateNote(note.id, $event)"
          />
          <div class="note-footer">
            <span class="info-icon">ℹ Info</span>
            <button class="show-button">Show</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStores'
import TipTapEditor from '@renderer/components/TipTapEditor.vue'

const props = defineProps<{
  initialWidth?: number
}>()

const emit = defineEmits(['resize'])

const noteStore = useNoteStore()

const sidebarWidth = ref(props.initialWidth || 400)
const sidebarNotes = computed(() => noteStore.rightSidebarNotes)

const closeSidebar = () => {
  noteStore.closeRightSidebar()
}

const updateNote = (noteId: string, content: any) => {
  noteStore.updateNote(noteId, { content })
}

// const removeNoteFromSidebar = (noteId: string) => {
//   noteStore.removeNoteFromRightSidebar(noteId)
// }

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
  height: 100%;
  background-color: var(--color-bg-primary);
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
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
    padding: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--color-border);

    h3 {
      margin: 0;
      font-size: 18px;
      color: var(--color-text-primary);
    }

    button {
      padding: 5px 10px;
      background-color: var(--color-bg-secondary);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      color: var(--color-text-primary);
      transition: background-color 0.2s ease;

      &:hover {
        background-color: var(--color-bg-hover);
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
    padding: 10px;

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: var(--color-bg-secondary);
    }

    &::-webkit-scrollbar-thumb {
      background-color: var(--color-scrollbar);
      border-radius: 4px;
    }
  }

  .sidebar-note {
    margin-bottom: 10px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;

    .note-header {
      padding: 10px;
      background-color: var(--color-bg-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;

      .collapse-icon {
        margin-right: 5px;
        transition: transform 0.2s ease;
      }

      .note-id {
        font-weight: 500;
        color: var(--color-text-primary);
      }

      &:hover {
        background-color: var(--color-bg-hover);
      }
    }

    .note-content {
      padding: 10px;

      h4 {
        margin-top: 0;
        color: var(--color-text-primary);
      }
    }

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
