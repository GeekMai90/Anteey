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
        <template v-if="menuItems.length > 0">
          <template v-for="item in menuItems" :key="item.name">
            <template v-if="item.divider">
              <div class="menu-divider"></div>
            </template>
            <template v-else>
              <div
                class="menu-item"
                :class="{ 'is-dangerous': item.isDangerous }"
                @click="handleItemClick(item)"
              >
                <div class="icon">
                  <component
                    :is="getIconComponent(item.icon)"
                    theme="outline"
                    size="18"
                    :fill="getItemFill(item)"
                    :strokeWidth="3"
                  />
                </div>
                <div class="name">{{ item.label }}</div>
              </div>
            </template>
          </template>
        </template>
        <div v-else class="empty-menu-item">
          {{ props.emptyText || '暂无可用选项' }}
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useFloating } from '@floating-ui/vue'
import { flip, offset, shift } from '@floating-ui/dom'
import { ref, computed, onMounted, onUnmounted } from 'vue'
// 导入所有可能用作图标的组件
import { Robot } from '@icon-park/vue-next'

export interface MenuItem {
  name: string
  label: string
  icon?: any // 可以是组件引用或字符串
  action: () => void
  fill?: string
  isDangerous?: boolean
  divider?: boolean // 新增：是否在此项后显示分隔线
}

const props = defineProps<{
  menuItems: MenuItem[]
  buttonRef: HTMLElement | null
  show: boolean
  emptyText?: string // 新增属性，用于显示空状态的提示文字
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

// 添加一个函数来获取图标组件
const getIconComponent = (icon: any) => {
  // 如果icon已经是组件引用，直接返回
  if (typeof icon !== 'string') {
    return icon
  }

  // 如果icon是字符串，映射到对应的组件
  const iconMap: Record<string, any> = {
    Robot: Robot
    // 添加其他图标组件映射
  }

  // 返回对应的组件，如果没有则返回默认图标
  return iconMap[icon] || Robot
}

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

.empty-menu-item {
  padding: 8px 12px;
  color: var(--color-text-secondary);
  font-size: 14px;
  text-align: center;
  user-select: none;
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

// 添加分隔线样式
.menu-divider {
  height: 1px;
  background-color: var(--color-border);
  margin: 4px 8px;
  opacity: 0.6;
  width: calc(100% - 16px);
}
</style>
