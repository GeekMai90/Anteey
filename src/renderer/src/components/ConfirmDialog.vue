<template>
  <Teleport to="body">
    <div v-if="show" class="confirm-dialog-overlay">
      <div class="confirm-dialog">
        <h3>{{ title }}</h3>
        <p>{{ message }}</p>
        <div class="button-group">
          <button @click="onCancel" class="cancel-button">{{ cancelText }}</button>
          <button @click="onConfirm" class="confirm-button">{{ confirmText }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

defineProps({
  show: Boolean,
  title: String,
  message: String,
  cancelText: {
    type: String,
    default: '取消'
  },
  confirmText: {
    type: String,
    default: '确定'
  }
})

const emit = defineEmits(['cancel', 'confirm'])

const onCancel = () => emit('cancel')
const onConfirm = () => emit('confirm')
</script>

<style scoped>
.confirm-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.confirm-dialog {
  background-color: white;
  border-radius: 12px;
  padding: 24px;
  width: 320px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  text-align: center;
}

h3 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

p {
  margin-bottom: 24px;
  font-size: 16px;
  color: #666;
  line-height: 1.5;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 16px;
}

button {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.cancel-button {
  background-color: #f0f0f0;
  color: #333;
}

.cancel-button:hover {
  background-color: #e0e0e0;
}

.confirm-button {
  background-color: #ff4d4f;
  color: white;
}

.confirm-button:hover {
  background-color: #ff7875;
}
</style>
