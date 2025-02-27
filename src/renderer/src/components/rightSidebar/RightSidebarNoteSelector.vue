<template>
  <div class="search-container" :class="{ expanded: isExpanded }">
    <div class="search-input-container">
      <div class="search-input-wrapper">
        <div class="search-icon">
          <Search theme="outline" size="16" fill="var(--color-text-secondary)" :strokeWidth="2" />
        </div>
        <input
          ref="searchInput"
          v-model="searchQuery"
          class="note-selector-search-input"
          placeholder="搜索笔记..."
          @input="performSearch"
          @keydown="handleKeyDown"
        />
        <div v-if="searchQuery" class="clear-icon" @click="clearSearch">
          <Close theme="outline" size="16" fill="var(--color-text-secondary)" :strokeWidth="2" />
        </div>
      </div>
    </div>

    <!-- 搜索结果展示区域 -->

    <div class="search-results-container">
      <!-- 无搜索关键词时显示最近笔记 -->
      <template v-if="!searchQuery">
        <div ref="searchResultsContainer" class="recent-notes-container">
          <div class="recent-notes-title">最近笔记</div>
          <div
            v-for="(note, noteIndex) in recentNotes"
            :key="note.id"
            class="recent-note-item"
            :class="{ selected: noteIndex === selectedNoteIndex }"
            @click="selectResult(noteIndex, 0)"
            @mouseover="hoverResult(noteIndex, 0)"
          >
            <div class="recent-note-meta">
              <div class="recent-note-address">
                <span class="note-indicator" :class="getCardTypeClass(note.cardType)"></span>
                <h3 class="recent-note-address-text">{{ note.address }}</h3>
              </div>
              <div class="recent-note-title">
                <div class="recent-note-preview-icon">
                  <div class="icon">
                    <ParagraphRectangle
                      theme="outline"
                      size="14"
                      fill="var(--color-text-secondary)"
                      :strokeWidth="3"
                    />
                  </div>
                </div>
                <span>{{ note.title || '无标题' }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <!-- 无搜索结果时显示的内容 -->
        <template v-if="searchResults.length === 0">
          <div class="no-results">
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
        </template>
        <!-- 有搜索结果时显示的内容 -->
        <template v-else>
          <div ref="searchResultsContainer" class="search-results">
            <div
              v-for="(note, noteIndex) in searchResults"
              :key="note.id"
              class="search-result-note"
              :class="{ selected: noteIndex === selectedNoteIndex }"
            >
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
                <div class="note-title-text">
                  <template v-if="searchQuery">
                    <template
                      v-for="part in highlightedParts(note.title || '无标题', searchQuery)"
                      :key="part.text"
                    >
                      <span :class="{ highlight: part.isMatch }">{{ part.text }}</span>
                    </template>
                  </template>
                  <template v-else>
                    {{ note.title || '无标题' }}
                  </template>
                </div>
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
        </template>
      </template>
      <!-- 预览区域 -->
      <div v-if="searchQuery && selectedNote" class="preview-container">
        <NotePreviewCard :key="selectedNote.id" :note="selectedNote" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import NotePreviewCard from '@renderer/components/note/NotePreviewCard.vue'
import { BankCard, ParagraphRectangle, FileSearch, Close, Search } from '@icon-park/vue-next'
import { useDebounceFn } from '@vueuse/core'
import type { Note } from '@shared/types'

// 初始化 store
const noteStore = useNoteStore()

interface SearchResult {
  id: string
  title: string
  blocks: Array<{ content: string }>
}

// 定义组件的响应式状态
const isExpanded = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
const searchResultsContainer = ref<HTMLDivElement | null>(null)
const resultItems = ref<HTMLElement[]>([])
const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])
const selectedNoteIndex = ref(-1)
const selectedBlockIndex = ref(-1)
const selectedNote = ref<Note | null>(null)

// 定义接口
interface RecentNote {
  id: string
  address: string
  title: string
  cardType: string
}

// 组件的响应式状态
const recentNotes = ref<RecentNote[]>([])

// 获取最近编辑的笔记
const fetchRecentNotes = async () => {
  try {
    const notes = await noteStore.getRecentEditedNotes()
    recentNotes.value = notes
  } catch (error) {
    console.error('获取最近笔记失败:', error)
  }
}

// 在组件挂载时获取最近笔记
onMounted(() => {
  fetchRecentNotes()
  focusSearchInput()
})

// 获取选中笔记的详细信息
const fetchSelectedNote = async () => {
  // 只在有搜索查询时获取预览
  if (
    searchQuery.value &&
    selectedNoteIndex.value >= 0 &&
    selectedNoteIndex.value < searchResults.value.length
  ) {
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
  if (!query.trim()) return [{ text, isMatch: false }]
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedQuery})`, 'gi')
  return text.split(regex).map((part) => ({
    text: part,
    isMatch: part.toLowerCase() === query.toLowerCase()
  }))
}

// 使用防抖函数来优化搜索性能
const debouncedSearch = useDebounceFn(async () => {
  if (searchQuery.value.trim()) {
    isExpanded.value = true
    searchResults.value = await noteStore.searchNotes(searchQuery.value)
    if (searchResults.value.length > 0) {
      // 自动选中第一条搜索结果
      selectedNoteIndex.value = 0
      selectedBlockIndex.value = 0
      // 获取并显示第一条笔记的预览
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
// 选择搜索结果
const selectResult = async (noteIndex: number, blockIndex: number) => {
  selectedNoteIndex.value = noteIndex
  selectedBlockIndex.value = blockIndex

  if (!searchQuery.value) {
    // 处理最近笔记的选择，不需要预览
    const note = recentNotes.value[noteIndex]
    if (note) {
      emit('select', { id: note.id, title: note.title })
    }
  } else {
    // 处理搜索结果的选择，需要预览
    const note = searchResults.value[noteIndex]
    if (note) {
      await fetchSelectedNote() // 获取预览
      emit('select', { id: note.id, title: note.title })
    }
  }
}

// 鼠标悬停在搜索结果上时的处理
const hoverResult = (noteIndex: number, blockIndex: number) => {
  selectedNoteIndex.value = noteIndex
  selectedBlockIndex.value = blockIndex
}

// 处理键盘事件
const handleKeyDown = (event: KeyboardEvent) => {
  if (!searchResults.value.length) return // 如果没有搜索结果，不处理方向键

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
        const prevNote = searchResults.value[selectedNoteIndex.value]
        selectedBlockIndex.value = prevNote.blocks.length - 1
      }
      scrollToSelectedItem()
      break
    case 'Enter':
      event.preventDefault()
      if (selectedNoteIndex.value >= 0) {
        const note = searchResults.value[selectedNoteIndex.value]
        emit('select', { id: note.id, title: note.title })
      }
      break
    case 'Escape':
      emit('close')
      break
  }
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

// 监听搜索结果的变化，更新结果项的引用
watch(searchResults, () => {
  nextTick(() => {
    resultItems.value = Array.from(document.querySelectorAll('.search-result-note'))
  })
})

const emit = defineEmits<{
  (e: 'select', { id, title }: { id: string; title: string }): void
  (e: 'close'): void
}>()

const clearSearch = () => {
  searchQuery.value = ''
}

// 添加获取卡片类型样式的函数
const getCardTypeClass = (cardType?: string) => {
  switch (cardType) {
    case 'Maincard':
      return 'maincard'
    case 'Bibcard':
      return 'bibcard'
    case 'Indexcard':
      return 'indexcard'
    case 'Hoplinkcard':
      return 'hoplinkcard'
    default:
      return 'default'
  }
}

const focusSearchInput = () => {
  nextTick(() => {
    if (searchInput.value) {
      searchInput.value.focus()
    }
  })
}
</script>

<style scoped lang="scss">
.search-container {
  width: 680px;
  background: var(--color-bg-primary);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 450px;
  box-shadow: var(--shadow-primary); // 添加阴影
  position: relative; // 确保阴影不被其他元素遮挡
}
.search-input-container {
  width: 100%;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-primary);
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  padding: 0 12px 0 4px;
  border: 1px solid var(--color-border); // 添加透明边框
  transition: all 0.2s ease;

  &:focus-within {
    background: var(--color-bg-hover);
    border-color: var(--color-primary); // focus 时显示边框
    box-shadow: 0 0 0 2px var(--color-primary-light);
  }

  // 搜索图标和清除图标的容器样式
  .search-icon,
  .clear-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    color: var(--color-text-secondary);
    transition: color 0.2s ease;

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
      color: var(--color-text);
    }
  }

  .clear-icon {
    cursor: pointer;
    opacity: 0.6;

    &:hover {
      opacity: 1;
    }
  }

  // 输入框样式
  .note-selector-search-input {
    flex: 1;
    height: 36px;
    padding: 0 8px 0 0;
    font-size: 14px;
    border: none;
    outline: none;
    background: transparent;
    color: var(--color-text);

    &::placeholder {
      color: var(--color-text-secondary);
      opacity: 0.8;
    }

    &:focus {
      outline: none; // 移除输入框自身的 outline
    }
  }
}

// 搜索结果容器
.search-results-container {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
  position: relative; // 添加相对定位
  height: 100%; // 确保容器占满高度
  padding: 10px;
}

.search-results {
  width: 60%;
  height: 100%;
  overflow-y: auto;
  padding-right: 20px;
  position: relative; // 添加相对定位
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
  transition: background-color 0.2s;
  border-radius: 8px;
  margin-bottom: 4px;

  &:hover,
  &.selected {
    background-color: var(--color-sidebar-hover);
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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--color-bg-primary);
  width: 100%;
  height: 100%;

  .no-results-icon {
    margin-bottom: 16px;
  }

  h3 {
    font-size: 18px;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--color-text);
  }

  p {
    font-size: 14px;
    margin-bottom: 24px;
    color: var(--color-text-secondary);
  }

  .suggestions {
    background-color: var(--color-bg-secondary);
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
        color: var(--color-text-secondary);

        &:before {
          content: '•';
          position: absolute;
          left: 8px;
          color: var(--color-text-secondary);
        }
      }
    }
  }
}

.highlight {
  background-color: rgba(255, 255, 0, 0.3);
  border-radius: 2px;
}

.result-preview-icon,
.result-preview-icon-note {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.search-result-note {
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;
  margin-bottom: 8px;
}

.recent-notes-container {
  padding: 6px;
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

.recent-notes-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
  padding-left: 4px;
}

.recent-note-item {
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  width: 100%;
  cursor: pointer;

  &:hover {
    background-color: var(--color-sidebar-hover);
  }
}

.note-indicator {
  width: 4px;
  height: 12px;
  border-radius: 2px;
  margin-right: 2px;
  flex-shrink: 0;

  &.maincard {
    background-color: var(--color-primary);
  }

  &.bibcard {
    background-color: var(--color-yellow);
  }

  &.indexcard {
    background-color: var(--color-blue);
  }

  &.hoplinkcard {
    background-color: var(--color-pink);
  }
}

.recent-note-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;

  .recent-note-address {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    margin-left: 4px;

    .recent-note-address-text {
      margin: 0;
      font-size: 14px;
      font-weight: normal;
      line-height: 1;
    }
  }
  .recent-note-title {
    font-size: 14px;
    color: var(--color-text);
    display: flex;
    align-items: center;
    gap: 4px;
    line-height: 1;

    .recent-note-preview-icon {
      display: flex;
      align-items: center;
      opacity: 0.6;
      .icon {
        background: none;
        border: none;
        cursor: pointer;
        width: 20px;
        height: 20px;
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

    span {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
</style>
