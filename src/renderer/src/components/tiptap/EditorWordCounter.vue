<template>
  <div
    v-if="showCounter"
    class="character-count"
    :class="{ 'character-count--warning': isLimitExceeded }"
  >
    <svg height="20" width="20" viewBox="0 0 20 20">
      <circle r="10" cx="10" cy="10" fill="var(--color-bg-tertiary)" />
      <circle
        r="5"
        cx="10"
        cy="10"
        fill="transparent"
        stroke="currentColor"
        stroke-width="10"
        :stroke-dasharray="`calc(${Math.min(percentage, 100)} * 31.4 / 100) 31.4`"
        transform="rotate(-90) translate(-20)"
      />
      <circle r="6" cx="10" cy="10" fill="var(--color-bg-primary)" />
    </svg>
    <div class="count-text">
      <span v-if="showLimit && characterLimit > 0"
        >{{ characterCount }} / {{ characterLimit }} 字</span
      >
      <span v-else>{{ characterCount }} 字</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  editor: {
    type: Object,
    required: true
  },
  showCounter: {
    type: Boolean,
    default: true
  },
  showLimit: {
    type: Boolean,
    default: true
  },
  showWords: {
    type: Boolean,
    default: true
  },
  showProgressBar: {
    type: Boolean,
    default: true
  },
  enforceLimit: {
    type: Boolean,
    default: false
  },
  characterLimit: {
    type: Number,
    default: 500
  }
})

// 统计计数
const characterCount = ref(0)
const wordCount = ref(0)

// 更新字数统计的函数
const updateCount = () => {
  if (props.editor) {
    // 获取文本内容
    const text = props.editor.getText()

    // 更新字符数 - 一个汉字算一个字符，排除空格
    const filteredText = text.replace(/\s+/g, '') // 移除所有空白字符
    characterCount.value = [...filteredText].length

    // 更新词数 - 优化中文分词逻辑
    // 匹配中文字符、英文单词、数字
    const matches = text.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+|[0-9]+/g)
    wordCount.value = matches ? matches.length : 0
  }
}

// 有效字符限制的计算属性
const effectiveCharacterLimit = computed(() => {
  // 如果启用了限制输入，返回设置的字符限制值
  // 如果禁用了限制输入，返回 null（表示无限制）
  return props.enforceLimit ? props.characterLimit : null
})

// 百分比计算
const percentage = computed(() => {
  if (props.characterLimit === 0) return 0 // 如果限制为0（无限制），则百分比为0
  return Math.round((100 / props.characterLimit) * characterCount.value)
})

// 是否超出限制
const isLimitExceeded = computed(() => {
  return props.enforceLimit && characterCount.value > props.characterLimit
})

// 监听编辑器更新事件
const setupEditorListener = () => {
  if (!props.editor) return

  // 初始更新计数
  updateCount()

  // 添加编辑器更新监听器
  props.editor.on('update', () => {
    updateCount()
  })

  // 更新CharacterCount扩展配置
  updateCharacterCountExtension()
}

// 更新CharacterCount扩展配置
const updateCharacterCountExtension = () => {
  if (!props.editor) return

  props.editor.extensionManager.extensions.forEach((extension) => {
    if (extension.name === 'characterCount') {
      // 更新limit配置
      extension.options.limit = effectiveCharacterLimit.value

      // 触发编辑器更新
      props.editor.view.dispatch(props.editor.state.tr)
    }
  })
}

// 监听属性变化
watch([() => props.enforceLimit, () => props.characterLimit], () => {
  updateCharacterCountExtension()
})

// 监听editor变化
watch(
  () => props.editor,
  (newEditor) => {
    if (newEditor) {
      setupEditorListener()
    }
  },
  { immediate: true }
)

// 暴露计数值给父组件
defineExpose({
  characterCount,
  wordCount,
  percentage,
  updateCount
})
</script>

<style lang="scss" scoped>
.character-count {
  position: absolute;
  bottom: 10px;
  right: 16px;
  font-size: 13px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  z-index: 100;
  user-select: none;
  transition: all 0.3s ease;
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  pointer-events: none; /* 防止鼠标事件影响编辑器 */

  svg {
    color: var(--color-primary);
    width: 16px;
    height: 16px;
  }

  &--warning {
    color: var(--color-danger);

    svg {
      color: var(--color-danger);
    }
  }

  .count-text {
    display: flex;
    align-items: center;
    white-space: nowrap;
    gap: 8px;

    .word-count {
      opacity: 0.7;
      font-size: 11px;
    }
  }
}
</style>
