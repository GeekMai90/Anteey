<template>
  <div class="backlinks-panel">
    <div class="panel-header">
      <div class="title" @click="togglePanel">
        <Motion
          as="div"
          class="icon"
          :initial="{ rotate: 0 }"
          :animate="{ rotate: isCollapsed ? 0 : -45 }"
          :transition="{ duration: 0.3, ease: 'easeInOut' }"
        >
          <LinkTwo
            theme="outline"
            size="16"
            :fill="isCollapsed ? 'var(--color-icon-secondary)' : 'var(--color-primary)'"
            :stroke-width="3"
          />
        </Motion>
        <div class="name">关联 ({{ totalLinks }})</div>
      </div>
      <transition name="fade">
        <div v-show="!isCollapsed" class="filters">
          <span
            v-for="type in linkTypes"
            :key="type.value"
            :class="['filter-item', { active: activeFilter === type.value }]"
            @click="setFilter(type.value)"
          >
            {{ type.label }}
          </span>
        </div>
      </transition>
    </div>

    <transition name="expand" @enter="enter" @after-enter="afterEnter" @leave="leave">
      <div v-show="!isCollapsed" class="links-container">
        <!-- 直接引用 -->
        <div v-if="showDirectLinks" class="links-section">
          <div class="section-title">
            <span>直接引用</span>
            <span class="count">{{ directLinksData.length }}</span>
          </div>
          <div class="links-list">
            <div
              v-for="link in directLinksData"
              :key="link.id"
              class="link-item"
              @click="(e) => handleLinkClick(link, e)"
            >
              <div class="link-header">
                <div class="note-type" :class="link.cardType || 'Maincard'"></div>
                <span class="note-title">{{ link.address || '未设置编码地址' }}</span>
                <span class="timestamp">{{
                  formatDate(new Date(link.createdAt || Date.now()), 'date-only')
                }}</span>
              </div>
              <div class="note-title-text">
                <span>{{ link.metadata?.title || '未命名笔记' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 反向引用 -->
        <div v-if="showBacklinks" class="links-section">
          <div class="section-title">
            <span>反向引用</span>
            <span class="count">{{ backlinksData.length }}</span>
          </div>
          <div class="links-list">
            <div
              v-for="link in backlinksData"
              :key="link.id"
              class="link-item"
              @click="(e) => handleLinkClick(link, e)"
            >
              <div class="link-header">
                <div class="note-type" :class="link.cardType || 'Maincard'"></div>
                <span class="note-title">{{ link.address || '未设置编码地址' }}</span>
                <span class="timestamp">{{
                  formatDate(new Date(link.createdAt || Date.now()), 'date-only')
                }}</span>
              </div>
              <div class="note-title-text">
                <span>{{ link.metadata?.title || '未命名笔记' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { LinkTwo } from '@icon-park/vue-next'
import { formatDate } from '@renderer/utils/noteHelpers'
import { useRouter } from 'vue-router'
import type { References, InternalNoteReference, Note } from '@shared/types'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useUIStore } from '@renderer/stores/UIStore'
import { useEventBus } from '@vueuse/core'
import { Motion } from 'motion-v'

const props = defineProps<{
  noteId: string
  references: References | string
}>()

const router = useRouter()
const activeFilter = ref('all')

const noteStore = useNoteStore()

const linkTypes = [
  { label: '全部', value: 'all' },
  { label: '直接引用', value: 'direct' },
  { label: '反向引用', value: 'backlink' }
]

// 存储引用数据
const referenceData = ref<References>(
  typeof props.references === 'string' ? JSON.parse(props.references) : props.references
)

// 计算属性现在基于 referenceData
const parsedReferences = computed<References>(() => referenceData.value)

const directLinks = computed<InternalNoteReference[]>(() => parsedReferences.value.outgoing || [])
const backlinks = computed<InternalNoteReference[]>(() => parsedReferences.value.incoming || [])
const totalLinks = computed(() => directLinksData.value.length + backlinksData.value.length)

const showDirectLinks = computed(
  () => activeFilter.value === 'all' || activeFilter.value === 'direct'
)
const showBacklinks = computed(
  () => activeFilter.value === 'all' || activeFilter.value === 'backlink'
)

const setFilter = (filter: string) => {
  activeFilter.value = filter
}

const handleLinkClick = (note: Note, event: MouseEvent) => {
  // Command/Ctrl + 点击: 全屏打开笔记
  if (event.metaKey || event.ctrlKey) {
    router.push(`/note/${note.id}`)
    return
  }

  // 普通点击: 在右侧边栏打开
  noteStore.openBacklinkPreview(note.id)
  const uiStore = useUIStore()
  uiStore.openRightSidebarWithTab('backlink')
}

// 添加折叠状态
const emit = defineEmits(['refresh'])
const isCollapsed = ref(true)

// 添加切换方法
const togglePanel = async () => {
  isCollapsed.value = !isCollapsed.value
  // 当展开面板时，重新获取笔记数据
  // 当展开面板时，通知父组件刷新数据
  if (!isCollapsed.value) {
    emit('refresh')
  }
}

const directLinksData = ref<Note[]>([])
const backlinksData = ref<Note[]>([])

// 简化数据获取方法
const fetchFullNotesData = async () => {
  try {
    // 获取直接引用的笔记数据
    const directNotes = await Promise.all(
      directLinks.value.map(async (link) => {
        try {
          const note = await noteStore.fetchNote(link.targetNoteId || '')
          // 如果笔记不存在或已删除,返回 null
          return note || null
        } catch (error) {
          console.error(`获取笔记 ${link.targetNoteId} 失败:`, error)
          return null
        }
      })
    )
    // 过滤掉 null 的结果
    directLinksData.value = directNotes.filter((note: any): note is Note => note !== null)

    // 获取反向引用的笔记数据
    const backNotes = await Promise.all(
      backlinks.value.map(async (link) => {
        try {
          const note = await noteStore.fetchNote(link.sourceNoteId || '')
          // 如果笔记不存在或已删除,返回 null
          return note || null
        } catch (error) {
          console.error(`获取笔记 ${link.sourceNoteId} 失败:`, error)
          return null
        }
      })
    )
    // 过滤掉 null 的结果
    backlinksData.value = backNotes.filter((note: any): note is Note => note !== null)
  } catch (error) {
    console.error('获取笔记数据失败:', error)
  }
}

// 监听 props 变化
watch(
  () => props.references,
  (newRefs) => {
    referenceData.value = typeof newRefs === 'string' ? JSON.parse(newRefs) : newRefs
  }
)

// 监听引用更新事件
const referencesUpdatedBus = useEventBus('references-updated')

// 获取最新的引用数据
const refreshReferences = async () => {
  try {
    // 获取最新的笔记数据（包含最新的引用关系）
    const updatedNote = await noteStore.fetchNote(props.noteId)
    if (updatedNote?.references) {
      // 更新引用数据
      referenceData.value = updatedNote.references
      // 重新获取完整的笔记数据
      await fetchFullNotesData()
    }
  } catch (error) {
    console.error('刷新引用数据失败:', error)
  }
}

// 组件挂载时获取数据
onMounted(() => {
  // 初始加载数据
  fetchFullNotesData()

  // 监听引用更新事件
  referencesUpdatedBus.on((updatedNoteId) => {
    // 如果更新的是当前笔记，则刷新数据
    if (updatedNoteId === props.noteId) {
      refreshReferences()
    }
  })
})

// 添加展开/折叠动画的处理函数
const enter = (element: Element) => {
  const el = element as HTMLElement
  el.style.height = 'auto'
  const height = el.scrollHeight
  el.style.height = '0px'
  // 触发重绘
  el.offsetHeight
  el.style.height = `${height}px`
}

const afterEnter = (element: Element) => {
  const el = element as HTMLElement
  el.style.height = 'auto'
}

const leave = (element: Element) => {
  const el = element as HTMLElement
  el.style.height = `${el.scrollHeight}px`
  // 触发重绘
  el.offsetHeight
  el.style.height = '0px'
}
</script>

<style scoped lang="scss">
.backlinks-panel {
  margin-top: 40px;
  padding: 20px 20px 0px 20px;
  border-top: 1px solid var(--color-border);
  border-radius: 0 0 8px 8px;

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;

    .title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
      color: var(--color-text-secondary);

      .icon {
        background: none;
        border: none;
        cursor: pointer;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transform-origin: center;

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
        font-size: 14px;
        line-height: 1;
        color: var(--color-text-secondary);
        cursor: pointer;
        user-select: none;
      }
    }

    .filters {
      display: flex;
      gap: 12px;
      user-select: none;

      .filter-item {
        font-size: 13px;
        color: var(--color-text-tertiary);
        cursor: pointer;
        padding: 2px 8px;
        border-radius: 4px;
        transition: all 0.2s ease;

        &:hover {
          color: var(--color-text-secondary);
          background: var(--color-hover-bg);
        }

        &.active {
          color: var(--color-primary);
          background: var(--color-primary-bg);
        }
      }
    }
  }

  .links-section {
    margin-bottom: 24px;

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--color-text-tertiary);
      margin-bottom: 12px;

      .count {
        color: var(--color-text-quaternary);
      }
    }
  }

  .links-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .link-item {
    padding: 12px;
    border-radius: 8px;
    background: var(--color-bg-backlink-note-card);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--color-hover-bg);
      transform: translateX(2px);
    }

    .link-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      width: 100%;

      .note-type {
        width: 3px;
        height: 10px;
        border-radius: 1.5px;
        flex-shrink: 0;

        &.Maincard {
          background: var(--color-primary);
        }
        &.Bibcard {
          background: var(--color-yellow);
        }
        &.Indexcard {
          background: var(--color-blue);
        }
      }

      .note-title {
        color: var(--color-text-primary);
        font-size: 12px;
        line-height: 1;
        flex-grow: 1;
      }

      .timestamp {
        font-size: 12px;
        color: var(--color-text-tertiary);
        margin-left: auto;
        flex-shrink: 0;
      }
    }
    .note-title-text {
      font-size: 14px;
      line-height: 1;
      margin-bottom: 6px;
    }

    .link-context {
      p {
        margin: 0;
        line-height: 1;
        font-size: 16px;
      }

      :deep(.reference-link) {
        border-radius: 0.125rem;
        color: var(--color-primary);
        cursor: pointer;
        transition: all 0.1s ease-in;
        box-shadow: 0 0 0 3px transparent;

        &:hover {
          background-color: var(--color-hover-bg);
          box-shadow: 0 0 0 3px var(--color-hover-bg);
        }

        .reference-text {
          border-bottom: 1px solid var(--color-primary);
          margin: 0 4px;
        }
      }
    }
  }
}

// 添加淡入淡出动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 添加展开/折叠动画
.expand-enter-active,
.expand-leave-active {
  transition: height 0.3s ease-in-out;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  height: 0;
}

.links-container {
  overflow: hidden;
}
</style>
