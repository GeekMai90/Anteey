<template>
  <div class="filter-button" :class="{ active: modelValue }" @click="toggleFilter">
    <div class="icon">
      <StorageCardOne theme="outline" size="18" fill="var(--color-icon-primary)" :strokeWidth="3" />
    </div>
    <div class="name">闪卡</div>
  </div>
</template>

<script setup lang="ts">
import { StorageCardOne } from '@icon-park/vue-next'

const props = defineProps<{
  modelValue: boolean | undefined
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean | undefined]
}>()

const toggleFilter = () => {
  emit('update:modelValue', !props.modelValue)
}
</script>

<style lang="scss" scoped>
.filter-button {
  display: flex;
  align-items: center;
  padding: 4px 10px 4px 4px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  height: 36px;
  &:hover {
    background-color: var(--color-hover-bg);
  }

  &.active {
    background-color: var(--color-hover-bg);
  }

  .icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 4px;
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
    font-size: 14px;
    color: var(--color-text-primary);
  }
}
</style>
