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
              fill="var(--color-icon-menu-default)"
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
import { CardType } from '@renderer/types/Note'
import { Notes, ListAlphabet, Bookshelf } from '@icon-park/vue-next'

const props = defineProps<{
  isOpen: boolean
  position?: { x: number; y: number }
  offset?: { x: number; y: number }
  currentCardType?: CardType
}>()

const emit = defineEmits(['select', 'close'])

const menuRef = ref<HTMLElement | null>(null)
const menuPosition = ref({ x: 0, y: 0 })
const cardTypes: CardType[] = ['Maincard', 'Indexcard', 'Bibcard']

const computedMenuStyle = computed((): CSSProperties => {
  const { x, y } = menuPosition.value
  const offsetX = props.offset?.x || 0
  const offsetY = props.offset?.y || 0
  const maxWidth = Math.min(300, window.innerWidth - 20) // 20px 作为安全边距
  return {
    position: 'fixed',
    top: `${y + offsetY}px`,
    left: `${x + offsetX}px`,
    maxWidth: `${maxWidth}px`
  }
})

const getIcon = (type: CardType) => {
  switch (type) {
    case 'Maincard':
      return Notes
    case 'Bibcard':
      return Bookshelf
    case 'Indexcard':
      return ListAlphabet
    // case 'Hoplinkcard':
    //   return Link
    default:
      return Notes // 默认返回 Notes 图标
  }
}

const getTypeLabel = (type: CardType): string => {
  switch (type) {
    case 'Maincard':
      return '主要卡片'
    case 'Bibcard':
      return '文献卡片'
    case 'Indexcard':
      return '索引卡片'
    // case 'Hoplinkcard':
    //   return '跳转卡'
    default:
      return '主要卡片'
  }
}

// 修改选择处理函数
const selectCardType = (type: CardType) => {
  emit('select', type) // 改为发送 select 事件
  emit('close')
}

const isTypeSelected = (type: CardType) => {
  return props.currentCardType === type
}

const closeMenu = () => {
  emit('close')
}

const adjustMenuPosition = () => {
  if (menuRef.value) {
    const rect = menuRef.value.getBoundingClientRect()
    const windowWidth = window.innerWidth
    if (rect.right > windowWidth) {
      const overflowX = rect.right - windowWidth
      menuPosition.value.x -= overflowX + 10 // 10px 作为安全边距
    }
  }
}

watch(
  () => props.isOpen,
  (newValue) => {
    if (newValue) {
      nextTick(() => {
        adjustMenuPosition()
      })
    }
  }
)

const openMenu = (x?: number, y?: number) => {
  if (x !== undefined && y !== undefined) {
    menuPosition.value = { x, y }
  } else if (props.position) {
    menuPosition.value = props.position
  }
  nextTick(() => {
    adjustMenuPosition()
  })
}

onMounted(() => {
  document.addEventListener('click', closeMenu)
  window.addEventListener('resize', adjustMenuPosition)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
  window.removeEventListener('resize', adjustMenuPosition)
})

defineExpose({ openMenu, closeMenu })
</script>

<style scoped lang="scss">
.card-type-dropdown-menu {
  position: fixed;
  background-color: var(--color-dropdown-bg);
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
