<template>
  <ul class="popup-menu">
    <template v-for="(item, index) in items" :key="index">
      <li v-if="item.type === 'separator'" class="popup-menu-separator">
        {{ item.title }}
      </li>
      <li
        v-else
        class="popup-menu-item"
        :class="{ 'is-selected': index === selectedIndex }"
        @click="selectItem(index)"
      >
        <div v-if="item.icon" class="icon">
          <component
            :is="item.icon"
            theme="outline"
            size="18"
            :fill="item.fill || 'var(--color-icon-menu-default)'"
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
import { ref } from 'vue'

interface CommandItem {
  type?: 'separator'
  title: string
  icon?: any
  command?: ({ editor, range }: { editor: any; range: any }) => void
  fill?: string
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

const selectItem = (index: number) => {
  const item = props.items[index]
  if (item && !item.type) {
    props.command(item)
  }
}

defineExpose({
  onKeyDown: ({ event }: { event: KeyboardEvent }) => {
    if (event.key === 'ArrowUp') {
      do {
        selectedIndex.value = (selectedIndex.value - 1 + props.items.length) % props.items.length
      } while (props.items[selectedIndex.value].type === 'separator')
      return true
    }
    if (event.key === 'ArrowDown') {
      do {
        selectedIndex.value = (selectedIndex.value + 1) % props.items.length
      } while (props.items[selectedIndex.value].type === 'separator')
      return true
    }
    if (event.key === 'Enter') {
      selectItem(selectedIndex.value)
      return true
    }
    return false
  }
})
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
  min-width: 150px;
  width: max-content;
  max-width: 300px;
  max-height: 350px; // 设置最大高度
  overflow-y: auto; // 允许垂直滚动
  overflow-x: hidden; // 防止水平溢出
  white-space: nowrap;
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

  &:hover {
    background-color: var(--color-hover-button);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

  &.is-selected {
    background-color: var(--color-hover-button);
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
    flex-grow: 0;
    text-align: left;
    color: var(--default-text-color);
    font-size: 13px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    overflow: hidden;
    text-overflow: ellipsis;
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
