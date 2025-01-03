<template>
  <div v-if="isLoaded" class="flashcard-view">
    <!-- 添加上下文菜单组件 -->
    <ContextMenu />

    <!-- 顶部固定区域 -->
    <div class="sticky-header">
      <!-- 工具栏 -->
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>

      <!-- 头部内容区域 -->
      <div class="header-content">
        <div class="flashcard-header">
          <!-- 左侧标题 -->
          <div class="flashcard-header-left">
            <div class="icon">
              <StorageCardOne
                theme="outline"
                size="20"
                fill="var(--color-primary)"
                :strokeWidth="3"
              />
            </div>
            <div class="name">记忆卡</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="flashcard-container">
      <!-- 统计信息区域 -->
      <div class="stats-section">
        <div class="stats-cards">
          <!-- 今日待复习 -->
          <div class="stats-card">
            <div class="stats-icon review">
              <Time theme="outline" size="24" :strokeWidth="3" />
            </div>
            <div class="stats-content">
              <div class="stats-value">{{ stats?.dueCards || 0 }}</div>
              <div class="stats-label">今日待复习</div>
            </div>
          </div>

          <!-- 总卡片数 -->
          <div class="stats-card">
            <div class="stats-icon total">
              <StorageCardOne theme="outline" size="24" :strokeWidth="3" />
            </div>
            <div class="stats-content">
              <div class="stats-value">{{ stats?.totalCards || 0 }}</div>
              <div class="stats-label">总卡片数</div>
            </div>
          </div>

          <!-- 已掌握 -->
          <div class="stats-card">
            <div class="stats-icon mastered">
              <CheckOne theme="outline" size="24" :strokeWidth="3" />
            </div>
            <div class="stats-content">
              <div class="stats-value">{{ stats?.masteredCards || 0 }}</div>
              <div class="stats-label">已掌握</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 新增：卡组列表区域 -->
      <div class="deck-list-section">
        <!-- 表头 -->
        <div class="deck-list-header">
          <div class="column-name">卡组名称</div>
          <div class="column-due">待复习</div>
          <div class="column-total">卡片数</div>
          <div class="column-progress">已掌握</div>
          <div class="column-actions">练习</div>
        </div>

        <!-- 所有卡片 -->
        <div class="deck-item all">
          <div class="deck-info">
            <div class="deck-icon">
              <StorageCardOne theme="outline" size="20" :strokeWidth="3" />
            </div>
            <div class="deck-name">所有记忆卡</div>
          </div>
          <div class="deck-due">{{ stats?.dueCards || 0 }}</div>
          <div class="deck-total">{{ stats?.totalCards || 0 }}</div>
          <div class="deck-progress">{{ stats?.masteredCards || 0 }}</div>
          <div class="deck-actions">
            <button
              class="practice-btn"
              :disabled="!stats?.dueCards"
              @click="startReview(null, true)"
            >
              <Play theme="outline" size="16" :strokeWidth="3" />
              练习
            </button>
            <button class="more-btn" @click="(event) => handleMoreClick(event, null, true)">
              <More theme="outline" size="16" :strokeWidth="3" />
            </button>
          </div>
        </div>

        <!-- 暂无分类卡组 -->
        <div class="deck-item default">
          <div class="deck-info">
            <div class="deck-icon">
              <Notes theme="outline" size="20" :strokeWidth="3" />
            </div>
            <div class="deck-name">暂无分类</div>
          </div>
          <div class="deck-due">{{ untaggedDeck.dueCount }}</div>
          <div class="deck-total">{{ untaggedDeck.totalCount }}</div>
          <div class="deck-progress">{{ untaggedDeck.masteredCount || 0 }}</div>
          <div class="deck-actions">
            <button
              class="practice-btn"
              :disabled="!untaggedDeck.dueCount"
              @click="startReview(null, false)"
            >
              <Play theme="outline" size="16" :strokeWidth="3" />
              练习
            </button>
            <button class="more-btn" @click="(event) => handleMoreClick(event, null, false)">
              <More theme="outline" size="16" :strokeWidth="3" />
            </button>
          </div>
        </div>

        <!-- 标签卡组列表 -->
        <div v-for="deck in tagDecks" :key="deck.tagId" class="deck-item">
          <div class="deck-info">
            <div class="deck-icon">
              <Tag theme="outline" size="20" :strokeWidth="3" />
            </div>
            <div class="deck-name">{{ deck.name }}</div>
          </div>
          <div class="deck-due">{{ deck.dueCount }}</div>
          <div class="deck-total">{{ deck.totalCount }}</div>
          <div class="deck-progress">{{ deck.masteredCount || 0 }}</div>
          <div class="deck-actions">
            <button
              class="practice-btn"
              :disabled="!deck.dueCount"
              @click="startReview(deck.tagId)"
            >
              <Play theme="outline" size="16" :strokeWidth="3" />
              练习
            </button>
            <button class="more-btn" @click="(event) => handleMoreClick(event, deck.tagId, false)">
              <More theme="outline" size="16" :strokeWidth="3" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加复习模态框 -->
    <FlashcardReviewModal
      v-model="flashcardStore.isReviewModalOpen"
      :cards="flashcardStore.dueFlashcards"
      @feedback="handleReviewFeedback"
      @complete="initializeData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, markRaw } from 'vue'
import {
  StorageCardOne,
  Tag,
  Time,
  CheckOne,
  Play,
  More,
  Notes,
  FileSearch
} from '@icon-park/vue-next'
import { useRouter } from 'vue-router'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import FlashcardReviewModal from '../components/flashcard/FlashcardReviesModal.vue'
import ContextMenu from '@renderer/components/common/ContexMenu.vue'
import { useFlashcardStore } from '@renderer/stores/flashcardStore'
import { useContextMenuStore } from '@renderer/stores/contextMenuStore'
import type { FlashcardStats } from '@renderer/types/flashcard'
import type { ReviewFeedback } from '@renderer/types/flashcard'

// 状态
const router = useRouter()
const isLoaded = ref(false)
const flashcardStore = useFlashcardStore()
const contextMenuStore = useContextMenuStore()
const stats = ref<FlashcardStats | null>(null)
const untaggedDeck = ref({
  dueCount: 0,
  totalCount: 0,
  masteredCount: 0
})
const tagDecks = ref<
  Array<{
    tagId: string
    name: string
    dueCount: number
    totalCount: number
    masteredCount: number
  }>
>([])

// 处理复习反馈
const handleReviewFeedback = async (noteId: string, feedback: ReviewFeedback) => {
  try {
    await flashcardStore.updateFlashcardStatus(noteId, feedback)
    // 更新卡组数据和进度
    const decks = await flashcardStore.fetchFlashcardDecks()

    // 更新数据
    untaggedDeck.value = {
      ...decks.untagged,
      masteredCount: decks.untagged.masteredCount || 0
    }

    tagDecks.value = decks.tagged.map((deck) => ({
      ...deck,
      masteredCount: deck.masteredCount || 0
    }))
  } catch (error) {
    console.error('处理复习反馈失败:', error)
  }
}

// 修改开始复习方法
const startReview = async (tagId: string | null, isAll = false) => {
  try {
    if (isAll) {
      // 所有记忆卡：传 undefined
      await flashcardStore.startReviewSession(undefined)
    } else if (tagId === null) {
      // 暂无分类：传空数组
      await flashcardStore.startReviewSession([])
    } else {
      // 特定标签：传标签ID数组
      await flashcardStore.startReviewSession([tagId])
    }
  } catch (error) {
    console.error('开始复习失败:', error)
  }
}

// 初始化数据
const initializeData = async () => {
  try {
    // 获取统计数据
    stats.value = await flashcardStore.fetchFlashcardStats()

    // 获取卡组数据
    const decks = await flashcardStore.fetchFlashcardDecks()

    // 更新数据
    untaggedDeck.value = {
      ...decks.untagged,
      masteredCount: decks.untagged.masteredCount || 0
    }

    tagDecks.value = decks.tagged.map((deck) => ({
      ...deck,
      masteredCount: deck.masteredCount || 0
    }))

    isLoaded.value = true
  } catch (error) {
    console.error('加载闪卡数据失败:', error)
  }
}

// 处理更多按钮点击
const handleMoreClick = (event: MouseEvent, tagId: string | null, isAll = false) => {
  event.stopPropagation()

  const menuItems = reactive([
    {
      label: '查看卡组',
      icon: markRaw(FileSearch),
      action: () => {
        // 跳转到卡片盒页面，带上标签和闪卡筛选条件
        router.push({
          name: 'cardbox',
          query: {
            // 如果是所有记忆卡则不传 tags，如果是暂无分类则传 none，如果是标签卡组则传 tagId
            ...(isAll ? {} : tagId === null ? { tags: 'none' } : { tags: tagId }),
            box: 'all',
            isFlashcard: 'true',
            page: '1'
          }
        })
        // 关闭上下文菜单
        contextMenuStore.closeMenu()
      }
    }
  ])

  // 显示上下文菜单
  contextMenuStore.showMenu(event.clientX, event.clientY, menuItems)
}

onMounted(initializeData)
</script>

<style lang="scss" scoped>
.flashcard-view {
  background-color: var(--color-bg-primary);
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

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

    .flashcard-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 8px 0;
      border-bottom: 1px solid var(--color-border);

      // 左侧标题区域
      .flashcard-header-left {
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
          color: var(--default-text-color);
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

.flashcard-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
}

.stats-section {
  margin-bottom: 20px;

  .stats-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-top: 20px;

    .stats-card {
      // background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        border-color: var(--color-primary);
      }

      .stats-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
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
          width: 24px;
          height: 24px;
        }

        &.review {
          background: rgba(var(--color-yellow-rgb), 0.1);
          color: var(--color-yellow);
        }

        &.total {
          background: rgba(var(--color-blue-rgb), 0.1);
          color: var(--color-blue);
        }

        &.mastered {
          background: rgba(var(--color-primary-rgb), 0.1);
          color: var(--color-primary);
        }
      }

      .stats-content {
        flex: 1;

        .stats-value {
          font-size: 24px;
          font-weight: 600;
          color: var(--color-text-primary);
          line-height: 1.2;
        }

        .stats-label {
          font-size: 14px;
          color: var(--color-text-secondary);
          margin-top: 4px;
        }
      }
    }
  }
}

.study-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;

  .empty-state {
    text-align: center;
    color: var(--color-text-secondary);

    &-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    &-title {
      font-size: 24px;
      font-weight: 600;
      color: var(--color-text-primary);
      margin-bottom: 8px;
    }

    &-description {
      font-size: 16px;
      color: var(--color-text-secondary);
    }
  }

  .start-review {
    text-align: center;

    .review-info {
      margin-bottom: 24px;

      h2 {
        font-size: 24px;
        font-weight: 600;
        color: var(--color-text-primary);
        margin-bottom: 8px;
      }

      p {
        font-size: 16px;
        color: var(--color-text-secondary);
      }
    }

    .start-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
      }

      &:active {
        transform: translateY(0);
      }
    }
  }
}

// 新增卡组列表样式
.deck-list-section {
  margin-top: 20px;
  // background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;

  .deck-list-header {
    display: grid;
    grid-template-columns: 2fr 100px 100px 1fr 150px;
    padding: 12px 20px;
    // background: var(--color-bg-tertiary);
    border-bottom: 1px solid var(--color-border);
    font-size: 13px;
    color: var(--color-text-secondary);
    font-weight: 500;
    align-items: center;

    .column-actions {
      display: flex;
      justify-content: flex-end;
      padding-right: 90px;
    }

    .column-progress {
      padding: 0 20px;
    }
  }

  .deck-item {
    display: grid;
    grid-template-columns: 2fr 100px 100px 1fr 150px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-border);
    transition: all 0.2s ease;
    align-items: center;

    &:hover {
      background: var(--color-hover-bg);
    }

    &:last-child {
      border-bottom: none;
    }

    &.all {
      // background: var(--color-bg-tertiary);

      &:hover {
        background: var(--color-hover-bg);
      }

      .deck-icon {
        background: rgba(var(--color-primary-rgb), 0.1);
        color: var(--color-primary);
      }
    }

    .deck-info {
      display: flex;
      align-items: center;
      gap: 12px;

      .deck-icon {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        background: var(--color-menu-bg);
        color: var(--color-primary);

        :deep(.i-icon) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        :deep(svg) {
          width: 20px;
          height: 20px;
        }
      }

      .deck-name {
        font-weight: 500;
        color: var(--color-text-primary);
      }
    }

    .deck-due {
      display: flex;
      align-items: center;
      color: var(--color-text-secondary);
      font-weight: 500;
    }

    .deck-total {
      display: flex;
      align-items: center;
      color: var(--color-text-secondary);
    }

    .deck-progress {
      display: flex;
      align-items: center;
      padding: 0 20px;
      color: var(--color-text-secondary);
      font-weight: 500;
    }

    .deck-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: flex-end;

      .practice-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        height: 32px;
        padding: 0 12px;
        background: var(--color-primary);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;

        .i-icon {
          width: 20px;
          height: 20px;
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
        }

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.2);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
      }

      .more-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;

        .i-icon {
          width: 20px;
          height: 20px;
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
        }

        &:hover {
          background: var(--color-hover-button);
        }
      }
    }
  }
}
</style>
