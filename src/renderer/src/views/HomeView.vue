<template>
  <div
    class="home-view"
    :style="{ backgroundImage: backgroundImageStyle }"
    :class="{ 'background-loaded': isBackgroundLoaded }"
  >
    <!-- 背景遮罩层 -->
    <div
      class="blur-overlay"
      :style="{
        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.1)'
      }"
    ></div>

    <!-- 窗口拖拽区域 -->
    <div class="drag-area"></div>

    <!-- 左上角日期时间显示 -->
    <div class="date-time-container">
      <div class="date">{{ currentDate }}</div>
      <div class="time">{{ currentTime }}</div>
    </div>

    <!-- 主要内容区域 -->
    <div class="content-wrapper">
      <div class="main-content">
        <!-- 问候语 -->
        <h1>{{ greeting }}</h1>

        <!-- 活跃度热力图 -->
        <div class="heatmap-container">
          <calendar-heatmap
            :values="heatmapData"
            :start-date="startDate"
            :end-date="endDate"
            :tooltip-formatter="tooltipFormatter"
            :no-data-text="'0 条笔记'"
            :range-color="heatmapColors"
            :max="10"
            no-margin
            :dark-mode="true"
          />
        </div>

        <!-- 统计数据展示 -->
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
            <div class="stat-value">{{ mindboardCount }}</div>
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
import DailyCardPick from '@renderer/components/home/DailyCardPick.vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useMindboardStore } from '@renderer/stores/mindboardStore'
import { useThemeStore } from '@renderer/stores/themeStore'

// Store 实例化
const noteStore = useNoteStore()
const mindboardStore = useMindboardStore()
const themeStore = useThemeStore()

// ===== 背景图片管理 =====
const backgroundImage = ref('')
const isBackgroundLoaded = ref(false)
const loadingAttempts = ref(0) // 添加加载尝试次数计数器
const maxLoadingAttempts = 3 // 最大重试次数
const useDefaultBackground = ref(false) // 是否使用默认背景色
const defaultBackgroundImage = ref('') // 默认背景图片

// 导入默认背景图片
import defaultBgImage from '../assets/backgrounds/background_1728172072229.jpg'

// 背景图片样式计算属性
const backgroundImageStyle = computed(() => {
  if (useDefaultBackground.value && defaultBackgroundImage.value) {
    // 使用默认背景图片
    return `url(${defaultBackgroundImage.value}) !important`
  }
  return backgroundImage.value ? `url(${backgroundImage.value}) !important` : 'none'
})

// 导入所有背景图片
const backgroundImages = import.meta.glob('../assets/backgrounds/*.{jpg,jpeg,png,gif}', {
  eager: true,
  as: 'url'
})
const backgroundImageArray = Object.values(backgroundImages)

// 设置默认背景图片
const setDefaultBackgroundImage = () => {
  // 使用指定的默认背景图片
  defaultBackgroundImage.value = defaultBgImage
}

// 图片预加载函数
const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('无效的图片URL'))
      return
    }

    const img = new Image()
    const timeoutId = setTimeout(() => {
      reject(new Error('图片加载超时'))
    }, 5000) // 5秒超时

    img.onload = () => {
      clearTimeout(timeoutId)
      resolve()
    }
    img.onerror = (e) => {
      clearTimeout(timeoutId)
      reject(e)
    }
    img.src = url
  })
}

// 获取日期种子值
const getTodaySeed = () => {
  const today = new Date()
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
}

// 获取每日固定背景
const getDailyBackground = () => {
  if (backgroundImageArray.length === 0) {
    console.error('背景图片数组为空')
    return ''
  }
  const seed = getTodaySeed()
  return backgroundImageArray[seed % backgroundImageArray.length]
}

// 获取随机背景（用于手动更换）
const getRandomBackground = () => {
  if (backgroundImageArray.length === 0) {
    console.error('背景图片数组为空')
    return ''
  }

  let randomIndex
  do {
    randomIndex = Math.floor(Math.random() * backgroundImageArray.length)
  } while (
    backgroundImageArray[randomIndex] === backgroundImage.value &&
    backgroundImageArray.length > 1
  )
  return backgroundImageArray[randomIndex]
}

// 初始化背景
const initBackground = async () => {
  // 先设置默认背景图片
  setDefaultBackgroundImage()

  // 先显示默认背景，确保界面不会空白
  useDefaultBackground.value = true
  isBackgroundLoaded.value = true

  // 检查背景图片数组是否为空
  if (backgroundImageArray.length === 0) {
    console.error('没有可用的背景图片')
    return
  }

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

  // 重置加载尝试计数
  loadingAttempts.value = 0
  await loadBackgroundImage(selectedBackground)
}

// 加载背景图片（带重试机制）
const loadBackgroundImage = async (imageUrl: string) => {
  if (!imageUrl || loadingAttempts.value >= maxLoadingAttempts) {
    // 如果URL为空或已达到最大重试次数，使用随机背景
    console.warn('背景图片加载失败，尝试使用随机背景')
    const randomBg = getRandomBackground()
    if (randomBg) {
      loadingAttempts.value = 0
      await loadBackgroundImage(randomBg)
    } else {
      console.error('无法加载任何背景图片')
      // 保持使用默认背景
      useDefaultBackground.value = true
    }
    return
  }

  try {
    isBackgroundLoaded.value = false
    await preloadImage(imageUrl)
    backgroundImage.value = imageUrl
    useDefaultBackground.value = false // 成功加载图片后，不使用默认背景
    isBackgroundLoaded.value = true
    localStorage.setItem('savedBackground', imageUrl)
  } catch (error) {
    console.error('背景图片加载失败:', error)
    loadingAttempts.value++

    // 重试加载
    if (loadingAttempts.value < maxLoadingAttempts) {
      console.warn(`尝试重新加载背景图片，第${loadingAttempts.value}次尝试`)
      setTimeout(() => loadBackgroundImage(imageUrl), 500) // 延迟500ms后重试
    } else {
      // 达到最大重试次数，尝试加载随机图片
      const randomBg = getRandomBackground()
      if (randomBg && randomBg !== imageUrl) {
        loadingAttempts.value = 0
        await loadBackgroundImage(randomBg)
      } else {
        // 如果随机背景也失败，使用默认背景
        useDefaultBackground.value = true
        isBackgroundLoaded.value = true
      }
    }
  }
}

// 更换背景处理函数
const changeBackground = async () => {
  const newBackground = getRandomBackground()
  if (!newBackground) {
    // 如果无法获取新背景，使用默认背景
    useDefaultBackground.value = true
    isBackgroundLoaded.value = true
    return
  }

  loadingAttempts.value = 0
  await loadBackgroundImage(newBackground)
}

// ===== 统计数据管理 =====
const cardCount = ref(0)
const lastDayNoteCount = ref(0)
const mindboardCount = ref(0)
const dayCount = ref(0)

// 监听并更新统计数据
watchEffect(async () => {
  cardCount.value = await noteStore.getNoteCount()
  lastDayNoteCount.value = await noteStore.getLastDayNoteCount()
  mindboardCount.value = await mindboardStore.getMindboardCount()
  dayCount.value = await noteStore.getUserUsageDays()
})

// ===== 日期时间管理 =====
const currentDate = ref('')
const currentTime = ref('')

// 更新日期时间
const updateDateTime = () => {
  const now = new Date()
  currentDate.value = now.toLocaleDateString('zh-CN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })
  currentTime.value = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 动态问候语
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return '👋🏻 早上好！'
  if (hour >= 12 && hour < 18) return '🌞 下午好！'
  return '🌙 晚上好！'
})

// ===== 热力图配置 =====
const endDate = new Date()
const startDate = new Date(endDate)
startDate.setFullYear(startDate.getFullYear() - 1)
const heatmapData = ref<{ date: string; count: number }[]>([])

// 添加暗色模式计算属性
const isDarkMode = computed(() => {
  if (!themeStore.themeSettings) return false
  return (
    themeStore.themeSettings.themeMode === 'dark' ||
    (themeStore.themeSettings.themeMode === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  )
})

// 热力图颜色配置
const heatmapColors = computed(() => {
  return isDarkMode.value
    ? [
        '#1f1f1f', // 0值背景色（深色背景）
        '#133B3B', // 无数据
        '#006D6D', // 较少
        '#00c8a8', // 中等（主题色）
        '#00FFD1', // 较多
        '#7BFFF0' // 最多
      ]
    : [
        '#ebedf0', // 0值背景色（浅色背景）
        '#e6f7f4', // 无数据
        '#b3ebe3', // 较少
        '#00c8a8', // 中等（主题色）
        '#009c83', // 较多
        '#00705e' // 最多
      ]
})

// 热力图提示格式化
const tooltipFormatter: TooltipFormatter = (item: CalendarItem) => {
  if (item.date instanceof Date) {
    const date = item.date
    const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    return `${formattedDate}: ${item.count ?? 0} 条笔记`
  }
  return ''
}

// ===== 生命周期钩子 =====
onMounted(async () => {
  // 先更新日期时间，确保界面有内容显示
  updateDateTime()
  setInterval(updateDateTime, 1000)

  // 确保背景图片加载优先于其他操作
  initBackground().catch((err) => {
    console.error('初始化背景图片失败:', err)
    // 失败时使用默认背景
    useDefaultBackground.value = true
    isBackgroundLoaded.value = true
  })

  // 加载热力图数据
  heatmapData.value = await noteStore.getHeatmapData()
})
</script>

<style scoped lang="scss">
// 主容器样式
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

// 背景遮罩层
.blur-overlay {
  position: absolute;
  inset: 0;
  backdrop-filter: blur(6px);
  transition: background-color 0.3s ease;
}

// 窗口拖拽区域
.drag-area {
  height: 20px;
  width: 100%;
  -webkit-app-region: drag;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
}

// 内容布局
.content-wrapper {
  flex-grow: 1;
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  z-index: 1;
  padding: 0 20px;
}

// 日期时间显示
.date-time-container {
  position: absolute;
  top: 40px;
  left: 20px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  .date {
    font-size: 16px;
    user-select: none;
  }

  .time {
    font-size: 38px;
    font-weight: bold;
    user-select: none;
  }
}

// 主要内容区域
.main-content {
  margin-top: 70px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  z-index: 1;

  h1 {
    font-size: 3rem;
    margin: 0 0 10px 0;
    user-select: none;
  }
}

// 弹性空间
.spacer {
  flex-grow: 1;
  min-height: 20px;
}

// 热力图容器
.heatmap-container {
  width: 100%;
  max-width: 800px;
  margin: 20px auto;
  z-index: 1;
  box-sizing: border-box;
  user-select: none;
}

:deep(.vch__wrapper) {
  color: white;
}

:deep(.vch__legend__wrapper) {
  color: white;
}

:deep(.vch__days__labels__wrapper) {
  width: 40px !important;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);

  .vch__day__label {
    width: 100% !important;
    text-align: right;
    padding-right: 8px;
  }
}

:deep(.vch__months__labels__wrapper) {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);
}

:deep(.vch__legend) {
  display: none !important;
}

// 统计数据容器
.stats-container {
  display: flex;
  justify-content: space-around;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 20px;
  margin-top: 20px;
  width: 80%;
  max-width: 500px;

  .stat-item {
    text-align: center;

    .stat-value {
      font-size: 34px;
      font-weight: bold;
      color: #fff;
      user-select: none;
    }

    .stat-label {
      font-size: 14px;
      color: #ffffff;
      margin-top: 5px;
      user-select: none;
    }
  }
}

// 每日卡片选择组件
.daily-card-pick {
  flex-shrink: 0;
  margin-bottom: 40px;
  align-self: center;
}

// 更换背景按钮
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
  opacity: 0.6;

  &:hover {
    opacity: 1;
    background-color: rgba(255, 255, 255, 0.3);
  }
}
</style>
