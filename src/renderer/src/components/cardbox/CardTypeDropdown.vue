<template>
  <div ref="reference" class="cardtype-dropdown" @click.stop="toggleMenu">
    <Button :height="36" :icon="CategoryManagement" dropdown>
      {{ selectedTypesName }}
    </Button>
    <!-- 下拉菜单 -->
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
        <!-- 固定选项：所有类型 -->
        <div
          class="dropdown-item"
          :class="{ active: modelValue.length === 0 }"
          @click.stop="select([])"
        >
          <div class="dropdown-item-content">
            <div class="icon">
              <CategoryManagement
                theme="outline"
                size="18"
                fill="var(--color-icon-primary)"
                :strokeWidth="3"
              />
            </div>
            <div class="name">所有类型</div>
          </div>
        </div>

        <div class="dropdown-divider"></div>

        <!-- 卡片类型列表 -->
        <div
          v-for="type in cardTypes"
          :key="type.id"
          class="dropdown-item"
          :class="{ active: modelValue.includes(type.id) }"
          @click.stop="toggleType(type.id)"
        >
          <div class="dropdown-item-content">
            <div class="icon">
              <component
                :is="type.icon"
                theme="outline"
                size="18"
                fill="var(--color-icon-primary)"
                :strokeWidth="3"
              />
            </div>
            <div class="name">{{ type.name }}</div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { CategoryManagement, Notes, Bookshelf, ListAlphabet } from '@icon-park/vue-next'
import { useFloating } from '@floating-ui/vue'
import { flip, offset, shift } from '@floating-ui/dom'
import Button from '@renderer/components/ui/Button.vue'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
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

// 固定的卡片类型列表
const cardTypes = [
  { id: 'Maincard', name: '主要卡片', icon: Notes },
  { id: 'Bibcard', name: '参考卡片', icon: Bookshelf },
  { id: 'Indexcard', name: '索引卡片', icon: ListAlphabet }
]

// 选中的类型名称
const selectedTypesName = computed(() => {
  if (props.modelValue.length === 0) return '所有类型'
  if (props.modelValue.length === 1) {
    const type = cardTypes.find((t) => t.id === props.modelValue[0])
    return type?.name || '卡片类型'
  }
  return `已选 ${props.modelValue.length} 种`
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

// 选择类型
const select = (types: string[]) => {
  emit('update:modelValue', types)
  showMenu.value = false
}

// 切换单个类型
const toggleType = (typeId: string) => {
  const newTypes = [...props.modelValue]
  const index = newTypes.indexOf(typeId)
  if (index === -1) {
    newTypes.push(typeId)
  } else {
    newTypes.splice(index, 1)
  }
  emit('update:modelValue', newTypes)
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
.cardtype-dropdown {
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
  padding: 8px;
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
    // 修改激活状态的样式
    &.active {
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
