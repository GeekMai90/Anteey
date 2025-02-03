<template>
  <Teleport to="body">
    <Transition name="fade-zoom">
      <div
        v-if="show"
        ref="floating"
        class="popup-menu"
        :style="{
          position: strategy,
          top: `${y ?? 0}px`,
          left: `${x ?? 0}px`
        }"
      >
        <div
          v-for="item in menuItems"
          :key="item.name"
          class="menu-item"
          :class="{ 'is-dangerous': item.isDangerous }"
          @click="handleItemClick(item)"
        >
          <div class="icon">
            <component
              :is="item.icon"
              theme="outline"
              size="18"
              :fill="getItemFill(item)"
              :strokeWidth="3"
            />
          </div>
          <div class="name">{{ item.label }}</div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useFloating } from '@floating-ui/vue'
import { flip, offset, shift } from '@floating-ui/dom'
import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface MenuItem {
  name: string
  label: string
  icon?: any
  action: () => void
  fill?: string
  isDangerous?: boolean
}

const props = defineProps<{
  menuItems: MenuItem[]
  buttonRef: HTMLElement | null
  show: boolean
}>()

const emit = defineEmits(['close', 'itemClick'])

// floating-ui 相关
const floating = ref<HTMLElement | null>(null)

const { x, y, strategy } = useFloating(
  computed(() => props.buttonRef),
  floating,
  {
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift()]
  }
)

// 修改获取图标填充颜色的方法
const getItemFill = (item: MenuItem) => {
  // 只有在确认删除状态时才显示红色
  if (item.isDangerous) {
    return '#ff4d4f'
  }
  // 使用 item.fill 如果存在，否则使用默认颜色
  return item.fill || 'var(--color-icon-primary)'
}

// 处理点击事件
const handleDocumentClick = (event: MouseEvent) => {
  // 如果菜单未显示，不处理
  if (!props.show) return

  // 先检查按钮元素（不处理按钮点击）
  if (props.buttonRef?.contains(event.target as Node)) {
    return
  }

  // 检查菜单元素
  const menuEl = floating.value
  if (!menuEl?.contains(event.target as Node)) {
    emit('close')
  }
}

const handleItemClick = (item: MenuItem) => {
  emit('itemClick', item)
}

onMounted(() => {
  // 使用 setTimeout 确保在 useMenu 的处理器之后执行
  setTimeout(() => {
    document.addEventListener('click', handleDocumentClick)
  }, 0)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<style scoped lang="scss">
.popup-menu {
  background-color: var(--color-bg-primary);
  border-color: var(--color-border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 9999;
  min-width: 160px;
  width: max-content;
  max-width: 300px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 12px;
  white-space: nowrap;
}

.menu-item {
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

  &:hover {
    background-color: var(--color-hover-button);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

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
    color: var(--color-text-primary);
    font-size: 14px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1;
    user-select: none;
  }

  &.is-dangerous {
    .name {
      color: #ff4d4f !important;
    }
  }
}

.fade-zoom-enter-active,
.fade-zoom-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-zoom-enter-from,
.fade-zoom-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.fade-zoom-enter-to,
.fade-zoom-leave-from {
  opacity: 1;
  transform: scale(1);
}
</style>
