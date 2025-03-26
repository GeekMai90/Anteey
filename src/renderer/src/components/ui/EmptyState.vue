<template>
  <div class="empty-state">
    <img src="@renderer/assets/images/empty.svg" :alt="alt" class="empty-icon" />
    <div class="empty-text">{{ text }}</div>
    <slot name="action"></slot>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  // 图片 alt 文本
  alt?: string
  // 空状态文本描述
  text: string
}>()
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 48px 0;
  width: 100%;
  text-align: center;

  .empty-icon {
    width: 280px;
    height: 280px;
  }

  .empty-text {
    color: var(--color-text-secondary);
    font-size: 14px;
    text-align: center;
    margin-top: -40px;
  }
}
</style>
