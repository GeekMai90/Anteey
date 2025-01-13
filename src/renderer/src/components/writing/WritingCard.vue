<template>
  <div class="writing-card" :class="{ 'is-focused': isFocused }" :data-card-id="card.id">
    <!-- 卡片头部 -->
    <div class="card-header">
      <!-- 拖拽手柄 -->
      <div class="drag-handle">
        <Drag theme="outline" size="16" fill="var(--color-icon-menu-default)" :strokeWidth="3" />
      </div>
      <!-- 卡片类型标识 -->
      <div class="card-type" :class="{ 'is-note': card.card_type === 'note' }">
        {{ card.card_type === 'note' ? '引用' : '写作' }}
      </div>
      <!-- 卡片操作按钮 -->
      <div class="card-actions">
        <button
          v-if="card.card_type === 'writing'"
          v-tooltip.bottom="'添加子卡片'"
          class="action-button add"
          @click.stop="handleAddChild"
        >
          <Plus theme="outline" size="14" fill="var(--color-text-primary)" :strokeWidth="3" />
        </button>
        <button
          v-tooltip.bottom="'删除卡片'"
          class="action-button delete"
          @click.stop="handleDelete"
        >
          <Delete theme="outline" size="14" fill="var(--color-text-danger)" :strokeWidth="3" />
        </button>
      </div>
    </div>

    <!-- 卡片内容 -->
    <div class="card-content">
      <TipTapEditor
        v-if="card.card_type === 'writing'"
        ref="editorRef"
        :content="card.content"
        :noteId="card.id"
        :editable="true"
        @update:content="handleContentUpdate"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <div v-else-if="card.card_type === 'note'" class="note-reference">
        <!-- 引用笔记的展示 -->
        <div class="note-preview">
          <div class="note-title">{{ referencedNote?.title || '未找到笔记' }}</div>
          <div class="note-excerpt">{{ referencedNote?.excerpt || '暂无内容' }}</div>
        </div>
      </div>
    </div>

    <!-- 卡片底部 -->
    <div class="card-footer">
      <div v-if="card.card_type === 'writing'" class="word-count">{{ wordCount }} 字</div>
      <div class="last-modified">
        {{ formatDate(card.updated_at) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { Drag, Delete, Plus } from '@icon-park/vue-next'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'
import type { ArticleCard } from '@shared/types/writing'
import { formatDate } from '@renderer/utils/dateUtils'
import { useNoteStore } from '@renderer/stores/noteStore'

// 定义 TipTap 内容的类型
interface TipTapContent {
  type: string
  content: Array<{
    type: string
    content?: Array<{
      type: string
      text: string
    }>
    text?: string
  }>
}

const props = defineProps<{
  card: ArticleCard
}>()

const emit = defineEmits<{
  (e: 'update', cardId: string, content: any): void
  (e: 'delete', cardId: string): void
  (e: 'addChild', cardId: string): void
}>()

const noteStore = useNoteStore()
const editorRef = ref()
const isFocused = ref(false)

// 计算字数
const wordCount = computed(() => {
  if (!props.card.content) return 0

  // 如果是字符串，直接计算
  if (typeof props.card.content === 'string') {
    return props.card.content.replace(/\s/g, '').length
  }

  // 如果是 TipTap JSON 内容
  try {
    const content = props.card.content as TipTapContent
    let text = ''

    // 递归提取所有文本内容
    const extractText = (node: any) => {
      if (node.text) {
        text += node.text
      }
      if (node.content) {
        node.content.forEach(extractText)
      }
    }

    if (content.content) {
      content.content.forEach(extractText)
    }

    return text.replace(/\s/g, '').length
  } catch (error) {
    console.error('解析内容失败:', error)
    return 0
  }
})

// 获取引用的笔记
const referencedNote = ref<{ title: string; excerpt: string } | null>(null)

// 使用 watchEffect 来处理异步数据
watchEffect(async () => {
  if (props.card.card_type !== 'note' || !props.card.card_id) {
    referencedNote.value = null
    return
  }

  try {
    const note = await noteStore.fetchNoteById(props.card.card_id)
    if (!note) {
      referencedNote.value = null
      return
    }

    // 先获取标题
    const title = note.metadata?.title || '未命名笔记'
    let excerpt = '暂无内容'

    // 处理内容
    if (note.content) {
      if (typeof note.content === 'object') {
        const content = note.content as TipTapContent
        if (content.content) {
          excerpt = content.content
            .filter((node) => node.type === 'paragraph')
            .slice(0, 2)
            .map((node) => {
              let text = ''
              node.content?.forEach((child) => {
                if (child.text) text += child.text
              })
              return text
            })
            .join('\n')
        }
      } else {
        // 如果是其他类型，转换为字符串
        excerpt = String(note.content).slice(0, 100)
      }
    }

    referencedNote.value = {
      title,
      excerpt: excerpt || '暂无内容'
    }
  } catch (error) {
    console.error('获取引用笔记失败:', error)
    referencedNote.value = null
  }
})

// 处理内容更新
const handleContentUpdate = (content: any) => {
  emit('update', props.card.id, content)
}

// 处理删除
const handleDelete = () => {
  emit('delete', props.card.id)
}

// 处理焦点
const handleFocus = () => {
  isFocused.value = true
}

const handleBlur = () => {
  isFocused.value = false
}

// 添加子卡片
const handleAddChild = () => {
  emit('addChild', props.card.id)
}

// 暴露方法给父组件
defineExpose({
  focus: () => {
    editorRef.value?.focus()
  }
})
</script>

<style lang="scss" scoped>
.writing-card {
  position: relative;
  background-color: var(--color-bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
  min-height: 150px;
  display: flex;
  flex-direction: column;

  &.is-focused {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
  }

  .card-header {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid var(--color-border);
    gap: 8px;

    .drag-handle {
      cursor: move;
      padding: 2px;
      border-radius: 4px;

      &:hover {
        background-color: var(--color-hover-bg);
      }
    }

    .card-type {
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 4px;
      background-color: var(--color-primary);
      color: var(--color-white);

      &.is-note {
        background-color: var(--color-warning);
      }
    }

    .card-actions {
      margin-left: auto;
      display: flex;
      gap: 4px;

      .action-button {
        padding: 4px;
        border-radius: 4px;
        background: none;
        border: none;
        cursor: pointer;

        &:hover {
          background-color: var(--color-hover-bg);
        }

        &.add:hover {
          background-color: var(--color-success-bg);
        }

        &.delete:hover {
          background-color: var(--color-danger-bg);
        }
      }
    }
  }

  .card-content {
    flex-grow: 1;
    padding: 12px;
    min-height: 100px;

    .note-reference {
      padding: 8px;
      background-color: var(--color-hover-bg);
      border-radius: 6px;

      .note-title {
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--color-text-primary);
      }

      .note-excerpt {
        font-size: 13px;
        color: var(--color-text-secondary);
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        max-height: 2.6em;
        position: relative;

        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          width: 100%;
          height: 1.3em;
          background: linear-gradient(transparent, var(--color-hover-bg));
          pointer-events: none;
          opacity: 0;
        }

        @supports not (-webkit-line-clamp: 2) {
          &::after {
            opacity: 1;
          }
        }
      }
    }
  }

  .card-footer {
    padding: 8px 12px;
    border-top: 1px solid var(--color-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: var(--color-text-secondary);

    .word-count {
      background-color: var(--color-hover-bg);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .last-modified {
      color: var(--color-text-placeholder);
    }
  }
}
</style>
