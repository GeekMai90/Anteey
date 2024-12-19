<template>
  <div class="text-note" :style="computedStyle">
    <textarea
      v-model="localContent"
      :readonly="!props.isEditing"
      :placeholder="props.isEditing ? '输入文本内容...' : ''"
      class="text-area"
      @input="handleInput"
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { useWhiteboardStore } from '@renderer/stores/whiteboardStores'

const props = defineProps<{
  id: string
  content?: string
  isEditing: boolean
  style?: {
    backgroundColor?: string
    textColor?: string
    fontSize?: number
    fontFamily?: string
  }
}>()

const whiteboardStore = useWhiteboardStore()

const localContent = ref(props.content || '')

const computedStyle = computed(() => {
  if (!props.style) return {}

  const style: Record<string, string> = {}

  if (props.style.backgroundColor) {
    style.borderColor = props.style.backgroundColor
  }

  if (props.style.textColor) {
    style.color = props.style.textColor
  }

  if (props.style.fontSize) {
    style.fontSize = `${props.style.fontSize}px`
  }

  if (props.style.fontFamily) {
    style.fontFamily = props.style.fontFamily
  }

  return style
})

watch(
  () => props.content,
  (newContent) => {
    localContent.value = newContent || ''
  }
)

watch(
  () => props.style,
  () => {
    nextTick(() => {
      const element = document.querySelector('.text-note') as HTMLElement
      if (element) {
        element.style.display = 'none'
        element.offsetHeight
        element.style.display = ''
      }
    })
  },
  { deep: true }
)

const handleInput = async () => {
  try {
    // 确保 content 存在且为字符串
    if (props.content !== undefined) {
      await whiteboardStore.updateWhiteboardNoteContent(props.id, localContent.value)
    } else {
      console.error('Content ID is undefined')
    }
  } catch (error) {
    console.error('更新文本内容失败:', error)
  }
}
</script>

<style lang="scss" scoped>
.text-note {
  width: 100%;
  height: 100%;
  display: flex;
  background-color: inherit;
  border-radius: 10px;
  backface-visibility: hidden;
  transform-style: preserve-3d;
  will-change: transform;

  .text-area {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    resize: none;
    padding: 10px;
    font-size: 16px;
    line-height: 16px;
    color: var(--color-text-primary);
    background-color: transparent !important;
    font-family: var(--font-family-editor);
    border-radius: 10px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;

    &::placeholder {
      color: var(--color-text-placeholder);
      opacity: 0.7;
    }

    &:not(:read-only) {
      cursor: text;
    }

    &:read-only {
      cursor: inherit;
    }
  }
}
</style>
