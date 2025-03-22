<template>
  <div class="manuscript-detail">
    <!-- 添加 AppToolbar -->
    <AppToolbar :showBackButton="true" :showForwardButton="true" />

    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="manuscript-title">
          <template v-if="!isEditing">
            <h1 class="title" @click="startEditing">{{ manuscript?.title || '未命名文稿' }}</h1>
            <button class="edit-button" @click="startEditing">
              <Edit theme="outline" size="16" :strokeWidth="3" />
            </button>
          </template>
          <template v-else>
            <input
              ref="titleInput"
              v-model="editingTitle"
              class="title-input"
              type="text"
              @blur="finishEditing"
              @keyup.enter="finishEditing"
              @keyup.esc="cancelEditing"
            />
          </template>
        </div>
      </div>
      <div class="toolbar-right">
        <!-- 模式切换 -->
        <SegmentedButton
          v-model="currentMode"
          :options="modeOptions"
          width="120px"
          height="32px"
          name="edit-mode"
          tooltipPlacement="top"
        />
        <!-- AI 润色按钮 -->
        <Button
          v-if="currentMode === 'draft'"
          type="primary"
          :icon="Magic"
          :loading="isPolishing"
          @click="handlePolish"
        >
          AI 润色
        </Button>
      </div>
    </div>

    <!-- 主要编辑区域 -->
    <div class="editor-container">
      <div class="content-wrapper">
        <!-- 草稿模式 -->
        <div v-if="currentMode === 'draft'" class="draft-mode">
          <div
            ref="scrollContainerRef"
            class="writing-paper"
            @dragover="handleDragOver"
            @drop="handleDrop"
          >
            <!-- 卡片列表 -->
            <div class="cards-container">
              <div
                v-if="!manuscript?.cards?.length"
                class="empty-state"
                @click="createParagraphCard"
              >
                <div class="empty-text">
                  <AddFour theme="outline" size="24" :strokeWidth="3" />
                  <span>点击创建段落</span>
                </div>
              </div>
              <template v-else>
                <draggable
                  v-model="localCards"
                  item-key="id"
                  handle=".drag-handle"
                  @end="handleDragEnd"
                >
                  <template #item="{ element }">
                    <ManuscriptContentCard
                      :card="element"
                      @update:content="(content) => handleCardContentUpdate(element.id, content)"
                      @delete="handleCardDelete(element.id)"
                      @add="(position) => handleAddCard(element, position)"
                    />
                  </template>
                </draggable>

                <!-- 添加新段落的按钮 -->
                <div class="add-paragraph-button" @click="createParagraphCard">
                  <AddFour theme="outline" size="20" :strokeWidth="3" />
                  <span>添加段落</span>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- 润色模式 -->
        <div v-else class="polish-mode">
          <div ref="scrollContainerRef" class="editor-wrapper">
            <TipTapEditor
              ref="polishEditorRef"
              :content="localPolishedContent"
              :editable="true"
              :enable-drag-handle="false"
              @update:content="handlePolishedContentUpdate"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { Edit, Magic, AddFour } from '@icon-park/vue-next'
import { useWritingDeskStore } from '@renderer/stores/writingDeskStore'
import { useNoteStore } from '@renderer/stores/noteStore'
import SegmentedButton from '@renderer/components/ui/SegmentedButton.vue'
import Button from '@renderer/components/ui/Button.vue'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import draggable from 'vuedraggable'
import ManuscriptContentCard from './ManuscriptContentCard.vue'
import { ManuscriptCard } from '@/shared/types'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'

// 使用路由获取参数
const route = useRoute()
const writingDeskStore = useWritingDeskStore()
const noteStore = useNoteStore()
const manuscript = computed(() => writingDeskStore.currentManuscript)
const localCards = ref(manuscript.value?.cards || [])

// 模式切换相关
const currentMode = ref<'draft' | 'polish'>('draft')
const modeOptions = [
  {
    value: 'draft',
    label: '草稿',
    tooltip: { content: '编排卡片模式', delay: { show: 1000 } }
  },
  {
    value: 'polish',
    label: '润色',
    tooltip: { content: '润色编辑模式', delay: { show: 1000 } }
  }
]

// 修改引用名称，因为两种模式都会用到
const scrollContainerRef = ref<HTMLElement | null>(null)

// 加载文稿数据
onMounted(async () => {
  const manuscriptId = route.params.id as string
  if (!manuscriptId) {
    console.error('ManuscriptDetail - 无效的文稿ID')
    return
  }

  console.log('ManuscriptDetail - 开始加载文稿，ID:', manuscriptId)
  await writingDeskStore.loadManuscript(manuscriptId)
  localCards.value = manuscript.value?.cards || []

  // 等待一帧后再滚动到顶部
  requestAnimationFrame(() => {
    scrollToTop()
  })
})

// 监听模式切换
watch(currentMode, () => {
  // 等待一帧后再滚动到顶部
  requestAnimationFrame(() => {
    scrollToTop()
  })
})

// 编辑标题相关
const isEditing = ref(false)
const editingTitle = ref('')
const titleInput = ref<HTMLInputElement | null>(null)

// AI 润色相关
const isPolishing = ref(false)

// 润色模式相关
const polishEditorRef = ref<any>(null)
const localPolishedContent = ref<any>(null)

// 监听 manuscript 变化，更新本地润色内容
watch(
  () => manuscript.value?.polishedContent,
  (newContent) => {
    if (newContent) {
      localPolishedContent.value = newContent
    } else {
      // 如果没有润色内容，则使用默认的空文档结构
      localPolishedContent.value = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      }
    }
  },
  { immediate: true }
)

// 监听 manuscript 变化，更新本地卡片列表
watch(
  () => manuscript.value?.cards,
  (newCards) => {
    if (newCards) {
      localCards.value = newCards
    }
  },
  { deep: true }
)

// 标题编辑方法
const startEditing = () => {
  if (!manuscript.value) return
  isEditing.value = true
  editingTitle.value = manuscript.value.title
}

const finishEditing = async () => {
  if (!editingTitle.value.trim() || !manuscript.value) {
    cancelEditing()
    return
  }

  try {
    await writingDeskStore.updateManuscript({
      id: manuscript.value.id,
      title: editingTitle.value.trim()
    })
  } catch (error) {
    console.error('更新标题失败:', error)
  } finally {
    isEditing.value = false
  }
}

const cancelEditing = () => {
  isEditing.value = false
  editingTitle.value = manuscript.value?.title || ''
}

// 处理润色内容更新
const handlePolishedContentUpdate = async (content: any) => {
  if (!manuscript.value) return

  try {
    await writingDeskStore.updateManuscript({
      id: manuscript.value.id,
      polishedContent: content
    })
  } catch (error) {
    console.error('更新润色内容失败:', error)
  }
}

// 修改 handlePolish 方法
const handlePolish = async () => {
  if (!manuscript.value || isPolishing.value) return

  try {
    isPolishing.value = true
    await writingDeskStore.polishManuscript({
      id: manuscript.value.id
    })

    // 切换到润色模式
    currentMode.value = 'polish'

    // 确保编辑器获得焦点
    nextTick(() => {
      if (polishEditorRef.value) {
        polishEditorRef.value.focus()
      }
    })
  } catch (error) {
    console.error('润色失败:', error)
  } finally {
    isPolishing.value = false
  }
}

// 卡片相关方法
const handleCardContentUpdate = async (cardId: string, content: any) => {
  if (!manuscript.value) return

  try {
    await writingDeskStore.updateManuscriptCard({
      manuscriptId: manuscript.value.id,
      cardId,
      content
    })
  } catch (error) {
    console.error('更新卡片内容失败:', error)
  }
}

const handleCardDelete = async (cardId: string) => {
  if (!manuscript.value) return

  try {
    await writingDeskStore.deleteCard(cardId)
    localCards.value = localCards.value.filter((card) => card.id !== cardId)
  } catch (error) {
    console.error('删除卡片失败:', error)
  }
}

const handleDragEnd = async () => {
  if (!manuscript.value) return

  // 将变量声明移到 try 块外面
  let originalCards: ManuscriptCard[] = []

  try {
    console.log('开始更新卡片顺序')

    // 保存拖拽前的卡片数据，以防更新失败时恢复
    originalCards = JSON.parse(JSON.stringify(localCards.value))

    // 将响应式对象转换为普通对象，保留所有必要的 ManuscriptCard 属性
    const plainCards = localCards.value.map((card, index) => {
      // 确保 content 存在且正确复制
      let safeContent
      try {
        safeContent = card.content ? JSON.parse(JSON.stringify(card.content)) : null
        if (!safeContent) {
          console.warn(`卡片 ${card.id} 的内容为空，使用默认内容`)
          safeContent = {
            type: 'doc',
            content: [{ type: 'paragraph', content: [] }]
          }
        }
      } catch (error) {
        console.error(`处理卡片 ${card.id} 内容时出错:`, error)
        safeContent = card.content // 使用原始内容作为后备
      }

      return {
        id: card.id,
        type: card.type,
        content: safeContent,
        order: index,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        noteId: card.noteId
      }
    })

    // 打印更新前的数据，方便调试
    console.log('更新前的卡片数据:', {
      totalCards: plainCards.length,
      cardsData: plainCards.map((card) => ({
        id: card.id,
        order: card.order,
        contentSize: JSON.stringify(card.content).length
      }))
    })

    await writingDeskStore.updateManuscriptCardsOrder({
      manuscriptId: manuscript.value.id,
      cards: plainCards
    })

    // 更新成功后重新加载数据，确保数据一致性
    await writingDeskStore.loadManuscript(manuscript.value.id)
    localCards.value = manuscript.value.cards || []

    console.log('卡片顺序更新成功')
  } catch (error) {
    console.error('更新卡片顺序失败:', error)
    // 如果更新失败，恢复到原始状态
    localCards.value = originalCards
    // 显示错误提示
    console.warn('已恢复到拖拽前的状态')
  }
}

// 创建段落卡片
const createParagraphCard = async () => {
  if (!manuscript.value) {
    console.error('无法创建段落：当前文稿不存在')
    return
  }

  try {
    console.log('开始创建段落卡片')
    // 计算新卡片的顺序
    const order = localCards.value.length

    // 创建新的段落卡片
    const newCard = await writingDeskStore.addCard(
      manuscript.value.id,
      {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      },
      order
    )

    // 更新本地卡片列表
    if (newCard) {
      localCards.value = [...localCards.value, newCard]
    }

    console.log('段落卡片创建成功')
  } catch (error) {
    console.error('创建段落卡片失败:', error)
  }
}

// 添加卡片处理方法
const handleAddCard = async (targetCard: ManuscriptCard, position: 'before' | 'after') => {
  if (!manuscript.value) return

  try {
    // 计算新卡片的顺序
    const targetIndex = localCards.value.findIndex((card) => card.id === targetCard.id)
    const newOrder = position === 'before' ? targetIndex : targetIndex + 1

    // 创建新的段落卡片
    const newCard = await writingDeskStore.addCard(
      manuscript.value.id,
      {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      },
      newOrder
    )

    if (newCard) {
      // 更新本地卡片列表
      const newCards = [...localCards.value]
      newCards.splice(newOrder, 0, newCard)

      // 先更新本地状态
      localCards.value = newCards

      // 更新所有卡片的顺序到数据库
      const plainCards = newCards.map((card, index) => ({
        id: card.id,
        type: card.type,
        content: JSON.parse(JSON.stringify(card.content)),
        order: index,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        noteId: card.noteId
      }))

      // 使用 updateManuscriptCardsOrder 来更新所有卡片的顺序
      await writingDeskStore.updateManuscriptCardsOrder({
        manuscriptId: manuscript.value.id,
        cards: plainCards
      })
    }
  } catch (error) {
    console.error('添加卡片失败:', error)
  }
}

// 滚动到顶部的方法
const scrollToTop = () => {
  nextTick(() => {
    if (scrollContainerRef.value) {
      // 强制等待一帧以确保 DOM 完全更新
      requestAnimationFrame(() => {
        scrollContainerRef.value!.scrollTop = 0
      })
    }
  })
}

// 处理拖拽相关
const handleDragOver = (event: DragEvent) => {
  // 允许放置
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

const handleDrop = async (event: DragEvent) => {
  event.preventDefault()
  if (!event.dataTransfer || !manuscript.value) return

  try {
    const data = event.dataTransfer.getData('application/json')
    const { id: noteId } = JSON.parse(data)

    if (!noteId) return

    // 使用 noteStore 获取源笔记
    const sourceNote = await noteStore.fetchNote(noteId)
    if (!sourceNote) {
      throw new Error('未找到源笔记')
    }

    // 创建新的引用卡片，使用源笔记的内容
    const newCard = await writingDeskStore.addCard(
      manuscript.value.id,
      sourceNote.content,
      localCards.value.length,
      noteId
    )

    // 更新本地卡片列表
    if (newCard) {
      localCards.value = [...localCards.value, newCard]
    }
  } catch (error) {
    console.error('创建引用卡片失败:', error)
  }
}
</script>

<style lang="scss" scoped>
.manuscript-detail {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);

  .toolbar {
    padding: 16px 24px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--color-bg-primary);

    .toolbar-left {
      .manuscript-title {
        display: flex;
        align-items: center;
        gap: 8px;

        .title {
          font-size: 20px;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
          cursor: pointer;

          &:hover + .edit-button {
            opacity: 1;
          }
        }

        .edit-button {
          padding: 4px;
          border: none;
          background: none;
          border-radius: 4px;
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s ease;
          color: var(--color-text-secondary);

          &:hover {
            background: var(--color-hover-bg);
            opacity: 1;
          }
        }

        .title-input {
          font-size: 20px;
          font-weight: 600;
          color: var(--color-text-primary);
          border: none;
          border-bottom: 2px solid var(--color-primary);
          background: transparent;
          padding: 4px 8px;
          width: 300px;

          &:focus {
            outline: none;
          }
        }
      }
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  }

  .editor-container {
    flex: 1;
    overflow: hidden;
    position: relative;
    display: flex;
    justify-content: center;

    .content-wrapper {
      width: 100%;
      max-width: 800px;
      height: 100%;
      padding: 0 20px;

      .draft-mode {
        height: 100%;
        padding: 24px 0;

        .writing-paper {
          height: 100%;
          background: var(--color-bg-secondary);
          border-radius: 12px;
          padding: 32px;
          overflow-y: auto;

          &.drag-over {
            border: 2px dashed var(--color-primary);
            background-color: var(--color-hover-bg);
          }

          .cards-container {
            min-height: 200px;

            .empty-state {
              height: 200px;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px dashed var(--color-border);
              border-radius: 8px;
              margin: 16px 0;
              cursor: pointer;
              transition: all 0.2s ease;

              &:hover {
                border-color: var(--color-primary);
                background: var(--color-hover-bg);
              }

              .empty-text {
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--color-text-secondary);
                font-size: 14px;

                &:hover {
                  color: var(--color-primary);
                }
              }
            }

            .add-paragraph-button {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              padding: 12px;
              margin: 16px 0;
              border: 1px dashed var(--color-border);
              border-radius: 8px;
              color: var(--color-text-secondary);
              cursor: pointer;
              transition: all 0.2s ease;

              &:hover {
                border-color: var(--color-primary);
                background: var(--color-hover-bg);
                color: var(--color-primary);
              }
            }
          }
        }
      }

      .polish-mode {
        height: 100%;
        padding: 24px 0;

        .editor-wrapper {
          height: 100%;
          background: var(--color-bg-secondary);
          border-radius: 12px;
          padding: 32px;
          overflow-y: auto;

          :deep(.tiptap) {
            min-height: 100%;
            outline: none;
          }
        }
      }
    }
  }
}
</style>
