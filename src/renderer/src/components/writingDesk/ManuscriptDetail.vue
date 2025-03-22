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
          width="240px"
          height="36px"
          name="edit-mode"
          tooltipPlacement="top"
        />
        <!-- 根据不同模式显示不同按钮 -->
        <Button
          v-if="currentMode === 'draft'"
          type="primary"
          :icon="Magic"
          :loading="isGeneratingFirstDraft"
          @click="handleGenerateFirstDraft"
        >
          卡片成文
        </Button>
        <Button
          v-if="currentMode === 'first_draft'"
          type="primary"
          :icon="Magic"
          :loading="isPolishing"
          @click="handlePolish"
        >
          润色文章
        </Button>
        <Button
          v-if="currentMode === 'polish'"
          type="primary"
          :icon="Brain"
          :loading="isThinking"
          @click="handleDeepThinking"
        >
          深度思考
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
            @dragleave="handleDragLeave"
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
                  :list="manuscript?.cards || []"
                  item-key="id"
                  handle=".drag-handle"
                  :group="{ name: 'cards' }"
                  @end="handleDragEnd"
                >
                  <template #item="{ element }">
                    <div class="card-wrapper">
                      <div
                        class="drop-indicator top"
                        :class="{
                          active: isDraggingOver && currentDropIndex === getCardIndex(element.id)
                        }"
                      ></div>
                      <ManuscriptContentCard
                        :card="element"
                        @update:content="(content) => handleCardContentUpdate(element.id, content)"
                        @delete="handleCardDelete(element.id)"
                        @add="(position) => handleAddCard(element, position)"
                      />
                      <div
                        class="drop-indicator bottom"
                        :class="{
                          active:
                            isDraggingOver && currentDropIndex === getCardIndex(element.id) + 1
                        }"
                      ></div>
                    </div>
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

        <!-- 初稿模式 -->
        <div v-else-if="currentMode === 'first_draft'" class="first-draft-mode">
          <div ref="scrollContainerRef" class="editor-wrapper">
            <TipTapEditor
              ref="firstDraftEditorRef"
              :content="localFirstDraftContent"
              :note-id="manuscript?.id"
              :editable="true"
              :enable-drag-handle="true"
              @update:content="handleFirstDraftContentUpdate"
            />
          </div>
        </div>

        <!-- 终稿模式 -->
        <div v-else-if="currentMode === 'polish'" class="polish-mode">
          <div ref="scrollContainerRef" class="editor-wrapper">
            <TipTapEditor
              ref="polishEditorRef"
              :content="localPolishedContent"
              :note-id="manuscript?.id"
              :editable="true"
              :enable-drag-handle="true"
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
import { Edit, Magic, AddFour, Brain } from '@icon-park/vue-next'
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

// 模式切换相关
const currentMode = ref<'draft' | 'first_draft' | 'polish'>('draft')
const modeOptions = [
  {
    value: 'draft',
    label: '草稿',
    tooltip: { content: '编排卡片模式', delay: { show: 1000 } }
  },
  {
    value: 'first_draft',
    label: '初稿',
    tooltip: { content: '初稿编辑模式', delay: { show: 1000 } }
  },
  {
    value: 'polish',
    label: '终稿',
    tooltip: { content: '终稿润色模式', delay: { show: 1000 } }
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

  try {
    console.log('ManuscriptDetail - 开始加载文稿，ID:', manuscriptId)
    await writingDeskStore.loadManuscript(manuscriptId)

    // 添加一个小延时确保 DOM 完全渲染
    setTimeout(() => {
      nextTick(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (scrollContainerRef.value) {
              scrollContainerRef.value.scrollTop = 0
              console.log('已滚动到顶部，当前滚动位置:', scrollContainerRef.value.scrollTop)
            } else {
              console.warn('scrollContainerRef 不存在')
            }
          })
        })
      })
    }, 100) // 100ms 的延时
  } catch (error) {
    console.error('加载文稿失败:', error)
  }
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

// 添加初稿相关状态
const isGeneratingFirstDraft = ref(false)
const firstDraftEditorRef = ref<any>(null)
const localFirstDraftContent = ref<any>(null)

// 添加深度思考相关状态
const isThinking = ref(false)

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
watch(
  () => manuscript.value?.firstDraftContent,
  (newContent) => {
    if (newContent) {
      localFirstDraftContent.value = newContent
    } else {
      // 如果没有润色内容，则使用默认的空文档结构
      localFirstDraftContent.value = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      }
    }
  },
  { immediate: true }
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
    console.log('开始删除卡片:', cardId)
    await writingDeskStore.deleteCard(cardId)

    // 删除成功后会自动重新加载文稿数据
    console.log('卡片删除成功')
  } catch (error) {
    console.error('删除卡片失败:', error)
  }
}

// 修改拖拽结束的处理方法
const handleDragEnd = async () => {
  if (!manuscript.value) return

  try {
    // 获取当前卡片的顺序
    const cards = manuscript.value.cards.map((card, index) => {
      // 创建一个普通对象的副本，避免响应式对象序列化问题
      const plainCard = {
        id: card.id,
        type: card.type,
        content: JSON.parse(JSON.stringify(card.content)),
        order: index,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        noteId: card.noteId
      }
      return plainCard
    })

    console.log('更新卡片顺序 - 准备数据:', {
      manuscriptId: manuscript.value.id,
      totalCards: cards.length,
      cards: cards.map((c) => ({ id: c.id, order: c.order }))
    })

    // 更新数据库中的顺序
    await writingDeskStore.updateManuscriptCardsOrder({
      manuscriptId: manuscript.value.id,
      cards
    })

    // 重新加载文稿数据
    await writingDeskStore.loadManuscript(manuscript.value.id)
  } catch (error) {
    console.error('更新卡片顺序失败:', error)
    await writingDeskStore.loadManuscript(manuscript.value.id)
  }
}

// 修改创建段落卡片的方法
const createParagraphCard = async () => {
  if (!manuscript.value) {
    console.error('无法创建段落：当前文稿不存在')
    return
  }

  try {
    console.log('开始创建段落卡片')
    // 直接使用 manuscript.value.cards.length 作为新卡片的顺序
    const order = manuscript.value.cards?.length || 0

    // 创建新的段落卡片
    await writingDeskStore.addCard(
      manuscript.value.id,
      {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      },
      order
    )

    // 重新加载文稿数据
    await writingDeskStore.loadManuscript(manuscript.value.id)
  } catch (error) {
    console.error('创建段落卡片失败:', error)
  }
}

// 修改添加卡片的方法
const handleAddCard = async (targetCard: ManuscriptCard, position: 'before' | 'after') => {
  if (!manuscript.value) return

  try {
    // 计算新卡片的顺序
    const targetIndex = manuscript.value.cards.findIndex((card) => card.id === targetCard.id)
    const newOrder = position === 'before' ? targetIndex : targetIndex + 1

    // 创建新的段落卡片
    await writingDeskStore.addCard(
      manuscript.value.id,
      {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      },
      newOrder
    )

    // 重新加载文稿数据
    await writingDeskStore.loadManuscript(manuscript.value.id)
  } catch (error) {
    console.error('添加卡片失败:', error)
  }
}

// 滚动到顶部的方法
const scrollToTop = () => {
  if (!scrollContainerRef.value) {
    console.warn('scrollToTop: scrollContainerRef 不存在')
    return
  }

  // 先尝试直接滚动
  scrollContainerRef.value.scrollTop = 0

  // 再用异步方式确保滚动生效
  setTimeout(() => {
    nextTick(() => {
      requestAnimationFrame(() => {
        if (scrollContainerRef.value) {
          scrollContainerRef.value.scrollTop = 0
          console.log(
            'scrollToTop: 已滚动到顶部，当前滚动位置:',
            scrollContainerRef.value.scrollTop
          )
        }
      })
    })
  }, 50)
}

// 添加一个生命周期钩子来确保组件完全挂载后滚动
onMounted(() => {
  // 确保组件完全挂载后执行滚动
  nextTick(() => {
    scrollToTop()
  })
})

// 添加拖拽状态管理
const isDraggingOver = ref(false)
const currentDropIndex = ref(-1)

// 获取卡片索引的辅助函数
const getCardIndex = (cardId: string) => {
  return manuscript.value?.cards.findIndex((card) => card.id === cardId) || -1
}

// 修改处理拖拽悬停
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (!event.dataTransfer) return

  isDraggingOver.value = true
  event.dataTransfer.dropEffect = 'copy'

  // 获取鼠标位置
  const mouseY = event.clientY
  const cardElements = document.querySelectorAll('.card-wrapper')

  // 找到最近的插入位置
  let closestIndex = -1
  let minDistance = Infinity

  cardElements.forEach((element, index) => {
    const rect = element.getBoundingClientRect()
    const centerY = rect.top + rect.height / 2
    const distance = Math.abs(mouseY - centerY)

    if (distance < minDistance) {
      minDistance = distance
      closestIndex = mouseY < centerY ? index : index + 1
    }
  })

  // 如果是空列表，设置索引为0
  if (cardElements.length === 0) {
    closestIndex = 0
  }

  currentDropIndex.value = closestIndex
}

// 修改处理拖拽离开
const handleDragLeave = (event: DragEvent) => {
  // 确保真的离开了容器而不是进入了子元素
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()

  const { clientX, clientY } = event
  if (
    clientX <= rect.left ||
    clientX >= rect.right ||
    clientY <= rect.top ||
    clientY >= rect.bottom
  ) {
    isDraggingOver.value = false
    currentDropIndex.value = -1
  }
}

// 修改处理放置的方法
const handleDrop = async (event: DragEvent) => {
  event.preventDefault()
  if (!event.dataTransfer || !manuscript.value) return

  try {
    const data = event.dataTransfer.getData('application/json')
    const { id: noteId } = JSON.parse(data)

    if (!noteId) return

    const sourceNote = await noteStore.fetchNote(noteId)
    if (!sourceNote) {
      throw new Error('未找到源笔记')
    }

    // 创建新卡片
    await writingDeskStore.addCard(
      manuscript.value.id,
      sourceNote.content,
      currentDropIndex.value,
      noteId
    )

    // 重新加载文稿数据
    await writingDeskStore.loadManuscript(manuscript.value.id)
  } catch (error) {
    console.error('创建引用卡片失败:', error)
  } finally {
    isDraggingOver.value = false
    currentDropIndex.value = -1
  }
}

// 监听路由变化
watch(
  () => route.params.id,
  async (newId) => {
    if (newId) {
      try {
        await writingDeskStore.loadManuscript(newId as string)
        // 在路由变化时也确保滚动到顶部
        scrollToTop()
      } catch (error) {
        console.error('加载文稿失败:', error)
      }
    }
  }
)

// 处理初稿内容更新 - 简化处理
const handleFirstDraftContentUpdate = async (content: any) => {
  if (!manuscript.value) return

  try {
    // 直接更新内容，不需要额外的处理
    await writingDeskStore.updateManuscript({
      id: manuscript.value.id,
      firstDraftContent: content
    })
  } catch (error) {
    console.error('更新初稿内容失败:', error)
  }
}

// 生成初稿的方法
const handleGenerateFirstDraft = async () => {
  if (!manuscript.value || isGeneratingFirstDraft.value) return

  try {
    isGeneratingFirstDraft.value = true
    // 生成初稿
    await writingDeskStore.generateFirstDraft({
      id: manuscript.value.id
    })

    // 切换到初稿模式
    currentMode.value = 'first_draft'

    // 确保编辑器获得焦点
    nextTick(() => {
      if (firstDraftEditorRef.value) {
        firstDraftEditorRef.value.focus()
      }
    })
  } catch (error) {
    console.error('生成初稿失败:', error)
  } finally {
    isGeneratingFirstDraft.value = false
  }
}

// 添加深度思考的方法
const handleDeepThinking = async () => {
  if (!manuscript.value || isThinking.value) return

  try {
    isThinking.value = true
    // TODO: 实现深度思考功能
    console.log('深度思考功能待实现')
  } catch (error) {
    console.error('深度思考失败:', error)
  } finally {
    isThinking.value = false
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
            border: 1px solid var(--color-border);
            background-color: var(--color-bg-secondary);
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

      .first-draft-mode {
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

  .card-wrapper {
    position: relative;

    .drop-indicator {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: transparent;
      transition: all 0.2s ease;
      pointer-events: none;
      z-index: 10;

      &.top {
        top: -1px;
      }

      &.bottom {
        bottom: -1px;
      }

      &.active {
        height: 2px;
        background: var(--color-primary);
        box-shadow: 0 0 4px var(--color-primary);
      }
    }
  }
}
</style>
