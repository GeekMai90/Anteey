<template>
  <div class="related-notes">
    <div v-if="isLoading" class="loading-container">
      <Vue3Lottie
        :animationData="loadingAnimation"
        :height="200"
        :width="200"
        :loop="true"
        :autoPlay="true"
      />
      <div class="loading-text">正在寻找相关笔记...</div>
    </div>
    <template v-else>
      <div v-if="relatedNotes.length" class="notes-list">
        <div
          v-for="{ note, similarity } in relatedNotes"
          :key="note.id"
          class="note-item"
          @click="openNote(note.id)"
        >
          <div class="note-header">
            <div class="note-address">{{ note.address }}</div>
            <div class="similarity">相似度: {{ similarity.toFixed(1) }}%</div>
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
import { useNoteStore } from '@renderer/stores/noteStore'
import { useSemanticStore } from '@renderer/stores/semanticStore' // 新增
import { useRouter } from 'vue-router'
import { formatDate } from '@renderer/utils/noteHelpers'
import type { Note } from '@shared/types'
import TipTapRender from '@renderer/components/tiptap/TipTapRender.vue'
import { Vue3Lottie } from 'vue3-lottie'
import loadingAnimation from '@renderer/assets/loading.json'
import log from 'electron-log'

const props = defineProps<{
  noteId: string | null
}>()

const noteStore = useNoteStore()
const semanticStore = useSemanticStore() // 新增
const router = useRouter()
const isLoading = ref(false)
const relatedNotes = ref<Array<{ note: Note; similarity: number }>>([])

const fetchRelatedNotes = async () => {
  log.info('开始获取相关笔记，noteId:', props.noteId)
  isLoading.value = true

  try {
    if (!props.noteId) {
      log.info('noteId 为空，跳过获取')
      return
    }

    // 使用新的语义搜索方法
    const similarResults = await semanticStore.getSimilarNotesForNote(props.noteId, 10)

    // 获取完整的笔记信息
    const notesWithDetails = await Promise.all(
      similarResults.map(async (result) => {
        const note = await noteStore.fetchNote(result.noteId)
        return {
          note,
          similarity: result.similarity * 100 // 转换为百分比
        }
      })
    )

    relatedNotes.value = notesWithDetails as Array<{ note: Note; similarity: number }>
    log.info('获取相关笔记成功:', notesWithDetails.length)
  } catch (error) {
    log.error('获取相关笔记失败:', error)
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

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 20px;
  height: 100%; // 改为100%以占满父容器

  .loading-text {
    margin-top: 8px;
    font-size: 14px;
    color: var(--color-text-secondary);
    animation: text-fade 2s ease-in-out infinite;
  }
}

@keyframes text-fade {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}
</style>
