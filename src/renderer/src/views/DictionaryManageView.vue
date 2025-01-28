<template>
  <div class="dictionary-manage-view">
    <!-- 固定在顶部的头部区域 -->
    <div class="sticky-header">
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="header-content">
        <div class="dictionary-header">
          <div class="dictionary-header-left">
            <div class="icon">
              <BookOne theme="outline" size="20" fill="var(--color-primary)" :strokeWidth="3" />
            </div>
            <div class="name">
              词库管理
              <InfoTooltip
                text="自定义词条可帮助系统更好的提取专业词汇，提升相关笔记和 AI
          助手的表现。"
                position="bottom"
                class="name-tooltip"
              />
            </div>
          </div>
          <div class="dictionary-header-right">
            <!-- 添加搜索框 -->
            <div class="search-box">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索词条..."
                @input="handleSearch"
              />
            </div>
            <div class="button-group">
              <button class="primary-button" @click="showAddWordDialog = true">添加新词</button>
              <button
                class="secondary-button"
                :disabled="!selectedWords.length"
                @click="handleBatchDelete"
              >
                批量删除 ({{ selectedWords.length }})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="dictionary-container">
      <div class="dictionary-list-container">
        <!-- 词典列表 -->
        <div class="dictionary-table">
          <div class="table-header">
            <div class="checkbox-cell">
              <label class="checkbox-wrapper">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @change="toggleSelectAll"
                />
                <span class="checkbox-custom"></span>
              </label>
            </div>
            <div class="word-cell sortable" @click="toggleSort('word')">
              词条
              <span v-if="sortField === 'word'" class="sort-icon">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </div>
            <div class="type-cell">来源</div>
            <div class="date-cell sortable" @click="toggleSort('createdAt')">
              添加时间
              <span v-if="sortField === 'createdAt'" class="sort-icon">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </div>
            <div class="actions-cell">操作</div>
          </div>

          <div class="table-body">
            <div
              v-for="word in sortedWords"
              :key="word.id"
              class="table-row"
              :class="{ selected: selectedWords.includes(word.id) }"
            >
              <div class="checkbox-cell">
                <label class="checkbox-wrapper">
                  <input
                    type="checkbox"
                    :checked="selectedWords.includes(word.id)"
                    @change="toggleSelect(word.id)"
                  />
                  <span class="checkbox-custom"></span>
                </label>
              </div>
              <div class="word-cell">{{ word.word }}</div>
              <div class="type-cell">
                <span class="type-tag" :class="word.type">
                  {{ word.type === 'system' ? '系统' : '自定义' }}
                </span>
              </div>
              <div class="date-cell">{{ formatDate(word.createdAt) }}</div>
              <div class="actions-cell">
                <button class="action-button delete" @click="handleDelete(word)">删除</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="totalWords" class="pagination">
          <button
            class="page-button"
            :disabled="currentPage === 1"
            @click="changePage(currentPage - 1)"
          >
            上一页
          </button>
          <span class="page-info"> 第 {{ currentPage }} 页，共 {{ totalPages }} 页 </span>
          <button
            class="page-button"
            :disabled="currentPage === totalPages"
            @click="changePage(currentPage + 1)"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <!-- 添加新词对话框 -->
    <AddWordDialog v-model:visible="showAddWordDialog" @submit="handleAddWord" />

    <!-- 删除确认对话框 -->
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      title="确认删除"
      :message="deleteConfirmMessage"
      type="danger"
      cancel-text="取消"
      confirm-text="确认删除"
      @confirm="confirmDelete"
    />
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { BookOne } from '@icon-park/vue-next'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'
import AddWordDialog from '@renderer/components/dictionary/AddWordDialog.vue'
import { useDictionaryStore } from '@renderer/stores/dictionaryStore'
import { formatDate } from '@renderer/utils/dateUtils'
import InfoTooltip from '@renderer/components/ui/InfoTooltip.vue'

// 初始化 store
const dictionaryStore = useDictionaryStore()

// 组件状态
const words = ref<
  Array<{
    id: string
    word: string
    type: 'system' | 'custom'
    createdAt: Date
  }>
>([])
const selectedWords = ref<string[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = 15
const sortField = ref<'word' | 'createdAt'>('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')
const searchQuery = ref('')
const showAddWordDialog = ref(false)
const showDeleteConfirm = ref(false)
const wordToDelete = ref<{ id: string; word: string } | null>(null)

// 计算属性
const filteredWords = computed(() => {
  if (!searchQuery.value) return words.value
  const query = searchQuery.value.toLowerCase()
  return words.value.filter((word) => word.word.toLowerCase().includes(query))
})

const sortedWords = computed(() => {
  const sorted = [...filteredWords.value].sort((a, b) => {
    if (sortField.value === 'word') {
      return sortOrder.value === 'asc' ? a.word.localeCompare(b.word) : b.word.localeCompare(a.word)
    } else {
      // 确保 createdAt 是 Date 对象
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
      return sortOrder.value === 'asc'
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime()
    }
  })

  // 分页
  const start = (currentPage.value - 1) * pageSize
  return sorted.slice(start, start + pageSize)
})

const totalWords = computed(() => filteredWords.value.length)
const totalPages = computed(() => Math.ceil(totalWords.value / pageSize))

const isAllSelected = computed(
  () =>
    sortedWords.value.length > 0 &&
    sortedWords.value.every((w) => selectedWords.value.includes(w.id))
)

const isIndeterminate = computed(
  () =>
    selectedWords.value.length > 0 &&
    !isAllSelected.value &&
    sortedWords.value.some((w) => selectedWords.value.includes(w.id))
)

const deleteConfirmMessage = computed(() => {
  if (wordToDelete.value) {
    return `确定要删除词条"${wordToDelete.value.word}"吗？`
  }
  return `确定要删除选中的 ${selectedWords.value.length} 个词条吗？`
})

// 方法
const loadWords = async () => {
  try {
    loading.value = true
    const dictWords = await dictionaryStore.fetchAllWords()
    // 转换数据结构
    words.value = dictWords.map((word) => ({
      id: word.word, // 使用 word 作为唯一标识
      word: word.word,
      type: word.source === 'manual' ? 'custom' : 'system',
      createdAt: word.createdAt
    }))
  } catch (error) {
    console.error('加载词典失败:', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
}

const toggleSort = (field: 'word' | 'createdAt') => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'desc'
  }
}

const toggleSelectAll = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  selectedWords.value = checked ? sortedWords.value.map((w) => w.id) : []
}

const toggleSelect = (id: string) => {
  const index = selectedWords.value.indexOf(id)
  if (index === -1) {
    selectedWords.value.push(id)
  } else {
    selectedWords.value.splice(index, 1)
  }
}

const handleDelete = (word: { id: string; word: string }) => {
  wordToDelete.value = word
  showDeleteConfirm.value = true
}

const handleBatchDelete = () => {
  wordToDelete.value = null
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  try {
    loading.value = true
    if (wordToDelete.value) {
      await dictionaryStore.deleteWord(wordToDelete.value.id)
    } else {
      await dictionaryStore.deleteWords(selectedWords.value)
      selectedWords.value = []
    }
    await loadWords()
  } catch (error) {
    console.error('删除失败:', error)
  } finally {
    loading.value = false
    wordToDelete.value = null
  }
}

const handleAddWord = async (word: string) => {
  try {
    loading.value = true
    await dictionaryStore.addWord(word)
    await loadWords()
  } catch (error) {
    console.error('添加词条失败:', error)
  } finally {
    loading.value = false
  }
}

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// 初始化
onMounted(() => {
  loadWords()
})
</script>
<style lang="scss" scoped>
.dictionary-manage-view {
  background-color: var(--color-bg-primary);
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .sticky-header {
    position: sticky;
    top: 0;
    z-index: 500;
    background-color: var(--color-bg-primary);
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;

    // 头部样式与之前的词典建议页面相同
    .header-content {
      width: 100%;
      padding: 0 20px;
      box-sizing: border-box;

      .dictionary-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 8px 0;
        border-bottom: 1px solid var(--color-border);

        .dictionary-header-left {
          position: relative;
          display: flex;
          align-items: center;
          border: none;
          background: none;
          border-radius: 6px;
          padding: 4px 0px;
          margin: 2px;

          .icon {
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            padding: 0;
            border-radius: 8px;
            background-color: var(--color-menu-bg);
            border: 1px solid var(--color-primary);

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
            color: var(--color-text-primary);
            font-size: 20px;
            font-weight: 600;
            margin-left: 8px;
            display: flex;
            align-items: center;
            gap: 4px;

            .name-tooltip {
              margin-top: 2px;
            }
          }
        }

        .dictionary-header-right {
          display: flex;
          align-items: center;
          gap: 16px; // 增加间距

          .search-box {
            width: 240px; // 设置合适的宽度

            input {
              width: 100%;
              padding: 6px 12px;
              border: 1px solid var(--color-border);
              border-radius: 6px;
              font-size: 14px;
              background: var(--color-bg-primary);
              color: var(--color-text-primary);
              transition: all 0.2s ease;

              &:focus {
                outline: none;
                border-color: var(--color-primary);
                box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
              }

              &::placeholder {
                color: var(--color-text-secondary);
              }
            }
          }
        }
      }
    }
  }

  .dictionary-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .dictionary-list-container {
      flex: 1;
      padding: 20px;
      box-sizing: border-box;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;

      .dictionary-table {
        border: 1px solid var(--color-border);
        border-radius: 8px;
        overflow: hidden;
        background: var(--color-bg-primary);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

        .table-header {
          display: grid;
          grid-template-columns: 60px 1fr 120px 180px 100px;
          background: var(--color-bg-secondary);
          border-bottom: 1px solid var(--color-border);

          > div {
            padding: 12px 16px;
            font-weight: 500;
            color: var(--color-text-secondary);
            display: flex;
            align-items: center;

            &.sortable {
              cursor: pointer;
              user-select: none;
              transition: color 0.2s ease;

              &:hover {
                color: var(--color-primary);
              }

              &.sorted {
                color: var(--color-primary);
              }

              .sort-icon {
                margin-left: 4px;
              }
            }
          }
        }

        .table-body {
          .table-row {
            display: grid;
            grid-template-columns: 60px 1fr 120px 180px 100px;
            border-bottom: 1px solid var(--color-border);
            transition: all 0.2s ease;

            &:hover {
              background: var(--color-hover);
            }

            &.selected {
              background: rgba(var(--color-primary-rgb), 0.1);
            }

            > div {
              padding: 12px 16px;
              display: flex;
              align-items: center;
            }

            .type-tag {
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 500;

              &.system {
                background: rgba(var(--color-info-rgb), 0.1);
                color: var(--color-info);
              }

              &.custom {
                background: rgba(var(--color-success-rgb), 0.1);
                color: var(--color-success);
              }
            }

            .action-button {
              padding: 4px 12px;
              border-radius: 4px;
              border: none;
              cursor: pointer;
              font-size: 12px;
              transition: all 0.2s ease;

              &.delete {
                background: var(--color-danger);
                color: white;

                &:hover {
                  opacity: 0.8;
                }
              }
            }
          }
        }
      }
    }
  }
}

.button-group {
  display: flex;
  gap: 8px;

  button {
    padding: 6px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;

    &.primary-button {
      background: var(--color-primary);
      color: white;

      &:hover:not(:disabled) {
        background: var(--color-primary);
      }
    }

    &.secondary-button {
      background: var(--color-danger);
      color: white;

      &:hover:not(:disabled) {
        opacity: 0.8;
      }
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }
  }
}

.checkbox-wrapper {
  position: relative;
  display: inline-block;
  cursor: pointer;

  input[type='checkbox'] {
    opacity: 0;
    position: absolute;

    &:checked + .checkbox-custom {
      background: var(--color-primary);
      border-color: var(--color-primary);

      &::after {
        content: '';
        position: absolute;
        left: 5px;
        top: 2px;
        width: 4px;
        height: 8px;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
    }

    &:indeterminate + .checkbox-custom {
      background: var(--color-primary);
      border-color: var(--color-primary);

      &::after {
        content: '';
        position: absolute;
        left: 3px;
        top: 6px;
        width: 8px;
        height: 2px;
        background: white;
      }
    }
  }

  .checkbox-custom {
    position: relative;
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid var(--color-border);
    border-radius: 4px;
    transition: all 0.2s ease;
  }
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  gap: 16px;

  .page-button {
    padding: 6px 16px;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    background: var(--color-bg-primary);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .page-info {
    color: var(--color-text-secondary);
  }
}
</style>
