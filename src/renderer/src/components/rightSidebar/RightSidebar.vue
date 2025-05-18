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
import {
  Split,
  Notepad,
  Components,
  Box,
  Robot,
  MailPackage,
  ListAlphabet,
  CopyLink
} from '@icon-park/vue-next'
import MultiNotes from '@renderer/components/rightSidebar/MultiNotes.vue'
import BacklinksPanelNoteEditor from '@renderer/components/rightSidebar/BacklinksPanelNoteEditor.vue'
import RightSidebarDraftsEditor from '@renderer/components/rightSidebar/RightSidebarDraftsEditor.vue'
import RightSidebarWidgets from '@renderer/components/rightSidebar/RightSidebarWidgets.vue'
import RightSidebarCardbox from '@renderer/components/rightSidebar/RightSidebarCardbox.vue'
import RightSidebarAssistant from '@renderer/components/rightSidebar/RightSidebarAssistant.vue'
import RightSidebarLetters from '@renderer/components/rightSidebar/RightSidebarLetters.vue'
import RightSidebarIndex from '@renderer/components/rightSidebar/RightSidebarIndex.vue'
import { useUIStore } from '@renderer/stores/UIStore'

// 定义 UIStore 中的标签页类型
type UIStoreTabKey = 'widgets' | 'drafts' | 'assistant' | 'cardbox' | 'index'

// 定义所有可能的标签页类型
type TabKey = UIStoreTabKey | 'multi' | 'backlink' | 'letters'

interface Tab {
  key: TabKey
  label: string
  icon: any
  component: any
}

const props = defineProps<{
  initialWidth?: number
}>()

const emit = defineEmits(['resize'])
const uiStore = useUIStore()

const sidebarWidth = ref(props.initialWidth || 400)
const currentTab = computed({
  get: () => {
    const tab = uiStore.rightSidebarTab
    return tab as TabKey
  },
  set: (value: TabKey) => {
    if (isUIStoreTab(value)) {
      uiStore.rightSidebarTab = value
    }
  }
})
const route = useRoute()

// 类型保护函数
function isUIStoreTab(tab: TabKey): tab is UIStoreTabKey {
  return ['widgets', 'drafts', 'assistant', 'cardbox', 'index'].includes(tab)
}

// 定义可用的 tabs
const tabs: Tab[] = [
  {
    key: 'multi',
    label: '多开笔记',
    icon: Split,
    component: MultiNotes
  },
  {
    key: 'backlink',
    label: '回链笔记',
    icon: CopyLink,
    component: BacklinksPanelNoteEditor
  },

  {
    key: 'cardbox' as const,
    label: '卡片盒',
    icon: Box,
    component: RightSidebarCardbox
  },
  {
    key: 'index' as const,
    label: '索引',
    icon: ListAlphabet,
    component: RightSidebarIndex
  },
  {
    key: 'assistant' as const,
    label: '智能助手',
    icon: Robot,
    component: RightSidebarAssistant
  },
  {
    key: 'drafts' as const,
    label: '草稿纸',
    icon: Notepad,
    component: RightSidebarDraftsEditor
  },
  {
    key: 'widgets' as const,
    label: '小组件',
    icon: Components,
    component: RightSidebarWidgets
  },
  {
    key: 'letters',
    label: '往期来信',
    icon: MailPackage,
    component: RightSidebarLetters
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
  background-color: var(--color-bg-secondary);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: relative;

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
    height: 40px;
    padding: 2px 8px;
    border-bottom: 1px solid var(--color-border);
  }

  .tabs-container {
    display: flex;
    gap: 8px;
    // border-bottom: 1px solid var(--color-border);

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
    border-radius: 0 0 8px 8px;
  }

  @media (max-width: 768px) {
    .resize-handle {
      display: none;
    }
  }
}
</style>
