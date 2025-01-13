<template>
  <div class="writing-detail">
    <!-- 顶部工具栏 -->
    <AppToolbar
      :showBackButton="true"
      :showForwardButton="true"
      @update:whiteboardName="handleTitleChange"
      :whiteboardName="article.title"
    />

    <!-- 主体内容区 -->
    <div class="detail-content">
      <!-- 卡片列表容器 -->
      <div class="columns-container">
        <!-- 使用 v-for 渲染每一列 -->
        <div
          v-for="(column, level) in cardColumns"
          :key="level"
          class="column"
          :class="{ 'first-column': level === 0 }"
          ref="columnRefs"
        >
          <!-- 上缓冲区 -->
          <div class="buffer"></div>

          <!-- 卡片组 -->
          <div
            class="group"
            :class="{ 'has-active': hasActiveCard(level) }"
            :ref="
              (el) => {
                if (level === 0) firstColumnGroup = el
              }
            "
          >
            <WritingCard
              v-for="card in column"
              :key="card.id"
              :card="card"
              :ref="(el) => (cardRefs[card.id] = el)"
              :class="{
                'is-active': isCardActive(card),
                'has-children': hasChildren(card),
                ancestor: isAncestor(card)
              }"
              draggable="true"
              @click="handleCardClick(card, level)"
              @update="handleCardUpdate"
              @delete="handleCardDelete"
              @addChild="handleAddChild"
              @dragstart="handleDragStart($event, card)"
              @dragend="handleDragEnd"
            />
          </div>

          <!-- 下缓冲区 -->
          <div class="buffer"></div>
        </div>
      </div>

      <!-- 右下角添加根卡片的按钮 -->
      <div class="floating-actions" v-if="!hasRootCards">
        <button class="floating-button add" @click="addRootCard">
          <Plus theme="outline" size="20" :strokeWidth="3" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Plus } from '@icon-park/vue-next'
import { useWritingStore } from '@renderer/stores/writingStore'
import WritingCard from './WritingCard.vue'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import type { Article, ArticleCard } from '@shared/types/writing'

const route = useRoute()
const writingStore = useWritingStore()

// 状态
const article = ref<Article>({} as Article)
const cardRefs = ref<Record<string, any>>({})
const draggingCard = ref<ArticleCard | null>(null)
const activeCardId = ref<string | null>(null)

// 添加列内容的引用
const columnContents = ref<HTMLElement[]>([])

// 添加新的响应式引用
const columnRefs = ref<HTMLElement[]>([])

// 添加对第一列组的引用
const firstColumnGroup = ref<HTMLElement | null>(null)

// 添加配置常量
const SCROLL_OFFSET = 20 // 可以根据需要调整这个值
const CARD_GAP = 10 // 卡片之间的间距

// 初始化
onMounted(async () => {
  const articleId = route.params.id as string
  await loadArticle(articleId)
  await loadCards()
  await nextTick()
  centerFirstColumn()

  // 监听窗口大小变化，重新计算居中位置
  window.addEventListener('resize', centerFirstColumn)
})

// 清理事件监听
onUnmounted(() => {
  window.removeEventListener('resize', centerFirstColumn)
})

// 计算并设置第一列的垂直居中位置
const centerFirstColumn = () => {
  if (!firstColumnGroup.value) return

  const column = columnRefs.value[0]
  if (!column) return

  const columnHeight = column.clientHeight
  const groupHeight = firstColumnGroup.value.clientHeight
  const bufferHeight = Math.max((columnHeight - groupHeight) / 2, 20) // 至少20px的buffer高度

  // 设置第一列的 buffer 高度
  const buffers = column.querySelectorAll('.buffer')
  buffers.forEach((buffer) => {
    ;(buffer as HTMLElement).style.height = `${bufferHeight}px`
  })

  // 初始滚动到中间位置
  if (groupHeight < columnHeight) {
    column.scrollTop = bufferHeight
  }
}

// 加载文章
const loadArticle = async (id: string) => {
  try {
    const loadedArticle = await writingStore.getArticleById(id)
    if (loadedArticle) {
      article.value = loadedArticle
    }
  } catch (error) {
    console.error('加载文章失败:', error)
  }
}

// 加载卡片
const loadCards = async () => {
  if (!article.value?.id) return
  await writingStore.fetchArticleCards(article.value.id)
}

// 计算每一列的卡片
const cardColumns = computed(() => {
  const columns: { [key: number]: ArticleCard[] } = {}
  const cards = writingStore.articleCards

  // 按层级分组
  cards.forEach((card) => {
    const level = card.level || 0
    if (!columns[level]) {
      columns[level] = []
    }
    columns[level].push(card)
  })

  // 对每一列的卡片按顺序排序
  Object.keys(columns).forEach((level) => {
    columns[Number(level)].sort((a, b) => a.order - b.order)
  })

  return columns
})

// 检查是否有根卡片
const hasRootCards = computed(() => {
  return cardColumns.value[0]?.length > 0
})

// 获取列标题
const getColumnTitle = (level: number) => {
  if (level === 0) return '章节'
  if (level === 1) return '小节'
  return `层级 ${level + 1}`
}

// 事件处理
const handleTitleChange = async (newTitle: string) => {
  if (!article.value?.id) return
  try {
    await writingStore.updateArticle(article.value.id, {
      title: newTitle
    })
  } catch (error) {
    console.error('更新文章标题失败:', error)
  }
}

// 添加根卡片
const addRootCard = async () => {
  if (!article.value?.id) return
  const newCard = await writingStore.createArticleCard({
    articleId: article.value.id,
    cardType: 'writing',
    parentId: null
  })
  await loadCards()
  // 聚焦新卡片
  setTimeout(() => {
    cardRefs.value[newCard.id]?.focus()
  }, 100)
}

// 添加子卡片
const handleAddChild = async (parentId: string) => {
  if (!article.value?.id) return
  const parentCard = writingStore.articleCards.find((card) => card.id === parentId)
  if (!parentCard) return

  // 获取父卡片的所有现有子卡片
  const existingChildCards = writingStore.articleCards
    .filter((card) => card.parent_id === parentId)
    .sort((a, b) => a.order - b.order)

  // 计算新卡片的顺序（放在所有子卡片的最后）
  const maxOrder =
    existingChildCards.length > 0
      ? Math.max(...existingChildCards.map((card) => card.order || 0))
      : 0

  // 创建默认内容并序列化为字符串
  const defaultContent = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [] }]
  }

  // 使用 writingStore 的 updateCardOrder 方法来设置顺序
  const newCard = await writingStore.createArticleCard({
    articleId: article.value.id,
    cardType: 'writing',
    parentId: parentId,
    content: JSON.stringify(defaultContent)
  })

  // 更新卡片顺序
  await writingStore.updateCardOrder({
    cardId: newCard.id,
    newOrder: maxOrder + 1,
    newParentId: parentId
  })

  await loadCards()

  // 聚焦新卡片并确保它在视图中
  setTimeout(() => {
    const cardElement = cardRefs.value[newCard.id]
    if (cardElement) {
      cardElement.focus()

      // 获取父卡片和新卡片的位置
      const parentElement = cardRefs.value[parentId].$el
      const newCardElement = cardElement.$el
      const columnContent = newCardElement.closest('.column-content')

      if (columnContent && parentElement) {
        const parentRect = parentElement.getBoundingClientRect()
        const newCardRect = newCardElement.getBoundingClientRect()
        const scrollTop = columnContent.scrollTop + (newCardRect.top - parentRect.top)

        columnContent.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        })
      }
    }
  }, 100)
}

// 卡片更新和删除
const handleCardUpdate = async (cardId: string, content: any) => {
  await writingStore.updateArticleCard(cardId, { content })
  await loadCards()
}

const handleCardDelete = async (cardId: string) => {
  await writingStore.deleteArticleCard(cardId)
  await loadCards()
}

// 拖拽相关
const handleDragStart = (event: DragEvent, card: ArticleCard) => {
  draggingCard.value = card
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

const handleDragEnd = () => {
  draggingCard.value = null
}

// 判断卡片是否在当前激活链上
const isCardActive = (card: ArticleCard) => {
  if (!activeCardId.value) return false

  const activeChain = new Set<string>()
  activeChain.add(activeCardId.value)

  let currentCard = writingStore.articleCards.find((c) => c.id === activeCardId.value)
  while (currentCard?.parent_id) {
    activeChain.add(currentCard.parent_id)
    currentCard = writingStore.articleCards.find((c) => c.id === currentCard?.parent_id)
  }

  const findChildren = (parentId: string) => {
    const children = writingStore.articleCards.filter((c) => c.parent_id === parentId)
    children.forEach((child) => {
      activeChain.add(child.id)
      findChildren(child.id)
    })
  }
  findChildren(activeCardId.value)

  return activeChain.has(card.id)
}

// 处理卡片点击
const handleCardClick = async (card: ArticleCard, level: number) => {
  // 如果点击已激活的卡片，取消激活
  if (activeCardId.value === card.id) {
    activeCardId.value = null
    return
  }
  activeCardId.value = card.id

  // 等待下一个 tick，确保 DOM 已更新
  await nextTick()

  // 获取下一列
  const nextColumn = columnRefs.value[level + 1]
  if (!nextColumn) return

  // 获取当前卡片的所有直接子卡片
  const childCards = writingStore.articleCards
    .filter((c) => c.parent_id === card.id)
    .sort((a, b) => a.order - b.order)

  if (childCards.length === 0) return

  // 获取子卡片的 DOM 元素
  const childElements = childCards
    .map((child) => nextColumn.querySelector(`[data-card-id="${child.id}"]`))
    .filter((el): el is HTMLElement => el !== null)

  if (childElements.length === 0) return

  // 计算子卡片组的总高度（包括间距）
  const totalChildrenHeight = childElements.reduce((sum, el) => {
    const style = window.getComputedStyle(el)
    const marginBottom = parseInt(style.marginBottom) || 0
    return sum + el.offsetHeight + marginBottom
  }, 0)

  // 计算第一个子卡片的位置
  const firstChildElement = childElements[0]
  const lastChildElement = childElements[childElements.length - 1]

  // 获取第一个和最后一个子卡片相对于列的位置
  const columnRect = nextColumn.getBoundingClientRect()
  const firstChildRect = firstChildElement.getBoundingClientRect()
  const lastChildRect = lastChildElement.getBoundingClientRect()

  // 计算子卡片组的中心位置
  const childrenGroupTop = firstChildRect.top - columnRect.top + nextColumn.scrollTop
  const childrenGroupBottom = lastChildRect.bottom - columnRect.top + nextColumn.scrollTop
  const childrenGroupCenter = (childrenGroupTop + childrenGroupBottom) / 2

  // 计算列的可视区域高度
  const columnVisibleHeight = nextColumn.clientHeight

  // 计算目标滚动位置（让子卡片组居中）
  const targetScrollTop = childrenGroupCenter - columnVisibleHeight / 2

  // 添加缓冲区
  const bufferSpace = Math.min(columnVisibleHeight * 0.1, 40) // 10% 的缓冲区，最大 40px

  // 确保滚动位置在合理范围内
  const maxScroll = nextColumn.scrollHeight - columnVisibleHeight
  const finalScrollTop = Math.max(bufferSpace, Math.min(targetScrollTop, maxScroll - bufferSpace))

  // 平滑滚动到目标位置
  nextColumn.scrollTo({
    top: finalScrollTop,
    behavior: 'smooth'
  })

  // 添加高亮效果
  childElements.forEach((el) => {
    el.style.transition = 'transform 0.3s ease'
    el.style.transform = 'scale(1.02)'
    setTimeout(() => {
      el.style.transform = 'scale(1)'
    }, 300)
  })
}

// 检查卡片是否有子卡片
const hasChildren = (card: ArticleCard) => {
  return writingStore.articleCards.some((c) => c.parent_id === card.id)
}

// 检查卡片是否是祖先卡片
const isAncestor = (card: ArticleCard) => {
  if (!activeCardId.value) return false

  let currentCard = writingStore.articleCards.find((c) => c.id === activeCardId.value)
  while (currentCard?.parent_id) {
    if (currentCard.parent_id === card.id) return true
    currentCard = writingStore.articleCards.find((c) => c.id === currentCard?.parent_id)
  }
  return false
}

// 检查该列是否有激活的卡片
const hasActiveCard = (level: number) => {
  if (!activeCardId.value) return false

  const activeCard = writingStore.articleCards.find((c) => c.id === activeCardId.value)
  return activeCard?.level === level
}
</script>

<style lang="scss" scoped>
.writing-detail {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-primary);

  .detail-content {
    flex: 1;
    overflow: hidden;
  }

  .columns-container {
    height: 100%;
    display: flex;
    overflow-x: auto;
    overflow-y: hidden;
    transform: translateZ(0);
  }

  .column {
    flex: 1 0 auto;
    height: 100%;
    max-width: 600px;
    min-width: 450px;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;

    &:first-child,
    &:last-child {
      flex: 0.25 0;
      min-width: 100px;
    }

    &.first-column {
      .buffer {
        transition: height 0.3s ease;
      }
    }

    .buffer {
      background: rgb(50, 89, 107);
      border-right: 2px solid rgb(63, 102, 121);
      border-left: 2px solid rgb(42, 79, 97);
      margin: 0 16px;
      height: 90%;
      z-index: 1;
    }

    .group {
      margin: 0;
      padding: 10px;
      background-color: var(--dark-gray);

      &.has-active {
        background: var(--light-gray);
      }

      &.active-descendant {
        color: #333;
        background: var(--white-bg);
        border-radius: 8px 0 0 8px;
      }

      // 添加卡片间距
      .writing-card {
        margin-bottom: 16px; // 卡片间距
        transition: all 0.3s ease;

        &:last-child {
          margin-bottom: 0;
        }

        &.is-active {
          transform: scale(1.02);
        }

        &:not(.is-active):not(.ancestor) {
          opacity: 0.6;
        }
      }
    }

    // 添加平滑滚动
    scroll-behavior: smooth;

    // 添加滚动过渡效果
    &:hover {
      &::-webkit-scrollbar-thumb {
        background-color: var(--color-scroll-thumb-hover);
      }
    }
  }

  // 隐藏滚动条
  .column::-webkit-scrollbar {
    width: 0 !important;
  }

  .floating-actions {
    position: fixed;
    right: 24px;
    bottom: 24px;
    display: flex;
    gap: 12px;
    z-index: 100;

    .floating-button {
      width: 40px;
      height: 40px;
      border-radius: 20px;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      &.outline {
        background-color: var(--color-bg-secondary);
        color: var(--color-text-primary);

        &:hover {
          background-color: var(--color-hover-bg);
        }
      }

      &.add {
        background-color: var(--color-primary);
        color: white;

        &:hover {
          transform: scale(1.05);
        }
      }
    }
  }
}
</style>
