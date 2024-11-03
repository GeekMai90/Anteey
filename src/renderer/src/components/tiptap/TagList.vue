<template>
  <ul class="popup-menu">
    <li
      v-for="item in props.items"
      :key="item.title"
      class="popup-menu-item"
      :class="{ 'is-selected': props.selected?.title === item.title }"
      @click="selectItem(item)"
    >
      <div class="icon">
        <component
          :is="item.icon"
          theme="outline"
          size="18"
          :fill="
            item.title.startsWith('新建标签')
              ? 'var(--color-primary)'
              : 'var(--color-icon-menu-default)'
          "
          :strokeWidth="3"
        />
      </div>
      <div class="name" :class="{ 'is-new': item.title.startsWith('新建标签') }">
        {{ item.title }}
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
interface TagItem {
  title: string
  icon: any
  command: ({ editor, range }: { editor: any; range: any }) => void
}

const props = defineProps({
  items: {
    type: Array as () => TagItem[],
    required: true
  },
  selected: {
    type: Object as () => TagItem,
    required: false
  },
  command: {
    type: Function as unknown as () => (item: TagItem) => void,
    required: true
  }
})

function selectItem(item: TagItem) {
  props.command(item)
}

// 键盘导航
function onKeyDown({ event }: { event: KeyboardEvent }) {
  if (event.key === 'ArrowUp') {
    const index = props.items.findIndex((item) => item.title === props.selected?.title)
    const prev = index > 0 ? props.items[index - 1] : props.items[props.items.length - 1]
    props.command(prev)
    return true
  }

  if (event.key === 'ArrowDown') {
    const index = props.items.findIndex((item) => item.title === props.selected?.title)
    const next = index < props.items.length - 1 ? props.items[index + 1] : props.items[0]
    props.command(next)
    return true
  }

  if (event.key === 'Enter') {
    if (props.selected) {
      props.command(props.selected)
      return true
    }
  }

  return false
}

defineExpose({
  onKeyDown
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
  min-width: 180px;
  width: max-content;
  max-width: 300px;
  max-height: 350px;
  height: 300px;
  overflow-y: auto;
  overflow-x: hidden;
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
    flex-shrink: 0;

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
    font-size: 13px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &.is-new {
      color: var(--color-primary);
      font-weight: 500;
    }
  }
}
</style>
