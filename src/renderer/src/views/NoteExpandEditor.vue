// src/views/NoteExpandEditor.vue
<!-- src/views/NoteExpandEditor.vue -->
<template>
  <div class="note-expand-editor">
    <!-- 顶部工具栏 -->
    <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
    <!-- 编辑器内容 -->
    <div class="editor-content">
      <div class="editor-header">
        <div class="address-input">
          <div
            ref="indicatorButton"
            class="note-indicator"
            :class="cardTypeClass"
            @click="toggleCardTypeMenu"
          ></div>
          <input
            ref="addressInput"
            v-model="editedNote.address"
            type="text"
            placeholder="输入编码地址"
            @keyup.enter="focusEditor"
          />
        </div>
        <div class="toolbar-right">
          <div class="info-btn" @click="toggleCardBoxMenu">
            <div class="icon">
              <Install theme="outline" size="18" fill="var(--color-icon-default)" />
            </div>
            <!-- 添加卡片盒下拉菜单 -->
            <CardboxDropdownMenu
              :isOpen="showCardBoxMenu"
              :cardBoxes="cardBoxes"
              :selectedCardBox="selectedCardBox"
              @update:selectedCardBox="selectCardBox"
              @close="showCardBoxMenu = false"
            />
          </div>
          <!-- <div class="more-menu-container"> -->
          <div class="more-btn" @click.stop="toggleOptionsMenu">
            <div class="icon">
              <More theme="outline" size="22" fill="var(--color-icon-default)" />
            </div>
            <div v-if="isOptionsMenuVisible" v-click-outside="closeOptionsMenu" class="option-menu">
              <NoteOptionsMenu
                @share="handleShare"
                @star="handleStar"
                @show-sidebar="handleShowSidebar"
                @copy="handleCopy"
                @show-history="handleShowHistory"
                @delete="handleDelete"
                @close="closeOptionsMenu"
              />
            </div>
          </div>
          <!-- </div> -->
        </div>
      </div>
      <div class="note-timestamp">
        {{ formatDate(editedNote.updatedAt) }}
      </div>
      <!-- 编辑器内容 -->
      <div class="content-area">
        <TipTapEditor
          ref="tiptapEditor"
          v-model:content="editedNote.content"
          :editable="true"
          :enableDragHandle="true"
        />
      </div>
    </div>
    <!-- 卡片类型选择菜单 -->
    <div v-if="showCardTypeMenu" class="card-type-menu" :style="menuStyle" @click.stop>
      <div
        v-for="type in cardTypes"
        :key="type"
        :class="{ active: editedNote.cardType === type }"
        class="card-type-item"
        @click="selectCardType(type)"
      >
        <div class="icon">
          <component :is="getIcon(type)" theme="outline" size="16" fill="#b6b6b6" />
        </div>
        <div class="name">{{ getTypeLabel(type) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, onMounted, computed, nextTick, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNoteStore } from '../stores/noteStores'
import { CardType, Note, CardBox } from '../types/Note'
import { formatDate } from '../utils/noteHelpers'
import { useNoteOptions } from '../composable/useNoteOptions'
import NoteOptionsMenu from '../components/NoteOptionsMenu.vue'
// import { More } from '@icon-park/vue-next';
import { Notes, BookOpen, ViewList, Link, More, Install } from '@icon-park/vue-next'

import { useDebounceFn, useThrottleFn } from '@vueuse/core'
import TipTapEditor from '../components/TipTapEditor.vue'
import CardboxDropdownMenu from '../components/CardboxDropdownMenu.vue'
// import { storeToRefs } from 'pinia';

const tiptapEditor = ref<any>(null)
const route = useRoute()
const router = useRouter()
const noteStore = useNoteStore()
const noteId = route.params.id as string
const addressInput = ref<HTMLInputElement | null>(null)
// const editedNote = ref(noteStore.getNoteById(noteId))
const editedNote = ref<Note>(
  noteId
    ? noteStore.getNoteById(noteId) || (noteStore.createNewNote() as Note)
    : (noteStore.createNewNote() as Note)
)

const {
  isOptionsMenuVisible,
  toggleOptionsMenu,
  closeOptionsMenu,
  handleShare,
  handleStar,
  handleShowSidebar,
  handleCopy,
  handleShowHistory,
  handleDelete
} = useNoteOptions(noteId, () => router.back())

// 卡片盒下拉菜单
const showCardBoxMenu = ref(false)
const selectedCardBox = ref<CardBox | null>(null)
const showMoreActions = ref<string | null>(null)

// 按名称排序卡片盒
const cardBoxes = computed(() => {
  const sortedCardBoxes = [...noteStore.cardBoxes].sort((a, b) =>
    a.name.localeCompare(b.name, 'zh-CN')
  )
  return [...sortedCardBoxes]
})

const toggleCardBoxMenu = () => {
  showCardBoxMenu.value = !showCardBoxMenu.value
}

const selectCardBox = (box: CardBox) => {
  selectedCardBox.value = box
  if (box && box.id !== '0000') {
    editedNote.value.cardBoxId = box.id
  } else {
    editedNote.value.cardBoxId = undefined
  }
  saveNote()
}

// 全局点击事件，关闭下拉菜单
const handleGlobalClick = (event: MouseEvent) => {
  if (
    showCardBoxMenu.value &&
    event.target instanceof Element &&
    !event.target.closest('.info-btn') &&
    !event.target.closest('.dropdown-menu')
  ) {
    showCardBoxMenu.value = false
  }
  showMoreActions.value = null
  if (
    showCardTypeMenu.value &&
    event.target instanceof Element &&
    !event.target.closest('.note-indicator') &&
    !event.target.closest('.card-type-menu')
  ) {
    showCardTypeMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
})

// 初始化卡片盒
onMounted(() => {
  if (editedNote.value.cardBoxId) {
    const currentCardBox = cardBoxes.value.find((box) => box.id === editedNote.value.cardBoxId)
    if (currentCardBox) {
      selectedCardBox.value = currentCardBox
    }
  }
})

// 保存笔记

const saveNote = async () => {
  if (editedNote.value?.id) {
    try {
      const savedNote = await noteStore.updateNote(editedNote.value.id, editedNote.value)
      editedNote.value = savedNote as Note
      console.log('笔记已更新')
    } catch (error) {
      console.error('Error updating note:', error)
    }
  } else {
    console.error('Cannot update note: Missing note id')
  }
}
// 使用防抖和节流函数来保存笔记
const debouncedSave = useDebounceFn(saveNote, 2000)
const throttledContentSave = useThrottleFn(saveNote, 5000)

// 监听内容变化，使用节流函数来保存笔记
watch(
  () => editedNote.value.content,
  () => {
    throttledContentSave()
  }
)

watch(
  () => editedNote.value,
  (newValue, oldValue) => {
    if (newValue.address !== oldValue.address || newValue.cardType !== oldValue.cardType) {
      debouncedSave()
    }
  },
  { deep: true }
)

// 在组件卸载前保存笔记或删除空笔记
onBeforeUnmount(async () => {
  // if (!isExpandingToExpandEditor.value) {
  if (
    !editedNote.value.address &&
    (!editedNote.value.content || Object.keys(editedNote.value.content).length === 0)
  ) {
    await noteStore.deleteNote(editedNote.value.id)
    console.log('清除空笔记')
  } else {
    await saveNote()
  }
  // }
})

// 卡片类型选择菜单处理
const indicatorButton = ref<HTMLButtonElement | null>(null)
const showCardTypeMenu = ref(false)
const cardTypes: CardType[] = ['Maincard', 'Bibcard', 'Indexcard', 'Hoplinkcard']
const menuStyle = ref({})

const cardTypeClass = computed(() => ({
  maincard: editedNote.value.cardType === 'Maincard',
  bibcard: editedNote.value.cardType === 'Bibcard',
  indexcard: editedNote.value.cardType === 'Indexcard',
  hoplinkcard: editedNote.value.cardType === 'Hoplinkcard'
}))

const getIcon = (type: CardType) => {
  switch (type) {
    case 'Maincard':
      return Notes
    case 'Bibcard':
      return BookOpen
    case 'Indexcard':
      return ViewList
    case 'Hoplinkcard':
      return Link
  }
}

const getTypeLabel = (type: CardType) => {
  switch (type) {
    case 'Maincard':
      return '主要卡'
    case 'Bibcard':
      return '书目卡'
    case 'Indexcard':
      return '索引卡'
    case 'Hoplinkcard':
      return '跳转卡'
  }
}

const toggleCardTypeMenu = () => {
  showCardTypeMenu.value = !showCardTypeMenu.value
  if (showCardTypeMenu.value) {
    nextTick(() => {
      const button = indicatorButton.value
      if (button) {
        const rect = button.getBoundingClientRect()
        menuStyle.value = {
          top: `${rect.bottom + window.scrollY + 10}px`,
          left: `${rect.left + window.scrollX}px`
        }
      }
    })
  }
}

const selectCardType = (type: CardType) => {
  editedNote.value.cardType = type
  showCardTypeMenu.value = false
  saveNote()
}

const focusEditor = () => {
  tiptapEditor.value?.focus()
}
const focusAddressInput = () => {
  nextTick(() => {
    addressInput.value?.focus()
  })
}

onMounted(() => {
  focusAddressInput()
})
</script>

<style scoped lang="scss">
.note-expand-editor {
  display: flex;
  flex-direction: column;
  // height: 100%;
  height: 100vh;
  background-color: #ffffff;
  width: 100%;
  position: relative;
}

.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  // flex-grow: 1;
  /* padding: 20px calc((100% - 900px)/2); */
  padding: 20px;
  overflow: auto;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;

  .content-area {
    flex-grow: 1;
    display: flex;
    // overflow: hidden;
    position: relative;
    min-height: 0;
  }

  :deep(.tiptap-container) {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    padding: 0 10px;
    position: relative;
  }

  :deep(.tiptap) {
    // width: 100%;
    min-width: calc(100% - 40px);
    min-height: 100%;
    overflow-y: auto;
  }
}

.more-menu-container {
  position: relative;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-left: 40px;
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
  /* margin-bottom: 20px; */
  display: flex;
  align-items: center;
  height: 40px;

  input {
    display: flex;
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    font-size: 1.5rem;
    font-weight: bold;
    background-color: transparent;
    line-height: 40px; // 设置行高，通常设置为 1.2 到 1.5 之间的值
    padding: 0;
    margin: 0;

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
  width: 4px;
  height: 15px;
  border-radius: 2px;
  margin-right: 10px;
  display: block;
  flex-shrink: 0;
  cursor: pointer;
  border: none;
  outline: none;
  transition: all 0.3s ease;

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

  &:hover {
    width: 6px;
    height: 15px;
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
      // border: 1px solid var(--color-primary);
    }
  }
}

.note-timestamp {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-bottom: 30px;
  margin-left: 40px;
}

.toolbar-right {
  display: flex;
  gap: 10px;
  position: relative;
  // margin-right: 10px;
}

.info-btn,
.more-btn {
  // position: relative;
  display: flex;
  align-items: center;
  // width: 200px;
  // padding: 8px 12px;
  border: none;
  background: none;
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 8px;
  // margin: 2px 8px;

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
    // margin-right: 3px;

    &:hover:not(:disabled) {
      background-color: var(--color-hover-bg);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    // 新增以下样式来处理 i-icon 类
    .i-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    svg {
      width: 18px; // 或者您想要的大小
      height: 18px; // 或者您想要的大小
    }
  }

  .name {
    flex-grow: 0;
    text-align: left;
    color: var(--default-text-color);
    font-size: 15px;
    white-space: nowrap; // 防止文字换行
    writing-mode: horizontal-tb; // 确保文字是水平排列的
  }

  &:hover {
    background-color: var(--color-hover-bg);
  }

  &.active {
    background-color: var(--color-menu-active-bg);
    // border: 1px solid var(--color-primary);
  }
}

.dropdown-container {
  position: relative;
}
</style>
