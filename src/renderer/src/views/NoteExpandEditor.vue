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
          <!-- 更多菜单 -->
          <div class="more-btn" @click.stop="toggleOptionsMenu">
            <div v-tooltip.bottom="{ content: '更多', delay: { show: 1000 } }" class="icon">
              <More theme="outline" size="16" fill="var(--color-icon-default)" />
            </div>
            <div v-if="isOptionsMenuVisible" v-click-outside="closeOptionsMenu">
              <NoteOptionsMenu ref="noteOptionsMenu" :noteId="noteId" @close="closeOptionsMenu" />
            </div>
          </div>
          <!-- <div class="more-btn" @click.stop="toggleOptionsMenu">
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
          </div> -->
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
          @update:content="updateContent"
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
import { useRoute } from 'vue-router'
import { useNoteStore } from '../stores/noteStores'
import { CardType, Note, CardBox } from '../types/Note'
import { formatDate } from '../utils/noteHelpers'
import NoteOptionsMenu from '../components/NoteOptionsMenu.vue'
import { Notes, BookOpen, ViewList, Link, More, Install } from '@icon-park/vue-next'
import TipTapEditor from '../components/TipTapEditor.vue'
import CardboxDropdownMenu from '../components/CardboxDropdownMenu.vue'
import AppToolbar from '../components/AppToolbar.vue'
import { debounce } from 'lodash-es'

// const props = defineProps<{
//   noteId: string
// }>()

const tiptapEditor = ref<any>(null)
const route = useRoute()
// const router = useRouter()
const noteStore = useNoteStore()
const noteId = route.params.id as string
const addressInput = ref<HTMLInputElement | null>(null)
// const editedNote = ref(noteStore.getNoteById(noteId))
// const editedNote = ref<Note>(
//   noteId
//     ? noteStore.getNoteById(noteId) || (noteStore.createNewNote() as Note)
//     : (noteStore.createNewNote() as Note)
// )

// 笔记选项菜单
const isOptionsMenuVisible = ref(false)
const noteOptionsMenu = ref<InstanceType<typeof NoteOptionsMenu> | null>(null)

const toggleOptionsMenu = () => {
  isOptionsMenuVisible.value = !isOptionsMenuVisible.value
}

const closeOptionsMenu = () => {
  isOptionsMenuVisible.value = false
  noteOptionsMenu.value?.resetState()
}

// 笔记的保存功能

const emptyNote: Note = {
  id: '',
  type: 'note',
  cardType: 'Maincard', // 或其他默认类型
  address: '',
  content: {
    type: 'doc',
    content: [{ type: 'paragraph' }]
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [],
  linkedTo: [],
  linkedFrom: [],
  cardBoxId: undefined,
  parentId: '',
  isDeleted: false,
  isStarred: false
}

const editedNote = ref<Note>({ ...emptyNote })
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')

// 加载笔记
const loadNote = async () => {
  try {
    editedNote.value = await noteStore.fetchNoteById(noteId)
  } catch (error) {
    console.error('Failed to load note:', error)
  }
}
// 自动保存
// 用于判断内容是否更新的函数
function isContentChanged(oldNote: Note, newNote: Note): boolean {
  return (
    JSON.stringify(oldNote.content) !== JSON.stringify(newNote.content) ||
    oldNote.address !== newNote.address ||
    oldNote.cardType !== newNote.cardType ||
    // 添加其他需要比较的字段
    JSON.stringify(oldNote.tags) !== JSON.stringify(newNote.tags)
  )
}

// 上一次保存的笔记内容
let lastSavedNote = JSON.parse(JSON.stringify(editedNote.value))
// 自动保存
const autoSave = debounce(async () => {
  if (editedNote.value && editedNote.value.id) {
    // 比较内容是否真的改变
    if (!isContentChanged(lastSavedNote, editedNote.value)) {
      console.log('Content not changed, skipping save')
      return
    }

    try {
      // noteStore.updateNoteSaveStatus(editedNote.value.id, 'saving')
      noteStore.updateCurrentNoteSaveStatus('saving')
      const updatedNote = await noteStore.updateNote(editedNote.value.id, editedNote.value)

      // noteStore.updateNoteSaveStatus(editedNote.value.id, 'saved')
      noteStore.updateCurrentNoteSaveStatus('saved')
      console.log('Note auto-saved successfully')

      // 更新最后保存的内容
      lastSavedNote = JSON.parse(JSON.stringify(updatedNote))

      // 更新编辑中的笔记
      editedNote.value = updatedNote
    } catch (error) {
      console.error('Auto-save failed:', error)
      // noteStore.updateNoteSaveStatus(editedNote.value.id, 'error')
      noteStore.updateCurrentNoteSaveStatus('error')
    }
  }
}, 2000)

// 监听笔记内容的变化
watch(
  () => [
    editedNote.value.content,
    editedNote.value.address,
    editedNote.value.cardType,
    editedNote.value.tags
  ],
  () => {
    if (isContentChanged(lastSavedNote, editedNote.value)) {
      autoSave()
    }
  },
  { deep: true }
)

// 监听笔记变化
// watch(
//   () => editedNote.value,
//   () => {
//     if (editedNote.value) {
//       autoSave()
//     }
//   },
//   { deep: true }
// )

// 定期保存
const autoSaveInterval = setInterval(() => {
  if (editedNote.value) {
    autoSave()
  }
}, 30000)

onMounted(loadNote)

onUnmounted(() => {
  clearInterval(autoSaveInterval)
  autoSave.cancel()
  noteStore.updateCurrentNoteSaveStatus('saved')
})

onBeforeUnmount(async () => {
  await saveNote()
})

// 更新内容
const updateContent = (newContent: any) => {
  if (editedNote.value) {
    editedNote.value.content = newContent
  }
}
// 手动保存（如果需要）
const saveNote = async () => {
  if (editedNote.value) {
    try {
      saveStatus.value = 'saving'
      await noteStore.updateNote(editedNote.value.id, editedNote.value)
      saveStatus.value = 'saved'
    } catch (error) {
      console.error('Manual save failed:', error)
      saveStatus.value = 'error'
    }
  }
}
// 卡片盒列表
const showCardBoxMenu = ref(false)
const selectedCardBox = ref<CardBox | null>(null)
const showMoreActions = ref<string | null>(null)
const cardBoxes = computed(() => {
  return [...noteStore.cardBoxes].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
})

const toggleCardBoxMenu = () => {
  showCardBoxMenu.value = !showCardBoxMenu.value
}

// 选择卡片盒
const selectCardBox = async (box: CardBox) => {
  if (!editedNote.value?.id) {
    console.error('NoteEditor.vue → 编辑的笔记为空')
    return
  }
  try {
    selectedCardBox.value = box
    const newCardBoxId = box.id
    const updatedNote = await noteStore.updateNoteCardBox(editedNote.value.id, newCardBoxId)
    if (updatedNote) {
      editedNote.value = updatedNote
      console.log('NoteEditor.vue → 卡片盒更新成功:', box.name)
    } else {
      console.error('NoteEditor.vue → 更新卡片盒失败: 未能获取更新后的笔记')
    }
  } catch (error) {
    console.error('NoteEditor.vue → 更新卡片盒失败:', error)
  }
}

// 全局点击事件，关闭下拉菜单
const handleGlobalClick = (event: MouseEvent) => {
  if (
    showCardBoxMenu.value &&
    event.target instanceof Element &&
    !event.target.closest('.install-btn') &&
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
  if (editedNote.value.cardBoxId) {
    const currentCardBox = cardBoxes.value.find((box) => box.id === editedNote.value.cardBoxId)
    if (currentCardBox) {
      selectedCardBox.value = currentCardBox
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
})

// 卡片类型选择菜单处理
const indicatorButton = ref<HTMLButtonElement | null>(null)
const showCardTypeMenu = ref(false)
const cardTypes: CardType[] = ['Maincard', 'Bibcard', 'Indexcard', 'Hoplinkcard']
const menuStyle = ref({})

const cardTypeClass = computed(() => ({
  maincard: editedNote.value?.cardType === 'Maincard',
  bibcard: editedNote.value?.cardType === 'Bibcard',
  indexcard: editedNote.value?.cardType === 'Indexcard',
  hoplinkcard: editedNote.value?.cardType === 'Hoplinkcard'
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

const toggleCardTypeMenu = (event: MouseEvent) => {
  event.stopPropagation()
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
  if (editedNote.value) {
    editedNote.value.cardType = type
    showCardTypeMenu.value = false
    saveNote()
  }
}

// 聚焦地址输入框
const focusAddressInput = () => {
  nextTick(() => {
    addressInput.value?.focus()
  })
}

const focusEditor = () => {
  nextTick(() => {
    tiptapEditor.value?.focus()
  })
}

// 在组件挂载后聚焦
onMounted(() => {
  focusAddressInput()
})

// 当 noteId 改变时聚焦（用于编辑现有笔记）
watch(
  () => noteId,
  () => {
    focusAddressInput()
  }
)

// 展开编辑器
// const handleExpand = async () => {
//   await saveNote()
//   isExpandingToExpandEditor.value = true
//   if (editedNote.value?.id) {
//     router.push({ name: 'NoteExpandEditor', params: { id: editedNote.value.id } })
//   }
//   noteStore.closeNoteEditor()
// }
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
  // gap: 10px;
  position: relative;
  // margin-right: 10px;
}

// .info-btn,
// .more-btn {
//   // position: relative;
//   display: flex;
//   align-items: center;
//   // width: 200px;
//   // padding: 8px 12px;
//   border: none;
//   background: none;
//   cursor: pointer;
//   transition: background-color 0.2s;
//   border-radius: 8px;
//   // margin: 2px 8px;

//   .icon {
//     background: none;
//     border: none;
//     cursor: pointer;
//     width: 28px;
//     height: 28px;
//     display: flex;
//     align-items: center;
//     justify-content: center;
//     border-radius: 6px;
//     transition: background-color 0.2s;
//     padding: 0;
//     // margin-right: 3px;

//     &:hover:not(:disabled) {
//       background-color: var(--color-hover-bg);
//     }

//     &:disabled {
//       opacity: 0.5;
//       cursor: not-allowed;
//     }

//     // 新增以下样式来处理 i-icon 类
//     .i-icon {
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       width: 100%;
//       height: 100%;
//     }

//     svg {
//       width: 18px; // 或者您想要的大小
//       height: 18px; // 或者您想要的大小
//     }
//   }

//   .name {
//     flex-grow: 0;
//     text-align: left;
//     color: var(--default-text-color);
//     font-size: 15px;
//     white-space: nowrap; // 防止文字换行
//     writing-mode: horizontal-tb; // 确保文字是水平排列的
//   }

//   &:hover {
//     background-color: var(--color-hover-bg);
//   }

//   &.active {
//     background-color: var(--color-menu-active-bg);
//     // border: 1px solid var(--color-primary);
//   }
// }

.info-btn,
.more-btn {
  position: relative;
  display: flex;
  align-items: center;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
  padding: 4px 4px;
  margin: 2px;

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

    // &:hover:not(:disabled) {
    //   background-color: rgba(0, 0, 0, 0.05);
    // }

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
      width: 16px;
      height: 16px;
    }
  }

  .name {
    flex-grow: 0;
    text-align: left;
    color: var(--default-text-color);
    font-size: 13px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
  }

  &:hover {
    background-color: var(--color-hover-button);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }
}

.dropdown-container {
  position: relative;
}
</style>
