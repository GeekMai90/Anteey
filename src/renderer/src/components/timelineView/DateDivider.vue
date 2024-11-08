<template>
  <div class="date-divider">
    <div class="date-content">{{ formattedDate }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// 修改 props 的类型定义，使其更严格
const props = defineProps<{
  date: string | Date // 允许接收字符串或 Date 类型
}>()

const formattedDate = computed(() => {
  // 确保传入的日期能够正确转换
  const date = props.date instanceof Date ? props.date : new Date(props.date)

  // 处理无效日期的情况
  if (isNaN(date.getTime())) {
    console.warn('Invalid date provided to DateDivider')
    return ''
  }

  return date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric'
  })
})
</script>

<style lang="scss" scoped>
.date-divider {
  padding: 10px 0;
  position: relative;
  margin-left: 20px;

  .date-content {
    font-size: 13px;
    color: var(--color-text-secondary);
    font-weight: 500;
    background: var(--color-bg-primary);
    padding: 4px 12px;
    display: inline-block;
    position: relative;
    margin-left: 27px;
    user-select: none;
    opacity: 0.8;
    letter-spacing: 0.5px;
    // border: 1px solid var(--color-border);
  }
}
</style>
