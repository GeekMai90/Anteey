<template>
  <Teleport to="body">
    <Transition name="fade-zoom">
      <div v-if="show" :style="computedMenuStyle" class="popup-menu" @click.stop>
        <div
          v-for="item in menuItems"
          :key="item.name"
          class="popup-menu-item"
          :class="{ 'popup-menu-item-danger': item.isDangerous }"
          @click="handleItemClick(item)"
        >
          <div v-if="item.icon" class="icon">
            <component
              :is="item.icon"
              theme="outline"
              size="18"
              :fill="item.isDangerous ? '#ff4d4f' : item.fill || 'var(--color-icon-default)'"
            />
          </div>
          <div class="name" :class="{ 'popup-menu-item-danger': item.isDangerous }">
            {{ item.label }}
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, CSSProperties } from 'vue'

export interface MenuItem {
  name: string
  label: string
  icon?: any
  action: () => void
  fill?: string
  isDangerous?: boolean
}

interface Position {
  x: number
  y: number
}

const props = defineProps<{
  menuItems: MenuItem[]
  position?: Position
  offset?: Position
  show?: boolean
}>()

const emit = defineEmits(['close', 'itemClick'])

// const show = ref(false)
const menuPosition = ref<Position>({ x: 0, y: 0 })
const isConfirmingDelete = ref(false)
let deleteTimeout: number | null = null

// const computedMenuItems = computed(() => {
//   return props.menuItems.map((item) => {
//     if (item.name === 'delete') {
//       return {
//         ...item,
//         label: isConfirmingDelete.value ? '确认删除' : '删除',
//         isDangerous: isConfirmingDelete.value,
//         fill: isConfirmingDelete.value ? '#ff4d4f' : item.fill
//       }
//     }
//     return item
//   })
// })

const computedMenuStyle = computed((): CSSProperties => {
  const { x, y } = menuPosition.value
  const offsetX = props.offset?.x || 0
  const offsetY = props.offset?.y || 0
  return {
    position: 'fixed',
    top: `${y + offsetY}px`,
    left: `${x + offsetX}px`
  }
})

const handleItemClick = (item: MenuItem) => {
  emit('itemClick', item)
}

const closeMenu = () => {
  isConfirmingDelete.value = false
  if (deleteTimeout !== null) {
    clearTimeout(deleteTimeout)
    deleteTimeout = null
  }
  emit('close')
}

const openMenu = (x?: number, y?: number) => {
  if (x !== undefined && y !== undefined) {
    menuPosition.value = { x, y }
  } else if (props.position) {
    menuPosition.value = props.position
  }
}

const resetDeleteState = () => {
  isConfirmingDelete.value = false
  if (deleteTimeout !== null) {
    clearTimeout(deleteTimeout)
    deleteTimeout = null
  }
}

onMounted(() => {
  document.addEventListener('click', closeMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
  resetDeleteState()
})

defineExpose({ openMenu, closeMenu, resetDeleteState })
</script>

<style scoped lang="scss">
.popup-menu {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 9999;
  min-width: 180px;
  width: max-content;
  max-width: 300px;
  overflow-y: auto;
  padding: 6px 12px;
  white-space: nowrap;
}

.popup-menu-item {
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

  &.popup-menu-item-danger {
    color: #ff4d4f;
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
// 添加动画相关的样式
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
