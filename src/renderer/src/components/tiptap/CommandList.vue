<template>
  <ul ref="menuRef" class="popup-menu" :class="{ 'bottom-overflow': isBottomOverflow }">
    <template v-for="(item, index) in items" :key="index">
      <li v-if="item.type === 'separator'" class="popup-menu-separator">
        {{ item.title }}
      </li>
      <li
        v-else
        class="popup-menu-item"
        :class="{
          'is-selected': index === selectedIndex,
          'is-snippet': item.snippetCommand,
          'is-no-match': item.noMatch
        }"
        @click="selectItem(index)"
      >
        <div v-if="item.icon" class="icon">
          <component
            :is="item.icon"
            theme="outline"
            size="18"
            :fill="item.fill || 'var(--color-icon-primary)'"
            :strokeWidth="3"
          />
        </div>
        <div class="name">
          {{ item.title }}
        </div>
      </li>
    </template>
  </ul>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'

interface CommandItem {
  type?: 'separator'
  title: string
  icon?: any
  command?: ({ editor, range }: { editor: any; range: any }) => void
  fill?: string
  snippetCommand?: boolean
  noMatch?: boolean
}

const props = defineProps({
  items: {
    type: Array as () => CommandItem[],
    required: true
  },
  command: {
    type: Function as unknown as () => (item: CommandItem) => void,
    required: true
  }
})
const selectedIndex = ref(0)
const menuRef = ref<HTMLElement | null>(null)
const isBottomOverflow = ref(false)

// 检查菜单位置是否会超出窗口底部
const checkMenuPosition = () => {
  nextTick(() => {
    if (!menuRef.value) return

    const menuRect = menuRef.value.getBoundingClientRect()
    const windowHeight = window.innerHeight

    // 如果菜单底部位置超出窗口高度，标记为底部溢出
    isBottomOverflow.value = menuRect.bottom > windowHeight
  })
}

const selectItem = (index: number) => {
  const item = props.items[index]
  if (item && (!item.type || item.snippetCommand) && !item.noMatch) {
    props.command(item)
  }
}

defineExpose({
  onKeyDown: ({ event }: { event: KeyboardEvent }) => {
    // 无匹配项时，不处理键盘导航
    if (props.items.length === 1 && props.items[0].noMatch) {
      return false
    }

    if (event.key === 'ArrowUp') {
      // 向上移动，跳过分隔线
      let newIndex = selectedIndex.value
      do {
        newIndex = (newIndex - 1 + props.items.length) % props.items.length
      } while (props.items[newIndex].type === 'separator' || props.items[newIndex].noMatch)

      selectedIndex.value = newIndex
      // 确保选中项在视图中可见
      ensureItemVisible()
      return true
    }
    if (event.key === 'ArrowDown') {
      // 向下移动，跳过分隔线
      let newIndex = selectedIndex.value
      do {
        newIndex = (newIndex + 1) % props.items.length
      } while (props.items[newIndex].type === 'separator' || props.items[newIndex].noMatch)

      selectedIndex.value = newIndex
      // 确保选中项在视图中可见
      ensureItemVisible()
      return true
    }
    if (event.key === 'Enter') {
      selectItem(selectedIndex.value)
      return true
    }
    return false
  },
  updatePosition: checkMenuPosition
})

// 添加一个函数，确保选中项在视图中可见
const ensureItemVisible = () => {
  nextTick(() => {
    // 直接查找当前选中的元素
    const element = document.querySelector('.popup-menu-item.is-selected') as HTMLElement
    if (element) {
      const container = element.closest('.popup-menu') as HTMLElement
      if (container) {
        // 检查元素是否在容器视图内
        const elementTop = element.offsetTop
        const elementBottom = elementTop + element.offsetHeight
        const containerTop = container.scrollTop
        const containerBottom = containerTop + container.offsetHeight

        // 如果元素不在视图内，滚动到适当位置
        if (elementTop < containerTop) {
          // 元素在视图上方，滚动到元素顶部
          container.scrollTop = elementTop - 10 // 额外增加一些边距
        } else if (elementBottom > containerBottom) {
          // 元素在视图下方，滚动到元素底部显示在视图内
          container.scrollTop = elementBottom - container.offsetHeight + 10 // 额外增加一些边距
        }
      }
    }
  })
}

onMounted(() => {
  // 如果只有一个项目且是无匹配项，不设置选中状态
  if (props.items.length === 1 && props.items[0].noMatch) {
    selectedIndex.value = -1
    return
  }

  // 初始化选中状态，跳过分隔符和无匹配项
  if (props.items.length > 0) {
    if (props.items[0].type === 'separator' || props.items[0].noMatch) {
      for (let i = 1; i < props.items.length; i++) {
        if (!props.items[i].type && !props.items[i].noMatch) {
          selectedIndex.value = i
          break
        }
      }
    }
  }

  // 检查菜单位置
  checkMenuPosition()
})

// 监听items变化，当菜单内容更新时重新检查位置
watch(
  () => props.items,
  () => {
    nextTick(() => {
      checkMenuPosition()
    })
  }
)
</script>

<style scoped lang="scss">
.popup-menu {
  padding: 6px 0;
  position: absolute;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  list-style-type: none;
  z-index: 9999;
  min-width: 200px;
  width: max-content;
  max-width: 220px;
  max-height: 340px; // 设置最大高度
  overflow-y: auto; // 允许垂直滚动
  overflow-x: hidden; // 防止水平溢出
  white-space: nowrap;
  // 添加以下属性防止页面滚动条
  position: fixed;
  transform-origin: top left;
  // 确保菜单不超出视口
  &.bottom-overflow {
    transform: translateY(-100%);
  }
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
  padding: 4px 12px;
  margin: 2px 8px;
  width: auto; // 确保项目宽度自适应
  box-sizing: border-box; // 确保padding不会影响宽度计算

  &:hover {
    background-color: var(--color-hover-button);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

  &.is-selected {
    background-color: var(--color-hover-button);
  }

  &.is-snippet {
    // 简化样式，只保留细微的颜色区分，不用那么夸张
    .icon {
      color: var(--color-primary);
    }
  }

  &.is-no-match {
    cursor: default;
    opacity: 0.7;
    color: var(--color-text-secondary);

    &:hover {
      background-color: transparent;
    }

    &:active {
      background-color: transparent;
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
    flex-shrink: 0; // 防止图标被挤压

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
    flex-grow: 1; // 让文本占用所有可用空间
    text-align: left;
    color: var(---color-text-primary);
    font-size: 13px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0; // 关键属性：允许弹性项目缩小到小于内容尺寸
  }
}
.popup-menu-separator {
  padding: 8px 21px 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  border-top: 1px solid var(--color-border-secondary);
  margin-top: 4px;
  pointer-events: none;
  background: none;
}
</style>
