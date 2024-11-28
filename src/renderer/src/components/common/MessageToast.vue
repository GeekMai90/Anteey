<template>
  <Transition name="fade">
    <div v-if="visible" class="message-toast" :class="type">
      <div class="icon">
        <CheckOne v-if="type === 'success'" theme="filled" size="16" fill="#4CAF50" />
        <CloseOne v-if="type === 'error'" theme="filled" size="16" fill="#F44336" />
        <Alarm v-if="type === 'warning'" theme="filled" size="16" fill="#FFA726" />
        <Info v-if="type === 'info'" theme="filled" size="16" fill="#2196F3" />
      </div>
      <div class="message">{{ message }}</div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { CheckOne, CloseOne, Alarm, Info } from '@icon-park/vue-next'

const props = defineProps<{
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
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
  padding: 8px 16px 8px 10px;
  border-radius: 100px;
  background: var(--color-message-toast-bg);
  color: var(--color-text-primary);
  font-size: 14px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.1);

  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 16px;
      height: 16px;
    }
  }

  .message {
    flex-grow: 0;
    text-align: left;
    color: var(--default-text-color);
    font-size: 13px;
    font-weight: 400;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    line-height: 1;
  }

  // &.success {
  //   background: white;
  // }

  // &.error {
  //   background: white;
  // }

  // &.warning {
  //   background: white;
  // }

  // &.info {
  //   background: white;
  // }
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
