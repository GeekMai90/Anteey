<template>
  <div
    class="toc-item"
    :class="{
      'is-active': item.isActive && !item.isScrolledOver,
      'is-scrolled-over': item.isScrolledOver,
      'has-children': item.children && item.children.length > 0
    }"
    :style="{ '--level': item.level }"
  >
    <div class="toc-item-content" :class="{ 'is-expanded': isExpanded }" @click="onItemClick">
      <span
        v-if="item.children && item.children.length > 0"
        class="toggle-icon"
        @click.stop="toggleExpand"
      >
        <span class="triangle"></span>
      </span>
      <span class="item-text">{{ item.textContent }}</span>
    </div>

    <div v-if="isExpanded && item.children && item.children.length > 0" class="children">
      <TocItem
        v-for="(child, childIndex) in item.children"
        :key="child.id"
        :item="child"
        :index="childIndex + 1"
        @item-click="onChildClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface TocItem {
  id: string
  level: number
  textContent: string
  itemIndex: number
  isActive: boolean
  isScrolledOver: boolean
  children?: TocItem[]
}

const props = defineProps<{
  item: TocItem
  index: number
}>()

const emit = defineEmits<{
  'item-click': [event: MouseEvent, id: string]
}>()

const isExpanded = ref(true)

const toggleExpand = (event: MouseEvent) => {
  isExpanded.value = !isExpanded.value
  event.stopPropagation()
}

const onItemClick = (event: MouseEvent) => {
  emit('item-click', event, props.item.id)
}

const onChildClick = (event: MouseEvent, id: string) => {
  emit('item-click', event, id)
}
</script>

<style lang="scss" scoped>
.toc-item {
  position: relative;
  font-size: 14px;
  border-left: 3px solid var(--color-hover-bg);
  transition: border-color 0.2s;

  &:hover {
    border-left-color: var(--color-primary-light);
  }

  &.is-active {
    border-left-color: var(--color-primary);
  }

  .toc-item-content {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    padding-left: calc(17px + (var(--level) - 1) * 16px);
    cursor: pointer;
    position: relative;
    transition: all 0.2s ease;
  }

  &:hover > .toc-item-content {
    color: var(--color-primary);
    background-color: var(--color-selection);
  }

  &.is-active > .toc-item-content {
    color: var(--color-primary);
    background-color: var(--color-selection);
    font-weight: 500;
  }

  &.is-scrolled-over > .toc-item-content {
    color: var(--color-text-tertiary);
  }

  .toggle-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin-right: 4px;
    cursor: pointer;
    position: relative;
    left: -4px;

    .triangle {
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 5px 0 5px 8px;
      border-color: transparent transparent transparent currentColor;
      transition: transform 0.2s ease;
    }
  }

  .toc-item-content.is-expanded .triangle {
    transform: rotate(90deg);
  }

  .item-text {
    flex: 1;
  }

  .children {
    margin-left: 0;
  }
}
</style>
