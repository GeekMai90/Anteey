<template>
  <div v-if="isFlashcard" v-tooltip.top="tooltipConfig" class="flashcard-indicator">
    <StorageCardOne theme="outline" size="14" :fill="flashcardColor" :strokeWidth="3" />
  </div>
</template>

<script setup lang="ts">
import { StorageCardOne } from '@icon-park/vue-next'
import { computed } from 'vue'
import { State } from 'ts-fsrs'

const props = withDefaults(
  defineProps<{
    isFlashcard: boolean | number
    fsrsState?: State | undefined
  }>(),
  {
    isFlashcard: false,
    fsrsState: undefined
  }
)

// 计算闪卡状态颜色
const flashcardColor = computed(() => {
  if (!props.fsrsState) return 'var(--color-text-secondary)'

  // 使用类型断言确保 TypeScript 知道这是有效的 State 值
  const state = props.fsrsState as State
  switch (state) {
    case State.New:
      return 'var(--color-fsrs-new)'
    case State.Learning:
      return 'var(--color-fsrs-learning)'
    case State.Review:
      return 'var(--color-fsrs-review)'
    case State.Relearning:
      return 'var(--color-fsrs-relearning)'
    default:
      return 'var(--color-text-secondary)'
  }
})

// 计算闪卡提示文本
const tooltipText = computed(() => {
  if (!props.fsrsState) return '新卡片'

  // 使用类型断言确保 TypeScript 知道这是有效的 State 值
  const state = props.fsrsState as State
  switch (state) {
    case State.New:
      return '新卡片'
    case State.Learning:
      return '学习中'
    case State.Review:
      return '复习中'
    case State.Relearning:
      return '重新学习'
    default:
      return '记忆卡'
  }
})

// tooltip配置
const tooltipConfig = computed(() => ({
  content: tooltipText.value,
  delay: { show: 1000 },
  html: true
}))
</script>

<style lang="scss" scoped>
.flashcard-indicator {
  display: flex;
  align-items: center;
  color: var(--color-primary);

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
</style>
