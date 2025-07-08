<template>
  <!-- 搜索模态框组件 -->
  <Modal :modelValue="isModalOpen" @update:modelValue="updateModalState" @after-enter="focusInput">
    <!-- 搜索容器，根据是否展开应用不同的样式 -->
    <div class="search-container" :class="{ expanded: isExpanded }">
      <!-- 搜索输入框 -->
      <div class="search-input-container">
        <input
          ref="searchInput"
          v-model="searchQuery"
          class="search-input"
          :placeholder="searchPlaceholder"
          @input="handleSearchInput"
          @keydown="handleKeyDown"
          @compositionstart="handleCompositionStart"
          @compositionend="handleCompositionEnd"
        />
        <!-- 添加搜索模式指示器 -->
        <div v-if="searchMode !== 'all' && hasSetMode" class="search-mode-indicator">
          <span :class="['mode-badge', searchMode]">
            {{ searchMode === 'address' ? '地址搜索' : '标题搜索' }}
          </span>
        </div>
      </div>
      <!-- 搜索结果展示区域，使用 transition 实现展开/收起动画 -->
      <transition name="expand">
        <div v-if="isExpanded" class="search-results-container">
          <!-- 搜索结果列表 -->
          <div ref="searchResultsContainer" class="search-results">
            <!-- 无搜索结果时显示的内容 -->
            <div v-if="searchResults.length === 0" class="no-results">
              <div class="no-results-icon">
                <FileSearch theme="outline" size="48" fill="#888" :strokeWidth="2" />
              </div>
              <h3>未找到结果</h3>
              <p>没有找到与"{{ searchQuery }}"相关的笔记</p>
              <div class="suggestions">
                <h4>建议：</h4>
                <ul>
                  <li>检查您的拼写</li>
                  <li>尝试使用不同的关键词</li>
                  <li>使用更通用的搜索词</li>
                </ul>
              </div>
            </div>
            <!-- 有搜索结果时显示的内容 -->
            <div
              v-for="(note, noteIndex) in searchResults"
              v-else
              :key="note.id"
              class="search-result-note"
              @dblclick="handleDoubleClick(noteIndex)"
            >
              <!-- ... 笔记标题和内容块的渲染逻辑 ... -->
              <div class="note-title">
                <div class="result-preview-icon-note">
                  <div class="icon">
                    <BankCard
                      theme="outline"
                      size="12"
                      fill="var(--color-text-secondary)"
                      :strokeWidth="2"
                    />
                  </div>
                </div>
                <div class="note-title-text">{{ note.address || '未设置编码地址' }}</div>
              </div>
              <div
                v-for="(block, blockIndex) in note.blocks"
                ref="resultItems"
                :key="`${note.id}-${blockIndex}`"
                class="search-result-item"
                :class="{
                  selected: noteIndex === selectedNoteIndex && blockIndex === selectedBlockIndex
                }"
                @click="selectResult(noteIndex, blockIndex)"
                @mouseover="hoverResult(noteIndex, blockIndex)"
              >
                <div class="result-preview">
                  <div class="result-preview-icon">
                    <div class="icon">
                      <ParagraphRectangle
                        theme="outline"
                        size="14"
                        fill="var(--color-text-secondary)"
                        :strokeWidth="3"
                      />
                    </div>
                  </div>
                  <span class="result-text">
                    <template
                      v-for="part in highlightedParts(block.content, searchQuery)"
                      :key="part.index"
                    >
                      <span :class="{ highlight: part.isMatch }">{{ part.text }}</span>
                    </template>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <!-- 选中笔记的预览容器 -->
          <div v-if="selectedNote" class="preview-container">
            <NotePreviewCard :key="selectedNote.id" :note="selectedNote" />
          </div>
        </div>
      </transition>
      <!-- 添加操作指令区域 -->
      <div v-if="isExpanded" class="action-hints">
        <div class="hint-group">
          <div class="hint">
            <span class="key">↵</span>
            <span class="description">添加到思维板</span>
          </div>
          <div class="hint">
            <span class="key">双击</span>
            <span class="description">添加到思维板</span>
          </div>
          <div class="hint">
            <span class="key">单击</span>
            <span class="description">预览笔记</span>
          </div>
        </div>
        <div class="hint-group">
          <div class="hint">
            <span class="key">ESC</span>
            <span class="description">关闭</span>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>
<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import Modal from '@renderer/components/common/Modal.vue'
import NotePreviewCard from '@renderer/components/note/NotePreviewCard.vue'
import { BankCard, ParagraphRectangle, FileSearch } from '@icon-park/vue-next'
import { useDebounceFn } from '@vueuse/core'
import { Note, SearchResult } from '@shared/types'

// 初始化 store
const noteStore = useNoteStore()

// 定义组件的响应式状态 - 使用独立的状态管理
const isModalOpen = ref(false)
const isExpanded = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
const searchResultsContainer = ref<HTMLDivElement | null>(null)
const resultItems = ref<HTMLElement[]>([])
const searchQuery = ref('')
const searchResults = ref<Array<SearchResult>>([])
const selectedNoteIndex = ref(-1)
const selectedBlockIndex = ref(-1)
const selectedNote = ref<Note | null>(null)

// 添加输入法组合输入状态
const isComposing = ref(false)

// 添加搜索模式相关的类型和状态
type SearchMode = 'all' | 'address' | 'title'
const searchMode = ref<SearchMode>('all')
const searchTerm = ref('')
const hasSetMode = ref(false)

// 定义新的 emit
const emit = defineEmits<{
  'select-note': [noteId: string]
}>()

// 获取选中笔记的详细信息
const fetchSelectedNote = async () => {
  if (selectedNoteIndex.value >= 0 && selectedNoteIndex.value < searchResults.value.length) {
    const note = searchResults.value[selectedNoteIndex.value]
    selectedNote.value = await noteStore.fetchNoteById(note.id)
  } else {
    selectedNote.value = null
  }
}
// 监听选中笔记索引的变化，更新选中的笔记
watch(selectedNoteIndex, fetchSelectedNote)

// 高亮搜索结果中匹配的文本
const highlightedParts = (text: string, query: string) => {
  // 定义接口来描述文本片段的结构
  interface TextPart {
    text: string
    isMatch: boolean
    index?: number
  }

  if (!query.trim()) return [{ text, isMatch: false }] as TextPart[]

  const searchTerms = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  if (searchTerms.length === 0) return [{ text, isMatch: false }] as TextPart[]

  const regex = new RegExp(`(${searchTerms.join('|')})`, 'gi')
  const parts: TextPart[] = [] // 明确指定数组类型
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, match.index),
        isMatch: false
      })
    }
    parts.push({
      text: match[0],
      isMatch: true
    })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      isMatch: false
    })
  }

  return parts
}

// 使用防抖函数来优化搜索性能
const debouncedSearch = useDebounceFn(async () => {
  if (!searchQuery.value.trim()) {
    searchMode.value = 'all'
    hasSetMode.value = false
    searchTerm.value = ''
    isExpanded.value = false
    searchResults.value = []
    selectedNoteIndex.value = -1
    selectedBlockIndex.value = -1
    selectedNote.value = null
    return
  }

  if (searchTerm.value.trim()) {
    isExpanded.value = true
    searchResults.value = await noteStore.searchNotes({
      mode: searchMode.value,
      term: searchTerm.value
    })

    // 添加自动选中第一个结果的逻辑
    if (searchResults.value.length > 0) {
      selectedNoteIndex.value = 0
      selectedBlockIndex.value = 0
      // 立即获取并更新选中的笔记
      await fetchSelectedNote()
    } else {
      selectedNoteIndex.value = -1
      selectedBlockIndex.value = -1
      selectedNote.value = null
    }
  } else {
    isExpanded.value = false
    searchResults.value = []
    selectedNoteIndex.value = -1
    selectedBlockIndex.value = -1
    selectedNote.value = null
  }
}, 300)

// 执行搜索的函数
const performSearch = () => {
  debouncedSearch()
}

// 选择搜索结果
const selectResult = (noteIndex: number, blockIndex: number) => {
  selectedNoteIndex.value = noteIndex
  selectedBlockIndex.value = blockIndex
}

// 添加双击处理函数
const handleDoubleClick = (noteIndex: number) => {
  const note = searchResults.value[noteIndex]
  if (note) {
    emit('select-note', note.id)
    hide()
  }
}

// 鼠标悬停在搜索结果上时的处理
const hoverResult = (noteIndex: number, blockIndex: number) => {
  selectedNoteIndex.value = noteIndex
  selectedBlockIndex.value = blockIndex
}

// 更新模态框状态
const updateModalState = (value: boolean) => {
  isModalOpen.value = value
}

// 聚焦搜索输入框
const focusInput = () => {
  searchInput.value?.focus()
}

// 添加显示搜索模态框的函数
const show = () => {
  isModalOpen.value = true
  // 重置状态
  searchQuery.value = ''
  searchResults.value = []
  selectedNoteIndex.value = -1
  selectedBlockIndex.value = -1
  isExpanded.value = false
}

// 隐藏搜索模态框并重置状态
const hide = () => {
  isModalOpen.value = false
  searchQuery.value = ''
  searchResults.value = []
  selectedNoteIndex.value = -1
  selectedBlockIndex.value = -1
}

// 修改键盘事件处理
const handleKeyDown = (event: KeyboardEvent) => {
  if (isComposing.value) {
    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (selectedNoteIndex.value === -1) {
        selectedNoteIndex.value = 0
        selectedBlockIndex.value = 0
      } else {
        const currentNote = searchResults.value[selectedNoteIndex.value]
        if (selectedBlockIndex.value < currentNote.blocks.length - 1) {
          selectedBlockIndex.value++
        } else if (selectedNoteIndex.value < searchResults.value.length - 1) {
          selectedNoteIndex.value++
          selectedBlockIndex.value = 0
        }
      }
      scrollToSelectedItem()
      break
    case 'ArrowUp':
      event.preventDefault()
      if (selectedBlockIndex.value > 0) {
        selectedBlockIndex.value--
      } else if (selectedNoteIndex.value > 0) {
        selectedNoteIndex.value--
        selectedBlockIndex.value = searchResults.value[selectedNoteIndex.value].blocks.length - 1
      }
      scrollToSelectedItem()
      break
    case 'Enter':
      event.preventDefault()
      if (selectedNote.value) {
        emit('select-note', selectedNote.value.id)
        hide()
      }
      break
    case 'Escape':
      hide()
      break
  }
  // 在每次键盘操作后强制更新 selectedNote
  nextTick(() => {
    // 触发 selectedNote 的重新计算
    if (selectedNoteIndex.value !== -1) {
      const currentIndex = selectedNoteIndex.value
      selectedNoteIndex.value = -1
      selectedNoteIndex.value = currentIndex
    }
  })
}

// 滚动到选中的搜索结果项
const scrollToSelectedItem = () => {
  nextTick(() => {
    const container = searchResultsContainer.value
    const selectedItem =
      resultItems.value[selectedNoteIndex.value]?.querySelectorAll('.search-result-item')[
        selectedBlockIndex.value
      ]
    if (container && selectedItem) {
      const containerRect = container.getBoundingClientRect()
      const selectedItemRect = selectedItem.getBoundingClientRect()

      if (selectedItemRect.bottom > containerRect.bottom) {
        container.scrollTop += selectedItemRect.bottom - containerRect.bottom
      } else if (selectedItemRect.top < containerRect.top) {
        container.scrollTop -= containerRect.top - selectedItemRect.top
      }
    }
  })
}

// 添加监听搜索结果变化的逻辑
watch(searchResults, async () => {
  // 当有搜索结果时，自动选择第一个结果
  if (searchResults.value.length > 0) {
    selectedNoteIndex.value = 0
    selectedBlockIndex.value = 0
    // 立即获取并更新选中的笔记
    await fetchSelectedNote()
  } else {
    selectedNoteIndex.value = -1
    selectedBlockIndex.value = -1
    selectedNote.value = null
  }

  nextTick(() => {
    resultItems.value = Array.from(document.querySelectorAll('.search-result-note'))
  })
})

// 暴露组件的方法
defineExpose({ show, hide })

// 修改搜索输入处理函数
const handleSearchInput = (event: Event) => {
  const input = (event.target as HTMLInputElement).value

  // 检查是否正在输入模式前缀
  if (input === 'a ' || input === 't ') {
    searchMode.value = input.startsWith('a') ? 'address' : 'title'
    searchTerm.value = ''
    hasSetMode.value = true
    searchQuery.value = input
    return
  }

  // 检查是否在删除模式前缀
  if (input.length < searchQuery.value.length) {
    if (hasSetMode.value && input.length <= 2) {
      searchMode.value = 'all'
      hasSetMode.value = false
      searchTerm.value = input
      searchQuery.value = input
      performSearch()
      return
    }
  }

  searchQuery.value = input

  if (hasSetMode.value) {
    searchTerm.value = input.slice(2)
  } else {
    searchTerm.value = input
  }

  performSearch()
}

// 添加搜索模式提示计算属性
const searchPlaceholder = computed(() => {
  switch (searchMode.value) {
    case 'address':
      return '搜索笔记地址...'
    case 'title':
      return '搜索笔记标题...'
    default:
      return '搜索笔记，按回车添加到思维板'
  }
})

// 处理输入法事件
const handleCompositionStart = () => {
  isComposing.value = true
}

const handleCompositionEnd = () => {
  isComposing.value = false
}
</script>
<style scoped lang="scss">
.highlight {
  background-color: rgba(255, 255, 0, 0.3);
  border-radius: 2px;
}
.search-container {
  will-change: transform, opacity;
  width: 640px;
  max-width: 90vw;
  background: var(--color-bg-primary);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 64px; // 初始高度
  transition:
    height 0.3s ease,
    top 0.3s ease;
  overflow: hidden; // 确保内容不会在过渡期间溢出
  position: absolute; // 使用绝对定位
  top: calc(50% - 225px); // 初始位置，计算方式：50% - (展开高度的一半 - 初始高度的一半)
  left: 50%;
  transform: translateX(-50%);
}

.search-container.expanded {
  height: 490px; // 增加高度以容纳操作提示
  top: calc(50% - 225px);
}

.search-input {
  width: 100%;
  padding: 20px 16px;
  font-size: 16px;
  border: none;
  outline: none;
  background-color: var(--color-bg-primary);
  transition: background-color 0.2s;
  flex-shrink: 0; // 防止输入框在过渡期间被压缩

  &:focus {
    background-color: var(--color-bg-primary);
  }
}

.search-results-container {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
  padding: 10px 20px 20px 20px;
  border-top: var(--color-border) 1px solid;
  position: relative;
  height: calc(100% - 64px - 37px); // 减去输入框和操作提示的高度
}

.search-results {
  width: 60%;
  height: 100%;
  overflow-y: auto;
  padding-right: 20px;
}

.search-results,
.preview-container {
  scrollbar-width: none;
  /* Firefox */
  -ms-overflow-style: none;
  /* Internet Explorer 10+ */

  &::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
    /* Chrome, Safari, Opera */
  }
}

.note-title {
  font-size: 12px;
  padding: 5px 0px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  height: 30px;
  .note-title-text {
    line-height: 1; // 确保文字行高为1，有助于垂直居中
    display: flex;
    align-items: center;
    height: 100%; // 让 span 占满父元素高度
  }
}

.search-result-item {
  padding: 6px 0px;
  cursor: pointer;
  transition:
    background-color 0.2s,
    box-shadow 0.2s;
  border-radius: 8px;
  margin-bottom: 4px;

  &:hover,
  &.selected {
    background-color: var(--color-sidebar-hover);
    // box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
}
.result-preview {
  font-size: 0.9em;
  color: #333;
  line-height: 1.4;
  display: flex;
  align-items: flex-start;
  padding: 5px 0;

  .result-text {
    margin-left: 8px;
    flex: 1;
    word-break: break-word;
  }

  .highlight {
    background-color: rgba(0, 200, 168, 0.2); // 使用主题色的半透明版本作为背景
    color: #00806c; // 使用主题色的深色版本作为文字颜色
    border-radius: 2px;
    padding: 2px 2px;
    font-weight: 500;
    box-shadow: 0 0 0 1px rgba(0, 200, 168, 0.3); // 添加一个细微的边框效果
  }
}

.result-preview-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px; // 给图标一个固定宽度
  height: 20px; // 给图标一个固定高度
  flex-shrink: 0; // 防止图标被压缩
  .icon {
    background: none;
    border: none;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 12px;
      height: 12px;
    }
  }
}

.result-preview-icon-note {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px; // 给图标一个固定宽度
  height: 18px; // 给图标一个固定高度
  flex-shrink: 0; // 防止图标被压缩

  .icon {
    background: none;
    border: none;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 12px;
      height: 12px;
    }
  }
}

.preview-container {
  width: 40%;
  padding: 0px;
  background-color: white;
  overflow-y: auto;
  height: 100%;
  border: #e0e0e0 1px solid;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  color: #666;
  text-align: center;
  padding: 20px;
  position: absolute;
  top: 0;
  left: 0;
  // transform: translate(-50%, -50%);
  // margin-top: 25px;

  .no-results-icon {
    margin-bottom: 16px;
  }

  h3 {
    font-size: 18px;
    margin-bottom: 8px;
    font-weight: 500;
  }

  p {
    font-size: 14px;
    margin-bottom: 24px;
  }

  .suggestions {
    background-color: #f0f0f0;
    border-radius: 8px;
    padding: 16px;
    text-align: left;
    width: 100%;
    max-width: 300px;

    h4 {
      font-size: 14px;
      margin-bottom: 8px;
      font-weight: 500;
    }

    ul {
      list-style-type: none;
      padding-left: 0;

      li {
        font-size: 13px;
        margin-bottom: 4px;
        position: relative;
        padding-left: 20px;

        &:before {
          content: '•';
          position: absolute;
          left: 8px;
          color: #888;
        }
      }
    }
  }
}

.expand-enter-active,
.expand-leave-active {
  transition:
    opacity 0.3s,
    transform 0.3s;
  transform-origin: top;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: scaleY(0);
}

:deep(mark) {
  background-color: rgba(255, 255, 0, 0.3);
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
}

.action-hints {
  display: flex;
  justify-content: space-between;
  padding: 8px 20px;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  font-size: 12px;
  color: var(--color-text-secondary);

  .hint-group {
    display: flex;
    gap: 16px;
  }

  .hint {
    display: flex;
    align-items: center;
    gap: 4px;

    .key {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 4px;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      font-family: system-ui;
      font-size: 11px;
      font-weight: 500;
    }

    .description {
      margin-left: 2px;
      user-select: none;
    }
  }
}

// 添加搜索模式指示器样式
.search-input-container {
  position: relative;
  width: 100%;
}

.search-mode-indicator {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.mode-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);

  &.address,
  &.title {
    background-color: rgba(var(--color-primary-rgb), 0.1);
    color: var(--color-primary);
  }
}
</style>
