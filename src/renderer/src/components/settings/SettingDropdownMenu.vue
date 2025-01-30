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
      <!-- <div class="image-manager setting-dropdown-item" @click.stop="handleImageManagerClick">
        <div class="icon">
          <ImageFiles
            theme="outline"
            size="20"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">图片管理</div>
      </div> -->
      <div class="vector-update setting-dropdown-item" @click.stop="handleVectorUpdate">
        <div class="icon">
          <Refresh
            theme="outline"
            size="20"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">更新向量索引</div>
      </div>
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
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { RecycleBin, SettingTwo, Refresh } from '@icon-park/vue-next'
import { useRouter } from 'vue-router'
import { useUIStore } from '@renderer/stores/UIStore'
import { useNoteStore } from '@renderer/stores/noteStore'
import { message } from '@renderer/utils/message'
import { computePosition, flip, shift, offset } from '@floating-ui/dom'
import type { CSSProperties } from 'vue'

const router = useRouter()
const uiStore = useUIStore()
const dropdownRef = ref<HTMLDivElement | null>(null)
const x = ref(0)
const y = ref(0)

const menuStyle = computed<CSSProperties>(() => ({
  position: 'fixed',
  top: `${y.value}px`,
  left: `${x.value}px`
}))

const noteStore = useNoteStore()

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

// const handleImageManagerClick = () => {
//   router.push('/image-manager')
//   uiStore.closeSettingDropdown()
// }

// 添加一个变量来保存消息实例
let vectorUpdateMessageInstance: { close: () => void } | null = null
const handleVectorUpdate = async () => {
  // 显示开始更新提示
  vectorUpdateMessageInstance = message.info('正在更新向量索引...', 3600000)

  // 调用批量更新向量的方法
  await noteStore.batchUpdateVectors()

  vectorUpdateMessageInstance?.close()

  // setTimeout(() => {
  //   window.location.reload()
  // }, 500)

  // 显示更新成功提示
  message.success('向量索引更新完成')

  // 关闭下拉菜单
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

onMounted(() => {
  window.addEventListener('resize', updateDropdownPosition)
  watch(
    () => uiStore.isSettingDropdownOpen,
    async (isOpen) => {
      if (isOpen) {
        // 等待 DOM 更新后再计算位置
        await nextTick()
        await updateDropdownPosition()
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
  // 添加过渡动画
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
