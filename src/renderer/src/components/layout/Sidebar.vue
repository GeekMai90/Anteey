<!-- src/renderer/src/components/Sidebar.vue -->
<template>
  <div class="sidebar" :style="{ width: `${sidebarWidth}px` }">
    <div class="sidebar-header">
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
                <path
                  d="M1.5 4H6.5"
                  stroke="currentColor"
                  stroke-width="1"
                  stroke-linecap="round"
                />
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
      <div class="antinet-button" @click.stop="uiStore.toggleSettingDropdown">
        <div class="left-section">
          <img src="@resources/icon.png" alt="Anteey" class="antinet-icon" />
          <div class="antinet-text">Anteey</div>
        </div>
        <div class="right-section">
          <!-- 同步按钮 -->
          <div
            v-if="webdavStore.config?.url && webdavStore.config?.username"
            v-tooltip.top="{
              content: getSyncStatusText,
              delay: { show: 1000 },
              html: true
            }"
            class="sync-button"
            :class="syncStatusClass"
            @click.stop="handleSync"
          >
            <div class="icon">
              <component
                :is="syncStatusIcon"
                theme="outline"
                size="16"
                fill="var(--color-sidebar-text)"
                :strokeWidth="2"
              />
            </div>
          </div>
          <div class="status-icon" :class="saveStatusClass"></div>
          <SettingDropdownMenu />
        </div>
      </div>
      <!-- 新增搜索区域 -->
      <div class="action-btn-area">
        <!-- 主页按钮 -->
        <button
          v-tooltip.top="{
            content: '主页',
            delay: { show: 1000 }
          }"
          class="action-btn"
          @click="router.push('/home')"
        >
          <div class="icon">
            <Home theme="outline" size="16" fill="var(--color-sidebar-icon)" :strokeWidth="3" />
          </div>
        </button>

        <!-- 草稿纸按钮 -->
        <!-- <button
          v-tooltip.top="{
            content: '草稿纸',
            delay: { show: 1000 }
          }"
          class="action-btn"
          @click="router.push('/drafts')"
        >
          <div class="icon">
            <Pencil theme="outline" size="16" fill="var(--color-sidebar-icon)" :strokeWidth="3" />
          </div>
        </button> -->
        <!-- 草稿纸按钮 -->
        <button
          v-tooltip.top="{
            content: '随机回顾',
            delay: { show: 1000 }
          }"
          class="action-btn"
          @click="uiStore.openReviewModal"
        >
          <div class="icon">
            <Cup theme="outline" size="16" fill="var(--color-sidebar-icon)" :strokeWidth="3" />
          </div>
        </button>
        <!-- 搜索按钮 -->
        <button
          v-tooltip.top="{
            content: '搜索<br>⌘ S',
            delay: { show: 1000 },
            html: true
          }"
          class="action-btn"
          @click="openSearch"
        >
          <div class="icon">
            <Search theme="outline" size="16" fill="var(--color-sidebar-icon)" :strokeWidth="3" />
          </div>
        </button>

        <!-- 主题切换按钮 -->
        <button
          v-tooltip.top="{
            content: isDarkMode ? '切换亮色主题' : '切换暗色主题',
            delay: { show: 1000 }
          }"
          class="action-btn"
          @click="themeStore.toggleThemeMode()"
        >
          <div class="icon">
            <component
              :is="isDarkMode ? SunOne : Moon"
              theme="outline"
              size="16"
              fill="var(--color-sidebar-icon)"
              :strokeWidth="3"
            />
          </div>
        </button>

        <!-- 新建笔记按钮 -->
        <button
          v-tooltip.top="{
            content: '新建笔记<br>⌘ N',
            delay: { show: 1000 },
            html: true
          }"
          class="action-btn"
          @click="createNewCard"
        >
          <div class="icon">
            <Plus theme="outline" size="16" fill="var(--color-sidebar-icon)" :strokeWidth="3" />
          </div>
        </button>
      </div>
    </div>
    <!-- 添加可滚动容器 -->

    <div class="sidebar-nav">
      <nav>
        <ul>
          <li v-for="item in menuItems" :key="item.name" class="nav-item-wrapper">
            <div
              class="nav-item"
              :class="{ active: isActiveOrHasActiveChild(item) }"
              @mouseenter="item.path === '/cardbox' ? showQuickAccess($event) : null"
              @mouseleave="item.path === '/cardbox' ? handleMenuLeave($event) : null"
            >
              <router-link
                :to="item.path"
                class="nav-link"
                :class="{ active: isActive(item.path) }"
              >
                <div class="icon">
                  <component
                    :is="item.icon"
                    theme="outline"
                    size="18"
                    :fill="getIconFill(item.path)"
                    :strokeWidth="2"
                  />
                </div>
                <div class="name">{{ item.name }}</div>
              </router-link>
              <!-- Quick Access Menu -->
              <QuickAccessMenu
                v-if="item.path === '/cardbox' && isQuickAccessVisible"
                v-model:visible="isQuickAccessVisible"
                :trigger-rect="triggerRect as DOMRect"
                @mouseleave="handleMenuLeave"
              />
            </div>
          </li>
        </ul>
      </nav>
    </div>
    <div class="sidebar-header-divider"></div>
    <!-- 将 segment-control 移到滚动区域外部 -->
    <div class="segment-control">
      <!-- 添加背景滑块 -->
      <div
        class="segment-slider"
        :style="{
          transform: `translateX(${activeSegment === 'starred' ? 0 : activeSegment === 'tags' ? 100 : 200}%)`,
          width: 'calc(33.333% - 2.67px)'
        }"
      ></div>

      <!-- 原有的按钮 -->
      <button
        class="segment-button"
        :class="{ active: activeSegment === 'starred' }"
        @click="switchSegment('starred')"
      >
        <div class="icon">
          <Star theme="outline" size="16" fill="var(--color-sidebar-text)" :strokeWidth="2" />
        </div>
        <span>星标</span>
      </button>
      <button
        class="segment-button"
        :class="{ active: activeSegment === 'tags' }"
        @click="switchSegment('tags')"
      >
        <div class="icon">
          <Tag theme="outline" size="16" fill="var(--color-sidebar-text)" :strokeWidth="2" />
        </div>
        <span>标签</span>
      </button>
      <button
        class="segment-button"
        :class="{ active: activeSegment === 'recent' }"
        @click="switchSegment('recent')"
      >
        <div class="icon">
          <Time theme="outline" size="16" fill="var(--color-sidebar-text)" :strokeWidth="2" />
        </div>
        <span>最近</span>
      </button>
    </div>
    <!-- 滚动区域只包含内容部分 -->
    <div class="scrollable-content">
      <div class="segment-content">
        <StarredNotes v-show="activeSegment === 'starred'" :active="activeSegment === 'starred'" />
        <TagsTree v-show="activeSegment === 'tags'" :active="activeSegment === 'tags'" />
        <RecentNotes v-show="activeSegment === 'recent'" :active="activeSegment === 'recent'" />
      </div>
    </div>
    <div class="resize-handle" @mousedown="startResize"></div>
    <div class="sidebar-footer">
      <div class="new-card-wrapper"></div>
      <!-- 清除空笔记 -->
      <div
        v-tooltip.top="{ content: '清除空笔记', delay: { show: 1000 } }"
        class="clear-empty-note"
        @click="noteStore.moveEmptyNotesToTrash"
      >
        <div class="icon">
          <Clear theme="outline" size="20" fill="var(--color-sidebar-text)" :strokeWidth="2" />
        </div>
      </div>

      <!-- <button class="theme-button" @click="handleThemeButtonClick">
        <div class="icon">
          <Theme theme="outline" size="20" :strokeWidth="2" fill="var(--color-sidebar-text)" />
        </div>
      </button> -->
      <div
        v-tooltip.top="{ content: '主题设置', delay: { show: 1000 } }"
        class="theme-button"
        @click="handleThemeButtonClick"
      >
        <div class="icon">
          <Theme theme="outline" size="20" :strokeWidth="2" fill="var(--color-sidebar-text)" />
        </div>
      </div>
      <div
        v-tooltip.top="{ content: '帮助中心', delay: { show: 1000 } }"
        class="help"
        @click="openHelp"
      >
        <div class="icon">
          <Help theme="outline" size="20" fill="var(--color-sidebar-text)" :strokeWidth="2" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  Time,
  Box,
  Workbench,
  Plus,
  Search,
  Help,
  Home,
  Clear,
  Moon,
  SunOne,
  Sapling,
  LinkCloud,
  LinkCloudFaild,
  LinkCloudSucess,
  StorageCardOne,
  NotebookOne,
  Theme,
  Star,
  Tag,
  HandPaintedPlate,
  Cup
} from '@icon-park/vue-next'
import { useNoteStore } from '@renderer/stores/noteStore'
import SettingDropdownMenu from '@renderer/components/settings/SettingDropdownMenu.vue'
import StarredNotes from '@renderer/components/layout/StarredNotes.vue'
import { useUIStore } from '@renderer/stores/UIStore'
import { useRoute, useRouter } from 'vue-router'
import RecentNotes from '@renderer/components/layout/RecentNotes.vue'
import { storeToRefs } from 'pinia'
import TagsTree from '@renderer/components/layout/TagsTree.vue'
import QuickAccessMenu from '@renderer/components/layout/QuickAccessMenu.vue'
import { useTimeBlockStore } from '@renderer/stores/timeBlockStore'
import { useAppearanceStore } from '@renderer/stores/appearanceStore'
import { useWebDAVStore } from '@renderer/stores/webdavStore'
import { message } from '@renderer/utils/message'
import { useThemeStore } from '@renderer/stores/themeStore'

const imageSrc = ref('')
const uiStore = useUIStore()
const route = useRoute()
const router = useRouter()
const timeBlockStore = useTimeBlockStore()
const appearanceStore = useAppearanceStore()
const webdavStore = useWebDAVStore()
const themeStore = useThemeStore()

const getIconFill = computed(
  () => (path: string) =>
    route.path === path ? 'var(--color-sidebar-nav-icon)' : 'var(--color-sidebar-nav-icon)'
)

onMounted(async () => {
  imageSrc.value = await window.electronAPI.shell.getResourcePath('icon.png')
  await timeBlockStore.fetchSettings()
  await webdavStore.loadConfig()
  await webdavStore.loadSyncHistory()
  isMaximized.value = await window.electronAPI.window.isMaximized()
})

const menuItems = computed(() => {
  const baseItems = [
    // { name: '主页', path: '/home', icon: Home },
    // 根据设置决定是否显示时间块
    ...(timeBlockStore.settings.enabled
      ? [{ name: '时光记', path: '/timeblock', icon: Time }]
      : []),
    // { name: '草稿纸', path: '/drafts', icon: Pencil },
    { name: '笔记流', path: '/timeline', icon: NotebookOne },
    { name: '卡片盒', path: '/cardbox', icon: Box },
    { name: '知识树', path: '/knowledge-tree', icon: Sapling },
    { name: '记忆卡', path: '/flashcard', icon: StorageCardOne },

    // 根据设置决定是否显示白板
    ...(appearanceStore.settings?.enableWhiteboard
      ? [{ name: '思维板', path: '/whiteboard', icon: Workbench }]
      : []),
    { name: '手绘板', path: '/ed-whiteboard', icon: HandPaintedPlate }
  ]
  return baseItems
})

const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}

const isActiveOrHasActiveChild = (item: any) => {
  return isActive(item.path)
}

const noteStore = useNoteStore()
const { getCurrentNoteSaveStatus } = storeToRefs(noteStore)
// 使用计算属性来处理保存状态的显示
// 简化状态类的计算
const saveStatusClass = computed(() => {
  return {
    'status-saving': getCurrentNoteSaveStatus.value === 'saving',
    'status-saved': getCurrentNoteSaveStatus.value === 'saved',
    'status-error': getCurrentNoteSaveStatus.value === 'error'
  }
})

// 侧边栏宽度调节
const emit = defineEmits<{
  (e: 'resize', width: number): void
}>()

const sidebarWidth = ref(230)
const MIN_WIDTH = 230
const MAX_WIDTH = 400

watch(sidebarWidth, (newWidth) => {
  emit('resize', newWidth)
})

const startResize = (e: MouseEvent) => {
  e.preventDefault()
  document.addEventListener('mousemove', resize)
  document.addEventListener('mouseup', stopResize)
}

const resize = (e: MouseEvent) => {
  let newWidth = e.clientX
  if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH
  if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH
  sidebarWidth.value = newWidth
}

const stopResize = () => {
  document.removeEventListener('mousemove', resize)
  document.removeEventListener('mouseup', stopResize)
}

const createNewCard = () => {
  // 实现新建卡片的逻辑
  noteStore.createAndOpenNewNote()
  console.log('创建新卡片')
}

const openSearch = () => {
  // 实现打开搜索的逻辑
  uiStore.openSearchModal()
  console.log('打开搜索')
}

const openHelp = () => {
  // 实现打开帮助的逻辑

  window.electronAPI.shell.openExternal('https://docs.anteey.com/')
}

const isQuickAccessVisible = ref(false)
const triggerRect = ref<DOMRect | null>(null)
let hideTimeout: NodeJS.Timeout | null = null

// 显示菜单
const showQuickAccess = (event: MouseEvent) => {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }

  const target = event.currentTarget as HTMLElement
  triggerRect.value = target.getBoundingClientRect()
  isQuickAccessVisible.value = true
}

// 处理菜单离开事件
const handleMenuLeave = (event: MouseEvent) => {
  const relatedTarget = event.relatedTarget as HTMLElement
  if (
    !relatedTarget?.closest('.quick-access-trigger') &&
    !relatedTarget?.closest('.quick-access-menu')
  ) {
    hideTimeout = setTimeout(() => {
      isQuickAccessVisible.value = false
    }, 100) // 添加小延迟，使过渡更平滑
  }
}

// 在组件卸载时清理定时器
onUnmounted(() => {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
})

// 添加点击外部区域关闭菜单的处理
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.quick-access-trigger') && !target.closest('.quick-access-menu')) {
    isQuickAccessVisible.value = false
  }
}

const syncStatusClass = computed(() => {
  const status = webdavStore.syncState.status
  return {
    'is-syncing': status === 'syncing',
    'is-error': status === 'error',
    'is-completed': status === 'completed'
  }
})

// 添加一个变量来保存消息实例
let syncMessageInstance: { close: () => void } | null = null

const handleSync = async () => {
  try {
    // 显示同步中的消息，设置一个很长的持续时间（比如1小时），并保存消息实例
    syncMessageInstance = message.info('开始同步...', 3600000)

    await webdavStore.sync('manual')
    // 同步成功时，先关闭同步中的消息
    syncMessageInstance?.close()
    // 然后显示成功消息
    message.success('同步完成，正在刷新...')
    // 同步完成后重新加载历史记录
    await webdavStore.loadSyncHistory()
    // 延迟一秒刷新页面，让用户看到成功提示
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  } catch (error) {
    // 同步失败时，也要先关闭同步中的消息
    syncMessageInstance?.close()
    // 然后显示错误消息
    console.error('同步失败:', error)
    message.error(error instanceof Error ? error.message : '同步失败')
  } finally {
    // 确保清理消息实例
    syncMessageInstance = null
  }
}

const syncStatusIcon = computed(() => {
  const status = webdavStore.syncState.status
  switch (status) {
    case 'syncing':
      return LinkCloud
    case 'error':
      return LinkCloudFaild
    case 'completed':
      return LinkCloudSucess
    default:
      return LinkCloud
  }
})

const getSyncStatusText = computed(() => {
  const status = webdavStore.syncState.status
  const type = webdavStore.syncState.type
  const lastSync = webdavStore.lastSuccessfulSync

  switch (status) {
    case 'syncing':
      return `${type === 'auto' ? '自动' : '手动'}同步中...`
    case 'error':
      return '同步失败'
    case 'completed':
      if (lastSync) {
        const formattedTime = new Date(lastSync).toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
        return `同步成功<br>最后同步：${formattedTime}`
      }
      return '同步成功'
    default:
      if (lastSync) {
        const formattedTime = new Date(lastSync).toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
        return `立即同步<br>最后同步：${formattedTime}`
      }
      return '立即同步'
  }
})

const handleThemeButtonClick = (event: MouseEvent) => {
  event.stopPropagation()
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  themeStore.openThemePicker({
    x: rect.left,
    y: rect.top
  })
}

// 添加暗色模式计算属性
const isDarkMode = computed(() => {
  if (!themeStore.themeSettings) return false
  return (
    themeStore.themeSettings.themeMode === 'dark' ||
    (themeStore.themeSettings.themeMode === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  )
})

// 窗口控制相关
const isMaximized = ref(false)

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

const activeSegment = ref('recent')

const switchSegment = (segment: string) => {
  activeSegment.value = segment
}
</script>

<style lang="scss" scoped>
.sidebar {
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  z-index: 1000;
  // border-right: 1px solid var(--color-border-sidebar);

  .sidebar-titlebar {
    height: 18px;
    -webkit-app-region: drag;
    position: relative;
    display: flex;
    align-items: center;
    padding: 0 8px;

    .window-controls {
      position: absolute;
      left: 8px;
      top: 0px;
      display: flex;
      gap: 8px;
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

  .sidebar-header {
    width: 100%; // 确保宽度为100%
    flex-shrink: 0; // 防止头部被压缩
    // padding-bottom: 10px; // 移除左右内边距

    .antinet-button {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 2px 6px 2px 3px;
      background-color: transparent;
      border: none;
      cursor: pointer;
      position: relative;

      .left-section {
        display: flex;
        align-items: center;
      }

      .right-section {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 8px;
        padding-right: 16px;
      }

      .antinet-icon {
        width: 40px;
        height: 40px;
        margin-right: 4px;
        object-fit: cover;
      }

      .antinet-text {
        font-size: 16px;
        font-weight: bold;
        color: var(--color-sidebar-text);
        user-select: none;
        margin-right: 8px;
      }

      .down-arrow {
        margin-left: auto; // 将箭头推到右侧
        color: var(--color-icon-default);
      }

      &:hover {
        background: rgba(var(--color-sidebar-icon-bg), 0.04);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 8px;
      }
    }
    .action-btn-area {
      display: flex;
      align-items: center;
      padding: 6px 6px;
      gap: 10px;
      justify-content: space-between;
      width: 100%;

      .action-btn {
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        background: rgba(var(--color-sidebar-icon-bg), 0.04);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        box-shadow: inset 0 0 0 1px rgba(var(--color-sidebar-icon-bg), 0.05);
        cursor: pointer;
        transition: all 0.2s ease;
        flex: 0 0 auto;

        .icon {
          background: none;
          border: none;
          cursor: pointer;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          padding: 0;

          :deep(.i-icon) {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
          }

          :deep(svg) {
            width: 16px;
            height: 16px;
          }
        }

        &:hover {
          background: rgba(var(--color-sidebar-icon-bg), 0.08);
          transform: translateY(-1px);
          box-shadow:
            inset 0 0 0 1px rgba(var(--color-sidebar-icon-bg), 0.08),
            0 4px 16px -8px rgba(0, 0, 0, 0.1);
        }

        &:active {
          transform: translateY(0);
          background: rgba(var(--color-sidebar-icon-bg), 0.08);
          box-shadow: inset 0 0 0 1px rgba(var(--color-sidebar-icon-bg), 0.08);
        }
      }
    }
  }

  .sidebar-header-divider {
    border-bottom: 1px solid var(--color-sidebar-divider);
    flex-shrink: 0; // 防止分割线被压缩
    margin: 6px;
  }

  .sidebar-nav {
    padding: 0px 6px;
    flex-shrink: 0; // 防止导航菜单被压缩

    nav {
      ul {
        list-style-type: none;
        padding: 0;
        margin: 0;
        .nav-item-wrapper {
          margin-bottom: 4px;
        }
        .nav-item {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 6px 8px;
          border-radius: 8px;
          // transition: all 0.2s ease;
          user-select: none;
          position: relative;
          background: transparent;

          &:hover {
            background: rgba(var(--color-sidebar-icon-bg), 0.04);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }

          &.active {
            background: rgba(var(--color-sidebar-icon-bg), 0.04);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }

          .nav-link {
            display: flex;
            align-items: center;
            flex-grow: 1;
            text-decoration: none;
            color: inherit;
            position: relative;
            z-index: 2;

            .icon {
              background: none;
              border: none;
              cursor: pointer;
              width: 20px;
              height: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 6px;
              transition: background-color 0.2s;
              padding: 0;
              margin-right: 8px;

              // 新增以下样式来处理 i-icon 类
              :deep(.i-icon) {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
              }

              svg {
                width: 16px;
                height: 16px;
                fill: var(--color-sidebar-icon);
                transition: fill 0.2s ease;
              }
            }

            .name {
              flex-grow: 0;
              text-align: left;
              color: var(--color-sidebar-text);
              font-weight: 400;
              font-size: 14px;
              white-space: nowrap;
              writing-mode: horizontal-tb;
              transition: all 0.2s ease;
            }
          }

          // &:hover {
          //   background-color: var(--color-hover-sidebar);
          // }
        }

        .expand-button {
          background: none;
          border: none;
          cursor: pointer;
          transition: transform 0.3s ease;
          border-radius: 6px;
          &:hover {
            background-color: var(--color-hover-button);
          }
          .icon {
            background: none;
            border: none;
            cursor: pointer;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            padding: 0;

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }

            :deep(.i-icon) {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
            }

            :deep(svg) {
              width: 16px;
              height: 16px;
            }
          }
        }

        .expand-button .rotated {
          transform: translateY(-50%) rotate(180deg);
        }

        .sub-menu {
          list-style-type: none;
          padding-left: 26px; // 与图标对齐
          margin-top: 4px;
        }

        .sub-item {
          display: flex;
          align-items: center;
          padding: 6px 8px;
          font-size: 14px;
          border-radius: 8px;
          text-decoration: none;
          color: inherit;
          margin-bottom: 4px;
          &:hover {
            background-color: var(--color-hover-sidebar);
          }
          &.active {
            background-color: var(--color-hover-sidebar);
          }
          .icon {
            background: none;
            border: none;
            cursor: pointer;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: background-color 0.2s;
            padding: 0;
            margin-right: 8px;

            // 新增以下样式来处理 i-icon 类
            :deep(.i-icon) {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
            }

            svg {
              width: 16px; // 或者您想要的大小
              height: 12px; // 或者您想要的大小
            }
          }

          .name {
            flex-grow: 0;
            text-align: left;
            color: var(--color-text-primary);
            font-size: 14px;
            white-space: nowrap; // 防止文字换行
            writing-mode: horizontal-tb; // 确保文字是水平排列的
            font-weight: 400;
          }
        }
      }
    }
  }

  .resize-handle {
    position: absolute;
    top: 0;
    right: -5px;
    width: 10px;
    height: 100%;
    cursor: col-resize;
  }

  .sidebar-footer {
    // margin-top: auto; // 将footer推到底部
    margin-top: 0; // 移除 margin-top: auto
    flex-shrink: 0; // 防止底部工具栏被压缩
    padding: 6px 10px 0 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--color-sidebar-divider);

    .new-card-wrapper {
      flex-grow: 1;
      display: flex;
      align-items: center;

      .new-card {
        display: flex;
        align-items: center;
        padding: 5px 14px 5px 10px;
        border-radius: 8px;
        cursor: pointer;

        .icon {
          width: 20px;
          height: 20px;
          display: flex;
          justify-content: center;
          align-items: center;

          .i-icon {
            width: 16px;
            height: 16px;
            display: flex;
            justify-content: center;
            align-items: center;
          }
        }

        .add-text {
          margin-left: 3px;
          font-size: 12px;
        }

        &:hover {
          background-color: var(--color-hover-sidebar);
        }
      }
    }

    .clear-empty-note,
    .theme-toggle,
    .theme-button,
    .help {
      width: 30px;
      height: 30px;
      justify-content: center;
      align-items: center;
      margin-left: 2px;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 6px;

      .icon {
        width: 20px;
        height: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 6px;
        transition: background-color 0.2s;

        .i-icon {
          width: 16px;
          height: 16px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
      }

      &:hover {
        background: rgba(var(--color-sidebar-icon-bg), 0.04);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }
    }
    .theme-toggle {
      .icon {
        transition: transform 0.3s ease;
      }

      &:hover .icon {
        transform: rotate(15deg);
      }
    }
  }
}

/* 定义过渡动画 */
.sidebar-enter-active,
.sidebar-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.sidebar-enter-from,
.sidebar-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 30px;
    bottom: 30px;
    left: 0;
    z-index: 9000;
    background-color: var(--color-shape-tertiary);
    padding: 12px 12px 10px 12px;
    width: 200px;
    min-width: 200px;
    overflow: hidden;
  }
}

.status-icon {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  position: absolute;
  top: 18px;
  right: 15px;
  box-shadow: 0 0 5px 1px currentColor;
  transition: all 0.3s ease;
}

.status-icon.status-idle {
  background-color: #808080;
  box-shadow: 0 0 5px 1px rgba(128, 128, 128, 0.5);
}

.status-icon.status-saving {
  background-color: #ffa500;
  box-shadow: 0 0 5px 1px rgba(255, 165, 0, 0.7);
  animation: pulse 1s infinite alternate;
}

.status-icon.status-saved {
  background-color: var(--color-primary);
  box-shadow: 0 0 5px 1px rgba(var(--color-primary-rgb), 0.7);
}

.status-icon.status-error {
  background-color: #ff0000;
  box-shadow: 0 0 5px 1px rgba(255, 0, 0, 0.7);
}

@keyframes pulse {
  from {
    opacity: 0.5;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1.1);
  }
}
// 修改相关样式
.segment-control {
  position: relative;
  display: flex;
  margin: 8px 6px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 4px;
  border-radius: 8px;
  gap: 4px;
  box-shadow: inset 0 0 0 1px rgba(var(--color-sidebar-icon-bg), 0.05);
  flex-shrink: 0; // 防止被压缩

  .segment-slider {
    position: absolute;
    top: 4px;
    left: 4px;
    height: calc(100% - 8px);
    background-color: rgba(var(--color-sidebar-icon-bg), 0.05);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 6px;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 0;
  }

  .segment-button {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 6px 8px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--color-sidebar-text);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 12px;

    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;

      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }

      :deep(svg) {
        width: 16px;
        height: 16px;
        transition: all 0.2s ease;
      }
    }

    &:active {
      transform: translateY(0);
      background: rgba(var(--color-sidebar-icon-bg), 0.08);
      box-shadow: inset 0 0 0 1px rgba(var(--color-sidebar-icon-bg), 0.08);
    }
  }
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0; // 确保内容可以正确滚动

  .segment-content {
    padding: 0 6px;
  }
}

.quick-access-menu {
  position: fixed;
  background-color: var(--color-dropdown-bg);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  padding: 8px;
  min-width: 200px;
  z-index: 1000;

  .menu-group {
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }

    .group-title {
      font-size: 12px;
      color: var(--color-text-secondary);
      padding: 4px 8px;
      margin-bottom: 4px;
    }

    .menu-items {
      .menu-item {
        display: flex;
        align-items: center;
        padding: 6px 8px;
        border-radius: 6px;
        cursor: pointer;
        text-decoration: none;
        color: var(--color-text-primary);

        &:hover {
          background-color: var(--color-hover-sidebar);
        }

        .icon {
          margin-right: 8px;
          display: flex;
          align-items: center;
        }

        .name {
          font-size: 14px;
        }
      }
    }
  }
}

.sync-button {
  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  margin-right: 10px;

  .icon {
    width: 18px;
    height: 18px;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all 0.3s ease;

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

  &:hover {
    background-color: var(--color-hover-sidebar);
  }

  &.is-syncing {
    .icon {
      animation: sync-pulse 1.5s ease infinite;
    }
  }

  &.is-error {
    .icon {
      fill: var(--color-error);
    }
  }

  &.is-completed {
    .icon {
      fill: var(--color-success);
      animation: pulse 0.3s ease;
    }
  }
}

@keyframes sync-pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.92);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.theme-button {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: rgba(var(--color-border-rgb), 0.1);
  }
}

.theme-picker-wrapper {
  position: fixed;
  z-index: 1000;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1));
}

// 弹出动画
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
