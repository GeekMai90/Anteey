<template>
  <div class="future-log">
    <div class="future-log-container">
      <div class="future-log-header">
        <div class="text">
          <div class="title">未来日志</div>
          <div class="subtitle">记录未来要做的事情，规划你的时间...</div>
        </div>
      </div>

      <FutureLogEditor
        v-model:content="content"
        class="future-log-editor"
        :placeholder="'开始记录未来的计划...'"
        @update:content="handleContentChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTimeBlockStore } from '@renderer/stores/timeBlockStore'
import FutureLogEditor from './FutureLogEditor.vue'

const store = useTimeBlockStore()
const content = ref('')

// 加载未来日志内容
const loadFutureLog = async () => {
  try {
    const log = await store.getFutureLog()
    console.log('Component: 获取到的未来日志:', log)
    if (log) {
      content.value = log.content || ''
    }
  } catch (error) {
    console.error('加载未来日志失败:', error)
  }
}

// 处理内容更新
const handleContentChange = async (newContent: string) => {
  try {
    console.log('Component: 准备更新内容:', newContent)
    await store.updateFutureLog(newContent)
  } catch (error) {
    console.error('更新未来日志失败:', error)
  }
}

onMounted(() => {
  loadFutureLog()
})
</script>

<style lang="scss" scoped>
.future-log {
  height: 100%;
  padding: 10px;
  background-color: var(--color-bg-primary);

  .future-log-container {
    max-width: 800px;
    margin: 0 auto;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .future-log-header {
    flex: none;
    display: flex;
    padding: 8px 12px 8px 0;
    margin-bottom: 0;

    .text {
      flex: 1;

      .title {
        font-size: 28px;
        font-weight: 600;
        color: var(--color-text-primary);
        margin-bottom: 8px;
        letter-spacing: 0.5px;
        line-height: 1.2;
        position: relative;
        display: inline-block;

        &::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, var(--color-primary), transparent);
          opacity: 0.5;
          border-radius: 2px;
        }
      }

      .subtitle {
        color: var(--color-text-secondary);
        font-size: 15px;
        line-height: 1.5;
        opacity: 0.85;
        max-width: 480px;
      }
    }
  }

  :deep(.future-log-editor) {
    flex: 1;
    min-height: 0;
    background-color: var(--color-note-card-bg);
    border-radius: 16px;
    box-shadow: var(--shadow-card);
    padding: 20px;
    transition: all 0.3s ease;
    border: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .theme-dark & {
      background-color: var(--color-bg-2);
      border-color: var(--color-shape-primary);
    }

    &:hover {
      box-shadow: var(--shadow-primary);

      .theme-dark & {
        background-color: var(--color-note-card-bg);
      }
    }
  }
}
</style>
