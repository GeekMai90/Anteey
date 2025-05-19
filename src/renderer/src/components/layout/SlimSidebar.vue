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

      <!-- 搜索按钮 -->
      <!-- <button
        v-tooltip.right="{
          content: '搜索 (⌘ S)',
          delay: { show: 500 }
        }"
        class="action-btn"
        @click="openSearch"
      >
        <div class="icon">
          <Search theme="outline" size="18" fill="var(--color-sidebar-icon)" :strokeWidth="3" />
        </div>
      </button> -->
      <!-- <button
        v-tooltip.right="{
          content: '新建笔记 (⌘ N)',
          delay: { show: 500 }
        }"
        class="action-btn"
        @click="createNewCard"
      >
        <div class="icon">
          <Plus theme="outline" size="18" fill="var(--color-sidebar-icon)" :strokeWidth="3" />
        </div>
      </button> -->
    </div>
    <QuickAccessMenu
      v-if="isQuickAccessVisible"
      v-model:visible="isQuickAccessVisible"
      :trigger-rect="triggerRect!"
      @mouseleave="handleMenuLeave"
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
  NotebookAndPen
} from '@icon-park/vue-next'
// import { useNoteStore } from '@renderer/stores/noteStore'
import { useTimeBlockStore } from '@renderer/stores/timeBlockStore'
import QuickAccessMenu from '@renderer/components/layout/QuickAccessMenu.vue'

const router = useRouter()
// const uiStore = useUIStore()
// const noteStore = useNoteStore()
const timeBlockStore = useTimeBlockStore()
const isMaximized = ref(false)

// 快速访问菜单相关
const isQuickAccessVisible = ref(false)
const triggerRect = ref<DOMRect | null>(null)
let hideTimeout: NodeJS.Timeout | null = null

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
})

onUnmounted(() => {
  // 清理定时器和事件监听
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('quickAccessMenuEnter', () => {})
})

// 显示菜单
// const showQuickAccess = (event: MouseEvent) => {
//   if (hideTimeout) {
//     clearTimeout(hideTimeout)
//     hideTimeout = null
//   }

//   // 为窄侧边栏优化菜单位置
//   const target = event.currentTarget as HTMLElement
//   const rect = target.getBoundingClientRect()
//   // 在卡片盒按钮的右侧显示菜单
//   triggerRect.value = {
//     ...rect,
//     // 确保菜单出现在按钮右侧而不是下方
//     right: rect.right,
//     // 使用按钮的top作为菜单的top
//     top: rect.top
//   } as DOMRect
//   isQuickAccessVisible.value = true
// }

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
  if (!target.closest('.action-btn') && !target.closest('.quick-access-menu')) {
    isQuickAccessVisible.value = false
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
    top: 13px;
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
  padding: 14px 0 8px 0;
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
