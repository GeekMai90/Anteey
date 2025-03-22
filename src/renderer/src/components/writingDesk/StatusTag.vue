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
    case 'first_draft':
      return '初稿'
    case 'polished':
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
    color: var(--color-draft);
    border-color: var(--color-draft);
    background-color: var(--color-draft-light);

    .dot {
      background-color: var(--color-draft);
    }
  }
  // 初稿状态
  &.first_draft {
    color: var(--color-yellow);
    border-color: var(--color-yellow);
    background-color: var(--color-yellow-light);

    .dot {
      background-color: var(--color-yellow);
    }
  }

  // 润色状态
  &.polished {
    color: var(--color-primary);
    border-color: var(--color-primary);
    background-color: var(--color-primary-light);

    .dot {
      background-color: var(--color-primary);
    }
  }

  // 完成状态
  &.completed {
    color: var(--color-primary);
    border-color: var(--color-primary);
    background-color: var(--color-primary-light);

    .dot {
      background-color: var(--color-primary);
    }
  }
}
</style>
