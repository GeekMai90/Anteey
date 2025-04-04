<template>
  <div class="task-widget">
    <!-- 标题栏 -->
    <div class="widget-header">
      <span class="widget-title">待办事项</span>
      <div class="header-right">
        <span class="count">{{ taskStore.tasks.length }}</span>
        <div class="refresh-btn" @click="handleRefresh">
          <Refresh theme="outline" size="16" fill="var(--color-text-secondary)" />
        </div>
      </div>
    </div>

    <!-- 主体内容区域 -->
    <div class="task-container">
      <!-- 任务列表 -->
      <div v-if="taskStore.tasks.length > 0" class="task-list">
        <div
          v-for="task in taskStore.tasks"
          :key="`${task.noteId}-${task.path.join('-')}`"
          class="task-item"
        >
          <div class="task-main">
            <!-- 任务复选框 -->
            <div class="task-checkbox">
              <input type="checkbox" :checked="task.isChecked" @change="handleTaskCheck(task)" />
            </div>
            <!-- 任务文本 -->
            <div
              class="task-text"
              :class="{ completed: task.isChecked }"
              @click="handleTaskClick(task)"
            >
              {{ task.text }}
            </div>
          </div>
          <!-- 笔记地址 -->
          <div class="task-address">{{ task.address }}</div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-else-if="isLoading" class="loading-state">
        <div class="loading-text">加载任务中...</div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-text">暂无任务</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useTaskStore } from '@renderer/stores/taskStore'
import { useNoteStore } from '@renderer/stores/noteStore'
import { Refresh } from '@icon-park/vue-next'
import type { Task } from '@shared/types'
import { useRouter } from 'vue-router'

const taskStore = useTaskStore()
const noteStore = useNoteStore()

const router = useRouter()
const isLoading = ref(false)

// 处理任务勾选
const handleTaskCheck = async (task: Task) => {
  try {
    // 确保传递的是简单数据类型
    const pathArray = task.path.map(String)
    await taskStore.updateTaskStatus(task.noteId, pathArray, !task.isChecked)
  } catch (error) {
    console.error('更新任务状态失败:', error)
  }
}

// 处理刷新按钮点击
const handleRefresh = async () => {
  try {
    await taskStore.fetchAllTasks()
  } catch (error) {
    console.error('刷新任务列表失败:', error)
  }
}

// 处理任务点击
// const handleTaskClick = async (task: Task) => {
//   try {
//     if (task.path[0] === 'timeBlock' && task.timeBlock) {
//       // 设置目标日期到 store
//       timeBlockStore.targetDate = task.timeBlock.date
//       timeBlockStore.$patch({ currentDay: null }) // 清空当前数据

//       // 跳转到时光记页面
//       await router.push('/timeblock')

//       // 等待时光记页面加载对应日期的数据
//       const hour = await timeBlockStore.navigateToTimeBlock(
//         task.timeBlock.date,
//         task.timeBlock.hour
//       )

//       // 添加一个延时确保数据已加载完成
//       await new Promise((resolve) => setTimeout(resolve, 100))

//       // 查找并滚动到对应的时间块
//       const timeBlock = document.querySelector(`.time-block[data-hour="${hour}"]`)
//       if (timeBlock) {
//         timeBlock.scrollIntoView({ behavior: 'smooth', block: 'center' })
//       } else {
//         console.warn('未找到对应的时间块元素:', hour)
//       }
//     } else {
//       // 普通笔记任务
//       await noteStore.openNoteEditor(task.noteId)
//     }
//   } catch (error) {
//     console.error('打开任务失败:', error)
//   }
// }

// const handleTaskClick = async (task: Task) => {
//   try {
//     if (task.path[0] === 'timeBlock' && task.timeBlock) {
//       // 先设置目标日期
//       timeBlockStore.targetDate = task.timeBlock.date

//       // 先加载数据
//       await timeBlockStore.loadTimeBlockDay(task.timeBlock.date)

//       // 确保数据加载完成后再跳转
//       await router.push({
//         path: '/timeblock',
//         replace: true // 使用 replace 避免历史记录堆积
//       })

//       // 等待路由和组件完全加载
//       await nextTick()
//       await new Promise((resolve) => setTimeout(resolve, 100))

//       // 滚动到对应时间块
//       const hour = task.timeBlock.hour
//       const timeBlock = document.querySelector(`.time-block[data-hour="${hour}"]`)
//       if (timeBlock) {
//         timeBlock.scrollIntoView({ behavior: 'smooth', block: 'center' })
//       }
//     } else {
//       // 普通笔记任务
//       await noteStore.openNoteEditor(task.noteId)
//     }
//   } catch (error) {
//     console.error('打开任务失败:', error)
//   }
// }

const handleTaskClick = async (task: Task) => {
  try {
    if (task.path[0] === 'timeBlock' && task.timeBlock) {
      // 直接使用路由跳转到指定日期
      await router.push({
        name: 'timeBlock',
        params: {
          date: task.timeBlock.date
        }
      })

      // 等待路由和组件完全加载
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // 滚动到对应时间块
      const hour = task.timeBlock.hour
      const timeBlock = document.querySelector(`.time-block[data-hour="${hour}"]`)
      if (timeBlock) {
        timeBlock.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    } else {
      // 普通笔记任务
      await noteStore.openNoteEditor(task.noteId)
    }
  } catch (error) {
    console.error('打开任务失败:', error)
  }
}
// 组件挂载时获取任务列表
onMounted(async () => {
  try {
    isLoading.value = true
    await taskStore.fetchAllTasks()
  } catch (error) {
    console.error('加载任务列表失败:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<style lang="scss" scoped>
.task-widget {
  padding: 16px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
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

.task-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;

  &:hover {
    background: var(--color-hover-bg);
  }
}

.task-main {
  display: flex;
  gap: 8px;
  align-items: center;
}

.task-checkbox {
  display: flex;
  align-items: center;

  input[type='checkbox'] {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    width: 1em;
    height: 1em;
    border: 1px solid var(--color-primary);
    border-radius: 50%;
    outline: none;
    cursor: pointer;
    position: relative;
    transition: all 0.3s ease;
    margin: 0;
    flex-shrink: 0;
    background: transparent;

    &:hover {
      border-color: var(--color-primary);
    }

    &:checked {
      border-color: var(--color-primary);
      background: transparent;

      &::after {
        content: '\2713';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 0.7em;
        font-weight: 900;
        color: var(--color-primary);
        line-height: 1;
      }
    }
  }
}

.task-text {
  font-size: 14px;
  color: var(--color-text-primary);
  word-break: break-word;
  line-height: 1.4;
  cursor: pointer;

  &:hover {
    color: var(--color-primary);
  }

  &.completed {
    text-decoration: line-through;
    color: var(--color-text-secondary);

    &:hover {
      color: var(--color-primary);
    }
  }
}

.task-address {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.2;
  padding-left: calc(1em + 12px); // 缩进对齐复选框
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
