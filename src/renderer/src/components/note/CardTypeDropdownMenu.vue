<template>
  <Teleport to="body">
    <Transition name="fade-zoom">
      <div
        v-if="isOpen"
        ref="menuRef"
        :style="computedMenuStyle"
        class="card-type-dropdown-menu"
        @click.stop
      >
        <div
          v-for="type in cardTypes"
          :key="type"
          class="card-type-item"
          :class="{ active: isTypeSelected(type) }"
          @click="selectCardType(type)"
        >
          <div class="icon">
            <component
              :is="getIcon(type)"
              theme="outline"
              size="18"
              fill="var(--color-icon-primary)"
              :strokeWidth="3"
            />
          </div>
          <div class="name">{{ getTypeLabel(type) }}</div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, CSSProperties, watch, nextTick } from 'vue'
import { CardType } from '@shared/types'
import { Notes, ListAlphabet, Bookshelf } from '@icon-park/vue-next'

const props = defineProps<{
  isOpen: boolean
  position: { x: number; y: number }
  currentCardType?: CardType
}>()

const emit = defineEmits(['select', 'close'])

const menuRef = ref<HTMLElement | null>(null)
const cardTypes: CardType[] = ['Maincard', 'Indexcard', 'Bibcard']
const menuPosition = ref(props.position)

// 计算菜单样式，使用 menuPosition 而不是直接使用 props.position
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

// 添加位置调整逻辑
const adjustMenuPosition = () => {
  if (menuRef.value) {
    const rect = menuRef.value.getBoundingClientRect()
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    // 处理水平方向的溢出
    if (rect.right > windowWidth) {
      menuPosition.value.x -= rect.right - windowWidth + 10
    }
    if (rect.left < 0) {
      menuPosition.value.x = 10
    }

    // 处理垂直方向的溢出
    if (rect.bottom > windowHeight) {
      menuPosition.value.y -= rect.bottom - windowHeight + 10
    }
    if (rect.top < 0) {
      menuPosition.value.y = 10
    }
  }
}

// 监听显示状态变化
watch(
  () => props.isOpen,
  (newValue) => {
    if (newValue) {
      menuPosition.value = props.position
      nextTick(() => {
        adjustMenuPosition()
      })
    }
  }
)

// 监听位置变化
watch(
  () => props.position,
  (newPosition) => {
    menuPosition.value = newPosition
    if (props.isOpen) {
      nextTick(() => {
        adjustMenuPosition()
      })
    }
  },
  { deep: true }
)

const getIcon = (type: CardType) => {
  switch (type) {
    case 'Maincard':
      return Notes
    case 'Bibcard':
      return Bookshelf
    case 'Indexcard':
      return ListAlphabet
    default:
      return Notes
  }
}

const getTypeLabel = (type: CardType): string => {
  switch (type) {
    case 'Maincard':
      return '主要卡片'
    case 'Bibcard':
      return '参考卡片'
    case 'Indexcard':
      return '索引卡片'
    default:
      return '主要卡片'
  }
}

const selectCardType = (type: CardType) => {
  emit('select', type)
  emit('close')
}

const isTypeSelected = (type: CardType) => {
  return props.currentCardType === type
}

const closeMenu = () => {
  emit('close')
}
// 使用具名函数，这样在移除时能确保移除的是同一个函数
const handleDocumentClick = (event: MouseEvent) => {
  // 如果点击的不是菜单内部元素，则关闭菜单
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    closeMenu()
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
.card-type-dropdown-menu {
  position: fixed;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 9999;
  min-width: 180px;
  width: max-content;
  max-width: 100vw; // 确保不超过视口宽度
  overflow-y: auto;
  overflow-x: hidden; // 防止水平溢出
  padding: 6px 12px;
  white-space: nowrap;
}

.card-type-item {
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

  &.active {
    background-color: var(--color-hover-button);
    font-weight: 500;
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
    flex-grow: 1;
    text-align: left;
    color: var(--color-text-primary);
    font-size: 14px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1;
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
