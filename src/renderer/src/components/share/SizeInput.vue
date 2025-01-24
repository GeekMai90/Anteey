<template>
  <div class="size-input">
    <div class="input-container">
      <div class="size-label" :class="{ dragging }" @mousedown="startDrag">
        {{ label }}
      </div>
      <input
        class="size-input-field"
        type="number"
        :min="300"
        :value="modelValue"
        @input="handleInput"
      />
      <span class="unit">px</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  label: string
  modelValue: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

// 处理输入事件
const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  const value = Number(target.value)
  if (value >= 300) {
    emit('update:modelValue', value)
  }
}

const dragging = ref(false)
const startX = ref(0)
const startValue = ref(0)

const startDrag = (e: MouseEvent) => {
  dragging.value = true
  startX.value = e.clientX
  startValue.value = props.modelValue

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e: MouseEvent) => {
  if (!dragging.value) return

  const delta = Math.round(e.clientX - startX.value)
  const newValue = startValue.value + delta

  if (newValue >= 300) {
    emit('update:modelValue', newValue)
  }
}

const stopDrag = () => {
  if (dragging.value) {
    dragging.value = false
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
  }
}
</script>

<style lang="scss" scoped>
.size-input {
  flex: 1;
}

.input-container {
  display: flex;
  align-items: center;
  background: var(--color-bg-secondary);
  border-radius: 4px;
  padding: 4px 8px;
  gap: 8px;
}

.size-label {
  font-size: 14px;
  color: var(--color-text-secondary);
  cursor: ew-resize;
  user-select: none;
  padding: 2px;

  &.dragging {
    color: var(--color-primary);
  }

  &:hover {
    color: var(--color-primary);
  }
}

.size-input-field {
  flex: 1;
  width: 15px;
  border: none;
  background: transparent;
  text-align: right;
  color: var(--color-text-primary);
  font-size: 14px;
  padding: 0;

  &:focus {
    outline: none;
  }

  // 隐藏上下箭头
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
}

.unit {
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
