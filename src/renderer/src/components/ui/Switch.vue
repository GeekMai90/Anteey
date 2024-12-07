<template>
  <div class="switch" :class="{ 'is-active': modelValue }" @click="handleClick">
    <div class="switch-handle"></div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', value: boolean): void
}>()

const handleClick = () => {
  emit('update:modelValue', !props.modelValue)
  emit('change', !props.modelValue)
}
</script>

<style scoped lang="scss">
.switch {
  position: relative;
  width: 36px;
  height: 20px;
  background-color: var(--color-slider-track);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &.is-active {
    background-color: var(--color-primary);

    .switch-handle {
      transform: translateX(16px);
    }
  }

  .switch-handle {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    background-color: #fff;
    border-radius: 50%;
    transition: all 0.2s ease;
  }
}
</style>
