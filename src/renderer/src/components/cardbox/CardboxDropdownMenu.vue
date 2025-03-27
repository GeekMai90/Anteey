<template>
  <Teleport to="body">
    <Transition name="fade-zoom">
      <div
        v-if="isOpen"
        ref="floating"
        class="cardbox-dropdown-menu"
        :style="{
          position: strategy,
          top: `${y ?? 0}px`,
          left: `${x ?? 0}px`
        }"
      >
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
                :fill="isBoxSelected(box) ? 'var(--color-primary)' : 'var(--color-icon-primary)'"
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
import { CardBox } from '@shared/types'
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import { storeToRefs } from 'pinia'
import router from '@renderer/router'
import { message } from '@renderer/utils/message'
import { useFloating } from '@floating-ui/vue'
import { flip, offset, shift } from '@floating-ui/dom'

const props = defineProps<{
  isOpen: boolean
  noteId?: string
  currentCardboxId?: string
  buttonRef: HTMLElement | null
}>()

const emit = defineEmits(['close', 'update'])

const noteStore = useNoteStore()
const { cardBoxes } = storeToRefs(noteStore)

const sortedCardBoxes = computed(() => {
  return [...cardBoxes.value].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
})

// floating-ui 相关
const floating = ref<HTMLElement | null>(null)

// 使用传入的 buttonRef 作为参考元素
const { x, y, strategy, update } = useFloating(
  computed(() => props.buttonRef), // 使用 computed 包装 buttonRef
  floating,
  {
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift()]
  }
)

// 监听 isOpen 变化，更新位置
watch(
  () => props.isOpen,
  (newValue) => {
    if (newValue) {
      nextTick(() => {
        update()
      })
    }
  }
)

// 添加本地状态来跟踪当前选中的卡片盒
const localSelectedBoxId = ref(props.currentCardboxId)

// 监听 props 变化，更新本地状态
watch(
  () => props.currentCardboxId,
  (newId) => {
    localSelectedBoxId.value = newId
  }
)

// 处理点击事件
const handleDocumentClick = (event: MouseEvent) => {
  if (floating.value && !floating.value.contains(event.target as Node)) {
    emit('close')
  }
}
// 修改 isBoxSelected 方法，使用本地状态
const isBoxSelected = (box: CardBox) => {
  return localSelectedBoxId.value === box.id
}

// 修改 selectCardBox 方法，实现乐观更新
const selectCardBox = async (box: CardBox) => {
  if (!props.noteId) {
    console.error('CardboxDropdownMenu.vue → 笔记ID为空')
    return
  }

  // 立即更新本地状态（乐观更新）
  localSelectedBoxId.value = box.id
  emit('close')

  try {
    // 后端更新
    await noteStore.updateNoteCardBox(props.noteId, box.id)
    console.log('CardboxDropdownMenu.vue → 卡片盒更新成功:', box.name)
    emit('update', box.id)
  } catch (error) {
    // 如果失败，回滚本地状态
    localSelectedBoxId.value = props.currentCardboxId
    console.error('CardboxDropdownMenu.vue → 更新卡片盒失败:', error)
    message.error('更新卡片盒失败') // 需要导入 message
    throw error
  }
}

const goToCardboxPage = () => {
  router.push('/cardbox')
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  window.addEventListener('resize', update)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('resize', update)
})
</script>

<style scoped lang="scss">
.cardbox-dropdown-menu {
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 9999;
  min-width: 200px;
  width: max-content;
  max-width: 300px;
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
  padding: 4px;
  margin: 2px;
  min-height: 32px;
  box-sizing: border-box;

  &:hover {
    background-color: var(--color-hover-button);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

  // 修改激活状态的样式
  &.active {
    background-color: var(--color-primary-light);
    color: var(--color-primary);

    .icon {
      :deep(svg) {
        color: var(--color-primary) !important; // 使用 !important 确保覆盖默认样式
      }
    }

    .name {
      color: var(--color-primary);
    }

    &:hover {
      background-color: var(--color-primary-light);
    }
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
      color: var(--color-icon-primary);
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
    line-height: 20px;
    user-select: none;
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
