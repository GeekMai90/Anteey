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
    <div class="note-options-menu-item delete" @click="deleteNote">
      <div class="icon">
        <delete-one theme="outline" size="18" :fill="isConfirmingDelete ? '#ff4d4f' : '#b6b6b6'" />
      </div>
      <div class="name delete">
        {{ isConfirmingDelete ? '确认删除' : '删除' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Info, Star, Copy, History, DeleteOne, RightBar } from '@icon-park/vue-next'
import { ref } from 'vue'

const emit = defineEmits(['share', 'star', 'showSidebar', 'copy', 'showHistory', 'delete', 'close'])

const isConfirmingDelete = ref(false)
let deleteTimeout: ReturnType<typeof setTimeout> | null = null

const deleteNote = () => {
  if (!isConfirmingDelete.value) {
    isConfirmingDelete.value = true
    deleteTimeout = setTimeout(() => {
      isConfirmingDelete.value = false
      emit('close')
    }, 3000)
  } else {
    emit('delete')
    emit('close')
    isConfirmingDelete.value = false
    if (deleteTimeout) {
      clearTimeout(deleteTimeout)
      deleteTimeout = null
    }
  }
}

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
  right: 0;
  top: 100%;
  background-color: #fff;
  border-radius: 8px;
  // box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  // width: 160px;
  width: auto;
  overflow-y: auto;
  padding: 6px 12px;
  white-space: nowrap;
  margin-top: 0px;
  background-clip: padding-box;
  box-shadow:
    0 3px 6px -4px rgb(0 0 0 / 12%),
    0 6px 16px 0 rgb(0 0 0 / 8%),
    0 9px 28px 8px rgb(0 0 0 / 5%);
  // margin-right: 10px;
}

.note-options-menu-item {
  position: relative;
  display: flex;
  align-items: center;
  // width: 200px;
  padding: 6px 18px 6px 12px;
  border: none;
  background: none;
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 8px;
  // margin: 0 auto;

  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: background-color 0.2s;
    padding: 0;
    margin-right: 3px;

    &:hover:not(:disabled) {
      background-color: var(--color-hover-bg);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    // 新增以下样式来处理 i-icon 类
    .i-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    svg {
      width: 18px; // 或者您想要的大小
      height: 18px; // 或者您想要的大小
    }
  }

  .name {
    flex-grow: 0;
    text-align: left;
    color: var(--default-text-color);
    font-size: 15px;
    white-space: nowrap; // 防止文字换行
    writing-mode: horizontal-tb; // 确保文字是水平排列的
  }

  &:hover {
    background-color: var(--color-hover-bg);
  }

  &.active {
    background-color: var(--color-menu-active-bg);
    // border: 1px solid var(--color-primary);
  }

  &:hover {
    background-color: #f6f7f9;
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
