<template>
  <div class="widgets-editor-panel">
    <div class="widgets-editor-container">
      <div class="editor-content">
        <!-- <div class="editor-header">
          <div class="title-area">
            <div class="icon">
              <Components theme="outline" size="18" fill="var(--color-primary)" :strokeWidth="3" />
            </div>
            <span class="title">小组件</span>
          </div>
        </div> -->

        <!-- 小组件列表 -->
        <div class="widgets-list">
          <Pomodoro />
          <Task />
          <DailyQuotes />
          <LifeGuide />
          <Review />

          <!-- 后续可以添加更多小组件 -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Pomodoro from '@renderer/components/widget/Pomodoro.vue'
import DailyQuotes from '@renderer/components/widget/DailyQuotes.vue'
import LifeGuide from '@renderer/components/widget/LifeGuide.vue'
import Review from '@renderer/components/widget/Review.vue'
import Task from '@renderer/components/widget/Task.vue'
</script>

<style lang="scss" scoped>
.widgets-editor-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
}

.widgets-editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  margin: 0 auto;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);

  .title-area {
    display: flex;
    align-items: center;
    gap: 8px;

    .title {
      font-size: 14px;
      font-weight: 500;
      color: var(--color-text-primary);
    }
  }
}

.widgets-list {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
