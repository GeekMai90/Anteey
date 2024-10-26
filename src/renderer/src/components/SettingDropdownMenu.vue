<!-- src/components/SettingDropdownMenu.vue -->
<template>
  <Teleport to="body">
    <div
      v-show="uiStore.isSettingDropdownOpen"
      ref="dropdownRef"
      v-click-outside="closeSettingDropdown"
      class="setting-dropdown-menu"
    >
      <div class="recycle-bin setting-dropdown-item" @click.stop="handleRecycleBinClick">
        <div class="icon">
          <RecycleBin
            theme="outline"
            size="20"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">回收站</div>
      </div>
      <div class="settings setting-dropdown-item" @click.stop="handleSettingsClick">
        <div class="icon">
          <SettingTwo
            theme="outline"
            size="20"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">设置</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { RecycleBin, SettingTwo } from '@icon-park/vue-next'
import { useRouter } from 'vue-router'
import { useUIStore } from '@renderer/stores/useUIStore'

const router = useRouter()
const uiStore = useUIStore()
const dropdownRef = ref<HTMLDivElement | null>(null)

const closeSettingDropdown = () => {
  uiStore.closeSettingDropdown()
}

const handleRecycleBinClick = () => {
  router.push('/trash')
  uiStore.closeSettingDropdown()
}

const handleSettingsClick = () => {
  uiStore.openSettingsPage()
  uiStore.closeSettingDropdown()
}

const updateDropdownPosition = () => {
  const button = document.querySelector('.antinet-button')
  const dropdown = dropdownRef.value
  if (button && dropdown) {
    const rect = button.getBoundingClientRect()
    dropdown.style.top = `${rect.bottom + 5}px`
    dropdown.style.left = `${rect.left + 30}px`
  }
}

onMounted(() => {
  window.addEventListener('resize', updateDropdownPosition)
  watch(
    () => uiStore.isSettingDropdownOpen,
    (isOpen) => {
      if (isOpen) {
        updateDropdownPosition()
      }
    }
  )
})

onUnmounted(() => {
  window.removeEventListener('resize', updateDropdownPosition)
})
</script>

<style scoped lang="scss">
.setting-dropdown-menu {
  position: fixed; // 改为 fixed 定位
  background-color: var(--color-dropdown-bg);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 1001;
  min-width: 200px;
  width: max-content;
  max-width: 300px;
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
    line-height: 1;
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
