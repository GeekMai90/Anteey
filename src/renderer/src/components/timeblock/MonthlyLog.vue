<template>
  <div class="monthly-log">
    <div class="controls">
      <!-- 年度概览按钮 -->
      <Button
        :icon="Calendar"
        :class="{ active: showOverview }"
        type="default"
        :height="36"
        @click="toggleOverview"
      >
        年度概览
      </Button>

      <!-- 年月选择器 -->
      <div ref="yearSelectRef" class="date-select">
        <Button
          :dropdown="true"
          type="default"
          :height="36"
          @click="showYearSelect = !showYearSelect"
        >
          {{ selectedYear }}年
        </Button>

        <!-- 年份下拉菜单 -->
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

      <div ref="monthSelectRef" class="date-select">
        <Button
          :dropdown="true"
          type="default"
          :height="36"
          @click="showMonthSelect = !showMonthSelect"
        >
          {{ selectedMonth }}月
        </Button>

        <!-- 月份下拉菜单 -->
        <div v-show="showMonthSelect" class="select-dropdown">
          <div v-for="month in 12" :key="month" class="select-option" @click="selectMonth(month)">
            {{ month }}月
          </div>
        </div>
      </div>
    </div>

    <template v-if="showOverview">
      <div class="overview-grid">
        <div
          v-for="month in 12"
          :key="month"
          class="month-card"
          :class="{ active: month === selectedMonth }"
          @click="selectMonthFromOverview(month)"
        >
          <div class="month-header">
            <span class="month-title">{{ month }}月</span>
          </div>
          <div class="month-content">
            <MonthlyLogEditor
              :content="monthlyLogs[month]?.content || ''"
              :editable="false"
              class="month-preview-editor"
            />
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="single-month-container">
        <MonthlyLogEditor
          v-model:content="content"
          class="monthly-log-editor"
          :placeholder="'开始记录本月计划...'"
          @update:content="handleContentChange"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useTimeBlockStore } from '@renderer/stores/timeBlockStore'
import MonthlyLogEditor from './MonthlyLogEditor.vue'
import { Calendar } from '@icon-park/vue-next'
import Button from '@renderer/components/ui/buttons/Button.vue'

const store = useTimeBlockStore()
const content = ref('')
const showYearSelect = ref(false)
const showMonthSelect = ref(false)
const showOverview = ref(false)
const monthlyLogs = ref<Record<number, { content: string }>>({})

// 获取当前年份和月份
const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

// 年份选项（前后 5 年）
const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

const selectedYear = ref(currentYear)
const selectedMonth = ref(currentMonth)

const yearSelectRef = ref<HTMLElement | null>(null)
const monthSelectRef = ref<HTMLElement | null>(null)

// 选择年份
const selectYear = (year: number) => {
  selectedYear.value = year
  showYearSelect.value = false
}

// 选择月份
const selectMonth = (month: number) => {
  selectedMonth.value = month
  showMonthSelect.value = false
}

// 修改点击外部关闭下拉菜单的逻辑
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!yearSelectRef.value?.contains(target)) {
      showYearSelect.value = false
    }
    if (!monthSelectRef.value?.contains(target)) {
      showMonthSelect.value = false
    }
  })
})

// 加载月度日志内容
const loadMonthlyLog = async () => {
  try {
    const log = await store.getMonthlyLog(selectedYear.value, selectedMonth.value)
    // console.log('Component: 获取到的月度日志:', log)
    if (log) {
      content.value = log.content || ''
    } else {
      content.value = ''
    }
  } catch (error) {
    console.error('加载月度日志失败:', error)
  }
}

// 处理内容更新
const handleContentChange = async (newContent: string) => {
  try {
    console.log('Component: 准备更新内容:', newContent)
    await store.updateMonthlyLog(selectedYear.value, selectedMonth.value, newContent)
  } catch (error) {
    console.error('更新月度日志失败:', error)
  }
}

// 监听年月变化
watch([selectedYear, selectedMonth], () => {
  loadMonthlyLog()
})

onMounted(() => {
  loadMonthlyLog()
})

// 切换概览模式
const toggleOverview = async () => {
  showOverview.value = !showOverview.value
  if (showOverview.value) {
    await loadAllMonthlyLogs()
  }
}

// 加载所有月份的日志
const loadAllMonthlyLogs = async () => {
  try {
    const logs: Record<number, { content: string }> = {}
    for (let month = 1; month <= 12; month++) {
      const log = await store.getMonthlyLog(selectedYear.value, month)
      if (log) {
        logs[month] = log
      }
    }
    monthlyLogs.value = logs
  } catch (error) {
    console.error('加载年度概览失败:', error)
  }
}

// 从概览中选择月份
const selectMonthFromOverview = (month: number) => {
  selectedMonth.value = month
  showOverview.value = false
}

// 监听年份变化时重新加载概览
watch(selectedYear, () => {
  if (showOverview.value) {
    loadAllMonthlyLogs()
  }
})
</script>

<style lang="scss" scoped>
.monthly-log {
  height: 100%;
  padding: 0px 16px 0px 16px;
  background-color: var(--color-bg-primary);
  display: flex;
  flex-direction: column;

  .month-header {
    .date-controls {
      display: flex;
      gap: 8px;
      justify-content: center;
    }
  }

  .overview-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    padding: 6px 20px 12px 20px;
    overflow-y: auto;
    min-height: 0;

    .month-card {
      height: 240px;
      margin: 0;
      background: var(--color-bg-note-card);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-card);
        border-color: var(--color-primary);
      }

      &.active {
        border-color: var(--color-primary);
        background: rgba(var(--color-primary-rgb), 0.05);
      }

      .month-header {
        padding-bottom: 8px;
        margin-bottom: 8px;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        flex-direction: column;
        gap: 8px;

        .month-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .content-preview {
          font-size: 14px;
          color: var(--color-text-secondary);
          opacity: 0.8;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 6;
          line-clamp: 6;
          -webkit-box-orient: vertical;
          box-orient: vertical;
          line-height: 1.5;
        }
      }

      .month-content {
        flex: 1;
        overflow: hidden;

        :deep(.month-preview-editor) {
          height: 100%;
          padding: 0;
          background: none;
          border: none;
          box-shadow: none;

          &:hover {
            box-shadow: none;
          }

          .monthly-log-editor-content {
            padding: 0;
            font-size: 13px;

            &.ProseMirror {
              max-height: 180px;
              overflow-y: auto;
            }
          }
        }
      }
    }
  }

  .single-month-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;

    :deep(.monthly-log-editor) {
      width: 100%;
      max-width: 800px;
      flex: 1;
      min-height: 0;
      background-color: var(--color-bg-note-card);
      border-radius: 16px;
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
        // box-shadow: var(--shadow-primary);
        // border-color: var(--color-primary);

        .theme-dark & {
          background-color: var(--color-bg-note-card);
        }
      }
    }
  }

  .controls {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    justify-content: center;
    align-items: center;
    position: relative;

    .date-select {
      position: relative;
    }

    :deep(.ant-btn) {
      &.active {
        background: rgba(var(--color-primary-rgb), 0.1);
        border-color: var(--color-primary);
        color: var(--color-primary);

        .button-icon {
          color: var(--color-primary);
        }
      }
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
</style>
