<template>
  <div
    class="card-grid-view"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div class="drop-overlay" :class="{ active: isDraggingOver && isExternalDrag }">
      <div class="drop-message">
        <span>放置卡片到此处</span>
      </div>
    </div>

    <draggable
      v-model="localCards"
      item-key="id"
      :group="{ name: 'cards' }"
      class="grid-container"
      :animation="200"
      @start="handleDragStart"
      @end="handleDragEnd"
    >
      <template #item="{ element }">
        <div
          class="grid-card"
          :class="{ active: selectedCardId === element.id }"
          @click="selectCard(element.id)"
        >
          <div class="card-header">
            <div class="card-index">{{ getCardIndex(element.id) + 1 }}</div>
            <div class="card-type" :class="element.type">
              {{ element.type === 'reference' ? '引用' : '段落' }}
            </div>
            <div class="card-actions">
              <button class="delete-btn" @click.stop="handleDelete(element.id)">
                <Delete theme="outline" size="16" :strokeWidth="3" />
              </button>
            </div>
          </div>

          <div class="card-content">
            <div class="content-preview">
              <JsonContentRenderer :content="element.content" />
            </div>
          </div>
        </div>
      </template>
    </draggable>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import draggable from 'vuedraggable'
import { Delete } from '@icon-park/vue-next'
import type { ManuscriptCard } from '@shared/types'
import JsonContentRenderer from '@renderer/components/note/JsonContentRenderer.vue'

const props = defineProps<{
  cards: ManuscriptCard[]
  selectedCardId?: string
  manuscriptId?: string
}>()

const emit = defineEmits<{
  'update:cards': [cards: ManuscriptCard[]]
  'select-card': [cardId: string]
  'add-card': []
  'add-reference-card': [noteId: string, order: number]
  'delete-card': [cardId: string]
}>()

// 拖拽状态
const isDraggingOver = ref(false)
// 新增：判断是否为内部拖拽
const isInternalDrag = ref(false)
// 计算属性：是否为外部拖拽
const isExternalDrag = computed(() => !isInternalDrag.value)

// 本地卡片数据
const localCards = computed({
  get: () => props.cards,
  set: (newCards) => {
    // 将卡片数据转换为普通对象，只保留必要的字段
    const plainCards = newCards.map((card, index) => ({
      id: card.id,
      type: card.type,
      content: JSON.parse(JSON.stringify(card.content)), // 深拷贝内容
      order: index,
      noteId: card.noteId,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt
    }))
    emit('update:cards', plainCards)
  }
})

// 获取卡片索引
const getCardIndex = (cardId: string) => {
  return props.cards.findIndex((card) => card.id === cardId)
}

// 选择卡片
const selectCard = (cardId: string) => {
  emit('select-card', cardId)
}

// 新增：处理拖拽开始
const handleDragStart = () => {
  // 标记为内部拖拽
  isInternalDrag.value = true
}

// 处理拖拽结束
const handleDragEnd = () => {
  // 重置内部拖拽标记
  isInternalDrag.value = false
  // 拖拽结束后会自动通过 v-model 更新卡片顺序
}

// 处理删除卡片
const handleDelete = (cardId: string) => {
  // 这里可以添加确认对话框
  if (confirm('确定删除此卡片吗？')) {
    // 使用事件发射处理删除
    emit('delete-card', cardId)
  }
}

// 处理拖拽悬停
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (!event.dataTransfer) return

  // 只有不是内部拖拽时才设置拖拽状态
  if (!isInternalDrag.value) {
    isDraggingOver.value = true
    event.dataTransfer.dropEffect = 'copy'
  }
}

// 处理拖拽离开
const handleDragLeave = (event: DragEvent) => {
  // 只有在外部拖拽时才需要处理离开事件
  if (isInternalDrag.value) return

  // 确保真的离开了容器而不是进入了子元素
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()

  const { clientX, clientY } = event
  if (
    clientX <= rect.left ||
    clientX >= rect.right ||
    clientY <= rect.top ||
    clientY >= rect.bottom
  ) {
    isDraggingOver.value = false
  }
}

// 处理放置的方法
const handleDrop = async (event: DragEvent) => {
  event.preventDefault()

  // 如果是内部拖拽，不做特殊处理
  if (isInternalDrag.value) return

  if (!event.dataTransfer || !props.manuscriptId) {
    isDraggingOver.value = false
    return
  }

  try {
    const data = event.dataTransfer.getData('application/json')
    const { id: noteId } = JSON.parse(data)

    if (!noteId) {
      isDraggingOver.value = false
      return
    }

    // 获取卡片顺序，默认添加到末尾
    const newOrder = props.cards.length

    // 触发添加引用卡片事件，让父组件处理实际的笔记获取逻辑
    emit('add-reference-card', noteId, newOrder)
  } catch (error) {
    console.error('创建引用卡片失败:', error)
  } finally {
    isDraggingOver.value = false
  }
}
</script>

<style lang="scss" scoped>
.card-grid-view {
  width: 100%;
  height: 100%;
  padding: 24px 16px;
  overflow-y: auto;
  position: relative;

  // 保留拖拽覆盖层
  .drop-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(var(--color-primary-rgb), 0.05);
    border: 2px dashed var(--color-primary);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;

    &.active {
      opacity: 1;
    }

    .drop-message {
      background: var(--color-primary);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }

  .grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 28px;
    padding: 0;
    margin: 0;
    position: relative;
    z-index: 1;
  }

  .grid-card {
    height: 350px;
    background: var(--color-bg-primary);
    border-radius: 12px;
    border: 1px solid var(--color-border);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.25s ease;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
      border-color: var(--color-primary-light);
    }

    &.active {
      border: 2px solid var(--color-primary);
      box-shadow: 0 0 0 6px rgba(var(--color-primary-rgb), 0.1);
    }

    .card-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: var(--color-bg-secondary);
      border-bottom: 1px solid var(--color-border);

      .card-index {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-bg-primary);
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-secondary);
      }

      .card-type {
        margin-left: 12px;
        font-size: 14px;
        padding: 4px 12px;
        border-radius: 6px;
        background: var(--color-bg-primary);
        color: var(--color-text-secondary);

        &.reference {
          color: var(--color-info);
          background: var(--color-info-light);
        }
      }

      .card-actions {
        margin-left: auto;
        opacity: 0;
        transition: opacity 0.2s ease;

        .delete-btn {
          padding: 6px;
          background: none;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          color: var(--color-text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;

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
            background: var(--color-danger-light);
            color: var(--color-danger);
          }
        }
      }
    }

    &:hover .card-actions {
      opacity: 1;
    }

    .card-content {
      flex: 1;
      overflow: hidden;
      padding: 0;

      .content-preview {
        height: 100%;
        overflow: hidden;

        transform-origin: top left;
        transform: scale(0.8);
        width: 125%;
        height: 125%;
        padding: 16px;

        :deep(.json-content) {
          h1,
          h2,
          h3,
          h4,
          h5,
          h6 {
            margin-top: 0;
            margin-bottom: 0.5em;
          }

          h1 {
            font-size: 1.4em;
          }
          h2 {
            font-size: 1.3em;
          }
          h3 {
            font-size: 1.2em;
          }

          p {
            margin-top: 0.3em;
            margin-bottom: 0.3em;
          }

          ul,
          ol {
            margin: 0.3em 0;
            padding-left: 1.5em;
          }

          // 移除渐变遮罩效果
          position: relative;

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
            vertical-align: middle;
          }
        }
      }
    }
  }
}

.card-grid-view::-webkit-scrollbar {
  width: 8px;
}

.card-grid-view::-webkit-scrollbar-thumb {
  background-color: var(--color-scrollbar);
  border-radius: 4px;

  &:hover {
    background-color: var(--color-scrollbar-hover);
  }
}

.card-grid-view::-webkit-scrollbar-track {
  background-color: transparent;
}
</style>
