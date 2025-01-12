<template>
  <div class="review-widget">
    <!-- 标题栏 -->
    <div class="widget-header">
      <span class="widget-title">智能回顾</span>
      <div class="header-right">
        <span v-if="reviewStore.remainingCount > 0" class="count">{{
          reviewStore.remainingCount
        }}</span>
        <div v-if="reviewStore.remainingCount > 0" class="refresh-btn" @click="handleRefresh">
          <Refresh theme="outline" size="16" fill="var(--color-text-secondary)" />
        </div>
      </div>
    </div>

    <!-- 主体内容区域 -->
    <div v-if="reviewStore.currentNote" class="review-container">
      <!-- 可滚动的笔记内容 -->
      <div class="review-content">
        <div class="review-text">
          <TipTapRender
            :key="reviewStore.currentNote.id"
            :content="reviewStore.currentNote.content"
            :editable="false"
            :enable-drag-handle="false"
          />
        </div>
      </div>

      <!-- 固定在底部的地址 -->
      <div class="review-address">{{ reviewStore.currentNote.address }}</div>

      <!-- 完成提示条 -->
      <div v-if="showCompleteTip" class="complete-tip">今日回顾已完成，明天见！</div>
    </div>

    <!-- 加载状态 -->
    <div v-else-if="reviewStore.isLoading" class="loading-state">
      <div class="loading-text">智能回顾加载中...</div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-text">今日暂无回顾内容</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useReviewStore } from '@renderer/stores/reviewStore'
import TipTapRender from '@renderer/components/tiptap/TipTapRender.vue'
import { Refresh } from '@icon-park/vue-next'

const reviewStore = useReviewStore()
const showCompleteTip = ref(false)

// 监听 remainingCount 的变化
watch(
  () => reviewStore.remainingCount,
  (newCount) => {
    if (newCount === 0) {
      showCompleteTip.value = true
      // 3秒后隐藏提示
      setTimeout(() => {
        showCompleteTip.value = false
      }, 3000)
    }
  }
)

// 处理刷新按钮点击
const handleRefresh = () => {
  if (reviewStore.hasMore) {
    reviewStore.showNextNote()
  }
}

// 组件挂载时获取回顾笔记
onMounted(async () => {
  try {
    await reviewStore.fetchReviewNotes()
  } catch (error) {
    console.error('加载智能回顾笔记失败:', error)
  }
})
</script>

<style lang="scss" scoped>
.review-widget {
  padding: 16px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px rgba(var(--color-sidebar-icon-bg), 0.05);
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
}

:deep(.tiptap) {
  padding-left: 0px;
  padding-right: 0px;
}

// 标题栏样式
.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;

  .widget-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;

    .count {
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    .refresh-btn {
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      transition: all 0.2s ease;

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

      &:hover {
        background: var(--color-hover-button);
      }
    }
  }
}

.review-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  position: relative;
}

.review-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--color-scrollbar);
    border-radius: 3px;
  }
}

.review-text {
  position: relative;
  padding: 0 8px;

  :deep(.tiptap-container) {
    font-size: 15px;
    line-height: 1.6;
    color: var(--color-text-primary);
    font-weight: 500;
  }
}

.review-address {
  font-size: 13px;
  color: var(--color-text-secondary);
  text-align: right;
  padding-right: 8px;
  flex-shrink: 0;
}

.loading-state,
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80px;

  .loading-text,
  .empty-text {
    font-size: 14px;
    color: var(--color-text-secondary);
  }
}

.complete-tip {
  position: absolute;
  left: 50%;
  top: 40%;
  transform: translate(-50%, -50%);
  background: var(--color-bg-float);
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--color-text-secondary);
  box-shadow: var(--shadow-primary);
  white-space: nowrap;
  pointer-events: none;
  animation: fadeInOut 3s ease forwards;
  z-index: 1;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translate(-50%, -30%);
  }
  10% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  80% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%);
  }
}
</style>
