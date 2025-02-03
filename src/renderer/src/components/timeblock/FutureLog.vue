<template>
  <div class="future-log">
    <div class="controls">
      <!-- 分屏模式按钮 -->
      <div class="tool-button" :class="{ active: splitMode }" @click="toggleSplitMode">
        <div class="icon">
          <Schedule theme="outline" size="16" :strokeWidth="3" />
        </div>
        <span>月度分配</span>
      </div>

      <!-- 年份选择器 -->
      <div class="date-select">
        <div class="selected" @click="showYearSelect = !showYearSelect">
          {{ selectedYear }}年
          <Down theme="outline" size="12" :strokeWidth="3" class="down-icon" />
        </div>
        <div v-show="showYearSelect" class="select-dropdown">
          <div
            v-for="year in yearOptions"
            :key="year"
            class="select-option"
            @click="selectYear(year)"
          >
            {{ year }}年
          </div>
        </div>
      </div>

      <!-- 月份选择器 -->
      <div class="date-select">
        <div class="selected month-select" @click="showMonthSelect = !showMonthSelect">
          {{ selectedMonth }}月
          <Down theme="outline" size="12" :strokeWidth="3" class="down-icon" />
        </div>
        <div v-show="showMonthSelect" class="select-dropdown">
          <div v-for="month in 12" :key="month" class="select-option" @click="selectMonth(month)">
            {{ month }}月
          </div>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="future-log-container" :class="{ 'split-mode': splitMode }">
      <!-- 左侧未来日志 -->
      <div class="future-log-panel">
        <FutureLogEditor
          v-model:content="content"
          class="future-log-editor"
          :placeholder="'开始记录未来的计划...'"
          @update:content="handleContentChange"
        />
      </div>

      <!-- 右侧月度日志 -->
      <div v-if="splitMode" class="monthly-log-panel">
        <MonthlyLogEditor
          v-model:content="monthlyContent"
          class="monthly-log-editor"
          :placeholder="'开始记录本月计划...'"
          @update:content="handleMonthlyContentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTimeBlockStore } from '@renderer/stores/timeBlockStore'
import FutureLogEditor from './FutureLogEditor.vue'
import MonthlyLogEditor from './MonthlyLogEditor.vue'
import { Down, Schedule } from '@icon-park/vue-next'

const store = useTimeBlockStore()
const content = ref('')

// 添加分屏相关的状态
const splitMode = ref(false)
const showYearSelect = ref(false)
const showMonthSelect = ref(false)
const monthlyContent = ref('')

// 获取当前年份和月份
const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

// 年份选项（前后 5 年）
const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

const selectedYear = ref(currentYear)
const selectedMonth = ref(currentMonth)

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

// 切换分屏模式
const toggleSplitMode = () => {
  splitMode.value = !splitMode.value
  if (splitMode.value) {
    loadMonthlyLog()
  }
}

// 选择年份
const selectYear = (year: number) => {
  selectedYear.value = year
  showYearSelect.value = false
  loadMonthlyLog()
}

// 选择月份
const selectMonth = (month: number) => {
  selectedMonth.value = month
  showMonthSelect.value = false
  loadMonthlyLog()
}

// 加载月度日志
const loadMonthlyLog = async () => {
  try {
    const log = await store.getMonthlyLog(selectedYear.value, selectedMonth.value)
    if (log) {
      monthlyContent.value = log.content || ''
    } else {
      monthlyContent.value = ''
    }
  } catch (error) {
    console.error('加载月度日志失败:', error)
  }
}

// 处理月度日志内容更新
const handleMonthlyContentChange = async (newContent: string) => {
  try {
    await store.updateMonthlyLog(selectedYear.value, selectedMonth.value, newContent)
  } catch (error) {
    console.error('更新月度日志失败:', error)
  }
}

// 添加点击外部关闭下拉菜单
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.date-select')) {
      showYearSelect.value = false
      showMonthSelect.value = false
    }
  })
})

onMounted(() => {
  loadFutureLog()
})
</script>

<style lang="scss" scoped>
.future-log {
  height: 100%;
  padding: 0px 16px 16px 16px;
  background-color: var(--color-bg-primary);
  display: flex;
  flex-direction: column;
  // gap: 12px;

  .controls {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    justify-content: center;
    align-items: center;

    .tool-button {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid var(--color-border);
      background-color: var(--color-bg-primary);
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 14px;
      color: var(--color-text-primary);

      .icon {
        width: 20px;
        height: 20px;
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
          width: 18px;
          height: 18px;
        }
      }

      &:hover {
        border-color: var(--color-primary);
        background: var(--color-hover-bg);
      }

      &.active {
        background: rgba(var(--color-primary-rgb), 0.1);
        border-color: var(--color-primary);
        color: var(--color-primary);

        .icon {
          color: var(--color-primary);
        }
      }
    }

    .date-select {
      position: relative;

      .selected {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        border-radius: 6px;
        border: 1px solid var(--color-border);
        background-color: var(--color-bg-primary);
        color: var(--color-text-primary);
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 90px;

        &.month-select {
          min-width: 70px;
        }

        .down-icon {
          margin-left: auto;
          opacity: 0.6;
        }

        &:hover {
          border-color: var(--color-primary);
          background: var(--color-hover-bg);
        }
      }

      .select-dropdown {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        min-width: 100%;
        background: var(--color-bg-primary);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 4px;
        box-shadow: var(--shadow-card);
        z-index: 1000;
        max-height: 280px;
        overflow-y: auto;

        .select-option {
          padding: 8px 12px;
          cursor: pointer;
          white-space: nowrap;
          border-radius: 4px;
          transition: all 0.2s;
          font-size: 14px;
          color: var(--color-text-primary);

          &:hover {
            background: var(--color-hover-bg);
          }
        }
      }
    }
  }

  .future-log-container {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 16px;

    // 非分屏模式下的样式
    .future-log-panel {
      flex: 1;
      display: flex;
      justify-content: center;

      :deep(.future-log-editor) {
        max-width: 800px;
        width: 100%;
      }
    }

    // 分屏模式下的样式
    &.split-mode {
      flex-direction: row !important;
      height: 100%;

      .future-log-panel,
      .monthly-log-panel {
        flex: 1;
        height: 100%;
        min-width: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .monthly-log-panel {
        display: flex;
        flex-direction: column;
      }
    }

    // 编辑器通用样式
    :deep(.future-log-editor),
    :deep(.monthly-log-editor) {
      flex: 1;
      min-height: 0;
      background-color: var(--color-bg-note-card);
      border-radius: 12px;
      // box-shadow: var(--shadow-card);
      padding: 20px;
      transition: all 0.3s ease;
      border: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;

      .theme-dark & {
        background-color: var(--color-bg-note-card);
        border-color: var(--color-border-light);
      }

      &:hover {
        // border-color: var(--color-primary);

        .theme-dark & {
          background-color: var(--color-bg-note-card);
        }
      }

      .monthly-log-editor-content,
      .future-log-editor-content {
        height: 100%;
        background: transparent;
        font-family: var(--font-family);
        font-size: 15px;
        line-height: 1.7;
        color: var(--color-text-primary);
        outline: none;
      }
    }
  }
}
</style>
