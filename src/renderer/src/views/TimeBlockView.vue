<template>
  <div class="time-block-view" :class="{ 'compare-mode': timeBlockStore.compareMode }">
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

          <!-- 修改日期导航，添加对比模式切换 -->
          <div class="date-nav-wrapper">
            <div class="date-nav">
              <button class="nav-btn prev" @click="changeDate(-1)">
                <Left theme="outline" size="16" :strokeWidth="3" />
              </button>

              <div class="date-status-group">
                <span
                  class="current-date"
                  :class="{ 'is-not-today': !isToday }"
                  @click="handleDateClick"
                >
                  <span class="date-text">{{
                    format(currentDate, 'yyyy年MM月dd日 EEEE', { locale: zhCN })
                  }}</span>
                  <span class="week-number">W{{ weekNumber }}</span>
                </span>

                <div v-if="timeBlockStore.currentDay" class="status-selects">
                  <div class="emoji-select">
                    <div
                      ref="weatherBtnRef"
                      class="selected-emoji"
                      @click.stop="toggleWeatherSelect"
                    >
                      {{ currentWeatherEmoji }}
                    </div>
                    <Teleport to="body">
                      <Transition name="fade-zoom">
                        <div
                          v-if="showWeatherSelect"
                          ref="weatherMenuRef"
                          class="select-dropdown"
                          :style="{
                            position: weatherStrategy,
                            top: `${weatherY ?? 0}px`,
                            left: `${weatherX ?? 0}px`
                          }"
                        >
                          <div
                            v-for="option in weatherOptions.filter((o) => o.value)"
                            :key="option.value"
                            class="select-option"
                            @click="selectWeather(option.value)"
                          >
                            <span class="emoji">{{ option.label }}</span>
                            <span class="text">{{ option.text }}</span>
                          </div>
                        </div>
                      </Transition>
                    </Teleport>
                  </div>

                  <div class="emoji-select">
                    <div ref="moodBtnRef" class="selected-emoji" @click.stop="toggleMoodSelect">
                      {{ currentMoodEmoji }}
                    </div>
                    <Teleport to="body">
                      <Transition name="fade-zoom">
                        <div
                          v-if="showMoodSelect"
                          ref="moodMenuRef"
                          class="select-dropdown"
                          :style="{
                            position: moodStrategy,
                            top: `${moodY ?? 0}px`,
                            left: `${moodX ?? 0}px`
                          }"
                        >
                          <div
                            v-for="option in moodOptions.filter((o) => o.value)"
                            :key="option.value"
                            class="select-option"
                            @click="selectMood(option.value)"
                          >
                            <span class="emoji">{{ option.label }}</span>
                            <span class="text">{{ option.text }}</span>
                          </div>
                        </div>
                      </Transition>
                    </Teleport>
                  </div>
                </div>
              </div>

              <button class="nav-btn next" @click="changeDate(1)">
                <Right theme="outline" size="16" :strokeWidth="3" />
              </button>
            </div>
          </div>

          <!-- 修改右侧日期选择器 -->
          <div class="time-block-header-right">
            <!-- 搜索按钮 -->
            <div class="tool-button" @click="showSearch">
              <div class="icon">
                <Search theme="outline" size="16" :strokeWidth="3" />
              </div>
              <span class="text">搜索</span>
            </div>
            <!-- 现有的日历按钮 -->
            <div
              class="calendar-button"
              :class="{ 'date-selected': selectedDate }"
              @click="toggleDateFilter"
            >
              <div class="icon">
                <Calendar theme="outline" size="16" :strokeWidth="3" />
              </div>
              <span class="date-text">{{ selectedDate || '日历' }}</span>
            </div>
            <!-- 月度日志按钮 -->
            <div class="tool-button" :class="{ active: showMonthlyLog }" @click="toggleMonthlyLog">
              <div class="icon">
                <Plan theme="outline" size="16" :strokeWidth="3" />
              </div>
              <span class="text">月志</span>
            </div>

            <!-- 未来日志按钮 -->
            <div class="tool-button" :class="{ active: showFutureLog }" @click="toggleFutureLog">
              <div class="icon">
                <MagicWand theme="outline" size="16" :strokeWidth="3" />
              </div>
              <span class="text">未来</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 添加月度日志视图 -->
      <template v-if="showMonthlyLog">
        <MonthlyLog />
      </template>

      <!-- 未来日志视图 -->
      <template v-else-if="showFutureLog">
        <FutureLog />
      </template>

      <!-- 对比模式下的三栏布局 -->
      <template v-else-if="timeBlockStore.compareMode">
        <div class="blocks-container">
          <div class="block-column">
            <BlockViewer
              :date="prevDate"
              :blocks="timeBlockStore.prevDay?.blocks ?? {}"
              :compare-mode="true"
            />
          </div>
          <div class="block-column">
            <BlockViewer
              :date="format(currentDate, 'yyyy-MM-dd')"
              :blocks="timeBlockStore.currentDay?.blocks ?? {}"
              :compare-mode="true"
            />
          </div>
          <div class="block-column">
            <BlockViewer
              :date="nextDate"
              :blocks="timeBlockStore.nextDay?.blocks ?? {}"
              :compare-mode="true"
            />
          </div>
        </div>
      </template>

      <!-- 普通模式下的时间块列表 -->
      <template v-else>
        <div class="time-blocks-container">
          <div class="time-blocks-wrapper">
            <div
              v-for="block in timeBlocks"
              :key="block.hour"
              class="time-block"
              :data-hour="block.hour"
            >
              <div class="time-label">{{ block.label }}</div>
              <div class="time-content" :class="{ editing: editingHour === block.hour }">
                <div class="time-block-content">
                  <BulletEditor
                    :content="getBlockContent(block.hour)"
                    :hour="block.hour"
                    :editable="editingHour === block.hour"
                    @update:content="(content) => handleContentUpdate(block.hour, content)"
                    @finish="handleFinishEdit"
                    @cancel="handleCancelEdit"
                    @click="startEdit(block.hour)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 添加日历选择器组件 -->
    <CalendarPicker
      :noteDates="noteDates"
      :isVisible="uiStore.isCalendarPickerOpen"
      :selectedDate="selectedDate"
      triggerElementSelector=".calendar-button"
      @dateSelected="onDateSelected"
    />

    <!-- 搜索弹窗 -->
    <Modal
      :modelValue="searchDialogVisible"
      @update:modelValue="updateModalState"
      @after-enter="focusInput"
    >
      <div class="search-container" :class="{ expanded: isExpanded }">
        <div class="search-input-container">
          <input
            ref="searchInput"
            v-model="searchQuery"
            class="search-input"
            placeholder="搜索时光记录..."
            @input="handleSearchInput"
            @keydown="handleKeyDown"
          />
        </div>

        <transition name="expand">
          <div v-if="isExpanded" class="search-results-container">
            <div ref="searchResultsContainer" class="search-results">
              <!-- 搜索结果部分 -->
              <div v-if="timeBlockStore.searchResults.length === 0" class="no-results">
                <div class="no-results-icon">
                  <FileSearch theme="outline" size="48" fill="#888" :strokeWidth="2" />
                </div>
                <h3>未找到结果</h3>
                <p>没有找到与"{{ searchQuery }}"相关的笔记</p>
                <div class="suggestions">
                  <h4>建议：</h4>
                  <ul>
                    <li>检查您的拼写</li>
                    <li>尝试使用不同的关键词</li>
                    <li>使用更通用的搜索词</li>
                  </ul>
                </div>
              </div>

              <!-- 搜索结果列表 -->
              <div v-else>
                <div
                  v-for="(result, index) in timeBlockStore.searchResults"
                  :key="result.id"
                  class="search-result-item"
                  :class="{ selected: index === selectedResultIndex }"
                  @click="navigateToResult(result)"
                  @mouseover="selectedResultIndex = index"
                >
                  <div class="result-date">
                    <div class="date-icon">
                      <Calendar theme="outline" size="14" :strokeWidth="3" />
                    </div>
                    {{ formatDate(result.date) }} {{ formatHour(result.hour) }}
                  </div>
                  <div class="result-preview">
                    <div class="result-preview-icon">
                      <div class="icon">
                        <ParagraphRectangle
                          theme="outline"
                          size="14"
                          fill="var(--color-text-secondary)"
                          :strokeWidth="3"
                        />
                      </div>
                    </div>
                    <div class="result-content" v-html="highlightContent(result.content)"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </transition>

        <!-- 操作提示 -->
        <div v-if="isExpanded" class="action-hints">
          <div class="hint-group">
            <div class="hint">
              <span class="key">↵</span>
              <span class="description">跳转到记录</span>
            </div>
            <div class="hint">
              <span class="key">ESC</span>
              <span class="description">关闭</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick, onUnmounted } from 'vue'
import { useTimeBlockStore } from '../stores/timeBlockStore'
import { format, getWeek } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  Time as TimeIcon,
  Left,
  Right,
  Calendar,
  MagicWand,
  Plan,
  Search,
  FileSearch,
  ParagraphRectangle
} from '@icon-park/vue-next'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import CalendarPicker from '@renderer/components/timelineView/CalendarPicker.vue'
import { useUIStore } from '@renderer/stores/UIStore'
import { isToday as isDateToday } from 'date-fns'
import BulletEditor from '@renderer/components/timeblock/BulletEditor.vue'
import BlockViewer from '@renderer/components/timeblock/BlockViewer.vue'
// import type { TimeBlock as TimeBlockData } from '../types/timeBlock'
import FutureLog from '../components/timeblock/FutureLog.vue'
import MonthlyLog from '../components/timeblock/MonthlyLog.vue'
import { useDebounceFn } from '@vueuse/core'
import Modal from '@renderer/components/common/Modal.vue'
import { useEventBus } from '@vueuse/core'
import { useRouter, useRoute } from 'vue-router'
import { parseISO } from 'date-fns'
import { useFloating } from '@floating-ui/vue'
import { flip, offset, shift } from '@floating-ui/dom'

// 重命名本地接口以避免冲突
interface TimeBlockHour {
  hour: number
  label: string
}

const timeBlockStore = useTimeBlockStore()
const uiStore = useUIStore()
const router = useRouter()
const route = useRoute()

// 添加 props 定义
const props = defineProps<{
  date?: string
}>()

// 修改 currentDate 的初始化逻辑
const currentDate = ref(props.date ? parseISO(props.date) : new Date())

// 监听路由参数变化
watch(
  () => route.params.date,
  async (newDate) => {
    if (newDate) {
      currentDate.value = parseISO(newDate as string)
    } else {
      // 如果没有日期参数，设置为今天
      currentDate.value = new Date()
    }
  }
)

const selectedDate = ref<string | null>(null)
const noteDates = ref<string[]>([])

// 修改计算属性的类型注解
const timeBlocks = computed<TimeBlockHour[]>(() => {
  const { startTime, endTime } = timeBlockStore.settings
  const blocks: TimeBlockHour[] = []

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
  { value: '', label: '🌤️', text: '选择天气' },
  { value: 'sunny', label: '☀️', text: '晴朗' },
  { value: 'cloudy', label: '☁️', text: '多云' },
  { value: 'overcast', label: '🌥️', text: '阴天' },
  { value: 'foggy', label: '🌫️', text: '雾天' },
  { value: 'light_rain', label: '🌦️', text: '小雨' },
  { value: 'moderate_rain', label: '🌧️', text: '中雨' },
  { value: 'heavy_rain', label: '⛈️', text: '大雨' },
  { value: 'thunderstorm', label: '🌩️', text: '雷雨' },
  { value: 'light_snow', label: '🌨️', text: '小雪' },
  { value: 'moderate_snow', label: '❄️', text: '中雪' },
  { value: 'heavy_snow', label: '🌨️', text: '大雪' },
  { value: 'windy', label: '🌪️', text: '大风' },
  { value: 'haze', label: '😷', text: '雾霾' }
]

// 修改心情选项，增加更多选择
const moodOptions = [
  { value: '', label: '😊', text: '选择心情' },
  { value: 'happy', label: '😄', text: '开心' },
  { value: 'excited', label: '🤩', text: '兴奋' },
  { value: 'peaceful', label: '😌', text: '平静' },
  { value: 'satisfied', label: '😊', text: '满意' },
  { value: 'normal', label: '😐', text: '一般' },
  { value: 'tired', label: '😫', text: '疲惫' },
  { value: 'sad', label: '😢', text: '难过' },
  { value: 'angry', label: '😠', text: '生气' },
  { value: 'anxious', label: '😰', text: '焦虑' }
]

const timeBlockTaskUpdatedBus = useEventBus<{ date: string; hour: number }>(
  'timeblock-task-updated'
)

timeBlockTaskUpdatedBus.on(async ({ date }) => {
  const currentDateStr = format(currentDate.value, 'yyyy-MM-dd')
  if (date === currentDateStr) {
    await loadCurrentDayData()
  }
})

// 监听日期变化
watch(
  () => currentDate.value,
  async (newDate) => {
    // console.log('Date changed to:', format(newDate, 'yyyy-MM-dd'))
    // 切换日期时，先清除编辑状态
    editingHour.value = null

    // 清除缓存中的旧数据，确保获取最新数据
    const dateStr = format(newDate, 'yyyy-MM-dd')
    timeBlockStore.cache.delete(dateStr)

    // 重新加载数据
    await loadCurrentDayData()

    // 如果在对比模式下，也需要重新加载对比数据
    if (timeBlockStore.compareMode) {
      await timeBlockStore.loadCompareData(dateStr)
    }
  }
)
// 处理从任务列表跳转
watch(
  () => timeBlockStore.targetDate,
  async (newDate) => {
    if (newDate) {
      currentDate.value = new Date(newDate)
      timeBlockStore.targetDate = null
    }
  },
  { immediate: true }
)

// 加载当天数据
async function loadCurrentDayData() {
  const dateStr = format(currentDate.value, 'yyyy-MM-dd')
  // console.log('正在加载日期:', dateStr)
  await timeBlockStore.loadTimeBlockDay(dateStr)
  // console.log('加载完成的数据:', timeBlockStore.currentDay)
}

// 切换日期
async function changeDate(days: number) {
  const newDate = new Date(currentDate.value)
  newDate.setDate(newDate.getDate() + days)

  // 更新路由
  await router.push({
    name: 'timeBlock',
    params: {
      date: format(newDate, 'yyyy-MM-dd')
    }
  })
}

const editingHour = ref<number | null>(null)

// 开始编辑
const startEdit = (hour: number) => {
  // 如果已在编辑其他时间块，先取消编辑
  if (editingHour.value !== null && editingHour.value !== hour) {
    handleFinishEdit()
  }
  editingHour.value = hour
}

// 处理内容更新
const handleContentUpdate = async (hour: number, content: string) => {
  try {
    const dateStr = format(currentDate.value, 'yyyy-MM-dd')
    await timeBlockStore.updateTimeBlock(dateStr, hour, content)
  } catch (error) {
    console.error('更新内容失败:', error)
  }
}

// 处理完成编辑
const handleFinishEdit = () => {
  editingHour.value = null
}

// 处理取消编辑
const handleCancelEdit = () => {
  editingHour.value = null
}

// 在组件载时获取设置
onMounted(async () => {
  try {
    // 先获取设置
    await timeBlockStore.fetchSettings()

    // 根据路由参数或目标日期初始化
    if (props.date) {
      currentDate.value = parseISO(props.date)
    } else if (timeBlockStore.targetDate) {
      currentDate.value = new Date(timeBlockStore.targetDate)
      timeBlockStore.targetDate = null
    } else {
      currentDate.value = new Date()
    }

    // 加载数据
    await loadCurrentDayData()
  } catch (error) {
    console.error('初始化时间块视图失败:', error)
  }
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

// 天气选择器相关
const weatherBtnRef = ref<HTMLElement | null>(null)
const weatherMenuRef = ref<HTMLElement | null>(null)
const toggleWeatherSelect = () => {
  showWeatherSelect.value = !showWeatherSelect.value
  showMoodSelect.value = false
}

const {
  x: weatherX,
  y: weatherY,
  strategy: weatherStrategy
} = useFloating(weatherBtnRef, weatherMenuRef, {
  placement: 'bottom-start',
  middleware: [offset(4), flip(), shift()]
})

// 心情选择器相关
const moodBtnRef = ref<HTMLElement | null>(null)
const moodMenuRef = ref<HTMLElement | null>(null)
const toggleMoodSelect = () => {
  showMoodSelect.value = !showMoodSelect.value
  showWeatherSelect.value = false
}

const {
  x: moodX,
  y: moodY,
  strategy: moodStrategy
} = useFloating(moodBtnRef, moodMenuRef, {
  placement: 'bottom-start',
  middleware: [offset(4), flip(), shift()]
})

// 处理点击外部关闭下拉菜单
const handleDocumentClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.emoji-select')) {
    showWeatherSelect.value = false
    showMoodSelect.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})

// 添加日期选择相关函数
const toggleDateFilter = () => {
  if (selectedDate.value) {
    selectedDate.value = null
    router.push({
      name: 'timeBlock'
    })
  } else {
    uiStore.toggleCalendarPicker()
  }
}

const onDateSelected = async (date: string | null) => {
  if (date) {
    // 更新选中日期
    selectedDate.value = date
    // 跳转到选中日期
    await router.push({
      name: 'timeBlock',
      params: {
        date
      }
    })
  } else {
    // 清除选中日期
    selectedDate.value = null
    // 如果没有选择日期，跳转到今天
    await router.push({
      name: 'timeBlock'
    })
  }
  // 关闭日历选择器
  // uiStore.isCalendarPickerOpen = false
}

// 监听路由参数变化，同步更新选中日期
watch(
  () => route.params.date,
  (newDate) => {
    selectedDate.value = (newDate as string) || null
  },
  { immediate: true }
)

// 添加计算属性判断是否为今天
const isToday = computed(() => {
  return isDateToday(currentDate.value)
})

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

// 处理点击其他区域
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    // 如果点击的不是时间块内容区域，取消编辑
    if (!target.closest('.time-block-content') && editingHour.value !== null) {
      handleFinishEdit()
    }
  })
})

// 添加一个计算属性来获取时间块内容
const getBlockContent = (hour: number) => {
  if (!timeBlockStore.currentDay?.blocks) {
    return ''
  }
  const content = timeBlockStore.currentDay.blocks[hour]?.content ?? ''
  // console.log(`Getting content for hour ${hour}:`, content)
  return content
}

// 添加前一天日期的计算属性
const prevDate = computed(() => {
  const date = new Date(currentDate.value)
  date.setDate(date.getDate() - 1)
  return format(date, 'yyyy-MM-dd')
})

// 添加后一天日期的计算属性
const nextDate = computed(() => {
  const date = new Date(currentDate.value)
  date.setDate(date.getDate() + 1)
  return format(date, 'yyyy-MM-dd')
})

// 修改日期点击处理
const handleDateClick = async () => {
  if (!isToday.value) {
    // 跳转到今天
    await router.push({
      name: 'timeBlock'
    })
  } else {
    await timeBlockStore.toggleCompareMode()
    if (timeBlockStore.compareMode) {
      uiStore.setIsSidebarCollapsed(true)
      await timeBlockStore.loadCompareData(format(currentDate.value, 'yyyy-MM-dd'))
    } else {
      uiStore.setIsSidebarCollapsed(false)
    }
  }
}

// 监听对比模式变化
watch(
  () => timeBlockStore.compareMode,
  async (newMode) => {
    if (newMode) {
      const dateStr = format(currentDate.value, 'yyyy-MM-dd')
      console.log('Entering compare mode, loading data for date:', dateStr)
      // 进入对比模式时关闭侧边栏
      uiStore.setIsSidebarCollapsed(true)
      await timeBlockStore.loadCompareData(dateStr)
      console.log('Compare data loaded:', {
        prev: timeBlockStore.prevDay?.blocks,
        current: timeBlockStore.currentDay?.blocks,
        next: timeBlockStore.nextDay?.blocks
      })
    } else {
      // 退出对比模式时恢复侧边栏
      uiStore.setIsSidebarCollapsed(false)
    }
  }
)

// 添加未来日志状态
const showFutureLog = ref(false)

// 切换未来日志显示
const toggleFutureLog = () => {
  showFutureLog.value = !showFutureLog.value
  if (showFutureLog.value) {
    showMonthlyLog.value = false
  }
}

// 添加月度日志状态
const showMonthlyLog = ref(false)

// 添加切换月度日志的函数
const toggleMonthlyLog = () => {
  showMonthlyLog.value = !showMonthlyLog.value
  if (showMonthlyLog.value) {
    showFutureLog.value = false
  }
}

// 添加一个计算属性来获取周数
const weekNumber = computed(() => {
  return getWeek(currentDate.value, { locale: zhCN })
})

const searchDialogVisible = ref(false)
const searchQuery = ref('')
const isExpanded = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
const searchResultsContainer = ref<HTMLDivElement | null>(null)

// 添加选中结果的索引
const selectedResultIndex = ref(-1)

// 添加滚动选中项到视图的函数
const scrollSelectedIntoView = () => {
  nextTick(() => {
    const selectedElement = document.querySelector('.search-result-item.selected')
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  })
}

// 修改键盘事件处理函数
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeSearch()
  } else if (event.key === 'Enter' && timeBlockStore.searchResults.length > 0) {
    // 如果有选中的结果,则导航到选中的结果
    if (selectedResultIndex.value >= 0) {
      navigateToResult(timeBlockStore.searchResults[selectedResultIndex.value])
    } else {
      // 否则导航到第一个结果
      navigateToResult(timeBlockStore.searchResults[0])
    }
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (selectedResultIndex.value < timeBlockStore.searchResults.length - 1) {
      selectedResultIndex.value++
      scrollSelectedIntoView()
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (selectedResultIndex.value > 0) {
      selectedResultIndex.value--
      scrollSelectedIntoView()
    }
  }
}

// 修改搜索结果项的点击处理
const navigateToResult = async (result: { date: string; hour: number }) => {
  selectedResultIndex.value = -1 // 重置选中索引
  searchDialogVisible.value = false
  isExpanded.value = false

  // 更新路由和日期
  await router.push({
    name: 'timeBlock',
    params: {
      date: result.date
    }
  })

  // 等待路由更新后滚动到指定时间
  nextTick(() => {
    scrollToHour(result.hour)
  })
}

// 更新模态框状态
const updateModalState = (value: boolean) => {
  searchDialogVisible.value = value
  if (!value) {
    closeSearch()
  }
}

// 聚焦搜索输入框
const focusInput = () => {
  searchInput.value?.focus()
}

// 处理搜索输入
const handleSearchInput = useDebounceFn(async (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  if (value.trim()) {
    isExpanded.value = true
    await timeBlockStore.searchTimeBlocks(value)
  } else {
    isExpanded.value = false
    timeBlockStore.searchResults = []
  }
}, 300)

// 跳转到搜索结果
// 滚动到指定时间块
const scrollToHour = (hour: number) => {
  nextTick(() => {
    // 使用 data-hour 属性来定位时间块
    const timeBlock = document.querySelector(`.time-block[data-hour="${hour}"]`)
    if (timeBlock) {
      timeBlock.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

// 显示搜索弹窗
const showSearch = () => {
  searchDialogVisible.value = true
  searchQuery.value = ''
  isExpanded.value = false
  timeBlockStore.searchResults = []
}

// 关闭搜索弹窗
const closeSearch = () => {
  searchDialogVisible.value = false
  searchQuery.value = ''
  isExpanded.value = false
  timeBlockStore.searchResults = []
}

// 格式化日期
const formatDate = (date: string) => {
  return format(new Date(date), 'yyyy年MM月dd日 EEEE', { locale: zhCN })
}

// 格式化小时
const formatHour = (hour: number) => {
  return `${hour.toString().padStart(2, '0')}:00`
}

// 高亮搜索关键词
const highlightContent = (content: string) => {
  if (!searchQuery.value) return content
  const regex = new RegExp(searchQuery.value, 'gi')
  return content.replace(regex, (match) => `<mark>${match}</mark>`)
}
</script>

<style lang="scss" scoped>
.time-block-header-left {
  .name {
    color: var(--color-text-primary) !important;
  }
}
.time-block-view {
  background-color: var(--color-bg-primary);
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .sticky-header {
    position: sticky;
    top: 0;
    z-index: 500;
    background-color: var(--color-bg-primary);
    width: 100%;
    flex-shrink: 0;
  }

  .main-content {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 16px;
    position: relative;

    // 修改未来日志容器的样式
    > :deep(.future-log) {
      height: 100%;

      .future-log-container {
        height: 100%;
        display: flex;

        .future-log-editor {
          flex: 1;
          min-height: 0;
          overflow: auto;
        }
      }
    }
  }

  &.compare-mode {
    .blocks-container {
      display: flex;
      gap: 16px;
      height: 100%;
      overflow: hidden;

      .block-column {
        flex: 1;
        min-width: 0;
        overflow: auto;
        background: var(--color-bg-secondary);
        border-radius: 8px;
        box-shadow: var(--shadow-card);
      }
    }
  }
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
      padding-bottom: 8px;
      border-bottom: 1px solid var(--color-border);

      &-left {
        width: 100px;
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
          background-color: var(--color-primary-light);
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
          color: var(---color-text-primary);
          font-size: 20px;
          font-weight: 600;
          margin-left: 8px;
          white-space: nowrap;
          user-select: none;
          line-height: 1;
        }
      }

      .date-nav-wrapper {
        flex: 0 1 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;

        .date-nav {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;

          .current-date {
            font-size: 15px;
            font-weight: 500;
            color: var(--color-text-primary);
            min-width: 180px;
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
            color: var(--color-text-secondary);
            cursor: pointer;
            transition: all 0.2s;
            opacity: 0;
            pointer-events: none;
            background: var(--color-bg-secondary);

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
        width: 350px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;

        .tool-button {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 6px 12px 6px 9px;
          min-width: 75px;
          // background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
          height: 36px;

          .text {
            font-size: 13px;
            color: var(--color-text-secondary);
            font-weight: 500;
            line-height: 1;
            white-space: nowrap;
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

          &.active {
            background: rgba(var(--color-primary-rgb), 0.1);
            border-color: var(--color-primary);

            .text,
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

        .calendar-button {
          position: relative;
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 6px 12px 6px 9px;
          min-width: 75px;
          // background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
          height: 36px;

          &.date-selected {
            min-width: 130px;
            width: auto;
            padding-right: 16px;

            .date-text {
              max-width: 100px;
            }
          }

          .date-text {
            font-size: 13px;
            color: var(--color-text-secondary);
            font-weight: 500;
            line-height: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
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
  height: 100%;
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
      left: 70px;
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
  padding-left: 90px;

  .time-label {
    position: absolute;
    left: 0;
    color: var(--color-text-secondary);
    font-weight: 500;
    font-size: 13px;
    padding-top: 14px;
    width: 60px;
    text-align: right;
  }

  .time-content {
    flex: 1;
    background: var(--color-bg-note-card);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 12px;
    transition: all 0.2s;
    min-height: 48px;

    &.editing {
      border-color: var(--color-primary);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
  }

  .time-block-content {
    position: relative;
    min-height: 24px;
    border-radius: 8px;
    background: var(--color-bg-note-card);
    transition: all 0.2s;

    .block-content {
      white-space: pre-wrap;
      line-height: 1.6;
      padding: 8px 12px;
      min-height: 24px;
      cursor: text;

      > div {
        // 普通文本
        > div:first-child {
          white-space: pre-wrap;
          line-height: 1.6;
          margin-bottom: 8px;
        }

        // 子弹笔记项
        .bullet-item {
          margin: 4px 0;
          padding-left: 20px;
          position: relative;
          line-height: 1.6;

          &::before {
            position: absolute;
            left: 0;
          }

          &.task::before {
            content: '•';
          }

          &.event::before {
            content: '○';
          }

          &.note::before {
            content: '-';
          }
        }
      }

      .placeholder {
        color: var(--color-text-3);
        opacity: 0.4;
        font-size: 13px;
        user-select: none;
      }
    }
  }

  // 添加时间点样式
  &::before {
    content: '';
    position: absolute;
    left: 66.5px;
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

.empty-block {
  display: none;
}

.editor-wrapper {
  width: 100%;

  textarea {
    width: 100%;
    min-height: 100px;
    padding: 8px 12px;
    background: transparent;
    resize: vertical;
    font-family: inherit;
    font-size: inherit;
    line-height: 1.6;
    color: var(--color-text-1);
    border: none;
    outline: none;

    &::placeholder {
      color: var(--color-text-3);
      opacity: 0.4;
    }

    &:focus {
      &::placeholder {
        opacity: 0.6;
      }
    }
  }
}

// 添加子弹笔记项样式
.bullet-item {
  margin: 4px 0;
  padding-left: 20px;
  position: relative;

  &::before {
    position: absolute;
    left: 0;
  }

  &.task::before {
    content: '•';
  }

  &.event::before {
    content: '○';
  }

  &.note::before {
    content: '-';
  }
}

.block-content {
  .text-content {
    white-space: pre-wrap;
    line-height: 1.6;
    margin-bottom: 8px;
  }

  .bullet-item {
    margin: 4px 0;
    padding-left: 20px;
    position: relative;
    line-height: 1.6;

    &::before {
      position: absolute;
      left: 0;
    }

    &.task::before {
      content: '•';
    }

    &.event::before {
      content: '○';
    }

    &.note::before {
      content: '-';
    }
  }
}

.loading-placeholder {
  padding: 8px 12px;
  color: var(--color-text-3);
  font-size: 13px;
}

.current-date {
  display: flex;
  align-items: center;
  gap: 6px;

  .date-text {
    flex: 1;
  }

  .week-number {
    font-size: 13px;
    color: inherit;
    font-weight: normal;
  }
}

.search-container {
  will-change: transform, opacity;
  width: 640px;
  max-width: 90vw;
  background: var(--color-bg-primary);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 64px;
  transition:
    height 0.3s ease,
    top 0.3s ease;
  overflow: hidden;
  position: absolute;
  top: calc(50% - 225px);
  left: 50%;
  transform: translateX(-50%);

  &.expanded {
    height: 490px;
  }
}

.search-input-container {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 20px 16px;
  font-size: 16px;
  border: none;
  outline: none;
  background-color: var(--color-bg-primary);
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.search-results-container {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
  padding: 10px 0px 20px 20px;
  border-top: var(--color-border) 1px solid;
  position: relative;
  height: calc(100% - 64px - 37px);
}

.search-results {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding-right: 20px;

  .search-result-item {
    padding: 6px 0px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    // border: 1px solid var(--color-border);
    margin-bottom: 8px;
    // background: var(--color-bg-secondary);

    &:hover {
      background: var(--color-bg-hover);
      // border-color: var(--color-primary);
      // transform: translateY(-1px);
      // box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .result-date {
      font-size: 13px;
      color: var(--color-text-secondary);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;

      .date-icon {
        display: flex;
        align-items: center;
        color: var(--color-text-3);
        :deep(.i-icon) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        :deep(svg) {
          width: 14px;
          height: 14px;
        }
      }
    }

    .result-preview {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      background: var(--color-bg-primary);
      padding: 12px;
      border-radius: 6px;
      border: 1px solid var(--color-border);

      .result-preview-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        flex-shrink: 0;

        .icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-secondary);
          :deep(.i-icon) {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
          }

          :deep(svg) {
            width: 14px;
            height: 14px;
          }
        }
      }

      .result-content {
        flex: 1;
        font-size: 14px;
        line-height: 1.6;
        color: var(--color-text-primary);
        word-break: break-word;

        :deep(mark) {
          background: rgba(var(--color-primary-rgb), 0.1);
          color: var(--color-primary);
          padding: 0 2px;
          border-radius: 2px;
          font-weight: 500;
        }
      }
    }

    &.selected {
      .result-preview {
        border-color: var(--color-primary);
      }
    }
  }
}

.result-preview {
  display: flex;
  align-items: flex-start;
  padding: 5px 0;
  font-size: 0.9em;
  line-height: 1.4;
}

.result-preview-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  color: #666;
  text-align: center;
  padding: 20px;
  position: absolute;
  top: 0;
  left: 0;
  // transform: translate(-50%, -50%);
  // margin-top: 25px;

  .no-results-icon {
    margin-bottom: 16px;
  }

  h3 {
    font-size: 18px;
    margin-bottom: 8px;
    font-weight: 500;
  }

  p {
    font-size: 14px;
    margin-bottom: 24px;
  }

  .suggestions {
    background-color: #f0f0f0;
    border-radius: 8px;
    padding: 16px;
    text-align: left;
    width: 100%;
    max-width: 300px;

    h4 {
      font-size: 14px;
      margin-bottom: 8px;
      font-weight: 500;
    }

    ul {
      list-style-type: none;
      padding-left: 0;

      li {
        font-size: 13px;
        margin-bottom: 4px;
        position: relative;
        padding-left: 20px;

        &:before {
          content: '•';
          position: absolute;
          left: 8px;
          color: #888;
        }
      }
    }
  }
}

.action-hints {
  display: flex;
  justify-content: flex-end;
  padding: 8px 20px;
  // background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  font-size: 12px;
  color: var(--color-text-secondary);

  .hint-group {
    display: flex;
    gap: 16px;
  }

  .hint {
    display: flex;
    align-items: center;
    gap: 4px;

    .key {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 4px;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      font-family: system-ui;
      font-size: 11px;
      font-weight: 500;
      color: var(--color-text-secondary);
    }

    .description {
      margin-left: 2px;
      user-select: none;
      color: var(--color-text-3);
    }
  }
}

.search-result-item {
  padding: 6px 0px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  // border: 1px solid var(--color-border);
  margin-bottom: 8px;
  // background: var(--color-bg-secondary);

  &:hover {
    background: var(--color-bg-hover);
    // border-color: var(--color-primary);
    // transform: translateY(-1px);
    // box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .result-date {
    font-size: 13px;
    color: var(--color-text-secondary);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;

    .date-icon {
      display: flex;
      align-items: center;
      color: var(--color-text-3);
      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }

      :deep(svg) {
        width: 14px;
        height: 14px;
      }
    }
  }

  .result-preview {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    background: var(--color-bg-primary);
    padding: 12px;
    border-radius: 6px;
    border: 1px solid var(--color-border);

    .result-preview-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      flex-shrink: 0;

      .icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-secondary);
        :deep(.i-icon) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        :deep(svg) {
          width: 14px;
          height: 14px;
        }
      }
    }

    .result-content {
      flex: 1;
      font-size: 14px;
      line-height: 1.6;
      color: var(--color-text-primary);
      word-break: break-word;

      :deep(mark) {
        background: rgba(var(--color-primary-rgb), 0.1);
        color: var(--color-primary);
        padding: 0 2px;
        border-radius: 2px;
        font-weight: 500;
      }
    }
  }

  &.selected {
    .result-preview {
      border-color: var(--color-primary);
    }
  }
}

// 添加过渡动画样式
.fade-zoom-enter-active,
.fade-zoom-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-zoom-enter-from,
.fade-zoom-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.fade-zoom-enter-to,
.fade-zoom-leave-from {
  opacity: 1;
  transform: scale(1);
}

// 修改下拉菜单样式
.select-dropdown {
  position: fixed;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 4px;
  min-width: 120px;
  box-shadow: var(--shadow-card);
  z-index: 9999;

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

    .emoji {
      font-size: 16px;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .text {
      flex: 1;
      font-size: 14px;
      line-height: 1;
    }

    &:hover {
      background: var(--color-hover-bg);
    }
  }
}
</style>
