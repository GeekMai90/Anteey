<template>
  <Suspense>
    <div class="app-container" :class="{ 'theme-dark': isDarkTheme }">
      <div class="custom-titlebar">
        <div class="fake-traffic-lights">
          <div class="fake-button close"></div>
          <div class="fake-button minimize"></div>
          <div class="fake-button maximize"></div>
        </div>
      </div>
      <div class="hover-zone" @mouseenter="showSidebar" @mouseleave="scheduleHideSidebar"></div>
      <div class="content-wrapper">
        <Sidebar
          v-show="!noteStore.isSidebarCollapsed || isTemporaryVisible"
          class="sidebar"
          :style="sidebarStyle"
          :class="{ 'temporary-visible': isTemporaryVisible }"
          @mouseenter="cancelHideSidebar"
          @mouseleave="hideSidebar"
          @resize="updateLeftSidebarWidth"
        />
        <main class="main-content" :style="mainContentStyle">
          <router-view :key="$route.fullPath"></router-view>
        </main>
        <RightSidebar
          v-show="noteStore.isRightSidebarOpen"
          class="right-sidebar"
          :style="rightSidebarStyle"
          :initialWidth="rightSidebarWidth"
          @resize="updateRightSidebarWidth"
        />
      </div>
      <NoteEditorModal />
      <GlobalUIManager ref="globalUIManager" />
      <SearchModal ref="searchModal" />
      <ContextMenu />
    </div>
  </Suspense>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide, onErrorCaptured } from 'vue'
import { useTransition } from '@vueuse/core'
import { RouterView, useRouter } from 'vue-router'
import Sidebar from './components/Sidebar.vue'
import RightSidebar from './components/RightSidebar.vue'
import NoteEditorModal from './components/NoteEditorModal.vue'
import GlobalUIManager from './components/GlobalUIManager.vue'
import SearchModal from './components/SearchModal.vue'
import { useNoteStore } from './stores/noteStores'
import { useGlobalHotkeys } from './composable/useGlobalHotkeys'
import ContextMenu from './components/ContexMenu.vue'

const noteStore = useNoteStore()
const isDarkTheme = ref(false)
const router = useRouter()

// 侧边栏相关
const isTemporaryVisible = ref(false)
let hideSidebarTimeout: number | undefined = undefined
const leftSidebarWidth = ref(250)
const rightSidebarWidth = ref(400)

// 全局 UI 管理器
const globalUIManager = ref<InstanceType<typeof GlobalUIManager> | null>(null)

// 错误捕获
onErrorCaptured((err, instance, info) => {
  console.error('Global error:', err, instance, info)
  return false
})

// 计算侧边栏的位置
const sidebarPosition = computed(() =>
  !noteStore.isSidebarCollapsed || isTemporaryVisible.value ? 0 : -100
)

// 使用 useTransition 创建平滑的过渡效果
const transitionedPosition = useTransition(sidebarPosition, {
  duration: 300,
  transition: [0.25, 0.1, 0.25, 1] // 自定义贝塞尔曲线
})

// 计算侧边栏样式
const sidebarStyle = computed(() => ({
  transform: `translateX(${transitionedPosition.value}%)`,
  position: noteStore.isSidebarCollapsed ? 'absolute' : 'relative',
  height: '100%',
  zIndex: 1000
}))

// 计算右侧边栏样式
// 计算右侧边栏的位置
const rightSidebarPosition = computed(() => (noteStore.isRightSidebarOpen ? 0 : 100))

// 使用 useTransition 创建右侧边栏的平滑过渡效果
const transitionedRightPosition = useTransition(rightSidebarPosition, {
  duration: 300,
  transition: [0.25, 0.1, 0.25, 1] // 自定义贝塞尔曲线
})

// 计算右侧边栏样式
const rightSidebarStyle = computed(() => ({
  transform: `translateX(${transitionedRightPosition.value}%)`,
  width: `${rightSidebarWidth.value}px`
}))

// 计算主内容区样式
const mainContentStyle = computed(() => {
  const leftWidth =
    !noteStore.isSidebarCollapsed || isTemporaryVisible.value
      ? `${leftSidebarWidth.value}px`
      : '0px'
  const rightWidth = noteStore.isRightSidebarOpen ? `${rightSidebarWidth.value}px` : '0px'
  return {
    width: `calc(100% - ${leftWidth} - ${rightWidth})`,
    transition: 'width 0.3s'
  }
})

// 侧边栏显示/隐藏控制
const showSidebar = () => {
  if (noteStore.isSidebarCollapsed) {
    isTemporaryVisible.value = true
    clearTimeout(hideSidebarTimeout)
  }
}

const hideSidebar = () => {
  if (noteStore.isSidebarCollapsed) {
    scheduleHideSidebar()
  }
}

const scheduleHideSidebar = () => {
  if (noteStore.isSidebarCollapsed) {
    hideSidebarTimeout = window.setTimeout(() => {
      isTemporaryVisible.value = false
    }, 300)
  }
}

const cancelHideSidebar = () => {
  clearTimeout(hideSidebarTimeout)
}

// 更新侧边栏宽度
const updateLeftSidebarWidth = (width: number) => {
  leftSidebarWidth.value = width
}

const updateRightSidebarWidth = (width: number) => {
  rightSidebarWidth.value = width
}

// 窗口大小检查
const checkWindowSize = () => {
  const shouldCollapse = window.innerWidth < 768
  noteStore.setIsSidebarCollapsed(shouldCollapse)
}

// 提供全局方法
provide('openOptionsMenu', (event: MouseEvent, noteId: string) => {
  globalUIManager.value?.openOptionsMenu(event, noteId)
})

// 生命周期钩子
onMounted(async () => {
  await noteStore.initializeStore()
  checkWindowSize()
  window.addEventListener('resize', checkWindowSize)
  console.log('App mounted')
  console.log('Current route:', router.currentRoute.value)
  if (router.currentRoute.value.path === '/') {
    console.log('Redirecting to /home')
    router.push('/whiteboard')
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkWindowSize)
})

// 使用全局热键
useGlobalHotkeys()

// 主题切换（如果需要）
// function toggleTheme() {
//   isDarkTheme.value = !isDarkTheme.value
// }
</script>

<style lang="scss">
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
}

.custom-titlebar {
  position: fixed;
  top: 2px;
  left: 1px;
  width: 70px;
  height: 28px;
  -webkit-app-region: drag;
  z-index: 9999;
}

.fake-traffic-lights {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  gap: 8px;
}

.fake-button {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  opacity: 0.5;
}

.close {
  background-color: #ff5f56;
}
.minimize {
  background-color: #ffbd2e;
}
.maximize {
  background-color: #27c93f;
}

/* 当真实按钮可见时，隐藏假按钮 */
@media (display-mode: window-controls-overlay) {
  .fake-traffic-lights {
    display: none;
  }
}

.content-wrapper {
  display: flex;
  width: 100%;
  height: 100%;
}

.sidebar,
.right-sidebar {
  flex-shrink: 0;
}

.main-content {
  flex-grow: 1;
  // overflow-y: auto;
  transition: width 0.3s ease;
  position: relative; // 添加这个
}

.hover-zone {
  position: absolute;
  top: 0;
  left: 0;
  width: 10px;
  height: 100%;
  z-index: 1001;
}

.sidebar {
  &.temporary-visible {
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  }
}

// .theme-dark {
//   // 添加深色主题的样式
// }

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 9999;
  }
}
</style>
