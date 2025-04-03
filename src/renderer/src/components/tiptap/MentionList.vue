<template>
  <div class="mention-popup">
    <!-- 无结果时显示的提示 -->
    <div v-if="props.items.length === 0" class="empty-state">
      <div class="no-results">
        <div class="no-results-icon">
          <FileSearch theme="outline" size="48" fill="#888" :strokeWidth="2" />
        </div>
        <h3>输入以搜索笔记</h3>
        <p>输入笔记编码地址或关键词来查找</p>
        <div class="suggestions">
          <h4>建议：</h4>
          <ul>
            <li>输入笔记的编码地址</li>
            <li>输入笔记标题或内容的关键词</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 有结果时显示的内容 -->
    <div v-else class="mention-container">
      <!-- 左侧列表 -->
      <div class="mention-results">
        <div
          v-for="(item, index) in items"
          :key="item.id"
          class="mention-result-item"
          :class="{
            'is-selected': index === selectedIndex,
            'is-clicked': index === clickedIndex
          }"
          @click="selectItem(index)"
          @dblclick="insertMention(index)"
          @mouseover="hoverItem(index)"
        >
          <div class="item-header">
            <div class="note-type" :class="item.cardType || 'Maincard'"></div>
            <span class="address">
              <template
                v-for="part in highlightText(
                  item.address || '未设置编码地址',
                  props.searchQuery || ''
                )"
                :key="part.text"
              >
                <span :class="{ highlight: part.isMatch }">{{ part.text }}</span>
              </template>
            </span>
          </div>
          <div class="title">
            <template
              v-for="part in highlightText(item.title || '未命名笔记', props.searchQuery || '')"
              :key="part.text"
            >
              <span :class="{ highlight: part.isMatch }">{{ part.text }}</span>
            </template>
          </div>
        </div>
      </div>

      <!-- 右侧预览 -->
      <div v-if="selectedNote" class="preview-container">
        <NotePreviewCard :key="selectedNote.id" :note="selectedNote" />
      </div>
    </div>

    <!-- 操作提示 -->
    <div class="action-hints">
      <div class="hint-group">
        <div class="hint">
          <span class="key">↑</span>
          <span class="key">↓</span>
          <span class="description">选择</span>
        </div>
        <div class="hint">
          <span class="key">⌘</span>
          <span class="key">↵</span>
          <span class="description">插入引用</span>
        </div>
        <div class="hint">
          <span class="description">双击插入引用</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import NotePreviewCard from '@renderer/components/note/NotePreviewCard.vue'
import type { Note } from '@shared/types'
import { FileSearch } from '@icon-park/vue-next'

interface MentionItem {
  id: string
  title: string
  address: string
  cardType?: string
}

const props = defineProps<{
  items: MentionItem[]
  command: (item: MentionItem) => void
  searchQuery?: string
}>()

const selectedIndex = ref(0)
const clickedIndex = ref(0)
const selectedNote = ref<Note | null>(null)
const noteStore = useNoteStore()

// 选择项目
const selectItem = (index: number) => {
  clickedIndex.value = index
  selectedIndex.value = index
}

// 添加插入引用函数
const insertMention = (index: number) => {
  const item = props.items[index]
  if (item) {
    props.command(item)
  }
}

// 悬停处理
const hoverItem = async (index: number) => {
  selectedIndex.value = index
}

// 加载笔记预览的函数
const loadNotePreview = async (index: number) => {
  if (index >= 0 && index < props.items.length) {
    const item = props.items[index]
    const note = await noteStore.fetchNote(item.id)
    if (note) {
      selectedNote.value = note
    }
  }
}

// 监听 items 变化
watch(
  () => props.items,
  async (newItems) => {
    if (newItems.length > 0) {
      const initialIndex = 0
      selectedIndex.value = initialIndex
      clickedIndex.value = initialIndex
      await loadNotePreview(initialIndex)
    } else {
      selectedIndex.value = -1
      clickedIndex.value = -1
      selectedNote.value = null
    }
  },
  { immediate: true }
)

// 监听选中项变化，加载笔记预览
watch(selectedIndex, async (newIndex) => {
  await loadNotePreview(newIndex)
})

// 组件挂载时加载第一个笔记的预览
onMounted(async () => {
  if (props.items.length > 0) {
    await loadNotePreview(0)
  }
})

// 键盘导航
defineExpose({
  onKeyDown: ({ event }: { event: KeyboardEvent }) => {
    if (event.key === 'ArrowUp') {
      const newIndex = (selectedIndex.value - 1 + props.items.length) % props.items.length
      // 同时更新选中状态和点击状态
      selectedIndex.value = newIndex
      clickedIndex.value = newIndex
      return true
    }

    if (event.key === 'ArrowDown') {
      const newIndex = (selectedIndex.value + 1) % props.items.length
      // 同时更新选中状态和点击状态
      selectedIndex.value = newIndex
      clickedIndex.value = newIndex
      return true
    }

    if (event.key === 'Enter') {
      // 如果按住 Ctrl/Cmd 键，则插入引用
      if (event.metaKey || event.ctrlKey) {
        insertMention(selectedIndex.value)
      }
      return true
    }

    return false
  }
})

// 添加高亮处理函数
const highlightText = (text: string, query: string) => {
  if (!query?.trim()) return [{ text, isMatch: false }]

  const searchTerms = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  if (searchTerms.length === 0) return [{ text, isMatch: false }]

  const regex = new RegExp(`(${searchTerms.join('|')})`, 'gi')
  const parts = []
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
</script>

<style lang="scss" scoped>
.mention-popup {
  position: absolute;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 9999;
  width: 640px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 320px; // 添加最小高度
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  min-height: 320px;
  height: 320px; // 固定高度，与 mention-container 一致
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
  text-align: center;
  max-width: 320px;

  .no-results-icon {
    margin-bottom: 16px;
  }

  h3 {
    font-size: 18px;
    margin-bottom: 8px;
    font-weight: 500;
    color: #666;
  }

  p {
    font-size: 14px;
    margin-bottom: 24px;
  }

  .suggestions {
    background-color: var(--color-bg-secondary);
    border-radius: 8px;
    padding: 16px;
    text-align: left;
    width: 100%;

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

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
}

.mention-container {
  display: flex;
  height: 320px;
  padding: 12px;
  gap: 12px;
}

.mention-results {
  width: 60%;
  overflow-y: auto;
  padding-right: 8px;

  &::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }
}

.mention-result-item {
  padding: 8px;
  cursor: pointer;
  border-radius: 8px;
  margin-bottom: 4px;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  &:hover {
    background-color: var(--color-sidebar-hover);
  }

  &.is-selected {
    background-color: var(--color-sidebar-hover);
  }

  &.is-clicked {
    background-color: var(--color-primary-light);
    border: 1px solid var(--color-primary);
  }

  &.is-clicked:hover {
    background-color: var(--color-primary-lighter);
  }

  .item-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;

    .note-type {
      width: 3px;
      height: 12px;
      border-radius: 1.5px;

      &.Maincard {
        background: var(--color-primary);
      }
      &.Literature {
        background: var(--color-literature);
      }
      &.Permanent {
        background: var(--color-permanent);
      }
      &.Hub {
        background: var(--color-hub);
      }
    }

    .address {
      font-size: 13px;
      color: var(--color-text-primary);
      line-height: 1;
    }
  }

  .title {
    font-size: 12px;
    color: var(--color-text-secondary);
    margin-left: 11px;
  }
}

.preview-container {
  width: 40%;
  background-color: var(--color-bg-primary);
  border: var(--color-border) 1px solid;
  border-radius: 8px;
  overflow-y: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  &::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }
}

.action-hints {
  padding: 8px 12px;
  // background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  font-size: 12px;
  color: var(--color-text-secondary);
  display: flex;
  justify-content: flex-end;

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

.highlight {
  background-color: rgba(0, 200, 168, 0.2);
  color: #00806c;
  border-radius: 2px;
  padding: 0 2px;
  font-weight: 500;
  box-shadow: 0 0 0 1px rgba(0, 200, 168, 0.3);
}
</style>
