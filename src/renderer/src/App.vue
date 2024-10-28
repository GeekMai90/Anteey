<template>
  <!-- 应用程序根容器，支持深色主题切换 -->
  <div class="app-container" :class="{ 'theme-dark': uiStore.isDarkTheme }">
    <!-- 加载动画 -->
    <!-- <div v-if=" isLoading" class="loading-overlay">
      <Vue3Lottie :animationData="loadingAnimation" :height="300" :width="300" />
    </div> -->
    <!-- 主要内容布局容器 -->
    <div class="content-wrapper">
      <!-- 左侧边栏 - 常规状态 -->
      <Sidebar
        v-show="!uiStore.isSidebarCollapsed"
        class="sidebar"
        @resize="updateLeftSidebarWidth"
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

      <!-- 主内容区域 - 包含路由视图 -->
      <main class="main-content">
        <router-view v-slot="{ Component }">
          <!-- 使用keep-alive缓存需要保持状态的组件 -->
          <keep-alive>
            <component :is="Component" v-if="$route.meta.keepAlive" :key="$route.fullPath" />
          </keep-alive>
          <!-- 不需要缓存的组件直接渲染 -->
          <component :is="Component" v-if="!$route.meta.keepAlive" :key="$route.fullPath" />
        </router-view>
      </main>

      <!-- 右侧边栏 -->
      <RightSidebar
        v-show="uiStore.isRightSidebarOpen"
        class="right-sidebar"
        :style="rightSidebarStyle"
        :initialWidth="rightSidebarWidth"
        @resize="updateRightSidebarWidth"
      />
    </div>

    <!-- 左侧悬停触发区域 - 用于显示折叠的侧边栏 -->
    <div
      v-if="uiStore.isSidebarCollapsed"
      class="hover-zone"
      @mouseenter="showSidebar"
      @mouseleave="scheduleHideSidebar"
    ></div>

    <!-- 全局组件 -->
    <!-- 笔记编辑器模态框 -->
    <NoteEditorModal />
    <!-- 全局UI管理器 -->
    <GlobalUIManager ref="globalUIManager" />
    <!-- 搜索模态框 -->
    <SearchModal ref="searchModal" />
    <!-- 上下文菜单 -->
    <ContextMenu />
    <!-- 设置页面模态框 -->
    <Modal v-model="uiStore.showSettingsPage" @outside-click="uiStore.closeSettingsPage">
      <SettingsPage />
    </Modal>
    <!-- 分享预览模态框 -->
    <SharePreviewModal
      v-if="noteStore.showShareModal"
      :note="noteStore.shareNote"
      @close="noteStore.showShareModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import Sidebar from './components/layout/Sidebar.vue'
import RightSidebar from './components/layout/RightSidebar.vue'
import NoteEditorModal from './components/note/NoteEditorModal.vue'
import GlobalUIManager from './components/ui/GlobalUIManager.vue'
import SearchModal from './components/SearchModal.vue'
import { useGlobalHotkeys } from './composables/useGlobalHotkeys'
import ContextMenu from './components/common/ContexMenu.vue'
import { useUIStore } from './stores/useUIStore'
import Modal from './components/common/Modal.vue'
import SettingsPage from './components/settings/SettingsPage.vue'
// import { Vue3Lottie } from 'vue3-lottie'
// import loadingAnimation from './assets/loading.json'
import { useNoteStore } from './stores/note-store'
import { useNoteMenu } from './composables/useNoteMenu'
import SharePreviewModal from './components/share/SharePreviewModal.vue'
import { useDebounceFn } from '@vueuse/core'
// import { SemanticVectorizer } from './utils/semanticVector'

// 初始化store
const uiStore = useUIStore()
const noteStore = useNoteStore()
const router = useRouter()

// 导出功能函数
const { handleBulkExport } = useNoteMenu({
  noteId: '',
  menuItems: ['star']
})

// ===== 侧边栏相关状态和方法 =====
const isTemporaryVisible = ref(false) // 控制悬停侧边栏的显示
let hideSidebarTimeout: number | undefined = undefined // 用于延迟隐藏侧边栏的定时器
const sidebarWidth = ref(250) // 左侧边栏宽度
const rightSidebarWidth = ref(400) // 右侧边栏宽度

// 全局UI管理器引用
const globalUIManager = ref<InstanceType<typeof GlobalUIManager> | null>(null)

// // 计算右侧边栏样式
const rightSidebarStyle = computed(() => ({
  transform: uiStore.isRightSidebarOpen ? 'translateX(0)' : 'translateX(100%)',
  width: `${rightSidebarWidth.value}px`
}))

// ===== 侧边栏控制方法 =====
// 显示侧边栏
const showSidebar = () => {
  if (uiStore.isSidebarCollapsed) {
    isTemporaryVisible.value = true
    clearTimeout(hideSidebarTimeout)
  }
}
// 隐藏侧边栏
const hideSidebar = () => {
  if (uiStore.isSidebarCollapsed) {
    scheduleHideSidebar()
  }
}

// 计划延迟隐藏侧边栏
const scheduleHideSidebar = () => {
  if (uiStore.isSidebarCollapsed) {
    hideSidebarTimeout = window.setTimeout(() => {
      isTemporaryVisible.value = false
    }, 300)
  }
}

// 取消隐藏侧边栏的计划
const cancelHideSidebar = () => {
  clearTimeout(hideSidebarTimeout)
}

// ===== 侧边栏宽度调整方法 =====
const updateLeftSidebarWidth = (width: number) => {
  sidebarWidth.value = width
}

const updateRightSidebarWidth = (width: number) => {
  rightSidebarWidth.value = width
}

// ===== 响应式布局相关 =====
// 检查窗口大小并决定是否折叠侧边栏
const checkWindowSize = () => {
  const shouldCollapse = window.innerWidth < 768
  uiStore.setIsSidebarCollapsed(shouldCollapse)
}
// 使用防抖处理窗口resize事件，避免频繁触发
const debouncedCheckWindowSize = useDebounceFn(checkWindowSize, 200)

// 初始化全局热键
useGlobalHotkeys()

// ===== 生命周期钩子 =====
onMounted(async () => {
  // 初始化主题
  uiStore.initTheme()

  // // 初始化语义向量模型
  // try {
  //   console.log('开始初始化语义向量模型...')
  //   const vectorizer = SemanticVectorizer.getInstance()
  //   await vectorizer.initialize()
  //   console.log('语义向量模型初始化成功')
  // } catch (error) {
  //   console.error('语义向量模型初始化失败:', error)
  // }
  // 设置响应式布局
  debouncedCheckWindowSize()
  window.addEventListener('resize', debouncedCheckWindowSize)
  // 路由重定向
  if (router.currentRoute.value.path === '/') {
    router.push('/timeline')
  }
  // 设置菜单事件监听
  // 新建笔记
  window.electronAPI.onMenuNewNote(async () => {
    await noteStore.createAndOpenNewNote()
  })
  // 导出笔记
  window.electronAPI.onMenuExportNotes(async () => {
    await handleBulkExport()
  })
})

// 组件卸载时清理
onUnmounted(async () => {
  // 移除事件监听
  window.removeEventListener('resize', debouncedCheckWindowSize)
  window.electronAPI.removeAllListeners('menu-new-note')
  window.electronAPI.removeAllListeners('menu-export-notes')
  // 清理笔记数据
  await noteStore.clearNotes()
})

// 提供全局方法给子组件使用
provide('openOptionsMenu', (event: MouseEvent, noteId: string) => {
  globalUIManager.value?.openOptionsMenu(event, noteId)
})
</script>

<style lang="scss">
/* 应用容器样式 */
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* 标题栏样式（用于自定义窗口标题栏） */
.custom-titlebar {
  position: fixed;
  top: 2px;
  left: 1px;
  width: 70px;
  height: 28px;
  -webkit-app-region: drag; // 允许拖动窗口
  z-index: 9999;
}

/* 布局相关样式 */
.content-wrapper {
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

/* 侧边栏基础样式 */
.sidebar {
  flex-shrink: 0;
  width: v-bind(sidebarWidth + 'px');
  height: 100%;
  transition: all 0.3s ease;
}

/* 悬停侧边栏特殊样式 */
.sidebar.hover-sidebar {
  position: absolute;
  top: 0;
  left: 0;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  z-index: 1001;
}

/* 主内容区域样式 */
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
  z-index: 1002;
}

/* 过渡动画样式 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}

.right-sidebar {
  flex-shrink: 0;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 9999;
  }
}

/* 过渡动画样式 */
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

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}
</style>
