<template>
  <div
    class="home-view"
    :style="{ backgroundImage: `url(${backgroundImage})` }"
    :class="{ 'background-loaded': isBackgroundLoaded }"
  >
    <!-- 背景模糊 -->
    <div class="blur-overlay"></div>
    <!-- 窗口拖拽区域 -->
    <div class="drag-area"></div>
    <!-- 日期时间 -->
    <div class="date-time-container">
      <div class="date">{{ currentDate }}</div>
      <div class="time">{{ currentTime }}</div>
    </div>
    <!-- 内容区域 -->
    <div class="content-wrapper">
      <div class="main-content">
        <h1>{{ greeting }}</h1>
        <div class="heatmap-container">
          <calendar-heatmap
            :values="heatmapData"
            :start-date="startDate"
            :end-date="endDate"
            :tooltip-formatter="tooltipFormatter"
            :no-data-text="'0 条笔记'"
            :range-color="[
              '#ebedf0', // 0值背景色
              '#e6f7f4', // 最浅
              '#b3ebe3', // 较浅
              '#00c8a8', // 中等（主题色）
              '#009c83', // 较深
              '#00705e' // 最深
            ]"
            :max="10"
            no-margin
          />
        </div>
        <div class="stats-container">
          <div class="stat-item">
            <div class="stat-value">{{ lastDayNoteCount }}</div>
            <div class="stat-label">昨日新增</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ cardCount }}</div>
            <div class="stat-label">卡片笔记</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ whiteboardCount }}</div>
            <div class="stat-label">思维板</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ dayCount }}</div>
            <div class="stat-label">天</div>
          </div>
        </div>
      </div>
      <!-- 弹性空间 -->
      <div class="spacer"></div>
      <!-- 每日卡片选择组件 -->
      <DailyCardPick class="daily-card-pick" />
      <!-- 更换背景按钮 -->
      <button class="change-background-btn" @click="changeBackground">更换背景</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watchEffect } from 'vue'
import { CalendarHeatmap, TooltipFormatter, CalendarItem } from 'vue3-calendar-heatmap'
import DailyCardPick from '../components/DailyCardPick.vue'
import { useWhiteboardStore } from '../stores/whiteboardStores'
import { useNoteStore } from '../stores/noteStores'

const whiteboardStore = useWhiteboardStore()
const noteStore = useNoteStore()

// 背景图片相关状态
const backgroundImage = ref('')
const isBackgroundLoaded = ref(false)

// 预加载图片的函数
const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })
}

// 导入所有背景图片
const backgroundImages = import.meta.glob('../assets/backgrounds/*.{jpg,jpeg,png,gif}', {
  eager: true,
  as: 'url'
})

// 获取背景图片数组
const backgroundImageArray = Object.values(backgroundImages)

// 获取今天的种子
const getTodaySeed = () => {
  const today = new Date()
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
}

// 根据日期选择背景
const getDailyBackground = () => {
  const seed = getTodaySeed()
  const index = seed % backgroundImageArray.length
  return backgroundImageArray[index]
}

// 随机选择背景图片（用于手动更换）
const getRandomBackground = () => {
  let randomIndex
  do {
    randomIndex = Math.floor(Math.random() * backgroundImageArray.length)
  } while (backgroundImageArray[randomIndex] === backgroundImage.value)
  return backgroundImageArray[randomIndex]
}

// 初始化背景
const initBackground = async () => {
  const lastSetDate = localStorage.getItem('lastSetDate')
  const savedBackground = localStorage.getItem('savedBackground')
  const today = getTodaySeed().toString()

  let selectedBackground: string
  if (lastSetDate === today && savedBackground) {
    selectedBackground = savedBackground
  } else {
    selectedBackground = getDailyBackground()
    localStorage.setItem('lastSetDate', today)
    localStorage.setItem('savedBackground', selectedBackground)
  }

  try {
    isBackgroundLoaded.value = false
    await preloadImage(selectedBackground)
    backgroundImage.value = selectedBackground
    isBackgroundLoaded.value = true
  } catch (error) {
    console.error('背景图片加载失败:', error)
    // 可以在这里设置一个默认背景
  }
}

// 更换背景
const changeBackground = async () => {
  const newBackground = getRandomBackground()
  try {
    isBackgroundLoaded.value = false
    await preloadImage(newBackground)
    backgroundImage.value = newBackground
    isBackgroundLoaded.value = true
    localStorage.setItem('savedBackground', newBackground)
  } catch (error) {
    console.error('更换背景失败:', error)
  }
}

// 在组件挂载时初始化背景
onMounted(() => {
  initBackground()
})

// 卡片笔记数量
const cardCount = ref(0)
watchEffect(async () => {
  cardCount.value = await noteStore.getNoteCount()
})

// 昨日笔记数量
const lastDayNoteCount = ref(0)
watchEffect(async () => {
  lastDayNoteCount.value = await noteStore.getLastDayNoteCount()
})

// 白板数量
const whiteboardCount = ref(0)
watchEffect(async () => {
  whiteboardCount.value = await whiteboardStore.getWhiteboardCount()
})

// 用户使用天数
const dayCount = ref(0)
watchEffect(async () => {
  dayCount.value = await noteStore.getUserUsageDays()
})

// 日期时间
const currentDate = ref('')
const currentTime = ref('')

// 问候语
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) {
    return '👋🏻 早上好！'
  } else if (hour >= 12 && hour < 18) {
    return '🌞 下午好！'
  } else {
    return '🌙 晚上好！'
  }
})

// 热力图数据
const endDate = new Date()
const startDate = new Date(endDate)
startDate.setFullYear(startDate.getFullYear() - 1)
const heatmapData = ref<{ date: string; count: number }[]>([])

onMounted(async () => {
  heatmapData.value = await noteStore.getHeatmapData()
})

// 热力图 tooltip 格式化
const tooltipFormatter: TooltipFormatter = (item: CalendarItem) => {
  if (item.date instanceof Date) {
    const date = item.date
    const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    return `${formattedDate}: ${item.count ?? 0} 条笔记`
  }
  return ''
}

// 更新日期时间
const updateDateTime = () => {
  const now = new Date()
  currentDate.value = now.toLocaleDateString('zh-CN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  updateDateTime()
  setInterval(updateDateTime, 1000)
})
</script>

<style scoped lang="scss">
.home-view {
  position: relative;
  background-size: cover;
  background-position: center;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: white;
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
  &.background-loaded {
    opacity: 1;
  }
}
.blur-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  backdrop-filter: blur(6px);
  background-color: rgba(255, 255, 255, 0.1);
}
.drag-area {
  height: 20px; /* 可以根据需要调整高度 */
  width: 100%;
  -webkit-app-region: drag; /* 使区域可拖拽 */
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
}
.content-wrapper {
  flex-grow: 1;
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  z-index: 1;
  padding: 0 20px; // 添加左右内边距
}

.date-time-container {
  position: absolute;
  top: 40px;
  left: 20px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.date {
  font-size: 16px;
  user-select: none;
}

.time {
  font-size: 38px;
  font-weight: bold;
  user-select: none;
}

.main-content {
  margin-top: 60px; // 设置固定的顶部距离
  flex-shrink: 0; // 防止内容被压缩
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  z-index: 1;
}
// 添加弹性空间
.spacer {
  flex-grow: 1;
  min-height: 20px; // 设置最小间距
}

h1 {
  font-size: 3rem;
  margin: 0 0 10px 0; // 调整标题边距
  user-select: none;
}

// 调整每日卡片选择组件
.daily-card-pick {
  flex-shrink: 0; // 防止被压缩
  margin-bottom: 40px; // 距离底部的距离
  align-self: center;
}

.heatmap-container {
  width: 100%;
  max-width: 800px;
  margin: 20px auto;
  padding: 0 20px; // 添加左右内边距
  z-index: 1;
  box-sizing: border-box;
  user-select: none;
}
:deep(.vch__container) {
  /* font-size: 10px; */
  transform: translateY(15px); /* 向下移动标签 */
  width: 100%;
}

/* 可能需要覆盖一些热力图的默认样式 */
:deep(.vch__wrapper) {
  color: white;
}

:deep(.vch__legend__wrapper) {
  color: white;
}
:deep(.vch__months__labels__wrapper) {
  /* transform: translateY(2px); */
  // transform: translateX(-1px);
  font-size: 10px;
}
:deep(.vch__days__labels__wrapper) {
  /* transform: translateY(2px); */
  font-size: 10px;
}

.vch__days__labels text {
  font-size: 10px; /* 调整字体大小 */
  transform: translateX(-5px); /* 向左移动标签 */
}
:deep(.vch__legend) {
  display: none !important;
}

.stats-container {
  display: flex;
  justify-content: space-around;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 20px;
  margin-top: 20px;
  width: 80%;
  max-width: 500px;
  margin-bottom: 0; // 移除底部边距，让间距由 spacer 控制
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 34px;
  font-weight: bold;
  /* color: #00c8a8;  */
  color: #fff;
  user-select: none;
}

.stat-label {
  font-size: 14px;
  color: #ffffff;
  margin-top: 5px;
  user-select: none;
}

.change-background-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 10px 15px;
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
  z-index: 10;
  opacity: 0;
  &:hover {
    opacity: 1;
    background-color: rgba(255, 255, 255, 0.3);
  }
}
</style>
