<template>
  <Teleport to="body">
    <Transition name="fade-zoom">
      <div v-if="show" ref="menuRef" :style="computedMenuStyle" class="popup-menu" @click.stop>
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
              :fill="item.isDangerous ? '#ff4d4f' : item.fill || 'var(--color-icon-menu-default)'"
              :strokeWidth="3"
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
import { ref, computed, onMounted, onUnmounted, CSSProperties, watch, nextTick } from 'vue'

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
  position: Position
  show: boolean
}>()

const emit = defineEmits(['close', 'itemClick'])

const menuRef = ref<HTMLElement | null>(null)
const menuPosition = ref(props.position)

watch(
  () => props.position,
  (newPosition) => {
    menuPosition.value = newPosition
    if (props.show) {
      nextTick(() => {
        adjustMenuPosition()
      })
    }
  },
  { deep: true }
)

watch(
  () => props.show,
  (newValue) => {
    if (newValue) {
      menuPosition.value = props.position
      nextTick(() => {
        adjustMenuPosition()
      })
    }
  }
)

const computedMenuStyle = computed((): CSSProperties => {
  const { x, y } = menuPosition.value
  const maxWidth = Math.min(300, window.innerWidth - 20)
  return {
    position: 'fixed',
    top: `${y}px`,
    left: `${x}px`,
    maxWidth: `${maxWidth}px`
  }
})

const handleDocumentClick = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close')
  }
}

const handleItemClick = (item: MenuItem) => {
  emit('itemClick', item)
}

const adjustMenuPosition = () => {
  if (menuRef.value) {
    const rect = menuRef.value.getBoundingClientRect()
    const windowWidth = window.innerWidth
    if (rect.right > windowWidth) {
      const overflowX = rect.right - windowWidth
      menuPosition.value.x -= overflowX + 10
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  window.addEventListener('resize', adjustMenuPosition)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('resize', adjustMenuPosition)
})
</script>

<style scoped lang="scss">
.popup-menu {
  background-color: var(--color-dropdown-bg);
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
  max-width: 100vw;
  overflow-x: hidden;
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

  &.popup-menu-item-danger,
  &.popup-menu-item-danger .name {
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

  &:hover {
    background-color: var(--color-hover-button);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }
  &.popup-menu-item-danger {
    color: #ff4d4f;
  }

  &.delete {
    color: #ff4d4f;
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
