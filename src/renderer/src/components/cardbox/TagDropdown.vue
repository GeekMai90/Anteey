<template>
  <div ref="reference" class="tag-dropdown" @click.stop="toggleMenu">
    <Button :height="36" :icon="Tag" dropdown>
      {{ selectedTagName || '标签' }}
    </Button>
    <!-- 标签下拉菜单 -->
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
        <!-- 固定选项：所有标签 -->
        <div
          class="dropdown-item"
          :class="{ active: modelValue.includes('all') }"
          @click.stop="select({ id: 'all', name: '所有标签' })"
        >
          <div class="dropdown-item-content">
            <div class="icon">
              <Tag theme="outline" size="18" fill="var(--color-icon-primary)" :strokeWidth="3" />
            </div>
            <div class="name">所有标签</div>
          </div>
        </div>
        <!-- 固定选项：无标签 -->
        <div
          class="dropdown-item"
          :class="{ active: modelValue.includes('none') }"
          @click.stop="select({ id: 'none', name: '无标签' })"
        >
          <div class="dropdown-item-content">
            <div class="icon">
              <TagOne theme="outline" size="18" fill="var(--color-icon-primary)" :strokeWidth="3" />
            </div>
            <div class="name">无标签</div>
          </div>
        </div>
        <!-- 分隔线 -->
        <div class="dropdown-divider"></div>

        <!-- 用户标签列表 -->
        <div
          v-for="tag in tags"
          :key="tag.id"
          class="dropdown-item"
          :class="{
            active: !modelValue.includes('all') && modelValue.includes(tag.id)
          }"
        >
          <div class="dropdown-item-content" @click.stop="select(tag)">
            <div class="icon">
              <TagOne theme="outline" size="18" fill="var(--color-icon-primary)" :strokeWidth="3" />
            </div>
            <div class="name">{{ tag.name }}</div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Tag, TagOne } from '@icon-park/vue-next'
import type { Tag as TagType } from '@shared/types'
import { useFloating } from '@floating-ui/vue'
import { flip, offset, shift } from '@floating-ui/dom'
import Button from '@renderer/components/ui/Button.vue'

const props = defineProps<{
  modelValue: string[]
  tags: TagType[]
  selectedTag: TagType | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  select: [tag: TagType | { id: string; name: string }]
}>()

// 下拉菜单状态
const showMenu = ref(false)
const reference = ref<HTMLElement | null>(null)
const floating = ref<HTMLElement | null>(null)
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

// 选中的标签名称
const selectedTagName = computed(() => {
  // 如果选中了多个标签（即选择了"所有标签"）
  if (props.modelValue.length > 1) {
    return '所有标签'
  }
  // 如果选择了"无标签"
  if (props.modelValue.includes('none')) {
    return '无标签'
  }
  // 如果有单个选中的标签
  if (props.selectedTag) {
    return props.selectedTag.name
  }
  // 如果有单个标签ID，尝试从标签列表中找到对应的标签
  if (props.modelValue.length === 1) {
    const currentTag = props.tags.find((tag) => tag.id === props.modelValue[0])
    return currentTag?.name || '标签'
  }
  // 默认显示
  return '标签'
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

// 选择标签
const select = async (tag: TagType | { id: string; name: string }) => {
  emit('select', tag)
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
.tag-dropdown {
  display: flex;
  align-items: center;
  height: 36px;

  :deep(.ant-btn) {
    width: 100%;
  }
}

.dropdown-menu {
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 1000;
  padding: 8px 12px 8px 8px;
  max-height: 400px;
  overflow-y: auto;
  transform-origin: top;
  will-change: transform, opacity;

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
}

.dropdown-divider {
  display: block;
  width: 100%;
  height: 1px;
  min-height: 1px; // 添加最小高度
  background-color: var(--color-border);
  margin: 6px 0;
  padding: 0;
  border: none;
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
