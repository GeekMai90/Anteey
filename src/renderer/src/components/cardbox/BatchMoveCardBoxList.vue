<template>
  <Teleport to="body">
    <Transition name="fade-zoom">
      <div
        v-if="isOpen"
        ref="floating"
        class="batch-move-cardbox-list"
        :style="{
          position: strategy,
          top: `${y ?? 0}px`,
          left: `${x ?? 0}px`
        }"
      >
        <div class="list-header">选择目标卡片盒</div>
        <div class="list-content">
          <template v-if="sortedCardBoxes.length > 0">
            <DropdownListItem
              v-for="box in sortedCardBoxes"
              :key="box.id"
              @click="selectCardBox(box)"
            >
              <template #icon>
                <Box theme="outline" size="18" fill="var(--color-icon-primary)" :strokeWidth="3" />
              </template>
              {{ box.name }}
            </DropdownListItem>
          </template>
          <div v-else class="empty-state">暂无卡片盒，请先创建</div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- 确认对话框 -->
  <ConfirmDialog
    v-model:visible="showConfirm"
    title="批量设置卡片盒确认"
    :message="confirmMessage"
    confirm-text="确认"
    cancel-text="取消"
    @confirm="confirmMove"
    @cancel="cancelMove"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import { Box } from '@icon-park/vue-next'
import type { CardBox } from '@shared/types'
import { storeToRefs } from 'pinia'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'
import { useFloating } from '@floating-ui/vue'
import { flip, offset, shift } from '@floating-ui/dom'
import DropdownListItem from '@renderer/components/ui/dropdowns/DropdownListItem.vue'

const props = defineProps<{
  isOpen: boolean
  selectedCount: number
  buttonRef: HTMLElement | null
}>()

const emit = defineEmits(['close', 'move'])

const noteStore = useNoteStore()
const { cardBoxes } = storeToRefs(noteStore)

// floating-ui 相关
const floating = ref<HTMLElement | null>(null)
const { x, y, strategy, update } = useFloating(
  computed(() => props.buttonRef),
  floating,
  {
    placement: 'top-start',
    middleware: [
      offset(4), // 设置偏移量
      flip(), // 自动翻转
      shift() // 防止溢出视口
    ]
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

// 排序后的卡片盒列表
const sortedCardBoxes = computed(() => {
  return [...cardBoxes.value].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
})

// 确认相关状态
const showConfirm = ref(false)
const selectedBox = ref<CardBox | null>(null)

// 确认消息
const confirmMessage = computed(() => {
  if (!selectedBox.value) return ''
  return `确定要将选中的 ${props.selectedCount} 张卡片添加到「${selectedBox.value.name}」卡片盒吗？`
})

// 选择卡片盒
const selectCardBox = (box: CardBox) => {
  selectedBox.value = box
  showConfirm.value = true
}

// 确认移动
const confirmMove = () => {
  if (selectedBox.value) {
    emit('move', selectedBox.value.id)
  }
  closeDialog()
}

// 取消移动
const cancelMove = () => {
  closeDialog()
}

// 关闭对话框
const closeDialog = () => {
  showConfirm.value = false
  selectedBox.value = null
  emit('close')
}

// 生命周期钩子
onMounted(() => {
  nextTick(() => {
    update()
  })
})

onUnmounted(() => {
  // 清理工作
})
</script>

<style lang="scss" scoped>
.batch-move-cardbox-list {
  background: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  width: 240px;
  max-height: 320px;
  display: flex;
  flex-direction: column;
  z-index: 1001;

  .list-header {
    padding: 12px;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-primary);
    border-bottom: 1px solid var(--color-border);
  }

  .list-content {
    padding: 4px;
    overflow-y: auto;
    max-height: calc(320px - 40px);
  }

  .empty-state {
    padding: 16px;
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 13px;
  }
}

.fade-zoom-enter-active,
.fade-zoom-leave-active {
  transition: all 0.2s ease;
}

.fade-zoom-enter-from,
.fade-zoom-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
