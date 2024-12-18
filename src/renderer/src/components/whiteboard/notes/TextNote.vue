<template>
  <div class="text-note">
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
import { ref, watch } from 'vue'

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

const emit = defineEmits<{
  (e: 'update:content', content: string): void
}>()

const localContent = ref(props.content || '')

watch(
  () => props.content,
  (newContent) => {
    localContent.value = newContent || ''
  }
)

const handleInput = () => {
  emit('update:content', localContent.value)
}
</script>

<style lang="scss" scoped>
.text-note {
  width: 100%;
  height: 100%;
  display: flex;
  background-color: inherit;
  border-radius: 10px;

  .text-area {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    resize: none;
    padding: 6px 10px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--color-text-primary);
    background-color: inherit !important;
    font-family: var(--font-family-ui);
    border-radius: 10px;

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
