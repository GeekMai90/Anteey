<template>
  <div class="content-wrapper" :style="backgroundStyle">
    <div
      class="theme-overlay"
      :style="{
        opacity: isDarkMode ? 0.3 : 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }"
    ></div>

    <!-- 左侧边栏 - 常规状态 -->
    <Sidebar
      v-show="!uiStore.isSidebarCollapsed"
      class="sidebar"
      :class="{ collapsed: uiStore.isSidebarCollapsed }"
      @resize="updateLeftSidebarWidth"
      @gradient-update="updateGradient"
    />

    <!-- 左侧边栏 - 悬停状态（当侧边栏折叠时显示） -->
    <Transition name="slide-left">
      <Sidebar
        v-show="isTemporaryVisible && uiStore.isSidebarCollapsed"
        class="sidebar hover-sidebar"
        @mouseenter="cancelHideSidebar"
        @mouseleave="hideSidebar"
      />
    </Transition>

    <!-- 主内容区域 -->
    <main class="main-content">
      <slot></slot>
    </main>

    <!-- 右侧边栏 -->
    <RightSidebar
      v-show="uiStore.isRightSidebarOpen"
      class="right-sidebar"
      :initialWidth="rightSidebarWidth"
      @resize="updateRightSidebarWidth"
    />

    <!-- 左侧悬停触发区域 -->
    <div
      v-if="uiStore.isSidebarCollapsed"
      class="hover-zone"
      @mouseenter="showSidebar"
      @mouseleave="scheduleHideSidebar"
    ></div>

    <div v-if="showNoiseOverlay" class="noise-overlay" :style="noiseStyle"></div>
  </div>

  <!-- 添加每日来信动画组件 -->
  <DailyLetterAnimation />
  <!-- 暗色模式遮罩层 -->
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useUIStore } from '@renderer/stores/UIStore'
import { useThemeStore } from '@renderer/stores/themeStore'
import Sidebar from './Sidebar.vue'
import RightSidebar from '../rightSidebar/RightSidebar.vue'
import DailyLetterAnimation from '@renderer/components/dailyLetter/DailyLetterAnimation.vue'

const uiStore = useUIStore()
const themeStore = useThemeStore()

// ===== 侧边栏状态管理 =====
const isTemporaryVisible = ref(false)
let hideSidebarTimeout: number | undefined = undefined
const sidebarWidth = ref(250)
const rightSidebarWidth = ref(400)

// ===== 侧边栏控制方法 =====
const showSidebar = () => {
  if (uiStore.isSidebarCollapsed) {
    isTemporaryVisible.value = true
    clearTimeout(hideSidebarTimeout)
  }
}

const hideSidebar = () => {
  if (uiStore.isSidebarCollapsed) {
    scheduleHideSidebar()
  }
}

const scheduleHideSidebar = () => {
  if (uiStore.isSidebarCollapsed) {
    hideSidebarTimeout = window.setTimeout(() => {
      isTemporaryVisible.value = false
    }, 300)
  }
}

const cancelHideSidebar = () => {
  clearTimeout(hideSidebarTimeout)
}

// ===== 侧边栏宽度调整 =====
const updateLeftSidebarWidth = (width: number) => {
  sidebarWidth.value = width
}

const updateRightSidebarWidth = (width: number) => {
  rightSidebarWidth.value = width
}

// ===== 响应式布局处理 =====
const checkWindowSize = () => {
  const shouldCollapse = window.innerWidth < 768
  uiStore.setIsSidebarCollapsed(shouldCollapse)
}

// 创建一个稳定的函数引用
const debouncedCheckWindowSize = useDebounceFn(checkWindowSize, 200)
const handleResize = () => debouncedCheckWindowSize()

interface GradientColors {
  startColor: string
  endColor: string
  angle: number
  noiseAmount: number
}

const gradient = ref<GradientColors>({
  startColor: '#A8ECFF',
  endColor: '#A8FFCF',
  angle: 45,
  noiseAmount: 20
})

const generateNoiseSVG = (amount: number) => {
  const baseFrequency = amount / 1000
  return `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${baseFrequency}' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
}

const backgroundStyle = computed(() => ({
  background: `linear-gradient(${gradient.value.angle}deg, ${gradient.value.startColor}, ${gradient.value.endColor})`
}))

const showNoiseOverlay = computed(() => gradient.value.noiseAmount > 0)

type MixBlendMode = 'overlay' | 'multiply' | 'screen' | 'soft-light'

interface NoiseStyle {
  backgroundImage: string
  opacity: number
  mixBlendMode: MixBlendMode
}

const noiseStyle = computed(() => {
  if (gradient.value.noiseAmount <= 0) return {}
  return {
    backgroundImage: generateNoiseSVG(gradient.value.noiseAmount),
    opacity: gradient.value.noiseAmount / 100,
    mixBlendMode: 'overlay'
  } as NoiseStyle
})

// 提供更新渐变的方法
const updateGradient = (newGradient: GradientColors) => {
  gradient.value = newGradient
}

// 监听主题变化
watch(
  () => themeStore.currentGradient,
  (newGradient) => {
    if (newGradient) {
      updateGradient(newGradient)
    }
  },
  { immediate: true }
)

// 添加暗色模式判断
const isDarkMode = computed(() => {
  // console.log('themeStore.themeSettings', themeStore.themeSettings?.themeMode)
  if (!themeStore.themeSettings) return false
  return (
    themeStore.themeSettings.themeMode === 'dark' ||
    (themeStore.themeSettings.themeMode === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  )
})

// 导出方法供父组件使用
defineExpose({
  checkWindowSize,
  handleResize,
  updateGradient
})
</script>

<style lang="scss" scoped>
.content-wrapper {
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  padding: 10px;
  transition: background 0.3s ease;

  // 添加一个微妙的白色叠加，让渐变更柔和
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
    pointer-events: none;
    z-index: 8;
  }

  // 给内容区域添加一个容器
  > * {
    position: relative;
    z-index: 11;
  }

  .noise-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 9;
  }

  // 添加暗色模式遮罩层样式
  .theme-overlay {
    position: absolute;
    // opacity: 0.2 !important;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 10;
    transition: opacity 0.3s ease;
    mix-blend-mode: multiply;
  }

  // 确保内容在遮罩层之上
  > * {
    position: relative;
    z-index: 11;
  }
}

/* 侧边栏样式 */
.sidebar {
  flex-shrink: 0;
  width: v-bind('uiStore.isSidebarCollapsed ? "0" : sidebarWidth + "px"');
  height: 100%;
  transition:
    all 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  background: transparent;
  border-radius: 12px;
  // margin-right: 10px;
  opacity: v-bind('uiStore.isSidebarCollapsed ? "0" : "1"');
  transform-origin: left center;
  transform: v-bind('uiStore.isSidebarCollapsed ? "translateX(-20px)" : "translateX(0)"');

  &.hover-sidebar {
    position: absolute;
    top: 20px;
    left: 0;
    width: 250px !important;
    height: calc(100% - 40px);
    background: rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    z-index: 1001;
    border: 1px solid rgba(255, 255, 255, 0.3);
    transform-origin: left center;
    opacity: 1;
    transform: translateX(0);
    animation: sidebar-pop 0.4s cubic-bezier(0.34, 1.2, 0.64, 1);
    padding: 0 10px;
    margin: 0 10px;
    overflow: hidden;

    // 添加内部阴影效果
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 12px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
      pointer-events: none;
    }

    // 微妙的光晕效果
    &::after {
      content: '';
      position: absolute;
      top: -10px;
      left: -10px;
      right: -10px;
      bottom: -10px;
      background: radial-gradient(closest-side, rgba(255, 255, 255, 0.1), transparent);
      pointer-events: none;
      z-index: -1;
    }
  }
}

/* 主内容区域样式 */
.main-content {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  background: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow:
    0 0 4px rgba(0, 0, 0, 0.09),
    0 0 8px rgba(0, 0, 0, 0.02),
    0 0 12px rgba(0, 0, 0, 0.03);
  .theme-dark & {
    box-shadow:
      0 0 4px rgba(0, 0, 0, 0.15),
      0 0 8px rgba(0, 0, 0, 0.12),
      0 0 12px rgba(0, 0, 0, 0.1);
  }
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  transition:
    margin-left 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    margin-right 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.3s ease;
  margin-left: v-bind('uiStore.isSidebarCollapsed ? "0" : "10px"');
  margin-right: v-bind('uiStore.isRightSidebarOpen ? "10px" : "0"');
  position: relative;
}

/* 右侧边栏样式 */
.right-sidebar {
  flex-shrink: 0;
  width: v-bind('uiStore.isRightSidebarOpen ? rightSidebarWidth + "px" : "0"');
  height: 100%;
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  background: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.09),
    0 4px 8px rgba(0, 0, 0, 0.02),
    0 8px 12px rgba(0, 0, 0, 0.03);
  .theme-dark & {
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.15),
      0 4px 8px rgba(0, 0, 0, 0.12),
      0 8px 12px rgba(0, 0, 0, 0.1);
  }
  backdrop-filter: blur(10px);
  opacity: v-bind('uiStore.isRightSidebarOpen ? "1" : "0"');
  transform-origin: right center;
  transform: v-bind('uiStore.isRightSidebarOpen ? "translateX(0)" : "translateX(20px)"');
}

/* 悬停触发区样式 */
.hover-zone {
  position: absolute;
  top: 0;
  left: 0;
  width: 10px;
  height: 100%;
  z-index: 1002;
  background: linear-gradient(to right, rgba(255, 255, 255, 0.2), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;

  &:hover {
    opacity: 1;
  }
}

/* 动画相关样式 */
@keyframes sidebar-pop {
  from {
    transform: translateX(-10px) scale(0.98);
    opacity: 0;
  }
  to {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
  box-shadow: none;
}

.slide-left-enter-to,
.slide-left-leave-from {
  transform: translateX(0);
  opacity: 1;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
}
</style>
