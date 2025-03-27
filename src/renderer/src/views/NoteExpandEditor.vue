<!-- src/views/NoteExpandEditor.vue -->
<!-- 笔记展开编辑器组件 - 用于编辑单个笔记的主要界面 -->
<template>
  <div class="note-expand-editor">
    <!-- 固定区域：包含工具栏和编码地址 -->
    <div ref="fixedHeaderRef" class="fixed-header">
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="editor-header">
        <!-- 地址输入区域 -->
        <div class="address-input">
          <div
            ref="indicatorButton"
            class="note-indicator"
            :class="cardTypeClass"
            @click="(e: any) => toggleCardTypeMenu(e)"
          ></div>
          <CardTypeDropdownMenu
            ref="cardTypeDropdownMenuRef"
            :is-open="cardTypeMenuState.isOpen"
            :position="cardTypeMenuState.position"
            :current-card-type="currentNote?.cardType"
            @close="closeCardTypeMenu"
            @select="handleCardTypeSelect"
          />
          <input
            v-if="currentNote"
            ref="addressInput"
            v-model="localAddress"
            type="text"
            placeholder="输入编码地址"
            @input="handleAddressInput"
            @keydown.enter="handleAddressEnter"
            @compositionstart="handleCompositionStart"
            @compositionend="handleCompositionEnd"
          />
        </div>
        <!-- 右侧工具栏 -->
        <div class="toolbar-right">
          <!-- 随机回顾按钮 -->
          <div
            v-tooltip.bottom="{ content: '随机回顾', delay: { show: 1000 } }"
            class="review-btn"
            :class="{ active: isReviewMode }"
            @click="toggleReviewMode"
          >
            <div class="icon">
              <Cup
                theme="outline"
                size="18"
                :fill="isReviewMode ? 'var(--color-primary)' : 'var(--color-icon-default)'"
                :strokeWidth="3"
              />
            </div>
          </div>

          <!-- AI按钮 -->
          <AIButton v-if="currentNote" :note-id="currentNote.id" size="large" />

          <!-- 卡片盒设置按钮 -->
          <CardboxButton
            v-if="currentNote"
            :note-id="currentNote.id"
            :current-cardbox-id="currentNote.cardBoxId"
            size="large"
          />

          <!-- 更多按钮 -->
          <MoreButton
            v-if="currentNote"
            :note-id="currentNote.id"
            size="large"
            :menu-items="[
              'star',
              'convertToFlashcard',
              'sidebar',
              'copyQuote',
              'historyVersion',
              'share',
              'exportNote',
              'delete'
            ]"
          />
        </div>
      </div>
      <!-- 时间戳 -->
      <div v-if="currentNote" class="note-timestamp">
        {{ formatDate(currentNote.createdAt) }}
      </div>
    </div>

    <!-- 可滚动的内容区域 -->
    <div class="scrollable-content">
      <div class="editor-content">
        <!-- 使用 transition-group 包裹按钮 -->
        <transition-group name="review-nav" tag="div" class="review-nav-container">
          <template v-if="isReviewMode">
            <div class="review-nav-buttons">
              <template v-if="reviewStore.enableMarioStyle">
                <MarioLeftButton
                  class="nav-btn mario-prev"
                  :model-value="isReviewMode"
                  label="上一条笔记"
                  @click="handlePrevNote"
                />
              </template>
              <template v-else>
                <DoubleArrowButton
                  class="nav-btn prev"
                  :model-value="isReviewMode"
                  label="上一条笔记"
                  @click="handlePrevNote"
                />
              </template>
              <template v-if="reviewStore.enableMarioStyle">
                <MarioQuestionBox
                  class="nav-btn mario-next"
                  :model-value="isReviewMode"
                  label="下一条笔记"
                  @click="handleNextNote"
                />
              </template>
              <template v-else>
                <DoubleArrowButton
                  class="nav-btn arrow-next"
                  :model-value="isReviewMode"
                  label="下一条笔记"
                  @click="handleNextNote"
                />
              </template>
            </div>
          </template>
        </transition-group>
        <div class="content-container">
          <div class="editor-area">
            <TipTapEditor
              v-if="currentNote"
              ref="tiptapEditor"
              v-model:content="currentNote.content"
              :note-id="currentNote.id"
              :editable="true"
              :enableDragHandle="true"
              @update:content="handleContentUpdate"
            />

            <!-- 添加字数统计组件 -->
            <div
              v-if="tiptapEditor && uiStore.editorSettings.showCharacterCount"
              class="character-count"
              :class="{
                'character-count--warning': characterCount >= characterLimit && characterLimit > 0
              }"
            >
              <svg height="20" width="20" viewBox="0 0 20 20">
                <circle r="10" cx="10" cy="10" fill="var(--color-bg-tertiary)" />
                <circle
                  r="5"
                  cx="10"
                  cy="10"
                  fill="transparent"
                  stroke="currentColor"
                  stroke-width="10"
                  :stroke-dasharray="`calc(${percentage > 100 ? 100 : percentage} * 31.4 / 100) 31.4`"
                  transform="rotate(-90) translate(-20)"
                />
                <circle r="6" cx="10" cy="10" fill="var(--color-bg-primary)" />
              </svg>
              <div class="count-text">
                <span v-if="characterLimit > 0"
                  >{{ characterCount }} / {{ characterLimit }} 字</span
                >
                <span v-else>{{ characterCount }} 字</span>
              </div>
            </div>
          </div>
          <div class="backlinks-area">
            <BacklinksPanel
              v-if="currentNote"
              :note-id="currentNote.id"
              :references="currentNote.references"
              @refresh="refreshNoteData"
            />
          </div>
          <TagsPanel
            v-if="currentNote"
            :note-id="currentNote.id"
            :tags="noteTags"
            @refresh="refreshNoteData"
          />
          <GraphPanel v-if="currentNote" :note-id="currentNote.id" />
          <MindEchoPanel v-if="currentNote" :note-id="currentNote.id" class="mind-echo-panel" />
        </div>
      </div>
    </div>
    <NoteVersionModal
      v-if="currentNote"
      v-model="versionStore.isVersionModalOpen"
      :note-id="currentNote.id"
      @version-restored="handleVersionRestored"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick, onBeforeUnmount, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { useNoteStore } from '@renderer/stores/noteStore'
import { formatDate } from '@renderer/utils/noteHelpers'
import { Cup } from '@icon-park/vue-next'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import CardTypeDropdownMenu from '@renderer/components/note/CardTypeDropdownMenu.vue'
import { message } from '@renderer/utils/message'
import { useMenu } from '@renderer/composables/useMenu'
import BacklinksPanel from '@renderer/components/note/BacklinksPanel.vue'
import { CardType, Note } from '@shared/types'
import { debounce } from 'lodash-es'
// import { EditorState } from '@tiptap/pm/state/dist'
import TagsPanel from '@renderer/components/note/TagsPanel.vue'
import { useTagStore } from '@renderer/stores/tagStore'
import GraphPanel from '@renderer/components/note/GraphPanel.vue'
import NoteVersionModal from '@renderer/components/note/NoteVersionModal.vue'
import { useNoteVersionStore } from '@renderer/stores/noteVersionStore'
import { useReviewStore } from '@renderer/stores/reviewStore'
import { useReviewModeStore } from '@renderer/stores/reviewModeStore'
import MarioQuestionBox from '@renderer/components/ui/MarioQuestionBox.vue'
import DoubleArrowButton from '@renderer/components/ui/DoubleArrowButton.vue'
import MarioLeftButton from '@renderer/components/ui/MarioLeftButton.vue'
import * as d3 from 'd3'
import { useUIStore } from '../stores/UIStore'
// === 组件状态管理 ===
const tiptapEditor = ref<any>(null)
const route = useRoute()
const router = useRouter()
const noteStore = useNoteStore()
const noteId = route.params.id as string
const addressInput = ref<HTMLInputElement | null>(null)
const currentNote = ref<Note | null>(null)
const fixedHeaderRef = ref<HTMLElement | null>(null)
const reviewStore = useReviewStore()
const uiStore = useUIStore()

// 添加计算 header 高度的方法
const updateHeaderHeight = () => {
  if (fixedHeaderRef.value) {
    const height = fixedHeaderRef.value.offsetHeight
    document.documentElement.style.setProperty('--header-height', `${height}px`)
  }
}

// 在组件挂载和更新时计算 header 高度
onMounted(() => {
  updateHeaderHeight()
  window.addEventListener('resize', updateHeaderHeight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateHeaderHeight)
})

// 1. 添加一个 ref 来存储笔记的标签
const noteTags = ref<{ id: string; name: string }[]>([])

const tagStore = useTagStore()

const versionStore = useNoteVersionStore()

// 添加版本创建的状态控制
const lastVersionTime = ref<Date | null>(null)
const VERSION_INTERVAL = 5 * 60 * 1000 // 5分钟

// 创建版本的方法
const createVersion = async () => {
  if (!currentNote.value) return

  // 检查是否达到创建间隔
  const now = new Date()
  if (lastVersionTime.value && now.getTime() - lastVersionTime.value.getTime() < VERSION_INTERVAL) {
    return
  }

  const safeContent = JSON.parse(JSON.stringify(currentNote.value.content))

  try {
    await window.electronAPI.noteVersion.createNoteVersion({
      noteId: currentNote.value.id,
      content: safeContent,
      address: currentNote.value.address,
      cardType: currentNote.value.cardType,
      createdAt: currentNote.value.createdAt
    })
    lastVersionTime.value = now
  } catch (error) {
    console.error('创建版本失败:', error)
  }
}

// 处理版本恢复后的回调
const handleVersionRestored = async () => {
  // 刷新笔记数据
  await refreshNoteData()
  message.success('笔记已恢复到选定版本')
}

// 2. 添加获取笔记标签的方法
const fetchNoteTags = async (noteId: string) => {
  try {
    const tags = await tagStore.getNoteTags(noteId) // 需要在 noteStore 中添加这个方法
    noteTags.value = tags
  } catch (error) {
    console.error('获取笔记标签失败:', error)
    message.error('获取笔记标签失败')
  }
}

// 初始化笔记数据
const initializeNote = async (noteId: string) => {
  try {
    const note = await noteStore.fetchNote(noteId)
    if (note) {
      currentNote.value = note
      await fetchNoteTags(noteId) // 获取笔记的标签
      noteStore.currentNoteId = noteId

      focusEditor()
    } else {
      message.error('笔记不存在')
    }
  } catch (error) {
    console.error('加载笔记失败:', error)
    message.error('加载笔记失败')
  }
}
// 组件挂载时加载笔记
onMounted(() => {
  const noteId = route.params.id
  if (noteId && typeof noteId === 'string') {
    initializeNote(noteId)
  }
})
// 监听路由参数变化，重新加载笔记
watch(
  () => route.params.id,
  (newId) => {
    if (newId && typeof newId === 'string') {
      initializeNote(newId)
    }
  }
)

// === 生命周期钩子 ===

// 刷新笔记数据
const refreshNoteData = async () => {
  try {
    // 检查 currentNote.value 和 id 是否存在
    if (!currentNote.value?.id) {
      return
    }
    const updatedNote = await noteStore.fetchNote(currentNote.value.id)
    if (updatedNote) {
      currentNote.value = updatedNote
      await fetchNoteTags(updatedNote.id) // 刷新标签
    }
  } catch (error) {
    console.error('刷新笔记数据失败:', error)
    message.error('刷新笔记数据失败')
  }
}

// === 地址输入处理 ===
// 使用本地状态来管理输入
const localAddress = ref('')
const isComposing = ref(false)

// 监听 currentNote 的变化，同步初始地址
watch(
  () => currentNote.value?.address,
  (newAddress) => {
    if (newAddress !== undefined) {
      localAddress.value = newAddress
    }
  },
  { immediate: true }
)

// 使用防抖处理地址更新
const updateAddress = debounce(async (address: string) => {
  if (!currentNote.value) return

  try {
    console.log('NoteExpandEditor.vue→ 更新笔记地址:', { noteId: currentNote.value.id, address })
    // 直接更新数据库
    await noteStore.updateNoteAddress(currentNote.value.id, address)
    // 更新本地状态
    if (currentNote.value) {
      currentNote.value.address = address
    }
  } catch (error) {
    console.error('更新地址失败:', error)
    message.error('更新地址失败')
    // 只在出错时回滚
    localAddress.value = currentNote.value?.address || ''
  }
}, 1000)

// 处理地址输入
const handleAddressInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const newValue = input.value

  // 直接更新本地状态
  localAddress.value = newValue

  // 如果不是在输入法编辑状态，则触发更新
  if (!isComposing.value) {
    updateAddress(newValue)
  }
}

// 处理输入法开始
const handleCompositionStart = () => {
  isComposing.value = true
}

// 处理输入法结束
const handleCompositionEnd = (event: CompositionEvent) => {
  isComposing.value = false
  // 在输入法结束后，手动触发一次更新
  const input = event.target as HTMLInputElement
  updateAddress(input.value)
}

// 处理回车键
const handleAddressEnter = (event: KeyboardEvent) => {
  // 如果正在输入法输入中，不做任何处理
  if (isComposing.value) {
    return
  }

  event.preventDefault()
  // 强制执行一次更新
  updateAddress.flush()
  focusEditor()
}

// === 内容更新处理 ===
// 使用防抖保存内容
const saveContent = debounce(
  async (noteId: string, content: any) => {
    try {
      await noteStore.updateNoteContent(noteId, content)
    } catch (error) {
      console.error('保存笔记失败:', error)
      message.error('保存失败')
    }
  },
  2000,
  { trailing: true }
)

// 处理编辑器内容更新
const handleContentUpdate = async (newContent: any) => {
  if (!currentNote.value) return

  try {
    // 确保内容是可序列化的
    const safeContent = JSON.parse(JSON.stringify(newContent))

    // 更新本地状态
    currentNote.value.content = safeContent

    // 触发防抖保存
    saveContent(currentNote.value.id, safeContent)
    // 处理版本创建
    await createVersion()
  } catch (error) {
    console.error('Content serialization error:', error)
  }
}

// === 尝试一下增加新的保存功能 ===
// 保存当前笔记内容的通用函数
const saveCurrentNote = async () => {
  if (!currentNote.value) return

  try {
    // 立即执行所有待保存的内容
    saveContent.flush()

    const editor = tiptapEditor.value?.editor
    if (editor) {
      const content = editor.getJSON()
      // 使用和 saveContent 相同的方式处理内容
      const safeContent = JSON.parse(JSON.stringify(content))
      await noteStore.updateNoteContent(currentNote.value.id, safeContent)
    }
  } catch (error) {
    console.error('保存笔记失败:', error)
    message.error('saveCurrentNote保存失败')
    throw error
  }
}

// 路由离开前保存
onBeforeRouteLeave(async (_to, _from, next) => {
  try {
    await saveCurrentNote()
    // 清理图谱组件
    const svgElements = document.querySelectorAll('.tree-graph')
    svgElements.forEach((svg) => {
      d3.select(svg).selectAll('*').remove()
    })
    next()
  } catch (error) {
    // 可以选择是否阻止路由切换
    // next(false) // 阻止路由切换
    next() // 继续路由切换
  }
})

// 路由更新前保存
onBeforeRouteUpdate(async (to, from, next) => {
  try {
    if (from.params.id !== to.params.id) {
      await saveCurrentNote()
    }
    next()
  } catch (error) {
    next()
  }
})

// 在组件卸载前确保所有待保存的内容都已保存
onBeforeUnmount(() => {
  saveContent.flush()
  // 添加到最近笔记
  noteStore.addToRecentNotes(noteId)
  // 清理图谱组件
  const svgElements = document.querySelectorAll('.tree-graph')
  svgElements.forEach((svg) => {
    d3.select(svg).selectAll('*').remove()
  })
})

// === 卡片类型菜单管理 ===
const indicatorButton = ref<HTMLElement | null>(null)
const cardTypeDropdownMenuRef = ref<HTMLElement | null>(null)

// 使用 useMenu 时传入正确的类型
const {
  menuState: cardTypeMenuState,
  toggleMenu: toggleCardTypeMenu,
  closeMenu: closeCardTypeMenu
} = useMenu({
  buttonRef: indicatorButton, // 直接传入 ref
  menuRef: cardTypeDropdownMenuRef,
  onClose: () => {
    console.log('卡片类型菜单已关闭')
  }
})

// 卡片类型，根据当前笔记的卡片类型设置样式
const cardTypeClass = computed(() => ({
  maincard: currentNote.value?.cardType === 'Maincard',
  bibcard: currentNote.value?.cardType === 'Bibcard',
  indexcard: currentNote.value?.cardType === 'Indexcard',
  hoplinkcard: currentNote.value?.cardType === 'Hoplinkcard',
  draftcard: currentNote.value?.cardType === 'Draftcard'
}))

// 处理卡片类型选择和更新
const handleCardTypeSelect = async (newType: string) => {
  if (currentNote.value) {
    currentNote.value.cardType = newType as CardType
    try {
      await noteStore.updateNoteCardType(noteId, newType as CardType)
      closeCardTypeMenu()
    } catch (error) {
      console.error('更新卡片类型失败:', error)
      message.error('更新卡片类型失败')
    }
  }
}

// === 辅助函数 ===
// 聚焦编辑器
const focusEditor = () => {
  nextTick(() => {
    tiptapEditor.value?.focus('start')
  })
}

// 路由离开时创建版本
onBeforeRouteLeave(async (_to, _from, next) => {
  if (currentNote.value) {
    await createVersion()
  }
  next()
})

// 页面关闭时创建版本
onBeforeUnmount(async () => {
  if (currentNote.value) {
    await createVersion()
  }
})

// 使用 store 管理状态
const reviewModeStore = useReviewModeStore()
const isReviewMode = computed({
  get: () => reviewModeStore.isReviewMode,
  set: (value) => {
    reviewModeStore.setReviewMode(value)
  }
})

// 监听路由参数变化
watch(
  () => route.query.review,
  (newValue) => {
    // 同步路由参数到状态
    reviewModeStore.setReviewMode(newValue === 'true')
  },
  { immediate: true } // 确保组件加载时就执行一次
)

// 切换随机回顾模式
const toggleReviewMode = () => {
  noteStore.isReviewMode = !noteStore.isReviewMode
  const newValue = !reviewModeStore.isReviewMode

  // 先更新路由
  router
    .replace({
      query: {
        ...route.query,
        review: newValue.toString()
      }
    })
    .then(() => {
      // 路由更新后再更新状态
      reviewModeStore.setReviewMode(newValue)
    })
}

// 处理上一条笔记
const handlePrevNote = async () => {
  try {
    const prevNote = await reviewStore.fetchPreviousNote()
    if (prevNote) {
      router.push({
        name: 'NoteExpandEditor',
        params: { id: prevNote.id },
        query: { review: 'true' }
      })
    } else {
      message.info('没有更多历史记录')
    }
  } catch (error) {
    console.error('获取上一条笔记失败:', error)
    message.error('获取上一条笔记失败')
  }
}

// 添加节流控制
let isLoading = false
const CLICK_INTERVAL = 2000 // 5秒间隔

const handleNextNote = async () => {
  // 检查是否在加载中
  if (isLoading) return

  // 检查点击间隔
  const now = Date.now()
  if (now - reviewStore.lastClickTime < CLICK_INTERVAL) {
    message.info('你太快啦，请等待2秒后再试~')
    return
  }

  try {
    isLoading = true
    reviewStore.updateLastClickTime(now) // 更新存储在 store 中的时间

    const nextNote = await reviewStore.fetchRandomNote()
    if (nextNote) {
      router.push({
        name: 'NoteExpandEditor',
        params: { id: nextNote.id },
        query: { review: 'true' }
      })
    }
  } catch (error: any) {
    if (error.message === '操作太频繁，请稍后再试') {
      message.info('请不要太快点击哦~')
    } else {
      console.error('获取下一条笔记失败:', error)
    }
  } finally {
    setTimeout(() => {
      isLoading = false
    }, 300)
  }
}

// 添加键盘事件处理
const handleKeydown = (e: KeyboardEvent) => {
  if (!reviewModeStore.isReviewMode) return

  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    handlePrevNote()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    handleNextNote()
  }
}

// 监听键盘事件
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  // 组件卸载时移除键盘事件监听
  window.removeEventListener('keydown', handleKeydown)
  // 组件卸载前更新向量
  //noteStore.updateNoteVectorOnClose(noteId, tiptapEditor.value?.editor?.getJSON())
})

// 添加字数统计相关的计算属性
const characterCount = computed(() => tiptapEditor.value?.characterCount || 0)
const characterLimit = computed(() => tiptapEditor.value?.characterLimit || 500)
const percentage = computed(() => tiptapEditor.value?.percentage || 0)

// 在 script 部分添加导入
import MindEchoPanel from '@renderer/components/note/MindEchoPanel.vue'
import AIButton from '@renderer/components/common/AIButton.vue'
import MoreButton from '@renderer/components/common/MoreButton.vue'
import CardboxButton from '@renderer/components/common/CardboxButton.vue'
</script>

<style scoped lang="scss">
.note-expand-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--color-bg-primary);
  width: 100%;
  position: relative;
  overflow: hidden;
}

/* 固定头部区域 */
.fixed-header {
  flex-shrink: 0;
  background-color: var(--color-bg-primary);
  z-index: 10;
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
}

/* 可滚动内容区域 */
.scrollable-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-bottom: 20px;
  position: relative;
  height: calc(100vh - var(--header-height));
}

.editor-content {
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  padding: 0 20px;
  min-height: calc(100vh - 200px);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  padding: 0 29px;
  z-index: 500;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.address-input {
  display: flex;
  align-items: center;
  height: 40px;
  width: 100%;
  position: relative;
  padding-left: 15px;

  input {
    display: flex;
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    font-size: 1.2rem;
    font-weight: bold;
    background-color: transparent;
    line-height: 40px; // 设置行高，通常设置为 1.2 到 1.5 之间的值
    padding: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &::placeholder {
      display: flex;
      color: var(--color-text-placeholder); // 使用变量或直接指定颜色
      font-size: 1rem; // 调整字体大小
      font-weight: normal; // 调整字体粗细
      // font-style: italic; // 可选：使用斜体
      opacity: 0.7; // 调整透明度
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      left: 0;
    }

    &:focus::placeholder {
      opacity: 0.5; // 当输入框获得焦点时，可以改变 placeholder 的样式
    }
  }
}
.note-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 15px;
  border-radius: 2px;
  display: block;
  flex-shrink: 0;
  cursor: pointer;
  border: none;
  outline: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  // 添加微光效果
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: inherit;
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 8px 2px currentColor;
  }

  &.maincard {
    background-color: var(--color-primary);
    &::after {
      color: var(--color-primary);
    }
  }

  &.bibcard {
    background-color: var(--color-yellow);
    &::after {
      color: var(--color-yellow);
    }
  }

  &.indexcard {
    background-color: var(--color-blue);
    &::after {
      color: var(--color-blue);
    }
  }

  &.hoplinkcard {
    background-color: var(--color-pink);
    &::after {
      color: var(--color-pink);
    }
  }
  &.draftcard {
    background-color: var(--color-draft);
    &::after {
      color: var(--color-draft);
    }
  }

  &:hover {
    width: 6px;
    height: 20px; // 增加高度变化
    transform: translateY(-50%) translateX(-1px); // 合并transform

    &::after {
      opacity: 0.5; // 显示光晕效果
    }
  }
}

.card-type-menu {
  position: fixed;
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 1000;
  padding: 8px 0;
  width: auto;
  align-items: center;

  .card-type-item {
    display: flex;
    align-items: center;
    width: 150px;
    padding: 2px 8px;
    border: none;
    background: none;
    cursor: pointer;
    transition: background-color 0.2s;
    border-radius: 8px;
    margin: 2px 8px;

    .icon {
      background: none;
      border: none;
      cursor: pointer;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: background-color 0.2s;
      padding: 0;
      margin-right: 5px;

      &:hover:not(:disabled) {
        background-color: var(--color-hover-bg);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      // 新增以下样式来处理 i-icon 类
      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }

      :deep(svg) {
        width: 18px; // 或者您想要的大小
        height: 18px; // 或者您想要的大小
      }
    }

    .name {
      flex-grow: 0;
      text-align: left;
      color: var(--color-text-primary);
      font-size: 14px;
      white-space: nowrap; // 防止文字换行
      writing-mode: horizontal-tb; // 确保文字是水平排列的
    }

    &:hover {
      background-color: var(--color-hover-bg);
    }

    &.active {
      background-color: var(--color-menu-active-bg);
    }
  }
}

.note-timestamp {
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  padding: 0 44px;
  font-size: 12px;
  color: var(--color-text-tertiary);
  // margin-top: 8px;
  user-select: none;
}

.toolbar-right {
  display: flex;
  position: relative;
}

.dropdown-container {
  position: relative;
}

.content-container {
  background: var(--color-bg-primary);
  border-radius: 12px;
  padding: 20px 0;
  min-height: 100%;
  display: flex;
  flex-direction: column;

  .editor-area {
    flex: 1;
    min-height: 450px;
  }

  .backlinks-area {
    margin-top: auto;
  }
}

/* 修改随机回顾按钮样式，使其与其他按钮保持一致 */
.review-btn {
  position: relative;
  display: flex;
  align-items: center;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
  padding: 4px;
  margin: 2px;
  width: 32px; /* 保持宽度为32px */
  height: 32px; /* 保持高度为32px */
  justify-content: center;

  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

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

  &:hover {
    background-color: var(--color-hover-button);
  }

  &.active {
    background: var(--color-primary-bg);

    .icon {
      color: var(--color-primary);
    }
  }
}

/* 添加左右切换按钮样式 */
.review-nav-container {
  position: relative;
}

/* 修改导航按钮的样式 */
.review-nav-buttons {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  left: 5%;
  right: 5%;
  pointer-events: none;
  z-index: 100;

  .nav-btn {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-primary);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: auto;
    color: var(--color-text-secondary);
    border: none;
    background: transparent;

    &.prev {
      left: 0%;
      transform: translateY(-50%);
      width: 76px;
      height: 76px;
    }

    // 马里奥按钮样式
    &.mario-next {
      right: 0%;
      transform: translateY(-50%);
      width: 4rem;
      height: 4rem;
    }

    // 箭头按钮样式
    &.arrow-next {
      right: 0%;
      transform: rotate(180deg) translateY(50%);
      width: 76px;
      height: 76px;
    }

    // 添加 Mario 风格左箭头按钮样式
    &.mario-prev {
      left: 0%;
      transform: translateY(-50%);
      width: 4rem;
      height: 4rem;
    }
  }
}

/* 修改过渡动画 */
.review-nav-enter-active,
.review-nav-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.review-nav-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(-50%);
}

.review-nav-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-50%);
}

.review-nav-enter-to,
.review-nav-leave-from {
  opacity: 1;
  transform: scale(1) translateY(-50%);
}

/* 添加字数统计样式 */
.character-count {
  position: absolute;
  bottom: -40px;
  right: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  z-index: 100;
  user-select: none;
  transition: all 0.3s ease;

  svg {
    color: var(--color-primary);
    width: 16px;
    height: 16px;
  }

  &--warning {
    color: var(--color-danger);

    svg {
      color: var(--color-danger);
    }
  }

  .count-text {
    display: flex;
    align-items: center;
    white-space: nowrap;
  }
}

.editor-area {
  position: relative;
  flex: 1;
  min-height: 450px;
}
</style>
