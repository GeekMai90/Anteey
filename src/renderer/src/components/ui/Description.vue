<template>
  <div class="settings-description">
    <div class="description-icon">
      <Tips theme="outline" size="16" :strokeWidth="3" />
    </div>
    <div class="description-text">
      <template v-if="Array.isArray(text)">
        <p v-for="(line, index) in text" :key="index">{{ line }}</p>
      </template>
      <slot v-else></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Tips } from '@icon-park/vue-next'

defineProps<{
  text?: string[] // 可选的文本数组
}>()
</script>

<style scoped lang="scss">
.settings-description {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  margin: 0 20px 16px 20px;
  width: calc(100% - 40px);
  box-sizing: border-box;
  background: var(--color-bg-secondary);
  border-radius: 6px;
  border: 1px solid var(--color-border);

  .description-icon {
    flex-shrink: 0;
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    margin-top: 2px;
  }

  .description-text {
    font-size: 14px;
    line-height: 1.5;
    color: var(--color-text-secondary);
    flex: 1;

    p {
      margin: 0;
      padding: 0;

      &:not(:last-child) {
        margin-bottom: 8px; // 段落之间的间距
      }
    }
  }
}
</style>
