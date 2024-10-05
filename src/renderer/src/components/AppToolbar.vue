// src/components/AppToolbar.vue

<template>
  <div class="app-toolbar" :style="computedStyle">
    <div class="toolbar-section left">
      <div
        v-tooltip.bottom="{ content: 'Cmd + \\', delay: { show: 1000 } }"
        class="toggle-left-sidebar"
        @click="toggleSidebar"
      >
        <div class="icon">
          <ExpandRight theme="outline" size="20" fill="#b6b6b6" />
        </div>
      </div>
      <div v-if="showBackButton" class="back-button" :disabled="!canGoBack" @click="goBack">
        <div class="icon">
          <Left theme="outline" size="20" fill="#b6b6b6" />
        </div>
      </div>
      <div
        v-if="showForwardButton"
        class="forward-button"
        :disabled="!canGoForward"
        @click="goForward"
      >
        <div class="icon">
          <Right theme="outline" size="20" fill="#b6b6b6" />
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
    <div class="toolbar-section center">
      <slot name="center"></slot>
    </div>
    <div class="toolbar-section right">
      <div
        v-tooltip.bottom="{ content: 'Cmd + Option + \\', delay: { show: 1000 } }"
        class="toggle-right-sidebar"
        @click="toggleRightSidebar"
      >
        <div class="icon">
          <ExpandLeft theme="outline" size="20" fill="#b6b6b6" />
        </div>
      </div>
      <slot name="right"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Left, Right, ExpandLeft, ExpandRight } from '@icon-park/vue-next'
import { useUIStore } from '@renderer/stores/useUIStore'

const uiStore = useUIStore()
const router = useRouter()

const toolbarStyle = computed(() => {
  return {
    paddingLeft: uiStore.isSidebarCollapsed ? '76px' : '16px' // Adjust these values as needed
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
    flex: 1;
  }

  &.center {
    justify-content: center;
    flex: 2;
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

    // &:hover:not(:disabled) {
    //   background-color: rgba(0, 0, 0, 0.05);
    // }

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
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  -webkit-app-region: no-drag; /* 使按钮不可拖动，从而可以点击 */

  span:hover {
    text-decoration: underline;
  }

  input {
    font-size: 16px;
    font-weight: 500;
    color: var(--color-text-primary);
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--color-border);
    outline: none;
    padding: 2px 4px;
    width: 200px;

    &:focus {
      border-bottom-color: var(--color-primary);
    }
  }
}
</style>
