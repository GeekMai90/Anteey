// src/components/AppToolbar.vue

<template>
  <div class="app-toolbar" :style="computedStyle">
    <div class="toolbar-section left">
      <div
        v-tooltip.bottom="{
          content: '折叠/展开左侧边栏<br>Cmd + /',
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
      <div v-if="showBreadcrumb" class="breadcrumb-container">
        <span class="breadcrumb-item root-item" @click="handleRootClick">
          Antinet Zettelkasten
        </span>
        <span class="separator">/</span>

        <span
          v-for="(node, index) in parentPath"
          :key="node.id"
          class="breadcrumb-item"
          @click="handleBreadcrumbClick(node)"
        >
          {{ node.address }} - {{ node.title }}
          <span v-if="index < parentPath.length - 1" class="separator">/</span>
        </span>
        <button v-if="parentPath.length > 0" class="back-button-breadcrumb" @click="handleBack">
          返回上层
        </button>
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
    <div class="toolbar-section center">
      <slot name="center"></slot>
    </div>
    <div class="toolbar-section right">
      <div
        v-tooltip.bottom="{
          content: '折叠/展开右侧边栏<br>Cmd + shift + /',
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
import { Left, Right, ExpandLeft, ExpandRight } from '@icon-park/vue-next'
import { useUIStore } from '@renderer/stores/useUIStore'
import { useKnowledgeTreeStore } from '@renderer/stores/knowledgeTreeStore'
import type { KnowledgeTreeNode } from '@renderer/types/knowledgeTree'

const uiStore = useUIStore()
const router = useRouter()
const route = useRoute()
const knowledgeTreeStore = useKnowledgeTreeStore()

const toolbarStyle = computed(() => {
  return {
    paddingLeft: uiStore.isSidebarCollapsed ? '76px' : '13px' // Adjust these values as needed
  }
})

const props = defineProps({
  showBackButton: { type: Boolean, default: true },
  showForwardButton: { type: Boolean, default: true },
  showRefreshButton: { type: Boolean, default: true },
  backgroundColor: { type: String, required: false },
  whiteboardName: { type: String, required: false }
})

const computedStyle = computed(() => {
  const style: any = { ...toolbarStyle.value }
  if (props.backgroundColor) {
    style.backgroundColor = props.backgroundColor
  }
  return style
})

const canGoBack = ref(false)
const canGoForward = ref(false)

const updateNavigationState = () => {
  canGoBack.value = window.history.length > 1
  canGoForward.value = window.history.length > window.history.state?.position + 1
}

const goBack = () => canGoBack.value && router.back()
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

// 新增: 用于向父组件发射更新事件
const emit = defineEmits(['update:whiteboardName'])

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
  return route.path === '/knowledge-tree' // 根据实际路由路径调整
})

// 获取面包屑数据
const parentPath = computed(() => knowledgeTreeStore.parentPath)

// 面包屑点击处理
const handleBreadcrumbClick = (node: KnowledgeTreeNode) => {
  // 如果点击的是当前聚焦的节点，则返回上一层
  if (
    knowledgeTreeStore.viewState.isInFocusMode &&
    node.address === knowledgeTreeStore.focusedNode?.address
  ) {
    knowledgeTreeStore.backToParent()
  } else {
    // 聚焦到新节点
    knowledgeTreeStore.focusNodeWithChildren(node)
  }
}

// 返回上层处理
const handleBack = () => {
  knowledgeTreeStore.backToParent()
}

// 添加根节点点击处理函数
const handleRootClick = async () => {
  // 重置所有状态
  knowledgeTreeStore.viewState.isInFocusMode = false
  knowledgeTreeStore.focusedNode = null
  knowledgeTreeStore.parentPath = [] // 清空面包屑路径
  await knowledgeTreeStore.fetchTopLevelNodes()
}
</script>

<style lang="scss" scoped>
.app-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  // padding: 0 16px;
  padding-right: 16px;
  background-color: var(--color-bg-primary);
  width: 100%;
  box-sizing: border-box;
  height: 40px;
  -webkit-app-region: drag; /* 使区域可拖动 */
}

.toolbar-section {
  display: flex;
  align-items: center;

  &.left {
    justify-content: flex-start;
    flex: 2;
  }

  &.center {
    justify-content: center;
    flex: 1;
  }

  &.right {
    justify-content: flex-end;
    flex: 1;
  }
}

.toggle-left-sidebar,
.back-button,
.forward-button,
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
  margin: 2px;
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
    color: var(--default-text-color);
    font-size: 13px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
  }

  &:hover {
    background-color: var(--color-hover-button);
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
  margin-left: 16px;
  -webkit-app-region: no-drag;
}

.breadcrumb-item {
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: 14px;

  &:hover {
    color: var(--color-primary);
  }
}

.separator {
  margin: 0 8px;
  color: var(--color-border);
}

.back-button-breadcrumb {
  margin-left: 16px;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: var(--color-text-secondary);

  &:hover {
    background: var(--color-hover-button);
  }
}
</style>
