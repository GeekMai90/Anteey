<template>
  <div class="life-guide-widget">
    <!-- 标题 -->
    <div class="widget-header">
      <span class="widget-title">人生指南</span>
    </div>

    <!-- 主体内容区域 -->
    <div v-if="lifeGuideStore.currentNote" class="guide-content">
      <!-- 笔记内容 -->
      <div class="guide-text">
        <TipTapRender
          :content="lifeGuideStore.currentNote.content"
          :editable="false"
          :enable-drag-handle="false"
        />
      </div>

      <!-- 笔记地址 -->
      <!-- <div class="guide-address">{{ lifeGuideStore.currentNote.address }}</div> -->
    </div>

    <!-- 加载状态 -->
    <div v-else-if="lifeGuideStore.isLoading" class="loading-state">
      <div class="loading-text">人生指南加载中...</div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-text">请先为笔记添加"人生指南"标签</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useLifeGuideStore } from '@renderer/stores/lifeGuideStore'
import TipTapRender from '@renderer/components/tiptap/TipTapRender.vue'

const lifeGuideStore = useLifeGuideStore()

// 组件挂载时获取随机人生指南笔记
onMounted(async () => {
  try {
    await lifeGuideStore.fetchRandomNote()
  } catch (error) {
    console.error('加载人生指南笔记失败:', error)
  }
})
</script>

<style lang="scss" scoped>
.life-guide-widget {
  padding: 16px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

:deep(.tiptap) {
  padding-left: 0px;
  padding-right: 0px;
}

// 添加标题样式
.widget-header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;

  .widget-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-secondary);
  }
}

.guide-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guide-text {
  position: relative;
  padding: 0 8px;

  :deep(.tiptap-container) {
    font-size: 15px;
    line-height: 1.6;
    color: var(--color-text-primary);
    font-weight: 500;
  }
}

.guide-address {
  font-size: 13px;
  color: var(--color-text-secondary);
  text-align: right;
  padding-right: 8px;
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
</style>
