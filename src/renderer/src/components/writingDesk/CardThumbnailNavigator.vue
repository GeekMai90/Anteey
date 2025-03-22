<template>
  <div class="card-thumbnail-navigator">
    <div class="navigator-header">卡片导航</div>
    <div class="thumbnail-list">
      <draggable
        v-model="localCards"
        item-key="id"
        :group="{ name: 'cards' }"
        animation="300"
        @end="handleDragEnd"
        @start="handleDragStart"
      >
        <template #item="{ element, index }">
          <div
            class="thumbnail-item"
            :class="{
              active: selectedCardId === element.id,
              dragging: draggingCardId === element.id
            }"
            @click="handleCardSelect(element.id)"
            @mousedown="startDragging(element.id, $event)"
            @mouseup="stopDragging()"
          >
            <div class="thumbnail-header">
              <div class="thumbnail-index">{{ index + 1 }}</div>
              <div class="thumbnail-type" :class="element.type">
                {{ element.type === 'reference' ? '引用' : '上下文' }}
              </div>
            </div>
            <div class="thumbnail-content">
              <div class="thumbnail-title" :title="getCardTitle(element)">
                {{ getCardTitle(element) }}
              </div>
              <div class="thumbnail-preview" :title="getCardPreview(element)">
                {{ getCardPreview(element) }}
              </div>
            </div>
          </div>
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import draggable from 'vuedraggable'
import type { ManuscriptCard } from '@shared/types'
import { extractTextFromTiptapJson } from '@services/utils/textToJson'

const props = defineProps<{
  cards: ManuscriptCard[]
  selectedCardId?: string
}>()

const emit = defineEmits<{
  'update:cards': [cards: ManuscriptCard[]]
  'select-card': [cardId: string]
}>()

// 使用卡片ID来标识正在拖拽的卡片
const draggingCardId = ref<string | null>(null)

// 修改本地卡片数据的计算属性
const localCards = computed({
  get: () => props.cards,
  set: (newCards) => {
    // 将卡片数据转换为普通对象，只保留必要的字段
    const plainCards = newCards.map((card) => ({
      id: card.id,
      type: card.type,
      content: JSON.parse(JSON.stringify(card.content)), // 深拷贝内容
      order: card.order,
      noteId: card.noteId,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt
    }))
    emit('update:cards', plainCards)
  }
})

// 添加一个处理 markdown 文本的函数
const cleanMarkdown = (text: string) => {
  return text
    .replace(/^#+\s+/g, '') // 移除标题符号 (#)
    .replace(/^\*\s+/g, '') // 移除无序列表符号 (*)
    .replace(/^-\s+/g, '') // 移除无序列表符号 (-)
    .replace(/^\d+\.\s+/g, '') // 移除有序列表符号 (1. 2. 等)
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1') // 移除加粗和斜体符号 (* _)
    .replace(/`([^`]+)`/g, '$1') // 移除行内代码符号 (`)
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1') // 移除链接，只保留文本
    .replace(/^\s*>\s+/g, '') // 移除引用符号 (>)
}

// 修改获取卡片标题的方法
const getCardTitle = (card: ManuscriptCard) => {
  const text = extractTextFromTiptapJson(card.content)
  const firstLine = text.split('\n')[0].trim()
  return cleanMarkdown(firstLine) || '空白卡片'
}

// 修改获取卡片预览的方法
const getCardPreview = (card: ManuscriptCard) => {
  const text = extractTextFromTiptapJson(card.content)
  const lines = text
    .split('\n')
    .map((line) => cleanMarkdown(line.trim()))
    .filter((line) => line)

  // 如果只有一行文本，就显示这一行的更多内容
  if (lines.length === 1) {
    return lines[0].length > 100 ? `${lines[0].slice(0, 100)}...` : lines[0]
  }

  // 如果有多行，显示前两行
  return lines
    .slice(0, 2)
    .map((line) => (line.length > 50 ? `${line.slice(0, 50)}...` : line))
    .join('\n')
}

// 处理卡片选择
const handleCardSelect = (cardId: string) => {
  emit('select-card', cardId)
}

// 开始拖拽指定卡片
const startDragging = (cardId: string, event: MouseEvent) => {
  // 只有鼠标左键按下时才设置拖拽状态
  if (event.button === 0) {
    draggingCardId.value = cardId
  }
}

// 停止拖拽
const stopDragging = () => {
  draggingCardId.value = null
}

// 处理拖拽开始
const handleDragStart = (event: any) => {
  // 拖拽开始时，设置正在拖拽的卡片ID
  const cardId =
    event.item.getAttribute('data-card-id') || event.item.__vnode?.key || event.oldIndex

  if (typeof cardId === 'number' && props.cards[cardId]) {
    draggingCardId.value = props.cards[cardId].id
  } else if (typeof cardId === 'string') {
    draggingCardId.value = cardId
  }
}

// 处理拖拽结束
const handleDragEnd = () => {
  // 拖拽结束时清除拖拽状态
  draggingCardId.value = null
}
</script>

<style lang="scss" scoped>
.card-thumbnail-navigator {
  width: 220px;
  height: 100%;
  border-radius: 12px;
  background: var(--color-bg-secondary);
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--color-border);
  overflow: hidden;

  .navigator-header {
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-secondary);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-primary);
  }

  .thumbnail-list {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    background: var(--color-bg-secondary);
  }

  .thumbnail-item {
    display: flex;
    flex-direction: column;
    padding: 10px;
    margin-bottom: 6px;
    border-radius: 8px;
    background: var(--color-bg-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
    gap: 6px;
    border: 1px solid transparent;

    .thumbnail-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;

      .thumbnail-index {
        min-width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-bg-secondary);
        border-radius: 4px;
        font-size: 12px;
        color: var(--color-text-secondary);
      }

      .thumbnail-type {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 4px;
        background: var(--color-draft-light);
        color: var(--color-draft);

        &.reference {
          color: var(--color-primary);
          background: var(--color-primary-light);
        }
      }
    }

    .thumbnail-content {
      .thumbnail-title {
        font-size: 13px;
        font-weight: 500;
        color: var(--color-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 4px;
      }

      .thumbnail-preview {
        font-size: 12px;
        color: var(--color-text-secondary);
        display: -webkit-box;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.4;
        max-height: 2.8em;
        opacity: 0.8;
      }
    }

    &:hover {
      background: var(--color-hover-bg);
      transform: translateX(2px);
      border-color: var(--color-border);
    }

    &.active {
      background: var(--color-primary-light);
      border: 1px solid var(--color-primary);
      transform: translateX(2px);

      .thumbnail-preview {
        opacity: 1;
      }
    }

    &.dragging {
      cursor: grabbing;
      opacity: 0.8;
      transform: scale(0.98);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      border-color: var(--color-primary);
      background: var(--color-bg-primary);
    }
  }
}

.thumbnail-list::-webkit-scrollbar {
  width: 4px;
}

.thumbnail-list::-webkit-scrollbar-thumb {
  background-color: var(--color-scrollbar);
  border-radius: 4px;

  &:hover {
    background-color: var(--color-scrollbar-hover);
  }
}

.thumbnail-list::-webkit-scrollbar-track {
  background-color: transparent;
}
</style>
