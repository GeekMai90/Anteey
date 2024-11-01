<template>
  <div class="backlinks-panel">
    <div class="panel-header">
      <div class="title" @click="togglePanel">
        <div class="icon" :class="{ collapsed: isCollapsed }">
          <LinkTwo
            theme="outline"
            size="16"
            :fill="isCollapsed ? 'var(--color-icon-secondary)' : 'var(--color-primary)'"
          />
        </div>
        <div class="name">关联 ({{ totalLinks }})</div>
      </div>
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
    </div>

    <div v-show="!isCollapsed" class="links-container">
      <!-- 直接引用 -->
      <div v-if="showDirectLinks" class="links-section">
        <div class="section-title">
          <span>直接引用</span>
          <span class="count">{{ directLinks.length }}</span>
        </div>
        <div class="links-list">
          <div
            v-for="link in directLinks"
            :key="link.id"
            class="link-item"
            @click="handleLinkClick(link)"
          >
            <div class="link-header">
              <div class="note-type" :class="link.metadata?.cardType || 'Maincard'"></div>
              <span class="note-title">{{ link.metadata?.address || '未命名笔记' }}</span>
            </div>
            <div v-if="link.context" class="link-context">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <p v-html="formatLinkContext(link.context.text)"></p>
            </div>
            <div class="link-meta">
              <span class="timestamp">{{ formatDate(new Date(link.createdAt)) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 反向引用 -->
      <div v-if="showBacklinks" class="links-section">
        <div class="section-title">
          <span>反向引用</span>
          <span class="count">{{ backlinks.length }}</span>
        </div>
        <div class="links-list">
          <div
            v-for="link in backlinks"
            :key="link.id"
            class="link-item"
            @click="handleLinkClick(link)"
          >
            <div class="link-header">
              <div class="note-type" :class="link.metadata?.cardType || 'Maincard'"></div>
              <span class="note-title">{{ link.metadata?.address || '未命名笔记' }}</span>
            </div>
            <div v-if="link.context" class="link-context">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <p v-html="formatLinkContext(link.context.text)"></p>
            </div>
            <div class="link-meta">
              <span class="timestamp">{{ formatDate(new Date(link.createdAt)) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { LinkTwo } from '@icon-park/vue-next'
import { formatDate } from '@renderer/utils/noteHelpers'
import { useRouter } from 'vue-router'
import type { References, InternalNoteReference } from '@renderer/types/Note'

const props = defineProps<{
  noteId: string
  references: References | string
}>()

const router = useRouter()
const activeFilter = ref('all')

const linkTypes = [
  { label: '全部', value: 'all' },
  { label: '直接引用', value: 'direct' },
  { label: '反向引用', value: 'backlink' }
]

const parsedReferences = computed<References>(() => {
  if (typeof props.references === 'string') {
    try {
      return JSON.parse(props.references)
    } catch (e) {
      console.error('解析 references 失败:', e)
      return { incoming: [], outgoing: [] }
    }
  }
  return props.references
})

const directLinks = computed<InternalNoteReference[]>(() => parsedReferences.value.outgoing || [])
const backlinks = computed<InternalNoteReference[]>(() => parsedReferences.value.incoming || [])
const totalLinks = computed(() => directLinks.value.length + backlinks.value.length)

const showDirectLinks = computed(
  () => activeFilter.value === 'all' || activeFilter.value === 'direct'
)
const showBacklinks = computed(
  () => activeFilter.value === 'all' || activeFilter.value === 'backlink'
)

const setFilter = (filter: string) => {
  activeFilter.value = filter
}

const handleLinkClick = (link: InternalNoteReference) => {
  // 根据引用类型选择正确的ID
  const noteId = link.targetNoteId || link.sourceNoteId
  if (noteId) {
    router.push(`/note/${noteId}`)
  }
}
const formatLinkContext = (text: string | undefined) => {
  if (!text) return ''
  // 将特殊标记转换为 Heptabase 风格的引用链接
  return text.replace(/\[\[([0-9a-f-]+):(.+?)\]\]/g, (_, id, text) => {
    return `<span class="reference-link"><span class="reference-text">${text}</span></span>`
  })
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
</script>

<style scoped lang="scss">
.backlinks-panel {
  margin-top: 40px;
  padding: 20px;
  border-top: 1px solid var(--color-border);

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

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
        transform: rotate(-45deg);
        transition: all 0.2s ease;
        padding: 0;

        &.collapsed {
          transform: rotate(0deg);
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
    background: var(--color-note-card-bg);
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
      margin-bottom: 12px;

      .note-type {
        width: 3px;
        height: 12px;
        border-radius: 1.5px;

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
        font-weight: 500;
        color: var(--color-text-primary);
        font-size: 14px;
        line-height: 1;
      }
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

    .link-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 12px;

      .timestamp {
        font-size: 12px;
        color: var(--color-text-tertiary);
      }
    }
  }
}
</style>
