<template>
  <div class="time-block-view">
    <!-- 顶部固定区域 -->
    <div class="sticky-header">
      <!-- 工具栏 -->
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>

      <!-- 头部内容区域 -->
      <div class="header-content">
        <div class="time-block-header">
          <!-- 左侧标题 -->
          <div class="time-block-header-left">
            <div class="icon">
              <TimeIcon theme="outline" fill="var(--color-primary)" :strokeWidth="3" />
            </div>
            <div class="name">时光记</div>
          </div>

          <!-- 中间日期导航 -->
          <div class="date-nav-wrapper">
            <div class="date-nav">
              <button class="nav-btn prev" @click="changeDate(-1)">
                <Left theme="outline" size="16" :strokeWidth="3" />
              </button>

              <div class="date-status-group">
                <span
                  class="current-date"
                  :class="{ 'is-not-today': !isToday }"
                  @click="backToToday"
                >
                  {{ format(currentDate, 'yyyy年MM月dd日 EEEE', { locale: zhCN }) }}
                </span>

                <div v-if="timeBlockStore.currentDay" class="status-selects">
                  <div class="emoji-select">
                    <div class="selected-emoji" @click="showWeatherSelect = !showWeatherSelect">
                      {{ currentWeatherEmoji }}
                    </div>
                    <div v-show="showWeatherSelect" class="select-dropdown">
                      <div
                        v-for="option in weatherOptions.filter((o) => o.value)"
                        :key="option.value"
                        class="select-option"
                        @click="selectWeather(option.value)"
                      >
                        {{ option.label }}
                      </div>
                    </div>
                  </div>

                  <div class="emoji-select">
                    <div class="selected-emoji" @click="showMoodSelect = !showMoodSelect">
                      {{ currentMoodEmoji }}
                    </div>
                    <div v-show="showMoodSelect" class="select-dropdown">
                      <div
                        v-for="option in moodOptions.filter((o) => o.value)"
                        :key="option.value"
                        class="select-option"
                        @click="selectMood(option.value)"
                      >
                        {{ option.label }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button class="nav-btn next" @click="changeDate(1)">
                <Right theme="outline" size="16" :strokeWidth="3" />
              </button>
            </div>
          </div>

          <!-- 添加右侧日期选择器 -->
          <div class="time-block-header-right">
            <div
              class="calendar-button"
              :class="{ 'date-selected': selectedDate }"
              @click="toggleDateFilter"
            >
              <div class="icon">
                <Calendar theme="outline" size="16" :strokeWidth="3" />
              </div>
              <span class="date-text">{{ selectedDate || '选择日期' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 时间块列表 -->
    <div class="time-blocks-container">
      <div class="time-blocks-wrapper">
        <div v-for="block in timeBlocks" :key="block.hour" class="time-block">
          <div class="time-label">{{ block.label }}</div>
          <div class="time-content" :class="{ editing: editingHour === block.hour }">
            <div class="time-block-content" :class="{ editing: editingHour === block.hour }">
              <template v-if="editingHour === block.hour">
                <div class="editor-wrapper">
                  <textarea
                    :ref="
                      (el) => {
                        if (el) textareaRefs[block.hour] = el as HTMLTextAreaElement
                      }
                    "
                    v-model="editingContent"
                    class="block-editor"
                    rows="1"
                    @input="(e: Event) => autoResizeTextarea(e)"
                    @blur="finishEdit"
                    @keydown.enter.prevent="handleEnter"
                    @keydown.esc="cancelEdit"
                  ></textarea>
                </div>
              </template>
              <template v-else>
                <div class="block-content" @click="startEdit(block.hour)">
                  <template v-if="timeBlockStore.currentDay?.blocks?.[block.hour]?.content">
                    <div>
                      <span
                        v-for="(line, index) in timeBlockStore.currentDay.blocks[
                          block.hour
                        ].content.split('\n')"
                        v-show="line.trim()"
                        :key="index"
                      >
                        {{ line }}
                      </span>
                    </div>
                  </template>
                  <template v-else>
                    <span class="placeholder">记录 {{ block.label }} 的事项...</span>
                  </template>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="timeBlockStore.isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span>加载中...</span>
    </div>

    <!-- 添加日历选择器组件 -->
    <CalendarPicker
      :noteDates="noteDates"
      :isVisible="uiStore.isCalendarPickerOpen"
      :selectedDate="selectedDate"
      triggerElementSelector=".calendar-button"
      @dateSelected="onDateSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import { useTimeBlockStore } from '../stores/timeBlockStore'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Time as TimeIcon, Left, Right, Calendar } from '@icon-park/vue-next'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import CalendarPicker from '@renderer/components/timelineView/CalendarPicker.vue'
import { useUIStore } from '@renderer/stores/useUIStore'
import { isToday as isDateToday } from 'date-fns'

const timeBlockStore = useTimeBlockStore()
const uiStore = useUIStore()
const currentDate = ref(new Date())
const selectedDate = ref<string | null>(null)
const noteDates = ref<string[]>([])

// 修改为计算属性，根据设置的时间范围生成时间块
const timeBlocks = computed(() => {
  const { startTime, endTime } = timeBlockStore.settings
  const blocks = []

  // 从设置的开始时间到结束时间生成时间块
  for (let i = startTime; i <= endTime; i++) {
    blocks.push({
      hour: i,
      label: `${String(i).padStart(2, '0')}:00`
    })
  }

  return blocks
})

// 修改天气选项，增加更多选择
const weatherOptions = [
  { value: '', label: '选择天气' },
  { value: 'sunny', label: '☀️ 晴朗' },
  { value: 'cloudy', label: '☁️ 多云' },
  { value: 'overcast', label: '🌥️ 阴天' },
  { value: 'foggy', label: '🌫️ 雾天' },
  { value: 'light_rain', label: '🌦️ 小雨' },
  { value: 'moderate_rain', label: '🌧️ 中雨' },
  { value: 'heavy_rain', label: '⛈️ 大雨' },
  { value: 'thunderstorm', label: '🌩️ 雷雨' },
  { value: 'light_snow', label: '🌨️ 小雪' },
  { value: 'moderate_snow', label: '❄️ 中雪' },
  { value: 'heavy_snow', label: '🌨️ 大雪' },
  { value: 'windy', label: '🌪️ 大风' },
  { value: 'haze', label: '😷 雾霾' }
]

// 修改心情选项，增加更多选择
const moodOptions = [
  { value: '', label: '选择心情' },
  { value: 'happy', label: '😊 开心' },
  { value: 'excited', label: '🤗 兴奋' },
  { value: 'peaceful', label: '😌 平静' },
  { value: 'satisfied', label: '😏 满意' },
  { value: 'neutral', label: '😐 一般' },
  { value: 'tired', label: '😪 疲惫' },
  { value: 'anxious', label: '😰 焦虑' },
  { value: 'frustrated', label: '😤 烦躁' },
  { value: 'sad', label: '😢 难过' },
  { value: 'angry', label: '😠 生气' },
  { value: 'sick', label: '🤒 不适' },
  { value: 'motivated', label: '💪 干劲' },
  { value: 'creative', label: '🎨 灵感' },
  { value: 'focused', label: '🎯 专注' }
]

// 加载当天数据
async function loadCurrentDayData() {
  const dateStr = format(currentDate.value, 'yyyy-MM-dd')
  await timeBlockStore.loadTimeBlockDay(dateStr)
}

// 切换日期
function changeDate(days: number) {
  currentDate.value = new Date(currentDate.value.setDate(currentDate.value.getDate() + days))
  loadCurrentDayData()
}

const editingHour = ref<number | null>(null)
const editingContent = ref('')
const textareaRefs = ref<{ [key: number]: HTMLTextAreaElement }>({})

// 创建一个新的工具函数来处理高度调整
function adjustTextareaHeight(textarea: HTMLTextAreaElement) {
  // 临时设置一个很大的高度，确保能获取到完整的 scrollHeight
  textarea.style.height = 'auto'
  textarea.style.minHeight = '24px'
  // 设置实际需要的高度
  textarea.style.height = `${Math.max(textarea.scrollHeight, 24)}px`
}

// 保持原有的事件处理函数
function autoResizeTextarea(e: Event) {
  const textarea = e.target as HTMLTextAreaElement
  adjustTextareaHeight(textarea)
}

// 开始编辑
async function startEdit(hour: number) {
  const content = timeBlockStore.currentDay?.blocks?.[hour]?.content || ''
  editingContent.value = content || ''
  editingHour.value = hour

  await nextTick()
  requestAnimationFrame(() => {
    const textarea = textareaRefs.value[hour]
    if (textarea) {
      textarea.focus()
      textarea.selectionStart = textarea.value.length
      textarea.selectionEnd = textarea.value.length
      adjustTextareaHeight(textarea)
    }
  })
}

// 处理回车事件
function handleEnter(e: KeyboardEvent) {
  const textarea = e.target as HTMLTextAreaElement
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value

  // 只插入换行符
  const newValue = value.slice(0, start) + '\n' + value.slice(end)
  editingContent.value = newValue

  nextTick(() => {
    if (textarea) {
      const newPosition = start + 1 // 只跳过换行符
      textarea.selectionStart = newPosition
      textarea.selectionEnd = newPosition
      adjustTextareaHeight(textarea)
    }
  })
}

// 完成编辑
async function finishEdit() {
  if (editingHour.value !== null) {
    const content = editingContent.value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n')

    if (content) {
      try {
        await timeBlockStore.updateTimeBlock(editingHour.value, content)
      } catch (error) {
        console.error('更新时间块失败:', error)
      }
    } else {
      await timeBlockStore.updateTimeBlock(editingHour.value, '')
    }
  }
  editingHour.value = null
  editingContent.value = ''
}

// 取消编辑
function cancelEdit() {
  editingHour.value = null
  editingContent.value = ''
}

// 在组件挂载时获取设置
onMounted(async () => {
  await timeBlockStore.fetchSettings()
  await loadCurrentDayData()
})

const showWeatherSelect = ref(false)
const showMoodSelect = ref(false)

// 添加选择处理函数
function selectWeather(value: string) {
  timeBlockStore.updateDayStatus({ weather: value || undefined })
  showWeatherSelect.value = false
}

function selectMood(value: string) {
  timeBlockStore.updateDayStatus({ mood: value || undefined })
  showMoodSelect.value = false
}

// 添加点击外部关闭下拉菜单
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.emoji-select')) {
      showWeatherSelect.value = false
      showMoodSelect.value = false
    }
  })
})

// 添加日期选择相关函数
const toggleDateFilter = () => {
  if (selectedDate.value) {
    selectedDate.value = null
    currentDate.value = new Date()
    loadCurrentDayData()
  } else {
    uiStore.toggleCalendarPicker()
  }
}

const onDateSelected = (date: string | null) => {
  selectedDate.value = date
  if (date) {
    currentDate.value = new Date(date)
    loadCurrentDayData()
  }
}

// 添加计算属性判断是否为今天
const isToday = computed(() => {
  return isDateToday(currentDate.value)
})

// 添加回到今天的方法
const backToToday = () => {
  if (!isToday.value) {
    currentDate.value = new Date()
    loadCurrentDayData()
  }
}

// 添加计算属性
const currentWeatherEmoji = computed(() => {
  if (!timeBlockStore.currentDay?.weather) return timeBlockStore.defaultWeather
  return weatherOptions
    .find((o) => o.value === timeBlockStore.currentDay?.weather)
    ?.label.split(' ')[0]
})

const currentMoodEmoji = computed(() => {
  if (!timeBlockStore.currentDay?.mood) return timeBlockStore.defaultMood
  return moodOptions.find((o) => o.value === timeBlockStore.currentDay?.mood)?.label.split(' ')[0]
})
</script>

<style lang="scss" scoped>
.time-block-view {
  background-color: var(--color-bg-primary);
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 500;
  background-color: var(--color-bg-primary);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;

  .header-content {
    width: 100%;
    padding: 0 20px;
    box-sizing: border-box;

    .time-block-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 8px 0;
      border-bottom: 1px solid var(--color-border);

      &-left {
        position: relative;
        display: flex;
        align-items: center;
        border: none;
        background: none;
        border-radius: 6px;
        padding: 4px 0px;
        margin: 2px;

        .icon {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          padding: 0;
          border-radius: 8px;
          background-color: var(--color-menu-bg);
          border: 1px solid var(--color-primary);

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

        .name {
          flex-grow: 0;
          text-align: left;
          color: var(--default-text-color);
          font-size: 20px;
          font-weight: 600;
          margin-left: 8px;
          white-space: nowrap;
          user-select: none;
          line-height: 1;
        }
      }

      .date-nav-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
        padding: 0 20px;

        .date-nav {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          // padding: 8px 0;

          .current-date {
            font-size: 15px;
            font-weight: 500;
            color: var(--color-text-2);
            min-width: 200px;
            text-align: center;
            display: inline-flex;
            margin-right: -8px;
            cursor: pointer;
            transition: all 0.2s ease;
            padding: 4px 8px;
            border-radius: 6px;
            user-select: none;

            &.is-not-today {
              &:hover {
                color: var(--color-primary);
                background: var(--color-hover-bg);
              }
            }
          }

          .status-selects {
            display: inline-flex;
            align-items: center;
            gap: 2px;
            margin-left: 0;
            padding-left: 4px;
          }

          .emoji-select {
            position: relative;

            .selected-emoji {
              font-size: 18px;
              width: 28px;
              height: 28px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: transform 0.2s;

              &:hover {
                transform: scale(1.1);
              }
            }

            .select-dropdown {
              position: absolute;
              top: calc(100% + 4px);
              left: 50%;
              transform: translateX(-50%);
              background: var(--color-dropdown-bg);
              border: 1px solid var(--color-border);
              border-radius: 8px;
              padding: 4px;
              min-width: 120px;
              box-shadow: var(--shadow-card);
              z-index: 1000;

              .select-option {
                padding: 8px 12px;
                cursor: pointer;
                white-space: nowrap;
                border-radius: 4px;
                transition: all 0.2s;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--color-text-primary);

                &:hover {
                  background: var(--color-hover-bg);
                }
              }
            }
          }

          // 导航按钮样式
          .nav-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            padding: 0;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            background: var(--color-bg-secondary);
            color: var(--color-text-2);
            cursor: pointer;
            transition: all 0.2s;
            opacity: 0;
            pointer-events: none;

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
          }

          &:hover {
            .nav-btn {
              opacity: 1;
              pointer-events: auto;
              transform: translateX(0);
            }
          }
        }
      }

      &-right {
        display: flex;
        align-items: center;
        gap: 5px;

        .calendar-button {
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px 6px 9px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;

          .date-text {
            font-size: 13px;
            color: var(--color-text-secondary);
            font-weight: 500;
            line-height: 1;
          }

          .icon {
            background: none;
            border: none;
            cursor: pointer;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            padding: 0;
            color: var(--color-text-secondary);

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
          }

          &.date-selected {
            background: rgba(var(--color-primary-rgb), 0.1);
            border-color: var(--color-primary);

            .date-text,
            .icon {
              color: var(--color-primary);
            }
          }

          &:hover {
            background: var(--color-hover-button);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }

          &:active {
            transform: translateY(0);
          }
        }
      }
    }

    .status-bar {
      display: none;
    }
  }
}

.time-blocks-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 40px 40px 0px;

  .time-blocks-wrapper {
    max-width: 900px;
    margin: 0 auto;
    padding-top: 16px;
    position: relative;

    // 调整时间线位置
    &::before {
      content: '';
      position: absolute;
      left: 70px; // 向右移动
      top: 0;
      bottom: 0;
      width: 1px;
      border-left: 1.5px dashed var(--color-border);
    }
  }
}

.time-block {
  position: relative;
  margin-bottom: 10px;
  transform: translateZ(0);
  will-change: transform;
  padding-left: 90px; // 增加左侧padding

  // 调整时间标签位置
  .time-label {
    position: absolute;
    left: 0;
    color: var(--color-text-secondary);
    font-weight: 500;
    font-size: 13px;
    padding-top: 14px;
    width: 60px; // 增加宽度
    text-align: right;
  }

  // 调整时间点位置
  &::before {
    content: '';
    position: absolute;
    left: 66.5px; // 对应时间线位置
    top: 20px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-bg-primary);
    border: 1.5px solid var(--color-primary);
    z-index: 1;
    transition: all 0.2s ease;
    box-shadow: 0 0 0 4px rgba(var(--color-primary-rgb), 0.1);
  }

  &:hover {
    &::before {
      transform: scale(1.2);
      border-color: var(--color-primary);
      box-shadow: 0 0 0 4px rgba(var(--color-primary-rgb), 0.15);
    }

    .time-content {
      transform: translateY(-2px);
      border-color: var(--color-primary);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
  }
}

.time-content {
  flex: 1;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  transition: all 0.2s;

  &.editing {
    border-color: var(--color-primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

.time-block-content {
  position: relative;
  min-height: 24px;
  border-radius: 8px;
  background: var(--color-bg-2);
  transition: all 0.2s;

  &.editing {
    background: var(--color-bg-1);

    .editor-wrapper {
      position: relative;
      display: flex;

      .block-editor {
        width: 100%;
        min-height: 24px;
        padding: 8px 12px;
        background: transparent;
        resize: none;
        font-family: inherit;
        font-size: inherit;
        line-height: 1.6;
        color: var(--color-text-1);
        white-space: pre-wrap;
        overflow-y: hidden;
        box-sizing: border-box;
        outline: none;
        border: none;
      }
    }
  }

  .block-content {
    white-space: pre-wrap;
    line-height: 1.6;
    padding: 8px 12px;
    min-height: 24px;
    cursor: text;

    > div {
      span {
        display: block;
        line-height: 1.6;
      }
    }

    .placeholder {
      color: var(--color-text-3);
      font-size: 13px;
      opacity: 0.4;
      font-weight: 400;
      user-select: none;
      transition: opacity 0.2s ease;
    }

    &:hover {
      background: var(--color-fill-2);

      .placeholder {
        opacity: 0.6;
      }
    }
  }

  &:hover {
    cursor: text;
  }
}

.empty-block {
  display: none;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--color-bg-primary-rgb), 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 1000;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// 添加动画以支持多行小圆点
@keyframes dots {
  from {
    clip-path: inset(0 0 0 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}

// 添加日历按钮样式
.calendar-button {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px 6px 9px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  .date-text {
    font-size: 13px;
    color: var(--color-text-secondary);
    font-weight: 500;
    line-height: 1;
  }

  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;
    color: var(--color-text-secondary);

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
  }

  &.date-selected {
    background: rgba(var(--color-primary-rgb), 0.1);
    border-color: var(--color-primary);

    .date-text,
    .icon {
      color: var(--color-primary);
    }
  }

  &:hover {
    background: var(--color-hover-button);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  &:active {
    transform: translateY(0);
  }
}
</style>
