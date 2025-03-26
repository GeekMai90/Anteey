<template>
  <div
    class="toc-item"
    :class="{
      'is-active': item.isActive && !item.isScrolledOver,
      'is-scrolled-over': item.isScrolledOver
    }"
    :style="{ '--level': item.level }"
  >
    <a :href="'#' + item.id" :data-item-index="item.itemIndex" @click.prevent="onItemClick">
      {{ item.textContent }}
    </a>
  </div>
</template>

<script setup lang="ts">
interface TocItem {
  id: string
  level: number
  textContent: string
  itemIndex: number
  isActive: boolean
  isScrolledOver: boolean
}

const props = defineProps<{
  item: TocItem
  index: number
}>()

const emit = defineEmits<{
  'item-click': [event: MouseEvent, id: string]
}>()

const onItemClick = (event: MouseEvent) => {
  emit('item-click', event, props.item.id)
}
</script>

<style lang="scss" scoped>
.toc-item {
  padding-left: calc((var(--level) - 1) * 1.2em);
  margin: 0.5em 0;

  a {
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: 14px;
    display: block;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s ease;

    &:hover {
      color: var(--color-primary);
      background: var(--color-hover-bg);
    }
  }

  &.is-active a {
    color: var(--color-primary);
    font-weight: 500;
    background: var(--color-primary-light);
  }

  &.is-scrolled-over a {
    color: var(--color-text-tertiary);
  }
}
</style>
