<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Minus } from '@icon-park/vue-next'

interface Props {
  modelValue: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  suffix?: string
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  disabled: false,
  suffix: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const handleDecrease = () => {
  if (props.disabled) return
  const newValue = props.modelValue - props.step
  if (newValue >= props.min) {
    emit('update:modelValue', newValue)
  }
}

const handleIncrease = () => {
  if (props.disabled) return
  const newValue = props.modelValue + props.step
  if (newValue <= props.max) {
    emit('update:modelValue', newValue)
  }
}

const handleInput = (e: Event) => {
  if (props.disabled) return
  const input = e.target as HTMLInputElement
  let value = parseFloat(input.value)

  if (isNaN(value)) {
    value = props.min
  } else {
    if (value < props.min) value = props.min
    if (value > props.max) value = props.max
  }

  emit('update:modelValue', value)
}

const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>

<template>
  <div class="number-input">
    <div class="input-wrapper">
      <button
        class="number-button decrease"
        :disabled="disabled || modelValue <= min"
        @click="handleDecrease"
      >
        <Minus theme="outline" size="14" :strokeWidth="3" />
      </button>
      <input
        v-model="inputValue"
        type="number"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        @change="handleInput"
      />
      <button
        class="number-button increase"
        :disabled="disabled || modelValue >= max"
        @click="handleIncrease"
      >
        <Plus theme="outline" size="14" :strokeWidth="3" />
      </button>
    </div>
    <span v-if="suffix" class="input-suffix">{{ suffix }}</span>
  </div>
</template>

<style lang="scss" scoped>
.number-input {
  display: flex;
  align-items: center;
  gap: 12px;

  .input-wrapper {
    display: flex;
    align-items: center;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-bg-secondary);
    transition: all 0.2s ease;

    &:hover:not(:has(:disabled)) {
      border-color: var(--color-primary);
    }

    &:focus-within:not(:has(:disabled)) {
      border-color: var(--color-primary);
    }

    input[type='number'] {
      width: 60px;
      height: 32px;
      border: none;
      text-align: center;
      padding: 0;
      color: var(--color-text-primary);
      font-size: 14px;
      background: transparent;
      outline: none;

      &::-webkit-inner-spin-button,
      &::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.6;
        color: var(--color-text-secondary);
      }
    }

    .number-button {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--color-text-secondary);
      transition: all 0.2s ease;

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

      &:not(:disabled):hover {
        color: var(--color-primary);
        background: var(--color-fill-secondary);
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      &.decrease {
        border-right: 1px solid var(--color-border);
      }

      &.increase {
        border-left: 1px solid var(--color-border);
      }
    }
  }

  .input-suffix {
    font-size: 14px;
    color: var(--color-text-secondary);
  }
}
</style>
