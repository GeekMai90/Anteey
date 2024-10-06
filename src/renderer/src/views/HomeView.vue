<template>
  <div class="home-view" :style="{ backgroundImage: `url(${backgroundImage})` }">
    <div class="blur-overlay"></div>
    <div class="drag-area"></div>
    <div class="top-bar">
      <div class="date-time-container">
        <div class="date">{{ currentDate }}</div>
        <div class="time">{{ currentTime }}</div>
      </div>
      <div class="actions"></div>
    </div>

    <div class="main-content">
      <h1>{{ greeting }}</h1>
      <div class="heatmap-container">
        <calendar-heatmap
          :values="heatmapValues"
          :start-date="startDate"
          :end-date="endDate"
          :tooltip-formatter="tooltipFormatter"
          :no-data-text="'0 条笔记'"
          :range-color="['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']"
          :max="10"
          no-margin
        />
      </div>
      <div class="stats-container">
        <div class="stat-item">
          <div class="stat-value">{{ cardCount }}</div>
          <div class="stat-label">昨日新增</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ cardCount }}</div>
          <div class="stat-label">卡片笔记</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ viewCount }}</div>
          <div class="stat-label">思维板</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ dayCount }}</div>
          <div class="stat-label">天</div>
        </div>
      </div>
      <!-- 新增的每日卡片选择组件 -->
      <DailyCardPick />
    </div>
    <button class="change-background-btn" @click="changeBackground">更换背景</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { CalendarHeatmap, TooltipFormatter, CalendarItem } from 'vue3-calendar-heatmap'
import DailyCardPick from '../components/DailyCardPick.vue'

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

// 背景图片 ref
const backgroundImage = ref('')

// 初始化背景
const initBackground = () => {
  const lastSetDate = localStorage.getItem('lastSetDate')
  const savedBackground = localStorage.getItem('savedBackground')
  const today = getTodaySeed().toString()

  if (lastSetDate === today && savedBackground) {
    // 如果是今天且有保存的背景，使用保存的背景
    backgroundImage.value = savedBackground
  } else {
    // 否则，设置新的每日背景
    backgroundImage.value = getDailyBackground()
    localStorage.setItem('lastSetDate', today)
    localStorage.setItem('savedBackground', backgroundImage.value)
  }
}

// 更换背景的方法
const changeBackground = () => {
  backgroundImage.value = getRandomBackground()
  // 保存用户选择的背景
  localStorage.setItem('savedBackground', backgroundImage.value)
}

// 在组件挂载时初始化背景
onMounted(() => {
  initBackground()
})

// 计算统计信息
const cardCount = computed(() => {
  return heatmapValues.value.reduce((sum, item) => sum + item.count, 0)
})

const viewCount = ref(8) // 这里需要根据实际情况计算或获取

const dayCount = computed(() => {
  return heatmapValues.value.length
})

const currentDate = ref('')
const currentTime = ref('')

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

// 生成随机数据的函数
function generateRandomData(startDate: Date, endDate: Date) {
  const data = []
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    // 70% 的概率生成数据，30% 的概率没有数据
    if (Math.random() < 0.7) {
      data.push({
        date: currentDate.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 10) + 1 // 1 到 10 之间的随机数
      })
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }
  return data
}

// 生成过去一年的随机数据
const endDate = new Date()
const startDate = new Date(endDate)
startDate.setFullYear(startDate.getFullYear() - 1)

const heatmapValues = ref(generateRandomData(startDate, endDate))

const tooltipFormatter: TooltipFormatter = (item: CalendarItem) => {
  if (item.date instanceof Date) {
    const date = item.date
    const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    return `${formattedDate}: ${item.count ?? 0} 条笔记`
  }
  return ''
}

// 计算开始日期（一年前的今天）
// const startDate = computed(() => {
//   const date = new Date()
//   date.setFullYear(date.getFullYear() - 1)
//   return date
// })

// // 计算结束日期（今天）
// const endDate = computed(() => new Date())

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

<style scoped>
.home-view {
  /* background-image: url('@resources/home-bg.jpg'); */
  background-size: cover;
  background-position: center;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: white;
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

.top-bar {
  display: flex;
  justify-content: space-between;
  padding: 20px;
  z-index: 1;
}
.date-time-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.date {
  font-size: 16px;
  margin-bottom: 4px;
  user-select: none;
}

.time {
  font-size: 36px;
  font-weight: bold;
  user-select: none;
}

.main-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  z-index: 1;
  /* justify-content: space-between; */
  /* min-height: 100vh; */
}

h1 {
  font-size: 4rem;
  margin-bottom: 1rem;
  user-select: none;
}

p {
  font-size: 1.5rem;
  margin-bottom: 2rem;
}

.cta-button {
  padding: 10px 20px;
  font-size: 1.2rem;
  background-color: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 5px;
  color: white;
  cursor: pointer;
}

.action-button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  margin-left: 10px;
}

.heatmap-container {
  width: 100%;
  max-width: 800px;
  margin: 20px auto;
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
  /* transform: translateX(-10px); */
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
  /* margin-bottom: 20px; */
  margin-bottom: var(--spacing, 20px);
}
@media (min-height: 800px) {
  .stats-container {
    --spacing: 20px;
  }
}

@media (min-height: 1000px) {
  .stats-container {
    --spacing: 240px;
  }
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
}

.change-background-btn:hover {
  background-color: rgba(255, 255, 255, 0.3);
}
</style>
