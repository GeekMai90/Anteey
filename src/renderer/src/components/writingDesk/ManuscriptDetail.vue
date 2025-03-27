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
          name="edit-mode"
          tooltipPlacement="top"
        />
        <!-- 在草稿模式下添加视图切换按钮 -->
        <SegmentedButton
          v-if="currentMode === 'draft'"
          v-model="viewMode"
          :options="viewModeOptions"
          width="112px"
          name="view-mode"
          tooltipPlacement="top"
        />
        <!-- 修改历史记录按钮部分 -->
        <Dropdown
          v-if="['first_draft', 'polish'].includes(currentMode)"
          ref="historyButtonRef"
          :tooltip="{
            content: '历史记录',
            delay: { show: 500 },
            placement: 'top'
          }"
          class="history-button"
          type="default"
          :icon="History"
          :items="historyMenuItems"
          :width="200"
          :showSelected="false"
          @select="handleHistorySelect"
          @visible-change="handleHistoryVisibleChange"
        >
          历史记录
        </Dropdown>

        <!-- 修改模型设置按钮部分 -->
        <Dropdown
          v-if="currentMode !== 'polish'"
          ref="modelButtonRef"
          :tooltip="{
            content: '模型设置',
            delay: { show: 500 },
            placement: 'top'
          }"
          class="model-setting-button"
          type="default"
          icon-only
          align="end"
          :icon="Receiver"
          :items="modelMenuItems"
          :width="240"
          @select="handleModelSelect"
        >
          模型设置
        </Dropdown>

        <!-- 根据不同模式显示不同按钮 -->
        <Button
          v-if="currentMode === 'draft'"
          type="primary"
          :icon="WholeSiteAccelerator"
          :loading="isGeneratingFirstDraft"
          @click="handleGenerateFirstDraft"
        >
          串联成文
        </Button>
        <Button
          v-if="currentMode === 'first_draft'"
          type="primary"
          :icon="Magic"
          :loading="isPolishing"
          @click="handlePolish"
        >
          精雕细琢
        </Button>
        <Dropdown
          v-if="currentMode === 'polish'"
          type="primary"
          :icon="Download"
          :items="exportMenuItems"
          align="end"
          :tooltip="{
            content: '导出文稿',
            delay: { show: 500 },
            placement: 'top'
          }"
          @select="handleExportSelect"
        >
          导出文稿
        </Dropdown>
      </div>
    </div>

    <!-- 主要编辑区域 -->
    <div class="editor-container">
      <!-- 列表视图使用原有的content-wrapper -->
      <div v-if="currentMode === 'draft' && viewMode === 'list'" class="content-wrapper">
        <div class="draft-mode">
          <!-- 卡片缩略图导航栏 -->
          <CardThumbnailNavigator
            v-if="manuscript?.cards"
            v-model:cards="localCards"
            :selected-card-id="selectedCardId"
            @select-card="handleCardSelect"
          />

          <div
            ref="scrollContainerRef"
            class="writing-paper"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
          >
            <!-- 修改主卡片列表的绑定 -->
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
                  :group="{ name: 'cards' }"
                  @end="handleDragEnd"
                >
                  <template #item="{ element }">
                    <div :id="`card-${element.id}`" class="card-wrapper">
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
                  <div class="add-paragraph-button-icon">
                    <AddFour theme="outline" size="20" :strokeWidth="3" />
                  </div>
                  <span>添加段落</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 网格视图使用全宽布局 -->
      <div v-else-if="currentMode === 'draft' && viewMode === 'grid'" class="full-width-wrapper">
        <div class="draft-mode grid-view">
          <CardGridView
            v-if="manuscript?.cards?.length"
            v-model:cards="localCards"
            :selected-card-id="selectedCardId"
            :manuscript-id="manuscript?.id"
            @select-card="handleCardSelect"
            @add-card="createParagraphCard"
            @add-reference-card="handleAddReferenceCard"
            @delete-card="handleGridCardDelete"
          />

          <div v-else class="empty-grid-state" @click="createParagraphCard">
            <div class="empty-text">
              <AddFour theme="outline" size="32" :strokeWidth="3" />
              <span>点击创建第一个卡片</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 其他模式保持不变 -->
      <div v-else class="content-wrapper with-toc">
        <!-- 目录侧边栏 - 移到右侧 -->
        <div v-if="['first_draft', 'polish'].includes(currentMode)" class="first-draft-mode">
          <div ref="scrollContainerRef" class="editor-wrapper">
            <TipTapEditor
              ref="firstDraftEditorRef"
              :content="localFirstDraftContent"
              :note-id="manuscript?.id"
              :editable="true"
              :enable-drag-handle="true"
              @update:content="handleFirstDraftContentUpdate"
              @toc-update="handleTocUpdate"
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
              @toc-update="handleTocUpdate"
            />
          </div>
        </div>

        <!-- 目录侧边栏 - 移到右侧 -->
        <div
          v-if="['first_draft', 'polish'].includes(currentMode)"
          class="toc-sidebar"
          :class="{ 'is-collapsed': isSmallScreen && !showToc }"
        >
          <div class="toc-container">
            <TableOfContents :items="tocItems" :editor="getCurrentEditor" />
          </div>
        </div>

        <!-- 添加固定的切换按钮 -->
        <button
          v-if="['first_draft', 'polish'].includes(currentMode) && isSmallScreen"
          class="toc-toggle-fixed"
          :class="{ 'is-expanded': showToc }"
          :title="showToc ? '收起目录' : '展开目录'"
          @click="toggleToc"
        >
          <MenuFold v-if="showToc" theme="outline" size="16" />
          <MenuUnfold v-else theme="outline" size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  Edit,
  Magic,
  AddFour,
  History,
  Receiver,
  WholeSiteAccelerator,
  Copy,
  Download,
  MenuFold,
  MenuUnfold
} from '@icon-park/vue-next'
import { useWritingDeskStore } from '@renderer/stores/writingDeskStore'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useModelConfigStore } from '@renderer/stores/modelConfigStore'
import SegmentedButton from '@renderer/components/ui/SegmentedButton.vue'
import Button from '@renderer/components/ui/Button.vue'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import draggable from 'vuedraggable'
import ManuscriptContentCard from './ManuscriptContentCard.vue'
import { ManuscriptCard } from '@/shared/types'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'
import CardThumbnailNavigator from './CardThumbnailNavigator.vue'
import CardGridView from './CardGridView.vue'
import Dropdown from '@renderer/components/ui/Dropdown.vue'
import TableOfContents from '../toc/TableOfContents.vue'

// 使用路由获取参数
const route = useRoute()
const writingDeskStore = useWritingDeskStore()
const noteStore = useNoteStore()
const modelConfigStore = useModelConfigStore()
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
    label: '完成',
    tooltip: { content: '完成润色模式', delay: { show: 1000 } }
  }
]

// 添加视图模式选择
const viewMode = ref<'list' | 'grid'>('list')
const viewModeOptions = [
  {
    value: 'list',
    label: '列表',
    tooltip: { content: '列表视图', delay: { show: 500 } }
  },
  {
    value: 'grid',
    label: '网格',
    tooltip: { content: '网格视图', delay: { show: 500 } }
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

    // 同时预加载模型配置数据
    await modelConfigStore.loadConfigs()

    // 加载 AI 特性配置数据 - 修正方法名
    await writingDeskStore.fetchAllAIConfigs()

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

  // 确保组件完全挂载后执行滚动
  nextTick(() => {
    scrollToTop()
  })

  // 设置事件监听器
  document.addEventListener('click', handleDocumentClick)
})

// 监听模式切换
watch(currentMode, () => {
  // 等待一帧后再滚动到顶部
  requestAnimationFrame(() => {
    scrollToTop()
  })
})

// 监听视图模式变化
watch(viewMode, () => {
  // 视图模式变化时，可能需要调整某些布局或滚动位置
  nextTick(() => {
    if (viewMode.value === 'list') {
      // 切换到列表视图时的逻辑
      scrollToTop()
    } else {
      // 切换到网格视图时的逻辑
      // 如果需要特殊处理可以在这里添加
    }
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

// 添加选中卡片状态
const selectedCardId = ref<string>('')

// 添加历史记录相关的状态
const isHistoryMenuOpen = ref(false)
const historyMenuRef = ref<HTMLElement | null>(null)
const isLoadingHistory = ref(false)
const historyButtonRef = ref<ButtonComponent | null>(null)

// AI 配置相关
const modelMenuItems = computed(() => {
  return modelConfigs.value.map((config) => ({
    label: config.name,
    key: config.id,
    // 添加选中状态标记
    active: getCurrentFeatureConfig.value?.modelConfigId === config.id
  }))
})

// 获取当前功能的模型配置
const getCurrentFeatureConfig = computed(() => {
  let featureType: 'firstDraft' | 'polish' | 'deepThinking' = 'firstDraft' // 默认值

  if (currentMode.value === 'draft') {
    featureType = 'firstDraft' // 草稿模式使用初稿生成功能的模型
  } else if (currentMode.value === 'first_draft') {
    featureType = 'polish' // 初稿模式使用润色文章功能的模型
  } else if (currentMode.value === 'polish') {
    featureType = 'deepThinking' // 终稿模式使用深度思考功能的模型
  }

  return writingDeskStore.aiConfigs.find((config) => config.featureType === featureType)
})

// 格式化日期的函数
const formatDate = (date: Date) => {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

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
  // 不需要额外处理，因为 v-model 会自动触发 set 函数
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

// 处理卡片选择
const handleCardSelect = (cardId: string) => {
  selectedCardId.value = cardId

  // 滚动到选中的卡片
  nextTick(() => {
    const cardElement = document.getElementById(`card-${cardId}`)
    const container = scrollContainerRef.value
    if (!cardElement || !container) return

    // 获取卡片相对于容器的顶部偏移量
    const cardTop = cardElement.offsetTop - container.offsetTop

    // 添加一些上边距，让卡片位置更合适
    const scrollPadding = 32 // 与 writing-paper 的 padding 一致

    // 直接滚动到卡片顶部位置
    container.scrollTo({
      top: cardTop - scrollPadding,
      behavior: 'smooth'
    })

    // 添加高亮效果
    cardElement.classList.add('highlight')
    setTimeout(() => {
      cardElement.classList.remove('highlight')
    }, 2000)
  })
}

// 修改本地卡片数据
const localCards = computed({
  get: () => manuscript.value?.cards || [],
  set: async (newCards) => {
    if (!manuscript.value) return

    try {
      // 将卡片数据转换为普通对象，只保留必要的字段
      const plainCards = newCards.map((card, index) => ({
        id: card.id,
        type: card.type,
        content: JSON.parse(JSON.stringify(card.content)), // 深拷贝内容
        order: index,
        noteId: card.noteId,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt
      }))

      await writingDeskStore.updateManuscriptCardsOrder({
        manuscriptId: manuscript.value.id,
        cards: plainCards
      })

      // 重新加载数据以确保同步
      await writingDeskStore.loadManuscript(manuscript.value.id)
    } catch (error) {
      console.error('更新卡片顺序失败:', error)
    }
  }
})

// 从网格视图中删除卡片的处理
const handleGridCardDelete = async (cardId: string) => {
  if (!manuscript.value) return

  try {
    await writingDeskStore.deleteCard(cardId)
    // 重新加载文稿数据
    await writingDeskStore.loadManuscript(manuscript.value.id)
  } catch (error) {
    console.error('删除卡片失败:', error)
  }
}

// 处理添加引用卡片
const handleAddReferenceCard = async (noteId: string, order: number) => {
  if (!manuscript.value) return

  try {
    console.log('从卡片盒添加引用卡片', noteId, order)
    const sourceNote = await noteStore.fetchNote(noteId)
    if (!sourceNote) {
      throw new Error('未找到源笔记')
    }

    // 创建新卡片
    await writingDeskStore.addCard(manuscript.value.id, sourceNote.content, order, noteId)

    // 重新加载文稿数据
    await writingDeskStore.loadManuscript(manuscript.value.id)
  } catch (error) {
    console.error('创建引用卡片失败:', error)
  }
}

// 添加历史菜单项的计算属性
const historyMenuItems = computed(() => {
  const history =
    currentMode.value === 'first_draft'
      ? writingDeskStore.firstDraftHistory
      : writingDeskStore.polishHistory

  if (isLoadingHistory.value) {
    return [
      {
        label: '加载中...',
        key: 'loading',
        disabled: true
      }
    ]
  }

  if (!history.length) {
    return [
      {
        label: '暂无历史记录',
        key: 'empty',
        disabled: true
      }
    ]
  }

  return history.map((item) => ({
    label: `${formatDate(item.createdAt)}`,
    key: item.id
  }))
})

// 修改历史记录相关的处理方法
const handleHistoryVisibleChange = async (visible: boolean) => {
  if (visible) {
    isLoadingHistory.value = true
    try {
      if (currentMode.value === 'first_draft') {
        await writingDeskStore.getFirstDraftHistory(manuscript.value!.id)
      } else if (currentMode.value === 'polish') {
        await writingDeskStore.getPolishHistory(manuscript.value!.id)
      }
    } catch (error) {
      console.error('加载历史记录失败:', error)
    } finally {
      isLoadingHistory.value = false
    }
  }
}

const handleHistorySelect = async (historyId: string) => {
  if (!manuscript.value) return

  try {
    if (currentMode.value === 'first_draft') {
      await writingDeskStore.restoreFirstDraftHistory(manuscript.value.id, historyId)
    } else if (currentMode.value === 'polish') {
      await writingDeskStore.restorePolishHistory(manuscript.value.id, historyId)
    }
  } catch (error) {
    console.error('恢复历史版本失败:', error)
  }
}

// 重新定义类型
interface ButtonComponent extends HTMLElement {
  $el: HTMLElement
  buttonRef?: {
    value: HTMLElement | null
  }
}

// 添加点击外部关闭菜单的处理
const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as Element

  // 处理历史菜单
  if (isHistoryMenuOpen.value && historyMenuRef.value) {
    // 检查点击是否在菜单内
    const clickInMenu = historyMenuRef.value.contains(target)

    // 检查点击是否在历史按钮上或其内部
    const clickOnHistoryButton = target.closest('.history-button') !== null

    // 如果既不在菜单内也不在按钮上，则关闭菜单
    if (!clickInMenu && !clickOnHistoryButton) {
      isHistoryMenuOpen.value = false
    }
  }
}

// 在 onMounted 中设置文档点击监听
onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

// 在 onUnmounted 中移除监听器
onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})

// 添加 modelConfigs 计算属性
const modelConfigs = computed(() => modelConfigStore.configs)

// 修改 handleModelSelect 方法
const handleModelSelect = async (modelConfigId: string) => {
  try {
    let featureType: 'firstDraft' | 'polish' = 'firstDraft'

    if (currentMode.value === 'draft') {
      featureType = 'firstDraft'
    } else if (currentMode.value === 'first_draft') {
      featureType = 'polish'
    }

    await writingDeskStore.updateAIConfig(featureType, modelConfigId)
  } catch (error) {
    console.error('更新模型配置失败:', error)
  }
}

// 添加导出菜单项的计算属性
const exportMenuItems = computed(() => [
  {
    label: '复制为 Markdown',
    key: 'copy',
    icon: Copy
  },
  {
    label: '导出为 Markdown 文件',
    key: 'export',
    icon: Download
  }
])

// 添加处理导出选项的方法
const handleExportSelect = async (key: string) => {
  if (!manuscript.value) return

  try {
    if (key === 'copy') {
      // 复制到剪贴板
      const message = await writingDeskStore.copyPolishedManuscript(manuscript.value.id)
      // TODO: 显示成功提示
      console.log(message)
    } else if (key === 'export') {
      // 导出为文件
      const result = await writingDeskStore.exportPolishedManuscript(manuscript.value.id)
      // TODO: 显示成功提示
      console.log(`文件已导出到: ${result.filePath}`)
    }
  } catch (error) {
    console.error('导出操作失败:', error)
    // TODO: 显示错误提示
  }
}

// 修改目录项的类型定义
interface TocItem {
  id: string
  level: number
  textContent: string
  itemIndex: number
  isActive: boolean
  isScrolledOver: boolean
}

// 修改目录相关的状态
const tocItems = ref<TocItem[]>([])

// 处理目录更新，确保 itemIndex 始终是数字
const handleTocUpdate = (items: any[]) => {
  // 确保 itemIndex 是数字类型
  tocItems.value = items.map((item) => ({
    ...item,
    itemIndex: typeof item.itemIndex === 'string' ? parseInt(item.itemIndex, 10) : item.itemIndex
  }))
}

// 获取当前编辑器实例
const getCurrentEditor = computed(() => {
  if (currentMode.value === 'first_draft') {
    return firstDraftEditorRef.value?.editor || null
  } else if (currentMode.value === 'polish') {
    return polishEditorRef.value?.editor || null
  }
  return null
})

// 添加响应式状态
const isSmallScreen = ref(false)
const showToc = ref(true)

// 检查屏幕宽度的函数
const checkScreenSize = () => {
  isSmallScreen.value = window.innerWidth < 1200
  // 在小屏幕下默认收起目录
  if (isSmallScreen.value) {
    showToc.value = false
  }
}

// 切换目录显示状态
const toggleToc = () => {
  showToc.value = !showToc.value
}

// 监听窗口大小变化
onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})
</script>

<style lang="scss" scoped>
.manuscript-detail {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);

  .toolbar {
    padding: 0 20px 10px 20px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--color-bg-primary);
    height: 52px;

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

          &:hover {
            background: var(--color-hover-bg);
            opacity: 1;
          }
        }
        input {
          border-radius: 0 !important;
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
    margin-bottom: 20px;

    .content-wrapper {
      width: 100%;
      max-width: 950px;
      height: 100%;
      padding: 0 20px;

      .draft-mode {
        height: 100%;
        padding: 24px 0;
        display: flex;
        gap: 16px;

        // 网格视图时使用不同的布局
        &.grid-view {
          display: block;
          max-width: 100%;
          margin: 0 auto;
          width: calc(100vw - 40px); // 左右各留20px边距
        }

        .writing-paper {
          height: 100%;
          background: var(--color-bg-secondary);
          border-radius: 12px;
          padding: 22px;
          overflow-y: auto;
          flex: 1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

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
              gap: 6px;
              padding: 12px;
              margin: 16px 0;
              border: 1px dashed var(--color-border);
              border-radius: 8px;
              color: var(--color-text-secondary);
              cursor: pointer;
              transition: all 0.2s ease;

              .add-paragraph-button-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
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
        display: flex;
        justify-content: center;

        .editor-wrapper {
          width: 100%;
          max-width: 800px;
          height: 100%;
          // background: var(--color-bg-secondary);
          border-radius: 12px;
          padding: 10px 32px;
          overflow-y: auto;

          // :deep(.tiptap) {
          //   min-height: 100%;
          //   outline: none;

          //   h1,
          //   h2,
          //   h3,
          //   h4,
          //   h5,
          //   h6 {
          //     margin-top: 1.5em;
          //     margin-bottom: 0.5em;
          //   }

          //   p {
          //     line-height: 1.6;
          //     margin-bottom: 1em;
          //   }
          // }
        }
      }

      .polish-mode {
        height: 100%;
        padding: 24px 0;
        display: flex;
        justify-content: center;

        .editor-wrapper {
          width: 100%;
          max-width: 800px;
          height: 100%;
          // background: var(--color-bg-secondary);
          border-radius: 12px;
          padding: 10px 32px;
          overflow-y: auto;

          // :deep(.tiptap) {
          //   min-height: 100%;
          //   outline: none;

          //   h1,
          //   h2,
          //   h3,
          //   h4,
          //   h5,
          //   h6 {
          //     margin-top: 1.5em;
          //     margin-bottom: 0.5em;
          //   }

          //   p {
          //     line-height: 1.6;
          //     margin-bottom: 1em;
          //   }
          // }
        }
      }

      &.with-toc {
        position: relative;
        display: flex;
        gap: 24px;
        max-width: 1200px;

        .toc-sidebar {
          width: 240px;
          flex-shrink: 0;
          position: relative;
          transition: all 0.3s ease;

          &.is-collapsed {
            position: absolute;
            right: 0;
            transform: translateX(100%);
            margin-right: 0;

            .toc-toggle {
              left: -32px;
              background: var(--color-primary);
              color: white;
              border-color: var(--color-primary);

              &:hover {
                background: var(--color-primary-dark);
              }
            }
          }

          @media screen and (max-width: 1200px) {
            position: fixed;
            right: 0;
            top: 0;
            height: 100vh;
            z-index: 100;
            padding: 24px 0;

            .toc-container {
              height: 100%;
              border-radius: 0;
              border-right: none;
              border-top: none;
              border-bottom: none;
            }
          }

          .toc-container {
            position: sticky;
            top: 24px;
            max-height: calc(100vh - 180px);
            overflow-y: auto;
          }
        }

        .first-draft-mode,
        .polish-mode {
          flex: 1;
          min-width: 0;

          @media screen and (max-width: 1200px) {
            width: 100%;

            .editor-wrapper {
              max-width: 100%;
            }
          }
        }

        @media screen and (max-width: 1200px) {
          max-width: 100%;
          padding: 0 16px;
        }

        .toc-toggle-fixed {
          position: fixed;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 24px;
          height: 48px;
          border-radius: 24px 0 0 24px;
          background: var(--color-primary);
          border: none;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 101;
          transition: all 0.3s ease;
          padding: 0;

          &:hover {
            background: var(--color-primary-dark);
            width: 28px;
          }

          &.is-expanded {
            right: 240px;
            background: var(--color-bg-secondary);
            color: var(--color-text-secondary);
            border: 1px solid var(--color-border);
            border-right: none;

            &:hover {
              background: var(--color-hover-bg);
              color: var(--color-primary);
            }
          }
        }
      }
    }

    .full-width-wrapper {
      width: 100%;
      height: 100%;
      padding: 0 24px;

      .draft-mode.grid-view {
        height: 100%;
        padding: 24px 0;
        background: var(--color-bg-primary);
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

  .empty-grid-state {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px dashed var(--color-border);
    border-radius: 12px;
    background: var(--color-bg-secondary);
    margin: 24px 0;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--color-primary);
      background: var(--color-hover-bg);
    }

    .empty-text {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: var(--color-text-secondary);
      font-size: 16px;

      &:hover {
        color: var(--color-primary);
      }
    }
  }
}

.fade-zoom-enter-active,
.fade-zoom-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-zoom-enter-from,
.fade-zoom-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.fade-zoom-enter-to,
.fade-zoom-leave-from {
  opacity: 1;
  transform: scale(1);
}

.history-menu,
.model-menu {
  background-color: var(--color-bg-secondary);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
  min-width: 300px;
  max-width: 350px;

  .history-menu-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border);
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .history-menu-content {
    max-height: 400px;
    overflow-y: auto;

    .loading-state {
      padding: 16px;
      text-align: center;
      color: var(--color-text-secondary);
    }

    .history-item {
      padding: 12px 16px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: var(--color-hover-bg);
      }

      .history-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;

        .history-date {
          color: var(--color-text-primary);
          font-size: 14px;
        }

        .history-style {
          color: var(--color-text-secondary);
          font-size: 12px;
        }
      }
    }

    .empty-history {
      padding: 16px;
      text-align: center;
      color: var(--color-text-secondary);
    }
  }
}

.model-menu {
  .model-menu-content {
    max-height: 400px;
    overflow-y: auto;

    .loading-state {
      padding: 16px;
      text-align: center;
      color: var(--color-text-secondary);
    }

    .model-item {
      padding: 12px 16px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: var(--color-hover-bg);
      }

      &.active {
        background: var(--color-primary-light);
        color: var(--color-primary);
      }

      .model-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;

        .model-name {
          color: var(--color-text-primary);
          font-size: 14px;
        }

        .model-provider {
          color: var(--color-text-secondary);
          font-size: 12px;
        }
      }
    }

    .empty-models {
      padding: 16px;
      text-align: center;
      color: var(--color-text-secondary);
    }
  }
}
</style>
