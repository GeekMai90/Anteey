<template>
  <div class="app-container" :class="{ 'theme-dark': isDarkMode }">
    <BaseLayout ref="baseLayout">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" v-if="route.meta.keepAlive" :key="route.fullPath" />
        </keep-alive>
        <component :is="Component" v-if="!route.meta.keepAlive" :key="route.fullPath" />
      </router-view>
    </BaseLayout>

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
    <QuickAddModal :is-visible="isQuickAddVisible" @close="closeQuickAdd" />
    <!-- 主题颜色选择器 -->
    <Teleport to="body">
      <Transition name="fade-scale">
        <ThemeColorPicker
          v-if="themeStore.isThemePickerOpen"
          :style="{
            position: 'fixed',
            left: `${themeStore.themePickerPosition.x}px`,
            top: `${themeStore.themePickerPosition.y}px`
          }"
          @close="themeStore.closeThemePicker"
          @update="handleGradientUpdate"
        />
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, provide, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'
import { useGlobalHotkeys } from '@renderer/composables/useGlobalHotkeys'
import { useWebDAVStore } from '@renderer/stores/webdavStore'
import { useAppearanceStore } from './stores/appearanceStore'
import { useDraftsStore } from '@renderer/stores/draftsStore'
import type { SyncState } from '@shared/types'
import { useThemeStore } from '@renderer/stores/themeStore'
import { useAuthStore } from './stores/authStore'

// 组件导入
import BaseLayout from './components/layout/BaseLayout.vue'
import NoteEditorModal from './components/note/NoteEditorModal.vue'
import GlobalUIManager from './components/ui/GlobalUIManager.vue'
import SearchModal from './components/SearchModal.vue'
import ContextMenu from './components/common/ContexMenu.vue'
import Modal from './components/common/Modal.vue'
import SettingsPage from './components/settings/SettingsPage.vue'
import SharePreviewModal from './components/share/SharePreviewModal.vue'
import QuickAddModal from '@renderer/components/drafts/QuickAddModal.vue'
import ThemeColorPicker from '@renderer/components/settings/ThemeColorPicker.vue'
import { useUIStore } from '@renderer/stores/UIStore'

// 状态管理初始化
const noteStore = useNoteStore()
const appearanceStore = useAppearanceStore()
const router = useRouter()
const route = useRoute()
const webdavStore = useWebDAVStore()
const draftsStore = useDraftsStore()
const themeStore = useThemeStore()
const uiStore = useUIStore()
const authStore = useAuthStore()

interface BaseLayoutInstance {
  checkWindowSize: () => void
  handleResize: () => void
  updateGradient: (gradient: {
    startColor: string
    endColor: string
    angle: number
    noiseAmount: number
  }) => void
}

const baseLayout = ref<BaseLayoutInstance | null>(null)
const globalUIManager = ref<InstanceType<typeof GlobalUIManager> | null>(null)

// 快速添加状态管理
const isQuickAddVisible = ref(false)

// ===== 菜单功能 =====
const { handleBulkExport } = useNoteMenu({
  noteId: '',
  menuItems: ['star']
})

// 处理快捷键
const handleKeydown = (event: KeyboardEvent) => {
  // 支持 Windows(Ctrl) 和 Mac(Cmd) 的快捷键
  const isCmdOrCtrl = event.metaKey || event.ctrlKey

  // 检查是否是需要排除的输入框
  const isExcludedInput =
    // 搜索框、标题输入等场景
    ((event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) &&
      !event.target.closest('.ProseMirror')) || // 排除编辑器内的输入
    // 其他需要排除的可编辑元素
    (event.target instanceof HTMLElement &&
      event.target.isContentEditable &&
      !event.target.closest('.ProseMirror')) // 排除编辑器内的可编辑元素

  if (isCmdOrCtrl && event.key.toLowerCase() === 'd' && !isExcludedInput) {
    console.log('Quick add shortcut triggered!')
    event.preventDefault()
    isQuickAddVisible.value = true
  }
}

// 关闭快速添加窗口
const closeQuickAdd = () => {
  isQuickAddVisible.value = false
}

// 处理渐变更新
const handleGradientUpdate = (gradient: {
  startColor: string
  endColor: string
  angle: number
  noiseAmount: number
}) => {
  baseLayout.value?.updateGradient(gradient)
}

// 初始化主题
const initializeTheme = async () => {
  await themeStore.initializeTheme()
  themeStore.applyTheme()
}

// 修改暗色主题的计算属性
const isDarkMode = computed(() => {
  if (!themeStore.themeSettings) return false
  return (
    themeStore.themeSettings.themeMode === 'dark' ||
    (themeStore.themeSettings.themeMode === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  )
})

// ===== 生命周期钩子 =====
onMounted(async () => {
  // 初始化主题设置
  await initializeTheme()
  // 初始化主题和布局
  // uiStore.initTheme()
  baseLayout.value?.checkWindowSize()
  window.addEventListener('resize', () => baseLayout.value?.handleResize())

  // 路由初始化
  // if (router.currentRoute.value.path === '/') {
  //   router.push('/timeline')
  // }
  // 如果当前在根路径，则跳转到默认页面
  if (router.currentRoute.value.path === '/') {
    await appearanceStore.initializeSettings()
    const defaultPage = appearanceStore.settings?.defaultPage || '/home'
    router.push(defaultPage)
  }

  // 移除加载动画
  const loadingWrapper = document.getElementById('loading-wrapper')
  if (loadingWrapper) {
    loadingWrapper.style.opacity = '0'
    loadingWrapper.style.transition = 'opacity 0.3s'
    setTimeout(() => loadingWrapper?.remove(), 300)
  }

  // 设置菜单事件监听
  window.electronAPI.systemMenu.onMenuNewNote(async () => {
    await noteStore.createAndOpenNewNote()
  })
  window.electronAPI.systemMenu.onMenuExportNotes(async () => {
    await handleBulkExport()
  })

  // 监听同步状态变化
  window.electronAPI.webDAV.syncStateChanged((state: SyncState) => {
    webdavStore.updateSyncState(state)
  })

  // 加载配置并启动自动同步
  await webdavStore.loadConfig()
  if (webdavStore.config?.autoSync) {
    await window.electronAPI.webDAV.startWebDAVAutoSync()
  }

  window.addEventListener('keydown', handleKeydown)
  console.log('Keydown event listener added')

  // 初始化草稿纸
  try {
    await draftsStore.fetchDraft()
    if (!draftsStore.currentDraft) {
      await draftsStore.createDraft()
    }
  } catch (error) {
    console.error('Failed to initialize draft:', error)
  }

  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    if (themeStore.themeSettings?.themeMode === 'system') {
      themeStore.applyTheme()
    }
  })

  await authStore.initAuth()
})

onUnmounted(() => {
  // 清理事件监听
  window.removeEventListener('resize', () => baseLayout.value?.handleResize())
  window.electronAPI.systemMenu.removeAllListeners('menu-new-note')
  window.electronAPI.systemMenu.removeAllListeners('menu-export-notes')
  window.electronAPI.systemMenu.removeAllListeners('sync-state-changed')
  window.removeEventListener('keydown', handleKeydown)
})

// 全局方法注入
provide('openOptionsMenu', (event: MouseEvent, noteId: string) => {
  globalUIManager.value?.openOptionsMenu(event, noteId)
})

// 初始化全局热键
useGlobalHotkeys()
</script>

<style lang="scss">
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;

  // 添加主题切换过渡
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

// 主题选择器弹出层样式
.theme-color-picker {
  position: fixed !important;
  z-index: 9999;
}

// 弹出动画
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
