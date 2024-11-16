<template>
  <div class="suggestion-bar">
    <button
      v-for="suggestion in suggestions"
      :key="suggestion.id"
      class="suggestion-button"
      :class="{ active: currentMode?.id === suggestion.id }"
      @click="selectMode(suggestion as Suggestion)"
    >
      <div class="icon">
        <component :is="suggestion.icon" theme="outline" size="18" />
      </div>
      <span class="text">{{ suggestion.text }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Suggestion } from '@renderer/types/assistant'
import { ThinkingProblem, MessageEmoji } from '@icon-park/vue-next'
import { markRaw } from 'vue'

defineProps<{
  currentMode: Suggestion | null
}>()

const emit = defineEmits<{
  (e: 'select', suggestion: Suggestion): void
}>()

const suggestions = [
  {
    id: 'ask',
    text: '问一问',
    icon: markRaw(ThinkingProblem),
    mode: 'ask',
    prompt: '',
    description: '从你的笔记中搜索相关内容'
  },
  {
    id: 'chat',
    text: '聊一聊',
    icon: markRaw(MessageEmoji),
    mode: 'chat',
    prompt: '',
    description: '与AI助手进行轻松的对话'
  }
]

const selectMode = (suggestion: Suggestion) => {
  emit('select', suggestion)
}
</script>

<style scoped lang="scss">
.suggestion-bar {
  display: flex;
  gap: 8px;
  padding: 8px 0;
  margin: 0;
}

.suggestion-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-primary);
  cursor: pointer;
  transition: all 0.2s;
  color: var(--color-text-secondary);

  &:hover {
    background: var(--color-hover-bg);
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  &.active {
    background: var(--color-primary-light);
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 14px;
      height: 14px;
    }
  }

  .text {
    flex-grow: 0;
    text-align: left;
    color: var(--color-text-secondary);
    font-size: 14px;
    font-weight: 400;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    line-height: 1;
  }
}
</style>
