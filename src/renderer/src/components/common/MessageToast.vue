<template>
  <Transition name="fade">
    <div v-if="visible" class="message-toast" :class="type">
      {{ message }}
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  message: string
  type?: 'success' | 'error'
  duration?: number
}>()

const visible = ref(false)

onMounted(() => {
  visible.value = true
  setTimeout(() => {
    visible.value = false
  }, props.duration || 2000)
})
</script>

<style lang="scss" scoped>
.message-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  font-size: 14px;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

  &.success {
    background: var(--color-primary);
  }

  &.error {
    background: var(--color-danger);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style>
