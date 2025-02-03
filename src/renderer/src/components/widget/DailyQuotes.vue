<template>
  <div class="daily-quotes-widget">
    <!-- 标题 -->
    <div class="widget-header">
      <span class="widget-title">今日箴言</span>
    </div>

    <!-- 主体内容区域 -->
    <div v-if="dailyQuotesStore.todayQuote" class="quote-content">
      <!-- 金句内容 -->
      <div class="quote-text">
        <span class="quote-mark">"</span>
        {{ dailyQuotesStore.todayQuote.content }}
        <span class="quote-mark">"</span>
      </div>

      <!-- 作者信息 -->
      <div class="quote-author">—— {{ dailyQuotesStore.todayQuote.author }}</div>
    </div>

    <!-- 加载状态 -->
    <div v-else class="loading-state">
      <div class="loading-text">今日箴言加载中...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useDailyQuotesStore } from '@renderer/stores/dailyquotesStore'

const dailyQuotesStore = useDailyQuotesStore()

// 组件挂载时获取今日金句
onMounted(async () => {
  try {
    await dailyQuotesStore.fetchTodayQuote()
  } catch (error) {
    console.error('加载今日金句失败:', error)
  }
})
</script>

<style lang="scss" scoped>
.daily-quotes-widget {
  padding: 16px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.quote-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quote-text {
  font-size: 15px;
  line-height: 1.6;
  color: var(--color-text-primary);
  font-weight: 500;
  position: relative;
  padding: 0 8px;

  .quote-mark {
    color: var(--color-primary);
    font-size: 18px;
    font-weight: bold;
  }
}

.quote-author {
  font-size: 13px;
  color: var(--color-text-secondary);
  text-align: right;
  padding-right: 8px;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80px;

  .loading-text {
    font-size: 14px;
    color: var(--color-text-secondary);
  }
}
</style>
