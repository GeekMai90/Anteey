<template>
  <div
    :id="`note-${note.id}`"
    class="note-card"
    :class="{
      highlighted: isHighlighted,
      'multi-select-mode': noteStore.isMultiSelectMode
    }"
    @click="handleCardClick"
    @dblclick="handleDoubleClick"
  >
    <!-- 添加复选框 -->
    <div
      v-if="noteStore.isMultiSelectMode"
      class="checkbox-wrapper"
      :class="{ checked: noteStore.isNoteSelected(note.id) }"
      @click.stop="toggleSelect"
    >
      <div class="checkbox">
        <CheckOne v-if="noteStore.isNoteSelected(note.id)" theme="filled" size="16" fill="#fff" />
      </div>
    </div>

    <div class="note-header">
      <span class="note-indicator" :class="cardTypeClass"></span>
      <h3 class="note-title">{{ note.address ? note.address : '无编码地址' }}</h3>
      <div v-if="!noteStore.isMultiSelectMode" class="note-buttons">
        <ExpandButton :note-id="note.id" />
        <!-- 使用封装的AI按钮组件 -->
        <AIButton :note-id="note.id" />
        <!-- 添加卡片盒设置按钮 -->
        <CardboxButton :note-id="note.id" :current-cardbox-id="note.cardBoxId || undefined" />
        <!-- 更多按钮 -->
        <MoreButton
          :note-id="note.id"
          :menu-items="[
            'star',
            'convertToFlashcard',
            'sidebar',
            'toggleIndex',
            'divider',
            'copyQuote',
            'copyAddress',
            'addSibling',
            'addChild',
            'divider',
            'viewInTree',
            'share',
            'delete'
          ]"
        />
      </div>
    </div>
    <div ref="noteContent" class="note-content">
      <JsonContentRenderer v-if="localNote" :key="localNote.id" :content="localNote.content" />
    </div>
    <div class="note-timestamp">
      <div class="note-tags">
        <div
          v-for="tag in noteTags"
          :key="tag.id"
          class="tag-item"
          @click.stop="handleTagClick(tag.id, $event)"
        >
          <span class="tag-symbol">#</span>
          <span class="tag-name">{{ tag.name }}</span>
        </div>
      </div>
      <div class="timestamp-section">
        <FlashcardIndicator
          :is-flashcard="note.isFlashcard"
          :fsrs-state="note.flashcard?.fsrs?.state"
        />
        <NoteLinkButton :note-id="note.id" container-class="cardbox-container" />
        {{ formatDate(note.createdAt, 'date-only') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Note, Tag } from '@shared/types'
import { formatDate } from '@renderer/utils/noteHelpers'
import { CheckOne } from '@icon-park/vue-next'
import { computed, onUnmounted, ref, watch, onMounted, inject } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useTagStore } from '@renderer/stores/tagStore'
import { useRouter } from 'vue-router'
import JsonContentRenderer from '@renderer/components/note/JsonContentRenderer.vue'
import AIButton from '@renderer/components/common/AIButton.vue'
import MoreButton from '@renderer/components/common/MoreButton.vue'
import CardboxButton from '@renderer/components/common/CardboxButton.vue'
import ExpandButton from '@renderer/components/common/ExpandButton.vue'
import FlashcardIndicator from '@renderer/components/common/FlashcardIndicator.vue'
import NoteLinkButton from '@renderer/components/common/NoteLinkButton.vue'

const props = defineProps<{
  note: Note
  highlightedNoteId: string | null
}>()

const noteStore = useNoteStore()
const tagStore = useTagStore()

// 修改这部分，确保接受两个参数的函数类型
const { handleNoteShiftSelect } = inject('provideShiftSelect', {
  handleNoteShiftSelect: () => false
}) as { handleNoteShiftSelect: (noteId: string, shiftKey: boolean) => boolean }

// 本地控制高亮状态
const localHighlight = ref(false)
let highlightTimer: NodeJS.Timeout | null = null

// 监听 highlightedNoteId 变化
watch(
  () => props.highlightedNoteId,
  (newId) => {
    if (newId === props.note.id) {
      localHighlight.value = true

      // 清除之前的定时器（如果存在）
      if (highlightTimer) {
        clearTimeout(highlightTimer)
      }

      // 等待滚动动画完成（大约500ms）后再开始计时
      highlightTimer = setTimeout(() => {
        // 2秒后清除高亮
        setTimeout(() => {
          localHighlight.value = false
        }, 5000)
      }, 500) // 等待滚动完成
    }
  },
  { immediate: true }
)

// 组件卸载时清理定时器
onUnmounted(() => {
  if (highlightTimer) {
    clearTimeout(highlightTimer)
  }
})

// 修改计算属性
const isHighlighted = computed(() => localHighlight.value)

const localNote = ref(props.note)

const router = useRouter()

const cardTypeClass = computed(() => {
  if (props.note.cardType === 'Maincard' && props.note.isIndexed) {
    return 'indexed-maincard'
  }
  switch (props.note.cardType) {
    case 'Maincard':
      return 'maincard'
    case 'Bibcard':
      return 'bibcard'
    case 'Indexcard':
      return 'indexcard'
    case 'Hoplinkcard':
      return 'hoplinkcard'
    case 'Draftcard':
      return 'draftcard'
    case 'Snippetcard':
      return 'snippetcard'
    default:
      return ''
  }
})

// 修改卡片点击处理函数
const handleCardClick = (event: MouseEvent) => {
  // 只在多选模式或使用了修饰键时阻止事件冒泡
  if (noteStore.isMultiSelectMode || event.shiftKey || event.metaKey) {
    event.preventDefault()
    event.stopPropagation()
  }

  if (noteStore.isMultiSelectMode) {
    // 多选模式下的原有逻辑
    if (event.shiftKey) {
      if (handleNoteShiftSelect(props.note.id, true)) {
        return
      }
    }
    toggleSelect()
    handleNoteShiftSelect(props.note.id, false)
  } else {
    // 非多选模式下的快捷键功能
    if (event.shiftKey && props.note.address) {
      // Shift+单击：在知识树中查看节点
      router.push({
        name: 'KnowledgeTreeNode',
        params: { address: props.note.address }
      })
    } else if (event.metaKey) {
      // Command+单击：全屏查看
      router.push({ name: 'NoteExpandEditor', params: { id: props.note.id } })
    }
  }
}

// 修改双击事件处理函数
const handleDoubleClick = (event: MouseEvent) => {
  // 检查点击源是否来自链接按钮、菜单或工具按钮区域
  const target = event.target as HTMLElement
  const linkButton = target.closest('.note-link-wrapper')
  const toolButton = target.closest('.note-buttons')
  if (linkButton || toolButton) {
    return
  }

  if (!noteStore.isMultiSelectMode) {
    noteStore.openNoteEditor(props.note.id)
  }
}

// 切换选择状态
const toggleSelect = () => {
  noteStore.selectNote(props.note.id)
}

// 添加标签相关代码
const noteTags = ref<Tag[]>([])

const fetchNoteTags = async () => {
  noteTags.value = await tagStore.getNoteTags(props.note.id)
}

// 标签点击处理
const handleTagClick = (tagId: string, event: Event) => {
  event.stopPropagation()
  router.push({
    name: 'cardbox',
    query: {
      tags: tagId,
      box: 'all'
    }
  })
}

onMounted(async () => {
  await fetchNoteTags()
})
</script>

<style lang="scss" scoped>
.note-card {
  background-color: var(--color-bg-note-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0 0 6px 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  width: 100%;
  height: var(--card-height);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  user-select: none;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &:hover {
    border: 1px solid rgba(var(--color-primary-rgb), 0.4);
    box-shadow: 0 0 20px 1px rgba(var(--color-primary-rgb), 0.1);
    transform: translateY(-2px);
  }

  .note-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    padding: 0 15px 0 20px;
    min-height: 30px;
    margin: 10px 0 0 0;

    .note-indicator {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 14px;
      border-radius: 2px;
      margin-right: 10px;

      &.maincard {
        background-color: var(--color-primary);
      }

      &.bibcard {
        background-color: var(--color-yellow);
      }

      &.indexcard {
        background-color: var(--color-blue);
      }

      &.hoplinkcard {
        background-color: var(--color-pink);
      }
      &.draftcard {
        background-color: var(--color-draft);
      }
      &.snippetcard {
        background-color: var(--color-snippet);
      }
    }
    @media (prefers-color-scheme: dark) {
      .note-indicator {
        &.indexed-maincard {
          background-color: var(--color-blue);
        }

        &.maincard {
          background-color: var(--color-primary);
        }

        // 稍微亮一点的绿色
        &.bibcard {
          background-color: var(--color-yellow);
        }

        // 稍微亮一点的橙色
        &.indexcard {
          background-color: var(--color-blue);
        }

        // 稍微亮一点的蓝色
        &.hoplinkcard {
          background-color: var(--color-pink);
        }
        // 稍微亮一点的灰色
        &.draftcard {
          background-color: var(--color-draft);
        }
        &.snippetcard {
          background-color: var(--color-snippet);
        }
      }
    }
    .note-title {
      margin: 0;
      font-size: 1rem;
      font-weight: bold;
      color: var(--color-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: flex;
      align-items: center;
      height: 100%;
      line-height: 1;
    }
    .note-buttons {
      position: absolute;
      right: 0;
      display: flex;
      opacity: 0;
      transition: opacity 0.2s ease;
      margin-right: 10px;
      height: 100%;
      align-items: center;

      .note-options-menu {
        :deep(.note-options-menu) {
          transform: translateX(-68%); // 居中对齐
        }
      }
      .note-button {
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

        .icon {
          background: none;
          border: none;
          cursor: pointer;
          width: 20px;
          height: 20px;
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

        .name {
          flex-grow: 0;
          text-align: left;
          color: var(---color-text-primary);
          font-size: 13px;
          font-weight: 400;
          margin-left: 6px;
          white-space: nowrap;
          writing-mode: horizontal-tb;
          line-height: 1;
        }

        &:hover {
          background-color: var(--color-hover-button);
        }

        &:active {
          background-color: rgba(0, 0, 0, 0.1);
        }

        &.delete {
          color: #ff4d4f;
        }
      }
    }
  }
  // 新增：确保菜单始终可见
  .note-options-menu {
    opacity: 1 !important;
    visibility: visible !important;
  }

  .note-content {
    flex-grow: 1;
    color: var(--color-text-primary);
    text-align: left;
    // margin-bottom: 10px;
    min-height: 60px;
    max-height: 300px;
    overflow: hidden;
    position: relative;
    font-size: 15px;
    padding: 0 20px;
  }

  // 多选模式样式
  &.multi-select-mode {
    cursor: pointer;

    &:hover {
      border-color: var(--color-primary);
      background-color: rgba(var(--color-primary-rgb), 0.02);
    }

    // 多选模式下隐藏功能按钮
    .note-buttons {
      display: none;
    }
  }
}

.note-card:hover .note-buttons {
  opacity: 1;
}

.fade-out {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 40px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1));
  /* 模糊效果 */
  pointer-events: none;
  /* 确保不影响交互 */
}

.note-timestamp {
  font-size: 0.8em;
  color: var(--color-text-tertiary);
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 15px;

  .note-tags {
    display: flex;
    gap: 6px;
    flex: 0 1 auto;
    align-items: center;
    margin-right: 12px;
    max-width: 200px;
    overflow: hidden;
    white-space: nowrap;

    .tag-item {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      height: 20px;
      padding: 0 6px;
      background: var(--color-primary-light);
      border: 1px solid transparent;
      border-radius: 16px;
      font-size: 10px;
      transition: all 0.2s ease;
      cursor: pointer;
      flex-shrink: 0;

      &:hover {
        border-color: var(--color-primary);
      }

      .tag-symbol {
        color: var(--color-primary);
        font-size: 12px;
      }

      .tag-name {
        color: var(--color-primary);
        font-weight: 400;
      }
    }
  }

  .timestamp-section {
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    flex-shrink: 0;

    .link-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: var(--color-text-tertiary);

      &:hover {
        color: var(--color-primary);
        background-color: var(--color-hover-button);
      }

      .link-icon {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.8;
        transition: opacity 0.2s ease;

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

        &:hover {
          opacity: 1;
        }
      }
    }
  }
}

.note-card {
  &.highlighted {
    box-shadow: 0 0 0 2px var(--color-primary);
    animation: pulse 2s infinite;
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--color-primary-rgb), 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(var(--color-primary-rgb), 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(var(--color-primary-rgb), 0);
  }
}

// 复选框样式
.checkbox-wrapper {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  margin: 0;

  .checkbox {
    width: 20px;
    height: 20px;
    border: 2px solid var(--color-border);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-bg-primary);
    transition: all 0.2s ease;
    padding: 0;
    margin: 0;

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      padding: 0;
      margin: 0;
    }

    &:hover {
      border-color: var(--color-primary);
      background-color: rgba(var(--color-primary-rgb), 0.1);
    }
  }

  &.checked {
    .checkbox {
      background-color: var(--color-primary);
      border-color: var(--color-primary);

      &:hover {
        background-color: var(--color-primary);
        opacity: 0.9;
      }
    }
  }
}
</style>
