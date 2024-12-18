<template>
  <div class="text-note">
    <div
      v-if="isEditing"
      class="text-editor"
      contenteditable="true"
      @input="handleInput"
      v-text="content"
      :style="textStyle"
    ></div>
    <div v-else class="text-content" v-text="content" :style="textStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  content?: string
  isEditing: boolean
  style?: {
    backgroundColor?: string
    textColor?: string
    fontSize?: number
    fontFamily?: string
  }
}>()

const textStyle = computed(() => ({
  ...props.style,
  backgroundColor: props.style?.backgroundColor,
  color: props.style?.textColor,
  fontSize: props.style?.fontSize ? `${props.style.fontSize}px` : undefined,
  fontFamily: props.style?.fontFamily
}))

const emit = defineEmits<{
  (e: 'update:content', content: string): void
}>()

const handleInput = (event: Event) => {
  const target = event.target as HTMLDivElement
  emit('update:content', target.textContent || '')
}
</script>

<style lang="scss" scoped>
.text-note {
  width: 100%;
  height: 100%;
  padding: 12px;

  .text-editor,
  .text-content {
    width: 100%;
    height: 100%;
    outline: none;
    white-space: pre-wrap;
  }

  .text-editor {
    cursor: text;
  }
}
</style>
