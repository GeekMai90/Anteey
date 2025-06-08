<!-- src/components/SettingDropdownMenu.vue -->
<template>
  <Teleport to="body">
    <div
      v-show="uiStore.isSettingDropdownOpen"
      ref="dropdownRef"
      v-click-outside="closeSettingDropdown"
      class="setting-dropdown-menu"
      :style="menuStyle"
    >
      <div class="recycle-bin setting-dropdown-item" @click.stop="handleRecycleBinClick">
        <div class="icon">
          <RecycleBin theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
        <div class="name">回收站</div>
      </div>
      <div class="settings setting-dropdown-item" @click.stop="handleSettingsClick">
        <div class="icon">
          <SettingTwo theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
        <div class="name">设置</div>
      </div>
      <div class="divider"></div>
      <div
        v-tooltip.top="{
          content: '点击查看版本更新日志',
          delay: { show: 1000 },
          html: true
        }"
        class="version-info setting-dropdown-item"
        @click.stop="handleVersionClick"
      >
        <div class="icon">
          <Info theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
        <div class="name">应用版本: {{ appVersion }}</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { RecycleBin, SettingTwo, Info } from '@icon-park/vue-next'
import { useRouter } from 'vue-router'
import { useUIStore } from '@renderer/stores/UIStore'
import { computePosition, flip, shift, offset } from '@floating-ui/dom'
import type { CSSProperties } from 'vue'

const router = useRouter()
const uiStore = useUIStore()
const dropdownRef = ref<HTMLDivElement | null>(null)
const x = ref(0)
const y = ref(0)
const appVersion = ref('')
const downloadUrl =
  'https://docs.anteey.com/%E5%BC%80%E5%A7%8B/%E6%9B%B4%E6%96%B0%E6%97%A5%E5%BF%97.html'

const menuStyle = computed<CSSProperties>(() => ({
  position: 'fixed',
  top: `${y.value}px`,
  left: `${x.value}px`
}))

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

const handleVersionClick = () => {
  window.electronAPI.shell.openExternal(downloadUrl)
  uiStore.closeSettingDropdown()
}

const updateDropdownPosition = async () => {
  const button = document.querySelector('.antinet-button') as HTMLElement
  const dropdown = dropdownRef.value
  if (button && dropdown) {
    // 使用 floating-ui 计算位置
    const { x: floatingX, y: floatingY } = await computePosition(button, dropdown, {
      placement: 'bottom-start',
      middleware: [
        offset(4),
        flip({
          fallbackPlacements: ['top-start', 'left-start', 'right-start']
        }),
        shift({ padding: 8 })
      ]
    })

    // 更新位置
    x.value = floatingX
    y.value = floatingY
  }
}

const getAppVersion = async () => {
  try {
    appVersion.value = await window.electronAPI.app.getVersion()
  } catch (error) {
    console.error('获取应用版本号失败:', error)
    appVersion.value = '未知'
  }
}

onMounted(() => {
  window.addEventListener('resize', updateDropdownPosition)
  watch(
    () => uiStore.isSettingDropdownOpen,
    async (isOpen) => {
      if (isOpen) {
        await getAppVersion()
        await nextTick()
        await updateDropdownPosition()
      }
    }
  )

  getAppVersion()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateDropdownPosition)
})
</script>

<style scoped lang="scss">
.setting-dropdown-menu {
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 1001;
  min-width: 200px;
  width: max-content;
  max-width: 300px;
  overflow-y: auto;
  padding: 6px 12px;
  white-space: nowrap;
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
  transform-origin: top left;
  animation: dropdown-in 0.2s ease;
}

@keyframes dropdown-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.divider {
  height: 1px;
  background-color: var(--color-border-light);
  margin: 4px 0;
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
    color: var(---color-text-primary);
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

  &.version-info {
    cursor: pointer;
    opacity: 0.7;

    &:hover {
      background-color: var(--color-hover-button);
    }
  }
}
</style>
