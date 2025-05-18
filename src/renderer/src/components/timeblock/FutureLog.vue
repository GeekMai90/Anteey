<template>
  <div class="future-log">
    <div class="controls">
      <!-- 分屏模式按钮 -->
      <Button
        :icon="Schedule"
        :class="{ active: splitMode }"
        type="default"
        :height="36"
        @click="toggleSplitMode"
      >
        月度分配
      </Button>

      <!-- 年份选择器 -->
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

      <!-- 月份选择器 -->
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
import { Schedule } from '@icon-park/vue-next'
import Button from '@renderer/components/ui/buttons/Button.vue'

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

const yearSelectRef = ref<HTMLElement | null>(null)
const monthSelectRef = ref<HTMLElement | null>(null)

// 加载未来日志内容
const loadFutureLog = async () => {
  try {
    const log = await store.getFutureLog()
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
