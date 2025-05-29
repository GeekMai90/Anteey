<template>
  <div class="checkbox-wrapper-5">
    <div class="check">
      <input :id="id" type="checkbox" :checked="Boolean(modelValue)" @change="handleClick" />
      <label :for="id"></label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', value: boolean): void
}>()

// 生成唯一ID以确保label和input的关联
const id = computed(() => `switch-${Math.random().toString(36).substr(2, 9)}`)

const handleClick = () => {
  emit('update:modelValue', !props.modelValue)
  emit('change', !props.modelValue)
}
</script>

<style scoped>
.checkbox-wrapper-5 {
  display: flex;
  align-items: center;
  height: 100%;
}

.checkbox-wrapper-5 .check {
  --size: 20px;
  position: relative;
  background: var(--color-primary);
  line-height: 0;
  perspective: 400px;
  font-size: var(--size);
}

.checkbox-wrapper-5 .check input[type='checkbox'],
.checkbox-wrapper-5 .check label,
.checkbox-wrapper-5 .check label::before,
.checkbox-wrapper-5 .check label::after,
.checkbox-wrapper-5 .check {
  appearance: none;
  display: inline-block;
  border-radius: var(--size);
  border: 0;
  transition: 0.35s ease-in-out;
  box-sizing: border-box;
  cursor: pointer;
}

.checkbox-wrapper-5 .check label {
  width: calc(1.8 * var(--size));
  height: var(--size);
  background: var(--color-slider-track);
  overflow: hidden;
}

.checkbox-wrapper-5 .check input[type='checkbox'] {
  position: absolute;
  z-index: 1;
  width: calc(0.7 * var(--size));
  height: calc(0.7 * var(--size));
  top: calc(0.15 * var(--size));
  left: calc(0.15 * var(--size));
  background: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  outline: none;
  margin: 0;
}

.checkbox-wrapper-5 .check input[type='checkbox']:checked {
  left: calc(0.95 * var(--size));
}

.checkbox-wrapper-5 .check input[type='checkbox']:checked + label {
  background: var(--color-primary);
}

.checkbox-wrapper-5 .check label::before,
.checkbox-wrapper-5 .check label::after {
  content: '· ·';
  position: absolute;
  overflow: hidden;
  left: calc(0.15 * var(--size));
  top: calc(0.5 * var(--size));
  height: var(--size);
  letter-spacing: calc(-0.04 * var(--size));
  color: #9b9b9b;
  font-family: 'Times New Roman', serif;
  z-index: 2;
  font-size: calc(0.6 * var(--size));
  border-radius: 0;
  transform-origin: 0 0 calc(-0.5 * var(--size));
  backface-visibility: hidden;
}

.checkbox-wrapper-5 .check label::after {
  content: '●';
  top: calc(0.65 * var(--size));
  left: calc(0.2 * var(--size));
  height: calc(0.1 * var(--size));
  width: calc(0.35 * var(--size));
  font-size: calc(0.2 * var(--size));
  transform-origin: 0 0 calc(-0.4 * var(--size));
}

.checkbox-wrapper-5 .check input[type='checkbox']:checked + label::before,
.checkbox-wrapper-5 .check input[type='checkbox']:checked + label::after {
  left: calc(1.2 * var(--size));
  top: calc(0.4 * var(--size));
  line-height: calc(0.1 * var(--size));
  transform: rotateY(360deg);
}

.checkbox-wrapper-5 .check input[type='checkbox']:checked + label::after {
  height: calc(0.16 * var(--size));
  top: calc(0.55 * var(--size));
  left: calc(1.2 * var(--size));
  font-size: calc(0.6 * var(--size));
  line-height: 0;
}
</style>
