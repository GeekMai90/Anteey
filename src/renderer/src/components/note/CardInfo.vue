<!-- CardInfo.vue -->
<template>
  <el-dialog
    v-model="dialogVisible"
    title="卡片信息"
    width="30%"
    append-to-body
    custom-class="card-info-dialog"
  >
    <div class="card-info">
      <div class="info-item">
        <span class="info-label">创建于</span>
        <span>{{ formatDate(createdAt) }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">更新于</span>
        <span>{{ formatDate(updatedAt) }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">字数</span>
        <span>{{ wordCount }} 字符</span>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, defineProps } from 'vue'

defineProps({
  createdAt: {
    type: Date,
    required: true
  },
  updatedAt: {
    type: Date,
    required: true
  },
  wordCount: {
    type: Number,
    required: true
  }
})

const dialogVisible = ref(false)

const formatDate = (date) => {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const open = () => {
  dialogVisible.value = true
}

const close = () => {
  dialogVisible.value = false
}

defineExpose({ open, close })
</script>

<style scoped>
.card-info {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-weight: bold;
  color: #606266;
}

:deep(.card-info-dialog) {
  margin-top: 40vh;
}
</style>
