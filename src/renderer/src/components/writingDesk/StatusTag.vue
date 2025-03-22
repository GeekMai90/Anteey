<template>
  <div class="status-tag" :class="status">
    <div class="dot"></div>
    <span class="text">{{ statusText }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ManuscriptStatus } from '@shared/types'

const props = defineProps<{
  status: ManuscriptStatus
}>()

const statusText = computed(() => {
  switch (props.status) {
    case 'draft':
      return '草稿'
    case 'polished':
      return '润色'
    case 'completed':
      return '完成'
    default:
      return '未知'
  }
})
</script>

<style lang="scss" scoped>
.status-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  gap: 4px;
  background: var(--color-bg-primary);
  border: 1px solid transparent;

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .text {
    line-height: 1;
  }

  // 草稿状态
  &.draft {
    color: var(--color-warning);
    border-color: var(--color-warning);
    background-color: var(--color-warning-light);

    .dot {
      background-color: var(--color-warning);
    }
  }

  // 润色状态
  &.polished {
    color: var(--color-info);
    border-color: var(--color-info);
    background-color: var(--color-info-light);

    .dot {
      background-color: var(--color-info);
    }
  }

  // 完成状态
  &.completed {
    color: var(--color-success);
    border-color: var(--color-success);
    background-color: var(--color-success-light);

    .dot {
      background-color: var(--color-success);
    }
  }
}
</style>
