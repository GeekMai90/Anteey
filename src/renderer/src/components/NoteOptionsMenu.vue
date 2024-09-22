<!-- src/components/NoteOptionsMenu.vue -->
<template>
  <div class="note-options-menu">
    <div
      v-for="item in menuItems"
      :key="item.name"
      class="note-options-menu-item"
      :class="{ delete: item.name === 'delete' && isConfirmingDelete }"
      @click="(event) => handleItemClick(event, item)"
    >
      <div class="icon">
        <component
          :is="item.icon"
          theme="outline"
          size="18"
          :fill="
            item.name === 'delete' && isConfirmingDelete
              ? '#ff4d4f'
              : item.fill || 'var(--color-icon-default)'
          "
        />
      </div>
      <div class="name" :class="{ delete: item.name === 'delete' && isConfirmingDelete }">
        {{ item.name === 'delete' && isConfirmingDelete ? '确认删除' : item.label }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStores'
import { Info, Star, Copy, History, DeleteOne, RightBar } from '@icon-park/vue-next'

const props = defineProps<{
  noteId: string
}>()

const emit = defineEmits(['close'])
const noteStore = useNoteStore()

const isConfirmingDelete = ref(false)
const isDeleting = ref(false)

const isStarred = computed(() => {
  return noteStore.notes.find((note) => note.id === props.noteId)?.isStarred || false
})

const handleShare = () => {
  console.log('Sharing note', props.noteId)
  // 实现分享逻辑
  emit('close')
}

const handleStar = () => {
  if (!isStarred.value) {
    console.log('添加星标收藏')
    noteStore.addStarToNote(props.noteId)
  } else {
    console.log('移除星标收藏')
    noteStore.removeStarFromNote(props.noteId)
  }
  emit('close')
}

const handleShowSidebar = () => {
  noteStore.addNoteToRightSidebar(props.noteId)
  emit('close')
}

const handleCopy = () => {
  console.log('Copying note', props.noteId)
  // 实现复制逻辑
  emit('close')
}

const handleShowHistory = () => {
  console.log('Showing history for note', props.noteId)
  // 实现显示历史记录的逻辑
  emit('close')
}

let deleteTimeout: number | null = null
const handleDelete = async (event: Event) => {
  event.stopPropagation()
  if (isDeleting.value) return

  if (!isConfirmingDelete.value) {
    isConfirmingDelete.value = true
    // 存储 timeout 的引用
    deleteTimeout = window.setTimeout(() => {
      isConfirmingDelete.value = false
    }, 3000) // 3秒后重置确认状态
  } else {
    // 如果正在确认删除，清除之前的 timeout
    if (deleteTimeout !== null) {
      clearTimeout(deleteTimeout)
      deleteTimeout = null
    }

    isDeleting.value = true
    try {
      const success = await noteStore.moveToTrash(props.noteId)
      if (success) {
        console.log('Note moved to trash successfully')
        noteStore.closeNoteEditor()
      } else {
        console.error('Failed to move note to trash')
      }
    } catch (error) {
      console.error('Error in moveToTrash:', error)
    } finally {
      isDeleting.value = false
      isConfirmingDelete.value = false
      emit('close')
    }
  }
}

const menuItems = computed(() => [
  { name: 'info', label: '卡片信息', icon: Info, action: handleShare },
  {
    name: 'star',
    label: '星标收藏',
    icon: Star,
    action: handleStar,
    fill: isStarred.value ? 'var(--color-primary)' : 'var(--color-icon-default)'
  },
  { name: 'sidebar', label: '右侧显示', icon: RightBar, action: handleShowSidebar },
  { name: 'copy', label: '复制全文', icon: Copy, action: handleCopy },
  { name: 'history', label: '历史版本', icon: History, action: handleShowHistory },
  { name: 'delete', label: '删除', icon: DeleteOne, action: handleDelete }
])

const handleItemClick = (event: Event, item: any) => {
  event.stopPropagation()
  if (item.name === 'delete') {
    handleDelete(event)
  } else {
    item.action()
  }
}

// 清理函数
const resetState = () => {
  isConfirmingDelete.value = false
  isDeleting.value = false
  if (deleteTimeout !== null) {
    clearTimeout(deleteTimeout)
    deleteTimeout = null
  }
}

defineExpose({ resetState })
</script>

<style scoped lang="scss">
.note-options-menu {
  position: absolute;
  top: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 1000;
  width: max-content;
  overflow-y: auto;
  padding: 6px 12px;
  white-space: nowrap;
}
.note-options-menu-item {
  position: relative;
  display: flex;
  align-items: center;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
  padding: 4px 8px 4px 4px;
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
      width: 16px;
      height: 16px;
    }
  }

  .name {
    flex-grow: 0;
    text-align: left;
    color: var(--default-text-color);
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

  &.delete {
    color: #ff4d4f;
  }
}

.dropdown-item-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-grow: 1;
}

.dropdown-menu::-webkit-scrollbar {
  width: 6px;
}

.dropdown-menu::-webkit-scrollbar-thumb {
  background-color: #d0d0d0;
  border-radius: 3px;
}

.dropdown-menu::-webkit-scrollbar-track {
  background-color: #f0f0f0;
}
</style>
