<template>
  <Teleport to="body">
    <Transition name="fade-zoom">
      <div v-if="isOpen" ref="menuRef" :style="computedMenuStyle" class="cardbox-dropdown-menu">
        <template v-if="sortedCardBoxes.length > 0">
          <div
            v-for="box in sortedCardBoxes"
            :key="box.id"
            class="dropdown-item"
            :class="{ active: isBoxSelected(box) }"
            @click="selectCardBox(box)"
          >
            <div class="icon">
              <component
                :is="box.id === '0000' ? FileCabinet : Box"
                theme="outline"
                size="18"
                fill="var(--color-icon-menu-default)"
                :strokeWidth="3"
              />
            </div>
            <div class="name">
              {{ box.name || '请添加卡片盒' }}
            </div>
          </div>
        </template>
        <div v-else class="empty-state" @click="goToCardboxPage">点击前往卡片盒页面新增卡片盒</div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { FileCabinet, Box } from '@icon-park/vue-next'
import { CardBox } from '@renderer/types/Note'
import { computed, CSSProperties, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStores'
import { storeToRefs } from 'pinia'
import router from '@renderer/router'

const props = defineProps<{
  isOpen: boolean
  position: { x: number; y: number }
  noteId?: string
  currentCardboxId?: string
}>()

const emit = defineEmits(['close'])

const noteStore = useNoteStore()
const { cardBoxes } = storeToRefs(noteStore)

const sortedCardBoxes = computed(() => {
  return [...cardBoxes.value].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
})

const menuRef = ref<HTMLElement | null>(null)
const menuPosition = ref(props.position)

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

// 监听打开状态
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

// 计算菜单样式
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

// 调整菜单位置
const adjustMenuPosition = () => {
  if (menuRef.value) {
    const rect = menuRef.value.getBoundingClientRect()
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    // 处理水平方向溢出
    if (rect.right > windowWidth) {
      const overflowX = rect.right - windowWidth
      menuPosition.value.x -= overflowX + 10
    }

    // 处理垂直方向溢出
    if (rect.bottom > windowHeight) {
      const overflowY = rect.bottom - windowHeight
      menuPosition.value.y -= overflowY + 10
    }
  }
}

// 处理点击事件
const handleDocumentClick = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close')
  }
}

const selectCardBox = async (box: CardBox) => {
  if (!props.noteId) {
    console.error('CardboxDropdownMenu.vue → 笔记ID为空')
    return
  }
  emit('close')
  try {
    await noteStore.updateNoteCardBox(props.noteId, box.id)
    console.log('CardboxDropdownMenu.vue → 卡片盒更新成功:', box.name)
  } catch (error) {
    console.error('CardboxDropdownMenu.vue → 更新卡片盒失败:', error)
    throw error
  }
}

const isBoxSelected = (box: CardBox) => {
  return props.currentCardboxId === box.id
}

const goToCardboxPage = () => {
  router.push('/cardbox')
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
.cardbox-dropdown-menu {
  position: fixed;
  background-color: var(--color-dropdown-bg);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 9999;
  min-width: 200px;
  width: max-content;
  max-width: 100vw;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 12px;
  white-space: nowrap;
}

.dropdown-item {
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

  &:hover {
    background-color: var(--color-hover-button);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
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

.empty-state {
  padding: 6px 12px;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 400;
  text-align: center;
  cursor: pointer;
}
</style>
