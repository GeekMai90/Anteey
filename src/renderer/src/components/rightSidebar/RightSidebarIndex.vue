<template>
  <div class="sidebar-index">
    <!-- 添加搜索框到最顶部 -->
    <div class="search-wrapper">
      <SearchInput v-model="searchKeyword" placeholder="搜索索引卡..." :width="999" :height="32" />
    </div>

    <div class="sidebar-content">
      <!-- 调整顺序：先笔记列表，后字母导航 -->
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
            v-for="(_, letter) in groupedNotes"
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
                <div
                  class="note-item"
                  :class="{ 'is-dragging': isDragging }"
                  @click="(e) => handleNoteClick(e, note)"
                  @dblclick="() => handleNoteDblClick(note)"
                >
                  <div class="note-content">
                    <div class="address-line">
                      <div class="note-indicator"></div>
                      <div class="note-address">{{ note.address || '无编码地址' }}</div>
                    </div>
                    <div class="note-title">{{ note.title }}</div>
                  </div>
                  <div class="note-actions">
                    <IconButton
                      :icon="Close"
                      tooltip="从索引中移除"
                      size="small"
                      @click.stop="() => openRemoveConfirm(note.id, note.title)"
                    />
                  </div>
                </div>
              </template>
            </draggable>
          </div>
        </template>
      </div>

      <!-- 字母导航区域移到右侧 -->
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
    </div>

    <!-- 确认删除弹窗 -->
    <ConfirmDialog
      v-model:visible="showRemoveConfirm"
      title="移除确认"
      :message="`确定要将笔记「${noteToRemove.title}」从索引中移除吗？`"
      type="danger"
      confirm-text="移除"
      @confirm="confirmRemove"
      @cancel="cancelRemove"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { TransactionOrder, Close } from '@icon-park/vue-next'
import { useNoteStore } from '@renderer/stores/noteStore'
import draggable from 'vuedraggable'
import type { Note } from '@shared/types'
import IconButton from '@renderer/components/ui/buttons/IconButton.vue'
import SearchInput from '@renderer/components/ui/SearchInput.vue'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const noteStore = useNoteStore()
const isLoading = computed(() => noteStore.isLoadingIndexedNotes)
const isDragging = ref(false)

// 确认弹窗相关状态
const showRemoveConfirm = ref(false)
const noteToRemove = ref<{ id: string; title: string }>({ id: '', title: '' })

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

// 添加搜索相关的状态
const searchKeyword = ref('')

// 修改 groupedNotes 计算属性，添加搜索过滤逻辑
const groupedNotes = computed(() => {
  const notes = noteStore.indexedNotes
  if (!searchKeyword.value) return notes

  // 创建一个新的过滤后的分组对象
  const filtered: Record<string, Note[]> = {}

  // 遍历所有分组
  Object.entries(notes).forEach(([letter, notesList]) => {
    // 过滤符合搜索条件的笔记
    const filteredNotes = notesList.filter(
      (note) =>
        note.title.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
        note.address?.toLowerCase().includes(searchKeyword.value.toLowerCase())
    )

    // 如果过滤后还有笔记，则保留该分组
    if (filteredNotes.length > 0) {
      filtered[letter] = filteredNotes
    }
  })

  return filtered
})

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

// 打开确认移除弹窗
const openRemoveConfirm = (noteId: string, noteTitle: string) => {
  noteToRemove.value = { id: noteId, title: noteTitle }
  showRemoveConfirm.value = true
}

// 确认移除操作
const confirmRemove = async () => {
  try {
    await noteStore.batchRemoveFromIndex([noteToRemove.value.id])
  } catch (error) {
    console.error('从索引中移除笔记失败:', error)
  }
}

// 取消移除操作
const cancelRemove = () => {
  noteToRemove.value = { id: '', title: '' }
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

// 添加处理笔记点击的函数
const handleNoteClick = (event: MouseEvent, note: Note) => {
  // 阻止事件冒泡
  event.preventDefault()
  event.stopPropagation()

  if (event.shiftKey) {
    // Shift+单击：在知识树中查看节点
    router.push({
      name: 'KnowledgeTreeNode',
      params: { address: note.address },
      replace: true
    })
  } else if (event.altKey) {
    // Alt+单击：在卡片盒中查看上下文
    router.push({
      name: 'cardbox',
      query: {
        mode: 'context',
        noteId: note.id
      }
    })
  } else if (event.metaKey) {
    // Command+单击：全屏查看
    router.push({ name: 'NoteExpandEditor', params: { id: note.id } })
  }
}

// 添加双击处理函数
const handleNoteDblClick = (note: Note) => {
  // 双击打开小窗笔记编辑器
  noteStore.openNoteEditor(note.id)
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
  flex-direction: column; // 改为纵向排列
  background-color: var(--color-bg-primary);

  .search-wrapper {
    padding: 12px;
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-bg-primary);

    :deep(.search-input-group) {
      width: 100%; // 让搜索框占满宽度
      max-width: 100% !important; // 覆盖默认的最大宽度
    }
  }

  .sidebar-content {
    flex: 1;
    display: flex;
    overflow: hidden; // 防止内容溢出
  }

  .letter-nav {
    width: 24px;
    padding: 8px 6px 8px 0; // 修改padding，右侧对齐
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

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
    padding-right: 12px; // 调整右侧间距
    display: flex;
    flex-direction: column;

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
        cursor: pointer;

        .note-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;

          .address-line {
            display: flex;
            align-items: center;
            gap: 8px;

            .note-indicator {
              width: 4px;
              height: 10px;
              border-radius: 2px;
              background-color: var(--color-blue);
              flex-shrink: 0;
            }

            .note-address {
              font-size: 12px;
              color: var(--color-text-secondary);
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }

          .note-title {
            font-size: 13px;
            font-weight: 500;
            color: var(--color-text-primary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            padding-left: 12px; // 与地址对齐
          }
        }

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

        .note-actions {
          opacity: 0;
          transition: opacity 0.2s ease;
          display: flex;
          align-items: center;
        }

        &:active {
          transform: scale(0.98);
        }
      }
    }
  }
}
</style>
