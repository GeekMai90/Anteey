<template>
  <!-- 应用程序根容器，支持深色主题切换 -->
  <div class="app-container" :class="{ 'theme-dark': uiStore.isDarkTheme }">
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
          <keep-alive>
            <component :is="Component" v-if="$route.meta.keepAlive" :key="$route.fullPath" />
          </keep-alive>
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

    <!-- 左侧悬停触发区域 -->
    <div
      v-if="uiStore.isSidebarCollapsed"
      class="hover-zone"
      @mouseenter="showSidebar"
      @mouseleave="scheduleHideSidebar"
    ></div>

    <!-- 全局模态框组件 -->
    <NoteEditorModal />
    <GlobalUIManager ref="globalUIManager" />
    <SearchModal ref="searchModal" />
    <ContextMenu />
    <Modal v-model="uiStore.showSettingsPage" @outside-click="uiStore.closeSettingsPage">
      <SettingsPage />
    </Modal>
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
import { useDebounceFn } from '@vueuse/core'
import { useUIStore } from './stores/useUIStore'
import { useNoteStore } from './stores/noteStores'
import { useNoteMenu } from './composables/useNoteMenu'
import { useGlobalHotkeys } from './composables/useGlobalHotkeys'

// 组件导入
import Sidebar from './components/layout/Sidebar.vue'
import RightSidebar from './components/layout/RightSidebar.vue'
import NoteEditorModal from './components/note/NoteEditorModal.vue'
import GlobalUIManager from './components/ui/GlobalUIManager.vue'
import SearchModal from './components/SearchModal.vue'
import ContextMenu from './components/common/ContexMenu.vue'
import Modal from './components/common/Modal.vue'
import SettingsPage from './components/settings/SettingsPage.vue'
import SharePreviewModal from './components/share/SharePreviewModal.vue'

// 状态管理初始化
const uiStore = useUIStore()
const noteStore = useNoteStore()
const router = useRouter()

// 全局UI管理器引用
const globalUIManager = ref<InstanceType<typeof GlobalUIManager> | null>(null)

// ===== 侧边栏状态管理 =====
const isTemporaryVisible = ref(false)
let hideSidebarTimeout: number | undefined = undefined
const sidebarWidth = ref(250)
const rightSidebarWidth = ref(400)

// 右侧边栏样式计算
const rightSidebarStyle = computed(() => ({
  transform: uiStore.isRightSidebarOpen ? 'translateX(0)' : 'translateX(100%)',
  width: `${rightSidebarWidth.value}px`
}))

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

const debouncedCheckWindowSize = useDebounceFn(checkWindowSize, 200)

// ===== 菜单功能 =====
const { handleBulkExport } = useNoteMenu({
  noteId: '',
  menuItems: ['star']
})

// ===== 生命周期钩子 =====
onMounted(async () => {
  // 初始化主题和布局
  uiStore.initTheme()
  debouncedCheckWindowSize()
  window.addEventListener('resize', debouncedCheckWindowSize)

  // 路由初始化
  if (router.currentRoute.value.path === '/') {
    router.push('/timeline')
  }

  // 移除加载动画
  const loadingWrapper = document.getElementById('loading-wrapper')
  if (loadingWrapper) {
    loadingWrapper.style.opacity = '0'
    loadingWrapper.style.transition = 'opacity 0.3s'
    setTimeout(() => loadingWrapper?.remove(), 300)
  }

  // 设置菜单事件监听
  window.electronAPI.onMenuNewNote(async () => {
    await noteStore.createAndOpenNewNote()
  })
  window.electronAPI.onMenuExportNotes(async () => {
    await handleBulkExport()
  })
})

onUnmounted(() => {
  // 清理事件监听
  window.removeEventListener('resize', debouncedCheckWindowSize)
  window.electronAPI.removeAllListeners('menu-new-note')
  window.electronAPI.removeAllListeners('menu-export-notes')
})

// 全局方法注入
provide('openOptionsMenu', (event: MouseEvent, noteId: string) => {
  globalUIManager.value?.openOptionsMenu(event, noteId)
})

// 初始化全局热键
useGlobalHotkeys()
</script>

<style lang="scss">
/* 基础布局样式 */
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.content-wrapper {
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

/* 侧边栏样式 */
.sidebar {
  flex-shrink: 0;
  width: v-bind(sidebarWidth + 'px');
  height: 100%;
  transition: all 0.3s ease;

  &.hover-sidebar {
    position: absolute;
    top: 0;
    left: 0;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
    z-index: 1001;
  }
}

/* 主内容区域样式 */
.main-content {
  flex-grow: 1;
  overflow-y: auto;
  min-width: 0;
  transition: margin-left 0.3s ease;
}

/* 悬停触发区样式 */
.hover-zone {
  position: absolute;
  top: 0;
  left: 0;
  width: 10px;
  height: 100%;
  z-index: 1002;
}

/* 右侧边栏样式 */
.right-sidebar {
  flex-shrink: 0;
}

/* 过渡动画 */
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
</style>
