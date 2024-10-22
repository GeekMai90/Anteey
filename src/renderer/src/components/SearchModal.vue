<template>
  <!-- 搜索模态框组件 -->
  <Modal
    :modelValue="uiStore.isSearchModalOpen"
    @update:modelValue="updateModalState"
    @after-enter="focusInput"
  >
    <!-- 搜索容器，根据是否展开应用不同的样式 -->
    <div class="search-container" :class="{ expanded: isExpanded }">
      <!-- 搜索输入框 -->
      <input
        ref="searchInput"
        v-model="searchQuery"
        class="search-input"
        placeholder="搜索笔记"
        @input="performSearch"
        @keydown="handleKeyDown"
      />
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
                <div class="note-title-text">{{ note.title }}</div>
              </div>
              <div
                v-for="(block, blockIndex) in note.blocks"
                ref="resultItems"
                :key="`${note.id}-${blockIndex}`"
                class="search-result-item"
                :class="{
                  selected: noteIndex === selectedNoteIndex && blockIndex === selectedBlockIndex
                }"
                @click="selectResult(noteIndex, blockIndex, true)"
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
    </div>
  </Modal>
</template>
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStores'
import Modal from '@renderer/components/Modal.vue'
import { useRouter } from 'vue-router'
import NotePreviewCard from '@renderer/components/NotePreviewCard.vue'
import { BankCard, ParagraphRectangle, FileSearch } from '@icon-park/vue-next'
import { useDebounceFn, useEventBus } from '@vueuse/core'
import { Note } from '@renderer/types/Note'
import { useUIStore } from '@renderer/stores/useUIStore'

// 初始化 store 和 router
const noteStore = useNoteStore()
const uiStore = useUIStore()
const router = useRouter()

// 定义组件的响应式状态
const isExpanded = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
const searchResultsContainer = ref<HTMLDivElement | null>(null)
const resultItems = ref<HTMLElement[]>([])
const searchQuery = ref('')
const searchResults = ref<Array<{ id: string; title: string; blocks: Array<{ content: string }> }>>(
  []
)
const selectedNoteIndex = ref(-1)
const selectedBlockIndex = ref(-1)
const selectedNote = ref<Note | null>(null)

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
  console.log('Performing search for:', searchQuery.value)
  if (searchQuery.value.trim()) {
    isExpanded.value = true
    searchResults.value = await noteStore.searchNotes(searchQuery.value)
    if (searchResults.value.length > 0) {
      selectedNoteIndex.value = 0
      selectedBlockIndex.value = 0
    } else {
      selectedNoteIndex.value = -1
      selectedBlockIndex.value = -1
    }
  } else {
    isExpanded.value = false
    searchResults.value = []
    selectedNoteIndex.value = -1
    selectedBlockIndex.value = -1
  }
  console.log('Search results:', searchResults.value)
}, 300) // 300ms 的延迟

// 执行搜索的函数
const performSearch = () => {
  debouncedSearch()
}
// const performSearch = () => {
//   requestAnimationFrame(() => {
//     // isExpanded.value = true
//     debouncedSearch()
//   })
// }

// 选择搜索结果
const selectResult = (noteIndex: number, blockIndex: number, openEditor = false) => {
  selectedNoteIndex.value = noteIndex
  selectedBlockIndex.value = blockIndex
  if (openEditor) {
    const note = searchResults.value[noteIndex]
    if (note) {
      noteStore.openNoteEditor(note.id)
      uiStore.closeSearchModal()
    }
  }
}

// 鼠标悬停在搜索结果上时的处理
const hoverResult = (noteIndex: number, blockIndex: number) => {
  selectedNoteIndex.value = noteIndex
  selectedBlockIndex.value = blockIndex
}

// 更新模态框状态
const updateModalState = (value: boolean) => {
  if (value) {
    uiStore.openSearchModal()
  } else {
    uiStore.closeSearchModal()
  }
}

// 聚焦搜索输入框
const focusInput = () => {
  searchInput.value?.focus()
}

// 显示搜索模态框
const show = () => {
  uiStore.openSearchModal()
}

// 隐藏搜索模态框并重置状态
const hide = () => {
  uiStore.closeSearchModal()
  searchQuery.value = ''
  searchResults.value = []
  selectedNoteIndex.value = -1
  selectedBlockIndex.value = -1
}

// 在卡片盒中定位笔记
const locateNoteInCardBox = (noteId: string) => {
  noteStore.setHighlightedNoteId(noteId)
  router.push({ name: 'cardbox' })
  uiStore.closeSearchModal()
  // 触发事件
  const searchHighlightEventBus = useEventBus('search-highlight')
  searchHighlightEventBus.emit(noteId)
}

// 处理键盘事件
const handleKeyDown = (event: KeyboardEvent) => {
  // const totalBlocks = searchResults.value.reduce((sum, note) => sum + note.blocks.length, 0)
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
      event.preventDefault() // 阻止默认行为
      if (selectedNote.value) {
        if (event.metaKey) {
          // Cmd+Enter: 只打开扩展笔记编辑器
          router.push({ name: 'NoteExpandEditor', params: { id: selectedNote.value.id } })
          uiStore.closeSearchModal()
        } else if (event.altKey) {
          // Alt+Enter: 在卡片盒中定位笔记
          locateNoteInCardBox(selectedNote.value.id)
          uiStore.closeSearchModal()
        } else {
          // 普通 Enter: 打开小窗编辑器
          noteStore.openNoteEditor(selectedNote.value.id)
          uiStore.closeSearchModal()
        }
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

// 监听搜索模态框的打开状态
watch(
  () => noteStore.isSearchModalOpen,
  (newValue) => {
    console.log('isSearchModalOpen changed:', newValue)
    if (newValue) {
      searchQuery.value = ''
      searchResults.value = []
      selectedNoteIndex.value = -1
      selectedBlockIndex.value = -1
      isExpanded.value = false
    }
  }
)

// 监听搜索结果的变化，更新结果项的引用
watch(searchResults, () => {
  nextTick(() => {
    resultItems.value = Array.from(document.querySelectorAll('.search-result-note'))
  })
})

// 暴露组件的方法
defineExpose({ show, hide })
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
  height: 450px; // 展开后的高度
  top: calc(50% - 225px); // 展开后的位置保持不变
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
    background-color: var(--sidebar-hover-bg);
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
</style>
