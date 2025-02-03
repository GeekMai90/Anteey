<template>
  <Button :class="{ active: modelValue }" :height="36" :icon="StorageCardOne" @click="toggleFilter">
    闪卡
  </Button>
</template>

<script setup lang="ts">
import { StorageCardOne } from '@icon-park/vue-next'
import Button from '@renderer/components/ui/Button.vue'

const props = defineProps<{
  modelValue: boolean | undefined
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean | undefined]
}>()

const toggleFilter = () => {
  emit('update:modelValue', !props.modelValue)
}
</script>

<style lang="scss" scoped>
:deep(.ant-btn) {
  &.active {
    background: rgba(var(--color-primary-rgb), 0.1);
    border-color: var(--color-primary);
    color: var(--color-primary);

    .button-icon {
      color: var(--color-primary);
    }
  }
}
</style>
