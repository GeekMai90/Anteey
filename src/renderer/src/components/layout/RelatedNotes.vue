<template>
  <div class="related-notes">
    <div v-if="isLoading" class="loading-state">加载中...</div>
    <template v-else>
      <div v-if="relatedNotes.length" class="notes-list">
        <div
          v-for="note in relatedNotes"
          :key="note.id"
          class="note-item"
          @click="openNote(note.id)"
        >
          <div class="note-header">
            <div class="note-address">{{ note.address }}</div>
            <div class="similarity">相似度: {{ note.similarity.toFixed(1) }}%</div>
          </div>
          <div class="note-preview">
            <TipTapRender :content="note.content" />
          </div>
          <div class="note-meta">
            <span>{{ formatDate(note.updatedAt) }}</span>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">暂无相关笔记</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useNoteStore } from '@renderer/stores/note-store'
import { useRouter } from 'vue-router'
import { formatDate } from '@renderer/utils/noteHelpers'
import type { RelatedNote } from '@renderer/types/Note'
import TipTapRender from '@renderer/components/tiptap/TipTapRender.vue'

const props = defineProps<{
  noteId: string
}>()

const noteStore = useNoteStore()
const router = useRouter()
const isLoading = ref(false)
const relatedNotes = ref<RelatedNote[]>([])

const fetchRelatedNotes = async () => {
  console.log('开始获取相关笔记，noteId:', props.noteId) // 添加日志
  isLoading.value = true
  try {
    if (!props.noteId) {
      console.log('noteId 为空，跳过获取') // 添加日志
      return
    }
    console.log('正在调用 getRelatedNotes...') // 添加日志
    const response = await noteStore.getRelatedNotes(props.noteId, 10)
    console.log('获取响应:', response) // 添加日志
    if (response.success) {
      relatedNotes.value = response.notes
    } else if (response.error) {
      console.error('获取相关笔记失败:', response.error)
    }
  } catch (error) {
    console.error('获取相关笔记发生异常:', error)
  } finally {
    isLoading.value = false
  }
}

const openNote = (noteId: string) => {
  router.push(`/note/${noteId}`)
}

watch(
  () => props.noteId,
  () => {
    if (props.noteId) {
      fetchRelatedNotes()
    }
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.related-notes {
  height: 100%;
  overflow-y: auto;
  .notes-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }

  .note-item {
    padding: 12px;
    border-radius: 8px;
    background: var(--color-note-card-bg);
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid var(--color-border);

    &:hover {
      background: var(--color-hover-bg);
    }

    .note-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      .note-address {
        font-weight: 500;
        color: var(--color-text-primary);
      }

      .similarity {
        font-size: 12px;
        color: var(--color-primary);
      }
    }

    .note-preview {
      font-size: 13px;
      // color: var(--color-text-secondary);
      margin-bottom: 12px; // 增加一点底部间距
      display: -webkit-box;
      -webkit-line-clamp: 4; // 增加到 3 行
      line-clamp: 4;
      -webkit-box-orient: vertical;
      box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.5; // 添加行高
      max-height: 6em; // 3 行的高度 (1.5 * 3)
      :deep(.tiptap) {
        // 禁用编辑器的一些默认样式
        padding: 0;
        * {
          margin: 0;
          padding: 0;
        }

        p {
          margin: 0;
          line-height: inherit;
        }

        // 可以根据需要添加其他样式覆盖
        ul,
        ol {
          margin: 0;
          padding-left: 1.2em;
        }
      }
    }

    .note-meta {
      font-size: 12px;
      color: var(--color-text-tertiary);
    }
  }
}

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--color-text-secondary);
  font-size: 14px;
}
</style>
