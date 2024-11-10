<template>
  <div class="dictionary-suggestions-view">
    <!-- 固定在顶部的头部区域 -->
    <div class="sticky-header">
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="header-content">
        <div class="dictionary-header">
          <!-- 左侧标题区域 -->
          <div class="dictionary-header-left">
            <div class="icon">
              <BookOne theme="outline" size="20" fill="var(--color-primary)" :strokeWidth="3" />
            </div>
            <div class="name">词典管理</div>
          </div>
          <!-- 右侧功能区域 -->
          <div class="dictionary-header-right">
            <div class="button-group">
              <button
                class="primary-button"
                :disabled="!selectedWords.length"
                @click="handleBatchAccept"
              >
                批量接受 ({{ selectedWords.length }})
              </button>
              <button
                class="secondary-button"
                :disabled="!selectedWords.length"
                @click="handleBatchReject"
              >
                批量拒绝
              </button>
              <button class="cleanup-button" :disabled="!suggestions.length" @click="handleCleanup">
                清理剩余词条
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="dictionary-container">
      <div class="suggestions-list-container">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <!-- 空状态 -->
        <div v-else-if="!suggestions.length" class="empty-state">
          <div class="empty-state-icon">📚</div>
          <h2 class="empty-state-title">暂无词典建议</h2>
          <p class="empty-state-description">继续使用笔记功能，系统会自动学习新词</p>
        </div>

        <!-- 建议列表 -->
        <div v-else class="suggestions-table">
          <!-- 表头 -->
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
            <div
              class="word-cell sortable"
              :class="{ sorted: sortField === 'word' }"
              @click="toggleSort('word')"
            >
              词条
              <span v-if="sortField === 'word'" class="sort-icon">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </div>
            <div
              class="weight-cell sortable"
              :class="{ sorted: sortField === 'weight' }"
              @click="toggleSort('weight')"
            >
              权重
              <span v-if="sortField === 'weight'" class="sort-icon">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </div>
            <div
              class="score-cell sortable"
              :class="{ sorted: sortField === 'score' }"
              @click="toggleSort('score')"
            >
              评分
              <span v-if="sortField === 'score'" class="sort-icon">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </div>
            <div class="reason-cell">建议原因</div>
            <div class="actions-cell">操作</div>
          </div>

          <!-- 表格内容 -->
          <div class="table-body">
            <div
              v-for="suggestion in sortedSuggestions"
              :key="suggestion.word"
              class="table-row"
              :class="{ selected: selectedWords.includes(suggestion.word) }"
            >
              <div class="checkbox-cell">
                <label class="checkbox-wrapper">
                  <input
                    type="checkbox"
                    :checked="selectedWords.includes(suggestion.word)"
                    @change="toggleSelect(suggestion.word)"
                  />
                  <span class="checkbox-custom"></span>
                </label>
              </div>
              <div class="word-cell">{{ suggestion.word }}</div>
              <div class="weight-cell">
                <span class="weight-tag" :class="getWeightClass(suggestion.weight)">
                  {{ suggestion.weight }}
                </span>
              </div>
              <div class="score-cell">{{ suggestion.score.toFixed(2) }}</div>
              <div class="reason-cell">{{ formatReason(suggestion.reason) }}</div>
              <div class="actions-cell">
                <button class="action-button accept" @click="handleAccept(suggestion)">接受</button>
                <button class="action-button reject" @click="handleReject(suggestion)">拒绝</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="suggestions.length" class="pagination">
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
    <!-- 使用通用确认对话框 -->
    <ConfirmDialog
      v-model:visible="showCleanupConfirm"
      title="确认清理"
      :message="`确定要清理所有未接受的词条吗？将清理 ${suggestions.length - selectedWords.length} 个词条`"
      type="danger"
      cancel-text="取消"
      confirm-text="确认清理"
      @confirm="confirmCleanup"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { BookOne } from '@icon-park/vue-next'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import { useDictionaryStore } from '@renderer/stores/dictionaryStore'
import type { WordSuggestion } from '../../../db/dictionaryService'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'

// 初始化 store
const dictionaryStore = useDictionaryStore()

// 组件状态
const suggestions = ref<WordSuggestion[]>([])
const selectedWords = ref<string[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = 13
const sortField = ref<'word' | 'weight' | 'score'>('weight')
const sortOrder = ref<'asc' | 'desc'>('desc')

// 计算属性
const isAllSelected = computed(
  () => suggestions.value.length > 0 && selectedWords.value.length === suggestions.value.length
)

const isIndeterminate = computed(
  () => selectedWords.value.length > 0 && selectedWords.value.length < suggestions.value.length
)

const totalPages = computed(() => Math.ceil(suggestions.value.length / pageSize))

const sortedSuggestions = computed(() => {
  const sorted = [...suggestions.value].sort((a, b) => {
    const aValue = a[sortField.value]
    const bValue = b[sortField.value]

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder.value === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    return sortOrder.value === 'asc'
      ? Number(aValue) - Number(bValue)
      : Number(bValue) - Number(aValue)
  })

  // 分页
  const start = (currentPage.value - 1) * pageSize
  return sorted.slice(start, start + pageSize)
})

// 方法
const loadSuggestions = async () => {
  try {
    loading.value = true
    suggestions.value = await dictionaryStore.fetchPendingSuggestions()
  } catch (error) {
    console.error('加载建议失败:', error)
    // 可以添加一个错误提示
  } finally {
    loading.value = false
  }
}

const toggleSelectAll = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  selectedWords.value = checked ? suggestions.value.map((s: WordSuggestion) => s.word) : []
}

const toggleSelect = (word: string) => {
  const index = selectedWords.value.indexOf(word)
  if (index === -1) {
    selectedWords.value.push(word)
  } else {
    selectedWords.value.splice(index, 1)
  }
}

const handleAccept = async (suggestion: WordSuggestion) => {
  try {
    loading.value = true
    await dictionaryStore.processSuggestion(suggestion.word, 'accepted')
    await loadSuggestions()
  } catch (error) {
    console.error('处理失败:', error)
  } finally {
    loading.value = false
  }
}

const handleReject = async (suggestion: WordSuggestion) => {
  try {
    loading.value = true
    await dictionaryStore.processSuggestion(suggestion.word, 'rejected')
    await loadSuggestions()
  } catch (error) {
    console.error('处理失败:', error)
  } finally {
    loading.value = false
  }
}

const handleBatchAccept = async () => {
  try {
    loading.value = true
    await dictionaryStore.processSuggestionBatch(selectedWords.value, 'accepted')
    selectedWords.value = []
    await loadSuggestions()
  } catch (error) {
    console.error('批量处理失败:', error)
  } finally {
    loading.value = false
  }
}

const handleBatchReject = async () => {
  try {
    loading.value = true
    await dictionaryStore.processSuggestionBatch(selectedWords.value, 'rejected')
    selectedWords.value = []
    await loadSuggestions()
  } catch (error) {
    console.error('批量处理失败:', error)
  } finally {
    loading.value = false
  }
}

const formatReason = (reason: string) => {
  try {
    return JSON.parse(reason).join('，')
  } catch {
    return reason
  }
}

const getWeightClass = (weight: number) => {
  if (weight >= 8) return 'high'
  if (weight >= 5) return 'medium'
  return 'low'
}

const toggleSort = (field: 'word' | 'weight' | 'score') => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'desc'
  }
}

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// 添加状态
const showCleanupConfirm = ref(false)

// 添加清理相关方法
const handleCleanup = () => {
  showCleanupConfirm.value = true
}

const confirmCleanup = async () => {
  try {
    loading.value = true
    // 获取未选中的词条
    const wordsToClean = suggestions.value
      .filter((s) => !selectedWords.value.includes(s.word))
      .map((s) => s.word)

    await dictionaryStore.processSuggestionBatch(wordsToClean, 'rejected')
    await loadSuggestions()
  } catch (error) {
    console.error('清理失败:', error)
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(() => {
  loadSuggestions()
})
</script>

<style lang="scss" scoped>
.dictionary-suggestions-view {
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
              width: 18px;
              height: 18px;
            }
          }

          .name {
            flex-grow: 0;
            text-align: left;
            color: var(--color-text-primary);
            font-size: 20px;
            font-weight: 600;
            margin-left: 8px;
            white-space: nowrap;
            writing-mode: horizontal-tb;
            user-select: none;
            line-height: 1;
          }
        }
      }
    }
  }

  .dictionary-container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .suggestions-list-container {
      flex-grow: 1;
      overflow-y: auto;
      padding: 20px;
      box-sizing: border-box;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;

      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--color-border);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        p {
          margin-top: 16px;
          color: var(--color-text-secondary);
        }
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 300px;
        padding: 40px;
        text-align: center;

        &-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        &-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--color-text-primary);
        }

        &-description {
          font-size: 1rem;
          color: var(--color-text-secondary);
        }
      }

      .suggestions-table {
        border: 1px solid var(--color-border);
        border-radius: 8px;
        overflow: hidden;
        background: var(--color-bg-primary);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

        .table-header {
          display: grid;
          grid-template-columns: 60px 200px 100px 100px 1fr 160px;
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
            grid-template-columns: 60px 200px 100px 100px 1fr 160px;
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

      .weight-tag {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;

        &.high {
          background: rgba(var(--color-error-rgb), 0.1);
          color: var(--color-error);
        }

        &.medium {
          background: rgba(var(--color-warning-rgb), 0.1);
          color: var(--color-warning);
        }

        &.low {
          background: rgba(var(--color-info-rgb), 0.1);
          color: var(--color-info);
        }
      }

      .action-button {
        padding: 4px 12px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
        margin-right: 8px;

        &.accept {
          background: var(--color-primary);
          color: white;

          &:hover {
            opacity: 0.8;
          }
        }

        &.reject {
          background: var(--color-danger);
          color: white;

          &:hover {
            opacity: 0.8;
          }
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
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
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
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
        background: var(--color-primary-dark);
        transform: translateY(-1px);
      }
    }

    &.secondary-button,
    &.cleanup-button {
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
</style>
