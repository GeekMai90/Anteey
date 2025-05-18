<template>
  <div ref="reference" class="cardbox-dropdown" @click.stop="toggleMenu">
    <Button :height="36" :icon="FileCabinet" dropdown>
      {{ selectedCardBoxName || '卡片盒' }}
    </Button>
    <!-- 卡片柜下拉菜单 -->
    <Transition
      name="dropdown"
      enter-active-class="animate-enter"
      leave-active-class="animate-leave"
      enter-from-class="animate-enter-from"
      leave-to-class="animate-leave-to"
    >
      <div
        v-if="showMenu"
        ref="floating"
        class="dropdown-menu"
        :style="{
          position: strategy,
          top: `${y ?? 0}px`,
          left: `${x ?? 0}px`,
          minWidth: referenceWidth + 'px'
        }"
      >
        <!-- 固定选项：全部卡片盒 -->
        <div
          class="dropdown-item"
          :class="{ active: modelValue === 'all' }"
          @click.stop="select({ id: 'all', name: '全部卡片盒' })"
        >
          <div class="dropdown-item-content">
            <div class="icon">
              <FileCabinet
                theme="outline"
                size="18"
                fill="var(--color-icon-primary)"
                :strokeWidth="3"
              />
            </div>
            <div class="name">全部卡片盒</div>
          </div>
        </div>
        <!-- 固定选项：无卡片盒 (Inbox) -->
        <div
          class="dropdown-item"
          :class="{ active: modelValue === 'inbox' }"
          @click.stop="select({ id: 'inbox', name: '无卡片盒' })"
        >
          <div class="dropdown-item-content">
            <div class="icon">
              <InboxIn
                theme="outline"
                size="18"
                fill="var(--color-icon-primary)"
                :strokeWidth="3"
              />
            </div>
            <div class="name">无卡片盒</div>
          </div>
        </div>
        <!-- 分隔线 -->
        <div class="dropdown-divider"></div>

        <div
          v-for="box in cardBoxes"
          :key="box.id"
          class="dropdown-item"
          :class="{ active: modelValue === box.id }"
        >
          <div class="dropdown-item-content" @click.stop="select(box)">
            <div class="icon">
              <Box theme="outline" size="18" fill="var(--color-icon-primary)" :strokeWidth="3" />
            </div>
            <div class="name">
              {{ box.name }}
            </div>
            <div class="dropdown-item-actions">
              <div class="more-actions-btn" @click.stop="$emit('more', box.id, $event)">
                <div class="icon">
                  <More
                    theme="outline"
                    size="18"
                    fill="var(--color-icon-primary)"
                    :strokeWidth="3"
                  />
                </div>
              </div>
            </div>
          </div>
          <!-- 更多操作按钮 -->
        </div>
        <!-- 分隔线 -->
        <div class="dropdown-divider"></div>
        <!-- 新增卡片盒按钮 -->
        <div class="dropdown-item add-cardbox" @click.stop="$emit('add')">
          <div class="dropdown-item-content">
            <div class="icon">
              <Plus theme="outline" size="18" fill="var(--color-icon-primary)" :strokeWidth="3" />
            </div>
            <div class="name">新增卡片盒</div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Box, FileCabinet, InboxIn, More, Plus } from '@icon-park/vue-next'
import type { CardBox } from '@shared/types'
import { useFloating } from '@floating-ui/vue'
import { flip, offset, shift } from '@floating-ui/dom'
import Button from '@renderer/components/ui/buttons/Button.vue'

const props = defineProps<{
  modelValue: string
  cardBoxes: CardBox[]
  selectedBox: CardBox | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [box: CardBox | { id: string; name: string }]
  more: [id: string, event: MouseEvent]
  add: []
}>()

// 下拉菜单状态
const showMenu = ref(false)
const reference = ref<HTMLElement | null>(null)
const floating = ref<HTMLElement | null>(null)

// 添加 referenceWidth ref
const referenceWidth = ref(0)

// 使用 floating-ui 的定位逻辑
const { x, y, strategy, update } = useFloating(reference, floating, {
  placement: 'bottom-start',
  middleware: [
    offset(8), // 设置偏移量
    flip(), // 自动翻转位置
    shift() // 防止溢出视窗
  ]
})

// 选中的卡片盒名称
const selectedCardBoxName = computed(() => {
  if (props.modelValue === 'all') return '全部卡片盒'
  if (props.modelValue === 'inbox') return '无卡片盒'
  if (props.selectedBox) return props.selectedBox.name

  // 如果有 cardBoxId 但没有 selectedCardBox，尝试从 cardBoxes 中找到对应的卡片盒
  const currentBox = props.cardBoxes.find((box) => box.id === props.modelValue)
  return currentBox?.name || '卡片盒'
})

// 切换菜单显示状态
const toggleMenu = async () => {
  showMenu.value = !showMenu.value
  if (showMenu.value) {
    await nextTick()
    // 更新参考元素宽度
    if (reference.value) {
      referenceWidth.value = reference.value.getBoundingClientRect().width
    }
    update() // 更新位置
  }
}

// 选择卡片盒
const select = async (box: CardBox | { id: string; name: string }) => {
  emit('select', box)
  await nextTick()
  showMenu.value = false
}

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  if (reference.value && !reference.value.contains(event.target as Node)) {
    showMenu.value = false
  }
}

// 监听器
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style lang="scss" scoped>
.dropdown-menu {
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 1000;
  padding: 8px;
  max-height: 400px;
  overflow-y: auto;
  transform-origin: top;
  will-change: transform, opacity;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background-color: var(--color-hover-bg);
  }

  &.active .dropdown-item-content {
    background-color: var(--color-hover-bg);
  }
}

.dropdown-item-content {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 6px;
  flex-grow: 1;

  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 20px;
    height: 20px;
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
    flex-grow: 0;
    text-align: left;
    color: var(---color-text-primary);
    font-size: 13px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    line-height: 1;
  }
}

.dropdown-divider {
  height: 1px;
  background-color: var(--color-border);
  margin: 6px 0;
}

.more-actions-btn {
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 8px;

  &:hover {
    background-color: var(--color-hover-bg);
  }
  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 20px;
    height: 20px;
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
}

.add-cardbox {
  display: flex;
  align-items: center; // 保持垂直居中

  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 20px;
    height: 20px;
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
      width: 18px;
      height: 18px;
    }
  }

  .name {
    flex-grow: 0;
    text-align: left;
    color: var(---color-text-primary);
    font-size: 13px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    line-height: 20px; // 添加行高，与图标高度一致
    display: flex; // 添加 flex 布局
    align-items: center; // 确保文字垂直居中
  }
}

// 优化的苹果风格动画
.animate-enter-from,
.animate-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.animate-enter-active {
  transition: all 0.2s cubic-bezier(0.3, 1, 0.3, 1);
}

.animate-leave-active {
  transition: all 0.15s cubic-bezier(0.3, 1, 0.3, 1);
}
</style>
