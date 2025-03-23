<template>
  <div class="textarea-wrapper">
    <textarea
      :value="modelValue"
      class="ant-textarea"
      :placeholder="placeholder"
      :disabled="disabled"
      :style="{ width, height: height + 'px' }"
      @input="handleInput"
    ></textarea>
    <div v-if="help" class="help-text">{{ help }}</div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue?: string
  placeholder?: string
  width?: string | number
  height?: number
  disabled?: boolean
  help?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '',
  width: '100%',
  height: 120,
  disabled: false,
  help: ''
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const handleInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

<style scoped lang="scss">
.textarea-wrapper {
  width: 100%;

  .ant-textarea {
    width: 100%;
    padding: 8px 12px;
    color: var(--color-text-primary);
    font-size: 14px;
    line-height: 1.5;
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    transition: all 0.3s;
    resize: vertical;
    min-height: 80px;

    &::placeholder {
      color: #9e9ea7;
    }

    &:hover {
      border-color: rgba(0, 200, 168, 0.4);
    }

    &:focus {
      border-color: rgba(0, 200, 168, 0.4);
      box-shadow: 0 0 0 4px rgb(0 200 168 / 10%);
      outline: none;
    }

    &:disabled {
      color: var(--color-text-disabled);
      background-color: var(--color-bg-disabled);
      cursor: not-allowed;
      opacity: 1;
    }
  }

  .help-text {
    margin-top: 4px;
    color: var(--color-text-secondary);
    font-size: 12px;
    line-height: 1.5;
  }
}
</style>
