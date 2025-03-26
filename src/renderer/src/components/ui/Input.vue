<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  modelValue?: string | null
  placeholder?: string
  width?: number | string
  height?: number
  type?: 'text' | 'password' | 'email' | 'number'
  disabled?: boolean
  help?: string
  step?: string | number
  min?: string | number
  max?: string | number
}

withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '',
  width: '100%',
  height: 40,
  type: 'text',
  disabled: false,
  help: '',
  step: undefined,
  min: undefined,
  max: undefined
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value || null)
}

const inputRef = ref<HTMLInputElement | null>(null)

defineExpose({
  focus: () => inputRef.value?.focus()
})
</script>

<template>
  <div
    class="input-wrapper"
    :style="{
      width: typeof width === 'number' ? `${width}px` : width
    }"
  >
    <input
      ref="inputRef"
      class="ant-input"
      :type="type"
      :placeholder="placeholder"
      :value="modelValue ?? ''"
      :disabled="disabled"
      :step="step"
      :min="min"
      :max="max"
      :style="{
        height: `${height}px`
      }"
      @input="handleInput"
    />
    <div v-if="help" class="input-help">{{ help }}</div>
  </div>
</template>

<style lang="scss" scoped>
.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  border-radius: 8px;
  transition: all 0.3s ease;

  &:focus-within {
    .ant-input {
      border-color: rgba(0, 200, 168, 0.4);
      background-color: var(--color-bg-primary);
      box-shadow: 0 0 0 4px rgb(0 200 168 / 10%);
    }
  }

  &:hover:not(:has(:disabled)) {
    .ant-input {
      border-color: rgba(0, 200, 168, 0.4);
      background-color: var(--color-bg-primary);
      box-shadow: 0 0 0 4px rgb(0 200 168 / 10%);
    }
  }
}

.ant-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  transition: all 0.3s ease;
  outline: none;
  box-sizing: border-box;
  line-height: 1.5;

  &:focus,
  &:hover:not(:disabled) {
    outline: none;
    border-color: rgba(0, 200, 168, 0.4);
    background-color: var(--color-bg-primary);
    box-shadow: 0 0 0 4px rgb(0 200 168 / 10%);
  }

  &::placeholder {
    color: #9e9ea7;
    font-size: 14px;
    transform: translateY(-1px);
  }

  &:disabled {
    background-color: var(--color-bg-secondary);
    cursor: not-allowed;
    opacity: 0.6;

    &:hover {
      border-color: var(--color-border);
      box-shadow: none;
    }
  }
}

.input-help {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-top: 2px;
}
</style>
