<script setup lang="ts">
import { Help } from '@icon-park/vue-next'
import { computed } from 'vue'

interface Props {
  content: string // 提示内容
  placement?: 'top' | 'bottom' | 'left' | 'right' // 提示框位置
  delay?: number // 延迟显示时间
  size?: 'small' | 'medium' // 图标大小
}

const props = withDefaults(defineProps<Props>(), {
  placement: 'top',
  delay: 0,
  size: 'small'
})

// 根据 size 计算图标尺寸
const iconSize = computed(() => {
  return props.size === 'small' ? 12 : 14
})
</script>

<template>
  <span
    v-tooltip="{
      content,
      placement,
      delay: { show: delay }
    }"
    class="help-tips"
    :class="size"
  >
    <Help :size="iconSize" :strokeWidth="3" />
  </span>
</template>

<style lang="scss" scoped>
.help-tips {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  cursor: help;
  transition: all 0.2s ease;
  vertical-align: middle;
  margin-left: 4px;

  &.small {
    width: 16px;
    height: 16px;
    padding: 2px;
  }

  &.medium {
    width: 20px;
    height: 20px;
    padding: 3px;
  }

  &:hover {
    background: var(--color-hover-bg);
    color: var(--color-primary);
  }

  :deep(.i-icon) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
}
</style>
