<template>
  <div class="right-sidebar" :style="{ width: `${sidebarWidth}px` }">
    <div class="resize-handle" @mousedown="startResize"></div>
    <div class="sidebar-header">
      <!-- Tab 切换按钮 -->
      <div class="tabs-container">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          v-tooltip.bottom="{
            content: tab.label,
            delay: { show: 1000 }
          }"
          class="tab-item"
          :class="{ active: currentTab === tab.key }"
          @click="currentTab = tab.key"
        >
          <div class="icon">
            <component
              :is="tab.icon"
              theme="outline"
              size="18"
              :fill="currentTab === tab.key ? 'var(--color-primary)' : 'var(--color-icon-default)'"
              :stroke-width="3"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="sidebar-content">
      <component :is="currentComponent" :noteId="currentNoteId" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Split, LinkTwo } from '@icon-park/vue-next'
import MultiNotes from '@renderer/components/layout/MultiNotes.vue'
import BacklinksPanelNoteEditor from '@renderer/components/layout/BacklinksPanelNoteEditor.vue'
import { useUIStore } from '@renderer/stores/useUIStore'

const props = defineProps<{
  initialWidth?: number
}>()

const emit = defineEmits(['resize'])
const uiStore = useUIStore()

const sidebarWidth = ref(props.initialWidth || 400)
const currentTab = computed({
  get: () => uiStore.rightSidebarTab,
  set: (value) => (uiStore.rightSidebarTab = value)
})
const route = useRoute()

// 定义可用的 tabs
const tabs = [
  {
    key: 'multi',
    label: '多开笔记',
    icon: Split,
    component: MultiNotes
  },
  {
    key: 'backlink',
    label: '回链笔记',
    icon: LinkTwo,
    component: BacklinksPanelNoteEditor
  }
]

// 获取当前打开的笔记 ID
const currentNoteId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : null
})

// 当前应该显示的组件
const currentComponent = computed(() => {
  const tab = tabs.find((t) => t.key === currentTab.value)
  return tab?.component
})

// 处理侧边栏宽度调整
const startResize = (e: MouseEvent) => {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = sidebarWidth.value

  const resize = (e: MouseEvent) => {
    const diff = startX - e.clientX
    const newWidth = Math.max(400, Math.min(600, startWidth + diff))
    sidebarWidth.value = newWidth
    emit('resize', newWidth)
  }

  const stopResize = () => {
    window.removeEventListener('mousemove', resize)
    window.removeEventListener('mouseup', stopResize)
  }

  window.addEventListener('mousemove', resize)
  window.addEventListener('mouseup', stopResize)
}
</script>

<style scoped lang="scss">
.right-sidebar {
  height: 100vh;
  background-color: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: relative;
  border-left: 1px solid var(--color-border);

  .resize-handle {
    position: absolute;
    top: 0;
    left: -5px;
    width: 10px;
    height: 100%;
    cursor: col-resize;
    z-index: 1;
  }

  .sidebar-header {
    // border-bottom: 1px solid var(--color-border);
    height: 40px;
    padding: 2px 8px;
  }

  .tabs-container {
    display: flex;
    gap: 8px;

    .tab-item {
      display: flex;
      align-items: center;
      gap: 6px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: none;
      padding: 4px 4px;
      margin: 2px;

      &:hover {
        background-color: var(--color-hover-button);
      }

      &:active {
        background-color: rgba(0, 0, 0, 0.1);
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
          width: 18px;
          height: 18px;
        }
      }

      span {
        font-size: 13px;
      }
    }
  }

  .sidebar-content {
    flex: 1;
    overflow: hidden;
  }

  @media (max-width: 768px) {
    .resize-handle {
      display: none;
    }
  }
}
</style>
