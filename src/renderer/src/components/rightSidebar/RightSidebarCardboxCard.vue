<template>
  <div
    :id="`note-${note.id}`"
    class="sidebar-note-card"
    :class="{ highlighted: isHighlighted }"
    draggable="true"
    @dragstart="handleDragStart"
    @click="handleCardClick"
    @dblclick="handleDoubleClick"
  >
    <div class="note-header">
      <span class="note-indicator" :class="cardTypeClass"></span>
      <h3 class="note-title">{{ note.address ? note.address : '无编码地址' }}</h3>
    </div>

    <div class="note-content">
      <JsonContentRenderer
        v-if="note"
        :key="note.id"
        :content="note.content"
        :editable="false"
        :enable-drag-handle="false"
        class="tiptap-content"
      />
    </div>

    <div class="note-timestamp">
      <StorageCardOne
        v-if="note.isFlashcard"
        theme="outline"
        size="14"
        :fill="flashcardColor"
        :strokeWidth="3"
      />
      {{ formatDate(note.updatedAt, 'date-only') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { Note } from '@shared/types'
import { formatDate } from '@renderer/utils/noteHelpers'
import { StorageCardOne } from '@icon-park/vue-next'
import { computed } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useRouter } from 'vue-router'
import JsonContentRenderer from '@renderer/components/note/JsonContentRenderer.vue'

const props = defineProps<{
  note: Note
  highlightedNoteId: string | null
}>()

const noteStore = useNoteStore()
const router = useRouter()

const isHighlighted = computed(() => props.highlightedNoteId === props.note.id)

const cardTypeClass = computed(() => {
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
    default:
      return ''
  }
})

const flashcardColor = computed(() => 'var(--color-text-secondary)')

// 处理卡片点击
const handleCardClick = (event: MouseEvent) => {
  // 如果使用了修饰键，阻止事件冒泡
  if (event.shiftKey || event.metaKey || event.altKey) {
    event.preventDefault()
    event.stopPropagation()
  }

  // 处理不同的快捷键操作
  if (event.shiftKey && props.note.address) {
    // Shift+单击：在知识树中查看节点
    router.push({
      name: 'KnowledgeTreeNode',
      params: { address: props.note.address }
    })
  } else if (event.metaKey) {
    // Command/Ctrl+单击：全屏查看
    router.push({ name: 'NoteExpandEditor', params: { id: props.note.id } })
  } else if (event.altKey) {
    // Alt+单击：在卡片盒中查看
    router.push({
      name: 'cardbox',
      query: {
        box: props.note.cardBoxId || 'all',
        highlight: props.note.id
      }
    })
  }
}

// 处理双击：打开笔记编辑器
const handleDoubleClick = () => {
  noteStore.openNoteEditor(props.note.id)
}

const handleDragStart = (event: DragEvent) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/json', JSON.stringify({ id: props.note.id }))
    event.dataTransfer.effectAllowed = 'copy'

    // 创建一个简单的拖动时的视觉效果
    const dragImage = document.createElement('div')
    dragImage.style.cssText = `
      position: absolute;
      width: 200px;
      height: 50px;
      background: var(--color-bg-note-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 10px;
      opacity: 0.8;
      pointer-events: none;
      display: flex;
      align-items: center;
    `
    dragImage.textContent = props.note.address || '无编码地址'
    document.body.appendChild(dragImage)

    // 设置拖动图像
    event.dataTransfer.setDragImage(dragImage, 100, 25)

    // 拖动结束后移除临时元素
    setTimeout(() => {
      document.body.removeChild(dragImage)
    }, 0)
  }
}
</script>

<style lang="scss" scoped>
.sidebar-note-card {
  background-color: var(--color-bg-note-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 0 6px 10px;
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  height: var(--card-height);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  cursor: grab;
  user-select: none;

  &:active {
    cursor: grabbing;
  }

  &:hover {
    border: 1px solid rgba(var(--color-primary-rgb), 0.4);
    box-shadow: 0 0 20px 1px rgba(var(--color-primary-rgb), 0.1);
    transform: translateY(-2px);
  }

  .note-header {
    display: flex;
    align-items: center;
    padding: 0 15px 0 15px;
    height: 30px;
    pointer-events: none;

    .note-indicator {
      position: absolute;
      left: 15px;
      top: 19px;
      width: 4px;
      height: 12px;
      border-radius: 2px;

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
    }

    .note-title {
      margin: 0;
      font-size: 1rem;
      font-weight: bold;
      color: var(--color-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .note-content {
    flex: 1;
    padding: 0 15px;
    overflow: hidden;
    pointer-events: none;

    :deep(.tiptap-content) {
      font-size: 13px;
      // line-height: 1.4;
      color: var(--color-text-primary);
    }

    :deep(.tiptap) {
      padding-left: 0;
      padding-right: 0;
    }
  }

  .note-timestamp {
    padding: 6px 15px 0px 15px;
    font-size: 0.7em;
    align-self: flex-end;
    color: var(--color-text-tertiary);
    display: flex;
    align-items: center;
    pointer-events: none;
  }

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
</style>
