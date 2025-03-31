<template>
  <div class="sidebar-index">
    <!-- 字母导航区域 -->
    <div class="letter-nav">
      <div
        v-for="letter in letters"
        :key="letter"
        class="letter-item"
        :class="{ active: currentLetter === letter }"
        @click="selectLetter(letter)"
      >
        {{ letter }}
      </div>
    </div>

    <!-- 笔记列表区域 -->
    <div class="notes-container">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!hasIndexedNotes" class="empty-state">
        <div class="empty-icon">
          <TransactionOrder
            theme="outline"
            size="32"
            fill="var(--color-text-secondary)"
            :strokeWidth="2"
          />
        </div>
        <span>还没有索引笔记</span>
      </div>

      <!-- 笔记列表 -->
      <template v-else>
        <div
          v-for="(notes, letter) in groupedNotes"
          :id="`letter-${letter}`"
          :key="letter"
          class="letter-group"
        >
          <div class="letter-header">{{ letter }}</div>
          <draggable
            v-model="groupedNotes[letter]"
            group="indexed-notes"
            item-key="id"
            class="notes-list"
            @end="handleDragEnd"
          >
            <template #item="{ element: note }">
              <div class="note-item" :class="{ 'is-dragging': isDragging }">
                <div class="note-content">
                  <div class="note-title">{{ note.title }}</div>
                  <div class="note-address">{{ note.address || '无编码地址' }}</div>
                </div>
                <div class="note-actions">
                  <button
                    v-tooltip="'从索引中移除'"
                    class="action-btn"
                    @click.stop="removeFromIndex(note.id)"
                  >
                    <Close theme="outline" size="12" :strokeWidth="3" />
                  </button>
                </div>
              </div>
            </template>
          </draggable>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { TransactionOrder, Close } from '@icon-park/vue-next'
import { useNoteStore } from '@renderer/stores/noteStore'
import draggable from 'vuedraggable'
import type { Note } from '@shared/types'

const noteStore = useNoteStore()
const isLoading = computed(() => noteStore.isLoadingIndexedNotes)
const isDragging = ref(false)

// 字母表（包含英文和中文拼音首字母）
const letters = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  '#'
]

// 当前选中的字母
const currentLetter = computed(() => noteStore.currentIndexLetter)

// 分组后的笔记
const groupedNotes = computed(() => noteStore.indexedNotes)

// 是否有索引笔记
const hasIndexedNotes = computed(() => {
  return Object.values(groupedNotes.value).some((notes) => notes.length > 0)
})

// 选择字母
const selectLetter = (letter: string) => {
  const element = document.getElementById(`letter-${letter}`)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
  noteStore.setCurrentEchoNoteId(null) // 清除当前选中的笔记
}

// 从索引中移除笔记
const removeFromIndex = async (noteId: string) => {
  try {
    await noteStore.batchRemoveFromIndex([noteId])
  } catch (error) {
    console.error('从索引中移除笔记失败:', error)
  }
}

// 处理拖拽结束
const handleDragEnd = async ({ newIndex, oldIndex, from, to }: any) => {
  if (newIndex === oldIndex && from === to) return

  const fromLetter = from.parentElement.id.replace('letter-', '')
  const toLetter = to.parentElement.id.replace('letter-', '')

  // 创建更新数组，包含源组和目标组的所有笔记
  const updates = [
    // 更新源组的顺序
    ...groupedNotes.value[fromLetter].map((note: Note, index: number) => ({
      noteId: note.id,
      firstLetter: fromLetter,
      order: index
    })),
    // 更新目标组的顺序
    ...groupedNotes.value[toLetter].map((note: Note, index: number) => ({
      noteId: note.id,
      firstLetter: toLetter,
      order: index
    }))
  ]

  try {
    await noteStore.updateIndexOrder(updates)
  } catch (error) {
    console.error('更新索引顺序失败:', error)
  }
}

// 初始化
onMounted(async () => {
  await noteStore.fetchIndexedNotes()
})
</script>

<style lang="scss" scoped>
.sidebar-index {
  height: 100%;
  display: flex;
  background-color: var(--color-bg-primary);

  .letter-nav {
    width: 24px;
    padding: 8px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    border-right: 1px solid var(--color-border);
    background-color: var(--color-bg-secondary);

    .letter-item {
      font-size: 12px;
      padding: 2px 4px;
      cursor: pointer;
      color: var(--color-text-secondary);
      transition: all 0.2s ease;

      &:hover {
        color: var(--color-primary);
      }

      &.active {
        color: var(--color-primary);
        font-weight: 500;
      }
    }
  }

  .notes-container {
    flex: 1;
    overflow-y: auto;
    padding: 12px;

    .letter-group {
      margin-bottom: 16px;

      .letter-header {
        font-size: 14px;
        font-weight: 500;
        color: var(--color-text-secondary);
        margin-bottom: 8px;
        padding-left: 4px;
      }

      .notes-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .note-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background-color: var(--color-bg-secondary);
        border-radius: 6px;
        transition: all 0.2s ease;

        &:hover {
          background-color: var(--color-hover-bg);

          .note-actions {
            opacity: 1;
          }
        }

        &.is-dragging {
          background-color: var(--color-hover-bg);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .note-content {
          flex: 1;
          min-width: 0;

          .note-title {
            font-size: 13px;
            font-weight: 500;
            color: var(--color-text-primary);
            margin-bottom: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .note-address {
            font-size: 12px;
            color: var(--color-text-secondary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        .note-actions {
          opacity: 0;
          transition: opacity 0.2s ease;

          .action-btn {
            padding: 4px;
            border: none;
            background: none;
            cursor: pointer;
            color: var(--color-text-secondary);
            border-radius: 4px;
            transition: all 0.2s ease;

            &:hover {
              background-color: var(--color-hover-button);
              color: var(--color-error);
            }
          }
        }
      }
    }

    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--color-text-secondary);
      font-size: 13px;
      gap: 12px;
    }

    .loading-spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .empty-state {
      .empty-icon {
        opacity: 0.5;
      }
    }
  }
}
</style>
