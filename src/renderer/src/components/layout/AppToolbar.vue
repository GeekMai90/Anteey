// src/components/AppToolbar.vue

<template>
  <div class="app-toolbar">
    <div class="toolbar-section left">
      <div
        v-tooltip.bottom="{
          content: '折叠/展开左侧边栏<br>Cmd + Shift + /',
          delay: { show: 1000 },
          html: true
        }"
        class="toggle-left-sidebar"
        @click="toggleSidebar"
      >
        <div class="icon">
          <ExpandRight
            theme="outline"
            size="20"
            fill="var(--color-icon-default)"
            :stroke-width="3"
          />
        </div>
      </div>

      <div
        v-if="showBackButton"
        v-tooltip.bottom="{
          content: '后退<br>Cmd + [',
          delay: { show: 1000 },
          html: true
        }"
        v-shortkey="['meta', '[']"
        class="back-button"
        :disabled="!canGoBack"
        @shortkey="goBack"
        @click="goBack"
      >
        <div class="icon">
          <Left theme="outline" size="20" fill="var(--color-icon-default)" :stroke-width="3" />
        </div>
      </div>
      <div
        v-if="showForwardButton"
        v-tooltip.bottom="{
          content: '前进<br>Cmd + ]',
          delay: { show: 1000 },
          html: true
        }"
        v-shortkey="['meta', ']']"
        class="forward-button"
        :disabled="!canGoForward"
        @shortkey="goForward"
        @click="goForward"
      >
        <div class="icon">
          <Right theme="outline" size="20" fill="var(--color-icon-default)" :stroke-width="3" />
        </div>
      </div>
      <div
        v-if="showRefreshButton"
        v-tooltip.bottom="{
          content: '刷新数据',
          delay: { show: 1000 },
          html: true
        }"
        class="refresh-button"
        @click="handleRefresh"
      >
        <div class="icon">
          <Refresh theme="outline" size="20" fill="var(--color-icon-default)" :stroke-width="3" />
        </div>
      </div>
      <div v-if="showBreadcrumb" class="breadcrumb-container">
        <div class="breadcrumb-items" :class="{ 'has-overflow': hasOverflow }">
          <template v-for="(item, index) in processedBreadcrumbs" :key="index">
            <template v-if="item.type === 'ellipsis'">
              <span class="breadcrumb-ellipsis">...</span>
            </template>
            <template v-else>
              <span
                class="breadcrumb-item"
                :class="{ active: index === breadcrumbs.length - 1 }"
                @click="handleBreadcrumbClick(item)"
              >
                <span class="address">{{ item.text }}</span>
                <span v-if="item.secondaryText" class="title">{{ item.secondaryText }}</span>
              </span>
              <span v-if="index < processedBreadcrumbs.length - 1" class="breadcrumb-separator"
                >/</span
              >
            </template>
          </template>
        </div>
      </div>
      <div v-if="whiteboardName" class="whiteboard-name">
        <span v-if="!isEditing" @click="startEditing">{{ whiteboardName }}</span>
        <input
          v-else
          ref="nameInput"
          v-model="editingName"
          @blur="finishEditing"
          @keyup.enter="finishEditing"
        />
      </div>
      <slot name="left"></slot>
    </div>
    <div class="toolbar-section right">
      <div
        v-tooltip.bottom="{
          content: 'AI 助手<br>Cmd + shift + A',
          delay: { show: 1000 },
          html: true
        }"
        class="toggle-assistant"
        @click="toggleAssistant"
      >
        <div class="icon">
          <Robot theme="outline" size="20" fill="#B6B6B6" :stroke-width="3" />
        </div>
      </div>
      <div
        v-tooltip.bottom="{
          content: '卡片盒<br>Cmd + shift + C',
          delay: { show: 1000 },
          html: true
        }"
        class="toggle-cardbox"
        @click="toggleCardbox"
      >
        <div class="icon">
          <Box theme="outline" size="20" fill="var(--color-icon-default)" :stroke-width="3" />
        </div>
      </div>
      <div
        v-tooltip.bottom="{
          content: '索引卡<br>Cmd + shift + I',
          delay: { show: 1000 },
          html: true
        }"
        class="toggle-index"
        @click="toggleIndex"
      >
        <div class="icon">
          <ListAlphabet
            theme="outline"
            size="20"
            fill="var(--color-icon-default)"
            :stroke-width="3"
          />
        </div>
      </div>
      <div
        v-tooltip.bottom="{
          content: '草稿纸<br>Cmd + shift + D',
          delay: { show: 1000 },
          html: true
        }"
        class="toggle-draft"
        @click="toggleDraft"
      >
        <div class="icon">
          <Notepad theme="outline" size="20" fill="var(--color-icon-default)" :stroke-width="3" />
        </div>
      </div>
      <div
        v-tooltip.bottom="{
          content: '小组件<br>Cmd + shift + W',
          delay: { show: 1000 },
          html: true
        }"
        class="toggle-widgets"
        @click="toggleWidgets"
      >
        <div class="icon">
          <Components
            theme="outline"
            size="20"
            fill="var(--color-icon-default)"
            :stroke-width="3"
          />
        </div>
      </div>
      <div
        v-tooltip.bottom="{
          content: '折叠/展开右侧边栏<br>Cmd + /',
          delay: { show: 1000 },
          html: true
        }"
        class="toggle-right-sidebar"
        @click="toggleRightSidebar"
      >
        <div class="icon">
          <ExpandLeft
            theme="outline"
            size="20"
            fill="var(--color-icon-default)"
            :stroke-width="3"
          />
        </div>
      </div>
      <slot name="right"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Left,
  Right,
  ExpandLeft,
  ExpandRight,
  Components,
  Notepad,
  Robot,
  Refresh,
  Box,
  ListAlphabet
} from '@icon-park/vue-next'
import { useUIStore } from '@renderer/stores/UIStore'
import { useKnowledgeTreeStore } from '@renderer/stores/knowledgeTreeStore'

const uiStore = useUIStore()
const router = useRouter()
const route = useRoute()
const knowledgeTreeStore = useKnowledgeTreeStore()

// const toolbarStyle = computed(() => {
//   return {
//     paddingLeft: uiStore.isSidebarCollapsed ? '76px' : '13px' // Adjust these values as needed
//   }
// })

const props = defineProps({
  showBackButton: { type: Boolean, default: true },
  showForwardButton: { type: Boolean, default: true },
  showRefreshButton: { type: Boolean, default: false },
  backgroundColor: { type: String, required: false },
  whiteboardName: { type: String, required: false }
})

// const computedStyle = computed(() => {
//   const style: any = { ...toolbarStyle.value }
//   if (props.backgroundColor) {
//     style.backgroundColor = props.backgroundColor
//   }
//   return style
// })

const canGoBack = ref(false)
const canGoForward = ref(false)

const updateNavigationState = () => {
  canGoBack.value = window.history.length > 1
  canGoForward.value = window.history.length > window.history.state?.position + 1
}

// 修改后退函数，添加对卡片盒上下文模式的处理
const goBack = () => {
  if (!canGoBack.value) return

  // 检查当前是否在卡片盒页面的上下文模式
  if (route.name === 'cardbox' && route.query.mode === 'context' && route.query.noteId) {
    // 从当前URL中清除上下文参数
    const newQuery = { ...route.query }
    delete newQuery.mode
    delete newQuery.noteId

    // 使用replace替换当前历史记录
    router.replace({
      path: route.path,
      query: newQuery
    })
  } else {
    // 其他情况正常回退
    router.back()
  }
}

const goForward = () => canGoForward.value && router.forward()
// const refresh = () => console.log('Refresh clicked')
const toggleSidebar = () => uiStore.toggleSidebar()

const toggleRightSidebar = () => (uiStore.isRightSidebarOpen = !uiStore.isRightSidebarOpen)

onMounted(() => {
  updateNavigationState()
  window.addEventListener('popstate', updateNavigationState)
})

onUnmounted(() => {
  window.removeEventListener('popstate', updateNavigationState)
})

// 刷新按钮的自定义事件
const emit = defineEmits(['refresh', 'update:whiteboardName'])

// 处理刷新按钮点击
const handleRefresh = () => {
  emit('refresh')
}

// 修改: 白板名称相关的状态和方法
const isEditing = ref(false)
const editingName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

const startEditing = () => {
  isEditing.value = true
  editingName.value = props.whiteboardName || ''
  nextTick(() => {
    nameInput.value?.focus()
  })
}

const finishEditing = () => {
  isEditing.value = false
  if (editingName.value !== props.whiteboardName) {
    emit('update:whiteboardName', editingName.value)
  }
}

// 控制面包屑显示
const showBreadcrumb = computed(() => {
  // 检查当前路由是否是知识树相关的路由
  return (
    route.path.startsWith('/knowledge-tree') ||
    route.name === 'KnowledgeTree' ||
    route.name === 'KnowledgeTreeNode'
  )
})

// 获取面包屑数据
const parentPath = computed(() => knowledgeTreeStore.parentPath)

// 定义面包屑数据结构
interface Breadcrumb {
  type?: 'ellipsis'
  text: string
  secondaryText?: string
  address?: string
  title?: string
}

// 计算面包屑数据
const breadcrumbs = computed<Breadcrumb[]>(() => {
  const items: Breadcrumb[] = [{ text: 'Anteey' }]

  if (parentPath.value) {
    parentPath.value.forEach((node: any) => {
      items.push({
        text: node.address,
        secondaryText: node.title?.slice(0, 6),
        address: node.address,
        title: node.title
      })
    })
  }

  return items
})

// 处理面包屑，如果层级过多则显示省略号
const processedBreadcrumbs = computed<Breadcrumb[]>(() => {
  const items = breadcrumbs.value
  if (items.length <= 8) {
    return items
  }

  // 当层级超过8个时，保留前4个和后4个，中间显示省略号
  const processed: Breadcrumb[] = [
    items[0],
    items[1],
    items[2],
    items[3],
    { type: 'ellipsis', text: '...' } as Breadcrumb,
    ...items.slice(-4)
  ]
  return processed
})

const hasOverflow = computed(() => {
  return breadcrumbs.value.length > 8
})

// 处理面包屑点击
const handleBreadcrumbClick = (item: Breadcrumb) => {
  if (item.type === 'ellipsis') return
  if (!item.address) {
    // 点击根节点
    handleRootClick()
    return
  }
  // 点击其他节点
  const node = parentPath.value.find((n: any) => n.address === item.address)
  if (node) {
    knowledgeTreeStore.focusNodeWithChildren(node)
  }
}

// 添加根节点点击处理函数
const handleRootClick = async () => {
  // 重置所有状态
  knowledgeTreeStore.viewState.isInFocusMode = false
  knowledgeTreeStore.focusedNode = null
  knowledgeTreeStore.parentPath = [] // 清空面包屑路径
  await knowledgeTreeStore.fetchTopLevelNodes()
}

// 添加小组件切换方法
const toggleWidgets = () => {
  // 如果右侧边栏已打开且当前是小组件标签，则关闭右侧边栏
  if (uiStore.isRightSidebarOpen && uiStore.rightSidebarTab === 'widgets') {
    uiStore.toggleRightSidebar()
  } else {
    // 否则，确保右侧边栏打开并切换到小组件标签
    if (!uiStore.isRightSidebarOpen) {
      uiStore.toggleRightSidebar()
    }
    uiStore.rightSidebarTab = 'widgets'
  }
}

// 添加草稿纸切换方法
const toggleDraft = () => {
  // 如果右侧边栏已打开且当前是草稿纸标签，则关闭右侧边栏
  if (uiStore.isRightSidebarOpen && uiStore.rightSidebarTab === 'drafts') {
    uiStore.toggleRightSidebar()
  } else {
    // 否则，确保右侧边栏打开并切换到草稿纸标签
    if (!uiStore.isRightSidebarOpen) {
      uiStore.toggleRightSidebar()
    }
    uiStore.rightSidebarTab = 'drafts'
  }
}

// 添加 AI 助手切换方法
const toggleAssistant = () => {
  if (uiStore.isRightSidebarOpen && uiStore.rightSidebarTab === 'assistant') {
    uiStore.toggleRightSidebar()
  } else {
    if (!uiStore.isRightSidebarOpen) {
      uiStore.toggleRightSidebar()
    }
    uiStore.rightSidebarTab = 'assistant'
  }
}

// 添加卡片盒切换方法
const toggleCardbox = () => {
  // 如果右侧边栏已打开且当前是卡片盒标签，则关闭右侧边栏
  if (uiStore.isRightSidebarOpen && uiStore.rightSidebarTab === 'cardbox') {
    uiStore.toggleRightSidebar()
  } else {
    // 否则，确保右侧边栏打开并切换到卡片盒标签
    if (!uiStore.isRightSidebarOpen) {
      uiStore.toggleRightSidebar()
    }
    uiStore.rightSidebarTab = 'cardbox'
  }
}

// 添加索引卡切换方法
const toggleIndex = () => {
  // 如果右侧边栏已打开且当前是索引卡标签，则关闭右侧边栏
  if (uiStore.isRightSidebarOpen && uiStore.rightSidebarTab === 'index') {
    uiStore.toggleRightSidebar()
  } else {
    // 否则，确保右侧边栏打开并切换到索引卡标签
    if (!uiStore.isRightSidebarOpen) {
      uiStore.toggleRightSidebar()
    }
    uiStore.rightSidebarTab = 'index'
  }
}
</script>

<style lang="scss" scoped>
.app-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  // padding-right: 16px;
  background-color: var(--color-bg-primary);
  width: 100%;
  box-sizing: border-box;
  height: 40px;
  -webkit-app-region: drag; /* 使区域可拖动 */
  // border-bottom: 1px solid var(--color-border);
}

.toolbar-section {
  display: flex;
  align-items: center;

  &.left {
    justify-content: flex-start;
    flex: 4;
  }

  &.right {
    justify-content: flex-end;
    flex: 1;
  }
}

.toggle-left-sidebar,
.back-button,
.forward-button,
.refresh-button,
.toggle-right-sidebar {
  position: relative;
  display: flex;
  align-items: center;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
  padding: 4px 4px;
  // margin: 2px;
  -webkit-app-region: no-drag; /* 使按钮不可拖动，从而可以点击 */

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
      width: 18px;
      height: 18px;
    }
  }

  .name {
    flex-grow: 0;
    text-align: left;
    color: var(---color-text-primary);
    font-size: 13px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
  }

  &:hover {
    background-color: var(--color-icon-hover-bg);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }
}

.whiteboard-name {
  margin-left: 16px;
  font-size: 16px;
  color: var(--color-text-primary);
  cursor: pointer;
  -webkit-app-region: no-drag; /* 使按钮不可拖动，从而可以点击 */

  span:hover {
    text-decoration: underline;
  }

  input {
    font-size: 16px;
    color: var(--color-text-primary);
    background: transparent;
    outline: none;
    padding: 2px 4px;
    width: 400px;
    line-height: 1;

    &:focus {
      background-color: var(--color-hover-button);
    }
  }
}

.breadcrumb-container {
  display: flex;
  align-items: center;
  overflow-x: auto;
  flex-shrink: 1;
  min-width: 0;
  margin-left: 12px;
  -webkit-app-region: no-drag;
  height: 40px;
}

.breadcrumb-items {
  display: flex;
  align-items: center;
  white-space: nowrap;
  padding: 0 4px;
  height: 100%;
}

.breadcrumb-item {
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
  user-select: none;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.3;
  background-color: transparent;
  border: 1px solid transparent;

  .address {
    color: var(--color-text-secondary);
    font-size: 12px;
    opacity: 0.9;
  }

  .title {
    color: var(--color-text-secondary);
    font-size: 11px;
    opacity: 0.7;
    margin-top: -1px;
  }

  &:hover {
    background-color: var(--color-hover-button);
    border-color: var(--color-primary);

    .address,
    .title {
      color: var(--color-text-primary);
      opacity: 1;
    }
  }

  &.active {
    cursor: default;
    opacity: 0.5;

    &:hover {
      background-color: transparent;
      border-color: transparent;

      .address,
      .title {
        color: var(--color-text-secondary);
      }
    }
  }
}

.breadcrumb-separator {
  color: var(--color-text-secondary);
  margin: 0 1px;
  opacity: 0.4;
  align-self: center;
  font-size: 12px;
}

.breadcrumb-ellipsis {
  color: var(--color-text-secondary);
  margin: 0 3px;
  opacity: 0.6;
  align-self: center;
  font-size: 12px;
}

/* 添加滚动条样式 */
.breadcrumb-container::-webkit-scrollbar {
  height: 2px;
}

.breadcrumb-container::-webkit-scrollbar-track {
  background: transparent;
}

.breadcrumb-container::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

// 复用已有的按钮样式
.toggle-widgets {
  @extend .toggle-right-sidebar;
  margin-right: 4px; // 添加一点间距
}

.toggle-draft {
  @extend .toggle-right-sidebar;
  margin-right: 4px; // 添加一点间距
}

// 添加 AI 助手按钮样式
.toggle-assistant {
  @extend .toggle-right-sidebar;
  margin-right: 4px;
}

// 添加卡片盒按钮样式
.toggle-cardbox {
  @extend .toggle-right-sidebar;
  margin-right: 4px;
}

// 添加索引卡按钮样式
.toggle-index {
  @extend .toggle-right-sidebar;
  margin-right: 4px;
}
</style>
