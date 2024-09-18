<!-- src/components/NoteOptionsMenu.vue -->
<template>
  <div class="note-options-menu">
    <div class="note-options-menu-item" @click="shareNote">
      <div class="icon">
        <Info theme="outline" size="18" fill="var(--color-icon-default)" />
      </div>
      <div class="name">卡片信息</div>
    </div>
    <div class="note-options-menu-item" @click="starNote">
      <div class="icon">
        <star theme="outline" size="18" fill="var(--color-icon-default)" />
      </div>
      <div class="name">星标收藏</div>
    </div>
    <div class="note-options-menu-item" @click="showSidebar">
      <div class="icon">
        <RightBar theme="outline" size="18" fill="var(--color-icon-default)" />
      </div>
      <div class="name">右侧显示</div>
    </div>
    <div class="note-options-menu-item" @click="copyNote">
      <div class="icon">
        <copy theme="outline" size="18" fill="var(--color-icon-default)" />
      </div>
      <div class="name">复制全文</div>
    </div>
    <div class="note-options-menu-item" @click="showHistory">
      <div class="icon">
        <history theme="outline" size="18" fill="var(--color-icon-default)" />
      </div>
      <div class="name">历史版本</div>
    </div>
    <div
      class="note-options-menu-item"
      :class="{ delete: isConfirmingDelete }"
      @click="handleDeleteClick"
    >
      <div class="icon">
        <delete-one
          theme="outline"
          size="18"
          :fill="isConfirmingDelete ? '#ff4d4f' : 'var(--color-icon-default)'"
        />
      </div>
      <div class="name" :class="{ delete: isConfirmingDelete }">
        {{ isConfirmingDelete ? '确认删除' : '删除' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Info, Star, Copy, History, DeleteOne, RightBar } from '@icon-park/vue-next'
import { useNoteOptions } from '@renderer/composable/useNoteOptions'
// import { useNoteStore } from '@renderer/stores/noteStores'
import { onUnmounted, ref } from 'vue'

const props = defineProps<{
  noteId: string
}>()

// const noteStore = useNoteStore()
const { moveToTrash } = useNoteOptions(props.noteId)

const emit = defineEmits(['share', 'star', 'showSidebar', 'copy', 'showHistory', 'delete', 'close'])

const isConfirmingDelete = ref(false)
let deleteTimeout: ReturnType<typeof setTimeout> | null = null

const handleDeleteClick = async (event: Event) => {
  event.stopPropagation() // 阻止事件冒泡
  if (!isConfirmingDelete.value) {
    isConfirmingDelete.value = true
    deleteTimeout = setTimeout(() => {
      isConfirmingDelete.value = false
    }, 3000)
  } else {
    try {
      await moveToTrash()
      emit('delete') // 发出删除成功的事件
      emit('close') // 删除成功后关闭菜单
    } catch (error) {
      console.error('Failed to move note to trash:', error)
      // 可以在这里添加错误处理逻辑，比如显示一个错误提示
    }
  }
}
// 清理定时器
onUnmounted(() => {
  if (deleteTimeout) {
    clearTimeout(deleteTimeout)
  }
})

// 添加一个方法来重置确认状态
const resetDeleteConfirmation = () => {
  isConfirmingDelete.value = false
  if (deleteTimeout) {
    clearTimeout(deleteTimeout)
  }
}

// 暴露这个方法，以便父组件可以调用
defineExpose({ resetDeleteConfirmation })

// const deleteNote = () => {
//   if (!isConfirmingDelete.value) {
//     isConfirmingDelete.value = true
//     deleteTimeout = setTimeout(() => {
//       isConfirmingDelete.value = false
//       emit('close')
//     }, 3000)
//   } else {
//     emit('delete')
//     emit('close')
//     isConfirmingDelete.value = false
//     if (deleteTimeout) {
//       clearTimeout(deleteTimeout)
//       deleteTimeout = null
//     }
//   }
// }

const shareNote = () => {
  emit('share')
  emit('close')
}

const starNote = () => {
  emit('star')
  emit('close')
}

const showSidebar = () => {
  emit('showSidebar')
  emit('close')
}

const copyNote = () => {
  emit('copy')
  emit('close')
}

const showHistory = () => {
  emit('showHistory')
  emit('close')
}
</script>

<style scoped lang="scss">
.note-options-menu {
  position: absolute;
  top: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%); // 居中对齐
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 1000;
  // width: 150px;
  // min-width: 200px;
  width: max-content; // 使用 max-content 确保菜单宽度适应内容
  // max-width: 300px; // 设置最大宽度，避免过宽
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
