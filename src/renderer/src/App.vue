<template>
  <div class="app-container" :class="{ 'theme-dark': isDarkTheme }">
    <div class="custom-titlebar">
      <div class="fake-traffic-lights">
        <div class="fake-button close"></div>
        <div class="fake-button minimize"></div>
        <div class="fake-button maximize"></div>
      </div>
    </div>
    <div class="content-wrapper">
      <!-- 左侧边栏和卡片盒二选一 -->
      <template v-if="!uiStore.showCardBox">
        <!-- 常规侧边栏 -->
        <Sidebar
          v-if="!uiStore.isSidebarCollapsed"
          class="sidebar"
          @resize="updateLeftSidebarWidth"
        />
        <!-- 悬停侧边栏 -->
        <Transition name="slide-left">
          <Sidebar
            v-if="isTemporaryVisible && uiStore.isSidebarCollapsed"
            class="sidebar hover-sidebar"
            @mouseenter="cancelHideSidebar"
            @mouseleave="hideSidebar"
          />
        </Transition>
      </template>
      <template v-else>
        <!-- 卡片盒侧边栏 -->
        <Transition name="slide-fade">
          <CardBoxSidebar v-if="isWhiteboardDetailRoute" class="card-box-sidebar" />
        </Transition>
      </template>

      <!-- 主内容区 -->
      <main class="main-content">
        <router-view :key="$route.fullPath"></router-view>
      </main>
      <RightSidebar
        v-if="uiStore.isRightSidebarOpen"
        class="right-sidebar"
        :style="rightSidebarStyle"
        :initialWidth="rightSidebarWidth"
        @resize="updateRightSidebarWidth"
      />
    </div>
    <!-- 鼠标悬停区域 -->
    <div
      v-if="uiStore.isSidebarCollapsed && !uiStore.showCardBox"
      class="hover-zone"
      @mouseenter="showSidebar"
      @mouseleave="scheduleHideSidebar"
    ></div>
    <NoteEditorModal />
    <GlobalUIManager ref="globalUIManager" />
    <SearchModal ref="searchModal" />
    <ContextMenu />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide, watch, onErrorCaptured } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import Sidebar from './components/Sidebar.vue'
import RightSidebar from './components/RightSidebar.vue'
import NoteEditorModal from './components/NoteEditorModal.vue'
import GlobalUIManager from './components/GlobalUIManager.vue'
import SearchModal from './components/SearchModal.vue'
import { useGlobalHotkeys } from './composable/useGlobalHotkeys'
import ContextMenu from './components/ContexMenu.vue'
import CardBoxSidebar from './components/CardBoxSidebar.vue'
import { useUIStore } from './stores/useUIStore'

const uiStore = useUIStore()
const isDarkTheme = ref(false)
const router = useRouter()

// 侧边栏相关
const isTemporaryVisible = ref(false)
let hideSidebarTimeout: number | undefined = undefined
const sidebarWidth = ref(250) // 统一侧边栏宽度
const rightSidebarWidth = ref(400)

// 全局 UI 管理器
const globalUIManager = ref<InstanceType<typeof GlobalUIManager> | null>(null)

// 错误捕获
onErrorCaptured((err, instance, info) => {
  console.error('Global error:', err, instance, info)
  return false
})

const isWhiteboardDetailRoute = ref(false)
// 监听路由变化
watch(
  () => router.currentRoute.value,
  (newRoute) => {
    isWhiteboardDetailRoute.value = newRoute.name === 'whiteboardDetail'
    if (!isWhiteboardDetailRoute.value) {
      uiStore.setShowCardBox(false)
    }
  },
  { immediate: true }
)

// 计算右侧边栏的位置
const rightSidebarPosition = computed(() => (uiStore.isRightSidebarOpen ? 0 : 100))

// 使用 useTransition 创建右侧边栏的平滑过渡效果
// const transitionedRightPosition = useTransition(rightSidebarPosition, {
//   duration: 100,
//   transition: [0.25, 0.1, 0.25, 1] // 自定义贝塞尔曲线
// })

// 计算右侧边栏样式
const rightSidebarStyle = computed(() => ({
  transform: `translateX(${rightSidebarPosition.value}%)`,
  width: `${rightSidebarWidth.value}px`
}))

// 侧边栏显示/隐藏控制
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

// 更新侧边栏宽度
const updateLeftSidebarWidth = (width: number) => {
  sidebarWidth.value = width
}

const updateRightSidebarWidth = (width: number) => {
  rightSidebarWidth.value = width
}

// 窗口大小检查
const checkWindowSize = () => {
  const shouldCollapse = window.innerWidth < 768
  uiStore.setIsSidebarCollapsed(shouldCollapse)
}

// 提供全局方法
provide('openOptionsMenu', (event: MouseEvent, noteId: string) => {
  globalUIManager.value?.openOptionsMenu(event, noteId)
})

// 生命周期钩子
onMounted(async () => {
  // await noteStore.initializeStore()
  checkWindowSize()
  window.addEventListener('resize', checkWindowSize)
  console.log('App mounted')
  console.log('Current route:', router.currentRoute.value)
  if (router.currentRoute.value.path === '/') {
    console.log('Redirecting to /home')
    router.push('/timeline')
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
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.sidebar,
.card-box-sidebar {
  flex-shrink: 0;
  width: v-bind(sidebarWidth + 'px');
  height: 100%;
  transition: all 0.3s ease;
}

.sidebar.hover-sidebar {
  position: absolute;
  top: 0;
  left: 0;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  z-index: 1001;
}

.main-content {
  flex-grow: 1;
  overflow-y: auto;
  min-width: 0;
  transition: margin-left 0.3s ease;
}

.hover-zone {
  position: absolute;
  top: 0;
  left: 0;
  width: 10px;
  height: 100%;
  z-index: 999;
}

.fade-enter-active,
.fade-leave-active,
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to,
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}

.right-sidebar {
  flex-shrink: 0;
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
.card-box-sidebar {
  flex-shrink: 0;
  // box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  height: 100%;
  z-index: 1000;
  position: relative;
  width: 300px;
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
</style>
