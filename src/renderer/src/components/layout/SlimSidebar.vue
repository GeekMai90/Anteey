<template>
  <div class="slim-sidebar">
    <!-- 窗口控制按钮 -->
    <div class="sidebar-titlebar">
      <div class="window-controls">
        <button class="window-button close" @click="handleClose">
          <div class="icon">
            <svg width="6" height="6" viewBox="0 0 8 8" fill="none">
              <path
                d="M1.5 1.5L6.5 6.5M1.5 6.5L6.5 1.5"
                stroke="currentColor"
                stroke-width="1"
                stroke-linecap="round"
              />
            </svg>
          </div>
        </button>
        <button class="window-button minimize" @click="handleMinimize">
          <div class="icon">
            <svg width="6" height="6" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4H6.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
            </svg>
          </div>
        </button>
        <button class="window-button maximize" @click="handleMaximize">
          <div class="icon">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path
                d="M1.5 1.5H6.5V6.5H1.5V1.5Z"
                stroke="currentColor"
                stroke-width="1"
                stroke-linecap="round"
              />
            </svg>
          </div>
        </button>
      </div>
    </div>

    <!-- 主要功能按钮 -->
    <div class="action-buttons">
      <!-- 主页按钮 -->
      <button
        v-tooltip.right="{
          content: '主页',
          delay: { show: 500 }
        }"
        class="action-btn"
        @click="router.push('/home')"
      >
        <div class="icon">
          <Home theme="outline" size="18" fill="var(--color-sidebar-icon)" :strokeWidth="3" />
        </div>
      </button>

      <!-- 时光记 -->
      <button
        v-if="timeBlockStore.settings.enabled"
        v-tooltip.right="{
          content: '时光记',
          delay: { show: 500 }
        }"
        class="action-btn"
        @click="router.push('/timeblock')"
      >
        <div class="icon">
          <Time theme="outline" size="18" fill="var(--color-sidebar-icon)" :strokeWidth="3" />
        </div>
      </button>

      <!-- 笔记流 -->
      <button
        v-tooltip.right="{
          content: '笔记流',
          delay: { show: 500 }
        }"
        class="action-btn"
        @click="router.push('/timeline')"
      >
        <div class="icon">
          <NotebookOne
            theme="outline"
            size="18"
            fill="var(--color-sidebar-icon)"
            :strokeWidth="3"
          />
        </div>
      </button>

      <!-- 卡片盒 -->
      <!-- 暂时去掉悬停出现菜单 -->
      <!-- @mouseenter="showQuickAccess($event)"
      @mouseleave="handleMenuLeave($event)" -->
      <button class="action-btn" @click="handleCardboxClick">
        <div class="icon">
          <Box theme="outline" size="18" fill="var(--color-sidebar-icon)" :strokeWidth="3" />
        </div>
      </button>

      <!-- 知识树 -->
      <button
        v-tooltip.right="{
          content: '知识树',
          delay: { show: 500 }
        }"
        class="action-btn"
        @click="router.push('/knowledge-tree')"
      >
        <div class="icon">
          <Sapling theme="outline" size="18" fill="var(--color-sidebar-icon)" :strokeWidth="3" />
        </div>
      </button>

      <!-- 记忆卡 -->
      <button
        v-tooltip.right="{
          content: '记忆卡',
          delay: { show: 500 }
        }"
        class="action-btn"
        @click="router.push('/flashcard')"
      >
        <div class="icon">
          <StorageCardOne
            theme="outline"
            size="18"
            fill="var(--color-sidebar-icon)"
            :strokeWidth="3"
          />
        </div>
      </button>

      <!-- 思维板 -->
      <button
        v-tooltip.right="{
          content: '思维板',
          delay: { show: 500 }
        }"
        class="action-btn"
        @click="router.push('/mindboard')"
      >
        <div class="icon">
          <Workbench theme="outline" size="18" fill="var(--color-sidebar-icon)" :strokeWidth="3" />
        </div>
      </button>

      <!-- 写作台 -->
      <button
        v-tooltip.right="{
          content: '写作台',
          delay: { show: 500 }
        }"
        class="action-btn"
        @click="router.push('/writing-desk')"
      >
        <div class="icon">
          <NotebookAndPen
            theme="outline"
            size="18"
            fill="var(--color-sidebar-icon)"
            :strokeWidth="3"
          />
        </div>
      </button>

      <!-- 收件箱按钮 -->
      <button
        v-tooltip.right="{
          content: '收件箱',
          delay: { show: 500 }
        }"
        class="action-btn"
        @click="router.push('/inbox')"
      >
        <div class="icon">
          <Inbox theme="outline" size="18" fill="var(--color-sidebar-icon)" :strokeWidth="3" />
        </div>
      </button>

      <!-- 多标签按钮 -->
      <button
        v-tooltip.right="{
          content: '多标签',
          delay: { show: 500 }
        }"
        class="action-btn"
        data-menu="tabs"
        @mouseenter="showTabsMenu($event)"
        @mouseleave="handleTabsButtonLeave"
      >
        <div class="icon">
          <BookmarkOne
            theme="outline"
            size="18"
            fill="var(--color-sidebar-icon)"
            :strokeWidth="3"
          />
        </div>
      </button>
    </div>
    <QuickAccessMenu
      v-if="isQuickAccessVisible"
      v-model:visible="isQuickAccessVisible"
      :trigger-rect="triggerRect!"
      @mouseleave="handleMenuLeave"
    />
    <FloatingTabsList
      v-if="isTabsMenuVisible"
      v-model:visible="isTabsMenuVisible"
      :button-position="tabsButtonPosition || undefined"
      @mouseleave="handleTabsMenuLeave"
      @mouseenter="cancelTabsMenuHide"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
// import { useUIStore } from '@renderer/stores/UIStore'
import {
  Home,
  Inbox,
  Time,
  Box,
  Workbench,
  Sapling,
  StorageCardOne,
  NotebookOne,
  NotebookAndPen,
  BookmarkOne
} from '@icon-park/vue-next'
// import { useNoteStore } from '@renderer/stores/noteStore'
import { useTimeBlockStore } from '@renderer/stores/timeBlockStore'
import QuickAccessMenu from '@renderer/components/layout/QuickAccessMenu.vue'
import FloatingTabsList from '@renderer/components/Tabs/FloatingTabsList.vue'

const router = useRouter()
// const uiStore = useUIStore()
// const noteStore = useNoteStore()
const timeBlockStore = useTimeBlockStore()
const isMaximized = ref(false)

// 快速访问菜单相关
const isQuickAccessVisible = ref(false)
const triggerRect = ref<DOMRect | null>(null)
let hideTimeout: NodeJS.Timeout | null = null

// 多标签菜单相关
const isTabsMenuVisible = ref(false)
let tabsMenuHideTimeout: NodeJS.Timeout | null = null

// 添加变量保存按钮位置
const tabsButtonPosition = ref<{ top: number; left: number } | undefined>(undefined)

// 添加全局鼠标移动变量和跟踪
let isMouseOverTabsArea = false

// 获取打开标签页概览的方法
// const openTabsOverview = inject('openTabsOverview') as () => void

// 窗口控制相关
onMounted(async () => {
  isMaximized.value = await window.electronAPI.window.isMaximized()
  await timeBlockStore.fetchSettings()

  // 添加点击外部区域关闭菜单的处理
  document.addEventListener('click', handleClickOutside)

  // 监听QuickAccessMenu进入事件，取消可能的隐藏定时器
  document.addEventListener('quickAccessMenuEnter', () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout)
      hideTimeout = null
    }
  })

  // 添加全局鼠标移动监听，用于跟踪鼠标位置
  document.addEventListener('mousemove', handleGlobalMouseMove)

  // ESC键关闭所有菜单
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      isQuickAccessVisible.value = false
      isTabsMenuVisible.value = false
    }
  })
})

onUnmounted(() => {
  // 清理定时器和事件监听
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
  if (tabsMenuHideTimeout) {
    clearTimeout(tabsMenuHideTimeout)
  }
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('quickAccessMenuEnter', () => {})
  document.removeEventListener('keydown', () => {})
  document.removeEventListener('mousemove', handleGlobalMouseMove)
})

// 处理菜单离开事件
const handleMenuLeave = (event: MouseEvent) => {
  const relatedTarget = event.relatedTarget as HTMLElement

  // 如果相关目标为空（例如，移出窗口），不要立即关闭
  if (!relatedTarget) return

  // 检查鼠标是否移动到了相关元素上
  if (!relatedTarget?.closest('.action-btn') && !relatedTarget?.closest('.quick-access-menu')) {
    // 增加延迟时间，给用户更多时间移动到菜单
    hideTimeout = setTimeout(() => {
      isQuickAccessVisible.value = false
    }, 300) // 添加稍长的延迟，使鼠标移动到菜单更容易
  }
}

// 处理点击外部区域关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement

  // 处理快速访问菜单
  if (!target.closest('.action-btn') && !target.closest('.quick-access-menu')) {
    isQuickAccessVisible.value = false
  }

  // 处理多标签菜单
  if (!target.closest('.action-btn') && !target.closest('.floating-tabs-menu')) {
    isTabsMenuVisible.value = false
  }
}

const handleClose = () => {
  window.electronAPI.window.close()
}

const handleMinimize = () => {
  window.electronAPI.window.minimize()
}

const handleMaximize = async () => {
  await window.electronAPI.window.maximize()
  isMaximized.value = await window.electronAPI.window.isMaximized()
}

// // 打开搜索
// const openSearch = () => {
//   uiStore.openSearchModal()
// }

// // 创建新笔记
// const createNewCard = async () => {
//   try {
//     await noteStore.createAndOpenNewNote()
//   } catch (error) {
//     console.error('创建笔记失败:', error)
//   }
// }

// 处理卡片盒点击
const handleCardboxClick = () => {
  // 导航到卡片盒页面
  router.push('/cardbox')
  // 隐藏悬浮菜单
  isQuickAccessVisible.value = false
}

// 显示多标签菜单
const showTabsMenu = (event: MouseEvent) => {
  // 清除可能存在的隐藏定时器
  if (tabsMenuHideTimeout) {
    clearTimeout(tabsMenuHideTimeout)
    tabsMenuHideTimeout = null
  }

  // 获取按钮位置
  const buttonElement = event.currentTarget as HTMLElement
  const buttonRect = buttonElement.getBoundingClientRect()

  // 确保菜单顶部与按钮顶部对齐，右侧紧贴侧边栏
  tabsButtonPosition.value = {
    top: buttonRect.top,
    left: buttonRect.right + 6 // 按钮右侧加一点间距
  }

  // 显示菜单
  isTabsMenuVisible.value = true

  // 如果打开了快速访问菜单，关闭它
  if (isQuickAccessVisible.value) {
    isQuickAccessVisible.value = false
  }
}

// 处理按钮鼠标离开事件
const handleTabsButtonLeave = (event: MouseEvent) => {
  const relatedTarget = event.relatedTarget as HTMLElement

  // 检查鼠标是否直接移到了菜单上
  if (relatedTarget?.closest('.floating-tabs-menu')) {
    return
  }

  // 延迟设置隐藏，给足够时间让鼠标移到菜单上
  tabsMenuHideTimeout = setTimeout(() => {
    // 再次检查当前鼠标是否在菜单或按钮上
    const menuElement = document.querySelector('.floating-tabs-menu')
    const buttonElement = document.querySelector('.action-btn[data-menu="tabs"]')

    if (
      (menuElement && menuElement.matches(':hover')) ||
      (buttonElement && buttonElement.matches(':hover'))
    ) {
      return // 如果鼠标在菜单或按钮上，不隐藏
    }

    isTabsMenuVisible.value = false
  }, 100)
}

// 处理多标签菜单离开事件
const handleTabsMenuLeave = (event: MouseEvent) => {
  const relatedTarget = event.relatedTarget as HTMLElement

  // 如果鼠标移回到按钮上，不要隐藏菜单
  if (relatedTarget?.closest('.action-btn')) {
    return
  }

  // 如果上下文菜单打开，不关闭悬浮菜单
  if (relatedTarget?.closest('.global-context-menu')) {
    return
  }

  // 设置延迟隐藏
  tabsMenuHideTimeout = setTimeout(() => {
    isTabsMenuVisible.value = false
  }, 200)
}

// 取消菜单隐藏定时器
const cancelTabsMenuHide = () => {
  if (tabsMenuHideTimeout) {
    clearTimeout(tabsMenuHideTimeout)
    tabsMenuHideTimeout = null
  }
}

// 处理全局鼠标移动
const handleGlobalMouseMove = (e: MouseEvent) => {
  // 检查鼠标是否在多标签按钮或悬浮菜单上
  const tabsButton = document.querySelector('.action-btn[data-menu="tabs"]')
  const tabsMenu = document.querySelector('.floating-tabs-menu')

  // 检查必要的元素是否存在
  if (!tabsButton) {
    isMouseOverTabsArea = false
    return
  }

  // 判断鼠标是否在元素区域内
  const isOverButton = elementContainsPoint(tabsButton as HTMLElement, e.clientX, e.clientY)

  // 判断是否在菜单上(如果菜单显示且存在)
  let isOverMenu = false
  if (isTabsMenuVisible.value && tabsMenu) {
    isOverMenu = elementContainsPoint(tabsMenu as HTMLElement, e.clientX, e.clientY)
  }

  // 更新鼠标是否在目标区域
  const wasOverTabsArea = isMouseOverTabsArea
  isMouseOverTabsArea = isOverButton || isOverMenu

  // 显示/隐藏逻辑
  if (isMouseOverTabsArea && !wasOverTabsArea) {
    // 鼠标刚移入区域
    if (!isTabsMenuVisible.value) {
      // 创建菜单，使用现有按钮元素的位置
      showTabsMenuFromPosition(tabsButton as HTMLElement)
    }
    // 取消任何隐藏定时器
    cancelTabsMenuHide()
  } else if (!isMouseOverTabsArea && wasOverTabsArea) {
    // 鼠标刚移出区域
    handleTabsAreaLeave()
  }
}

// 从指定元素位置显示菜单（供全局鼠标移动使用）
const showTabsMenuFromPosition = (buttonElement: HTMLElement) => {
  // 清除可能存在的隐藏定时器
  if (tabsMenuHideTimeout) {
    clearTimeout(tabsMenuHideTimeout)
    tabsMenuHideTimeout = null
  }

  // 获取按钮位置
  const buttonRect = buttonElement.getBoundingClientRect()

  // 确保菜单顶部与按钮顶部对齐，右侧紧贴侧边栏
  tabsButtonPosition.value = {
    top: buttonRect.top,
    left: buttonRect.right + 6 // 按钮右侧加一点间距
  }

  // 显示菜单
  isTabsMenuVisible.value = true

  // 如果打开了快速访问菜单，关闭它
  if (isQuickAccessVisible.value) {
    isQuickAccessVisible.value = false
  }
}

// 检查元素是否包含指定点
const elementContainsPoint = (element: HTMLElement, x: number, y: number) => {
  const rect = element.getBoundingClientRect()
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

// 处理标签区域离开
const handleTabsAreaLeave = () => {
  // 检查是否有上下文菜单打开
  const contextMenu = document.querySelector('.global-context-menu')
  if (contextMenu) return

  // 添加短暂延迟再隐藏，避免边缘情况
  tabsMenuHideTimeout = setTimeout(() => {
    if (!isMouseOverTabsArea) {
      isTabsMenuVisible.value = false
    }
  }, 200)
}
</script>

<style lang="scss" scoped>
.slim-sidebar {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  height: 100%;
  width: 32px;
  background: transparent;
  // border-radius: 14px;
  overflow: visible;
  transition: all 0.3s ease;
  z-index: 100;
  padding: 0 0 14px 0;
}

.sidebar-titlebar {
  height: 18px;
  -webkit-app-region: drag;
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0 8px;
  margin-bottom: 10px;
  flex-shrink: 0;

  .window-controls {
    position: absolute;
    left: -7px;
    top: 4px;
    display: flex;
    gap: 5px;
    -webkit-app-region: no-drag;
    z-index: 100;
  }

  .window-button {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: none;
    padding: 0;
    position: relative;
    cursor: pointer;
    transition: all 0.2s ease;

    &.close {
      background: #ff5f57;
      &:hover {
        background: #ff4343;
      }
    }

    &.minimize {
      background: #febc2e;
      &:hover {
        background: #fead1c;
      }
    }

    &.maximize {
      background: #28c840;
      &:hover {
        background: #24b539;
      }
    }

    // 添加图标
    .icon {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;

      svg {
        width: 6px;
        height: 6px;
      }
    }

    &:hover .icon {
      opacity: 0.7;
    }

    &.close .icon {
      color: #4d0000; // 深红色
    }

    &.minimize .icon,
    &.maximize .icon {
      color: #006500; // 深绿色
    }
  }
}

.action-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0px 0 8px 0;
  width: 100%;
  margin-top: 0;
  overflow-y: auto;
  max-height: calc(100% - 40px);
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  padding: 0;
  flex-shrink: 0;

  &:hover {
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0) scale(0.96);
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.5;
    transition: opacity 0.2s ease;

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

  &:hover .icon {
    opacity: 1;
  }
}
</style>
