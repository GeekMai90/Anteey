<!-- src/components/SettingDropdownMenu.vue -->
<template>
  <div
    v-if="noteStore.isSettingDropdownOpen"
    v-click-outside="closeSettingDropdown"
    class="setting-dropdown-menu"
  >
    <div class="recycle-bin setting-dropdown-item" @click.stop="handleRecycleBinClick">
      <div class="icon">
        <ExpandTextInput theme="outline" size="20" fill="#b6b6b6" />
      </div>
      <div class="name">回收站</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ExpandTextInput } from '@icon-park/vue-next'
import { useNoteStore } from '@renderer/stores/noteStores'
import { useRouter } from 'vue-router'

const noteStore = useNoteStore()
const router = useRouter()

const closeSettingDropdown = () => {
  noteStore.closeSettingDropdown()
}

const handleRecycleBinClick = () => {
  router.push('/trash')
}
</script>

<style scoped lang="scss">
.setting-dropdown-menu {
  position: absolute;
  top: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%); // 居中对齐
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 9999;
  min-width: 200px;
  width: max-content; // 使用 max-content 确保菜单宽度适应内容
  max-width: 300px; // 设置最大宽度，避免过宽
  overflow-y: auto;
  padding: 6px 12px;
  white-space: nowrap;
}

.setting-dropdown-item {
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
</style>
