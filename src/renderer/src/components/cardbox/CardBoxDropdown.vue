<template>
  <div ref="cardboxDropdown" class="cardbox-dropdown" @click.stop="toggleMenu">
    <div class="icon">
      <FileCabinet
        theme="outline"
        size="18"
        fill="var(--color-icon-menu-default)"
        :strokeWidth="3"
      />
    </div>
    <div class="name">{{ selectedCardBoxName || '卡片盒' }}</div>
    <div class="icon down-icon">
      <Down theme="outline" size="14" fill="var(--color-text-secondary)" :strokeWidth="3" />
    </div>
    <!-- 卡片柜下拉菜单 -->
    <div v-if="showMenu" class="dropdown-menu" :class="{ show: showMenu }" :style="menuStyle">
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
              fill="var(--color-icon-menu-default)"
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
              fill="var(--color-icon-menu-default)"
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
            <Box theme="outline" size="18" fill="var(--color-icon-menu-default)" :strokeWidth="3" />
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
                  fill="var(--color-icon-menu-default)"
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
            <Plus
              theme="outline"
              size="18"
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
            />
          </div>
          <div class="name">新增卡片盒</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Box, FileCabinet, InboxIn, More, Plus, Down } from '@icon-park/vue-next'
import type { CardBox } from '@renderer/types/Note'

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
const cardboxDropdown = ref<HTMLElement | null>(null)
const menuStyle = ref({})

// 选中的卡片盒名称
// const selectedCardBoxName = computed(() => {
//   if (props.modelValue === 'all') return '全部卡片盒'
//   if (props.modelValue === 'inbox') return '无卡片盒'
//   return props.selectedBox?.name || '卡片盒'
// })

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
const toggleMenu = () => {
  showMenu.value = !showMenu.value
  if (showMenu.value) {
    updateMenuPosition()
  }
}

// 选择卡片盒
const select = async (box: CardBox | { id: string; name: string }) => {
  emit('select', box)
  await nextTick()
  showMenu.value = false
}

// 更新菜单位置
const updateMenuPosition = () => {
  if (!cardboxDropdown.value) return

  const rect = cardboxDropdown.value.getBoundingClientRect()
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop

  menuStyle.value = {
    top: `${rect.bottom + scrollTop + 8}px`,
    left: `${rect.left}px`,
    minWidth: `${rect.width}px`
  }
}

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  if (cardboxDropdown.value && !cardboxDropdown.value.contains(event.target as Node)) {
    showMenu.value = false
  }
}

// 监听器
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', updateMenuPosition)
  window.addEventListener('resize', updateMenuPosition)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', updateMenuPosition)
  window.removeEventListener('resize', updateMenuPosition)
})
</script>

<style lang="scss" scoped>
.cardbox-dropdown {
  display: flex;
  align-items: center;
  padding: 4px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  user-select: none;
  margin-left: 2px;
  height: 36px;
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
      width: 15px;
      height: 15px;
    }
  }

  .name {
    flex-grow: 0;
    text-align: left;
    color: var(--default-text-color);
    font-size: 14px;
    font-weight: 400;
    margin-left: 3px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    line-height: 1;
  }

  &:hover {
    background-color: var(--color-hover-bg);
  }
}

.dropdown-menu {
  position: fixed;
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 1000;
  padding: 8px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  max-height: 400px;
  overflow-y: auto;

  &.show {
    opacity: 1;
    visibility: visible;
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
      color: var(--default-text-color);
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
      color: var(--default-text-color);
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
}
</style>
