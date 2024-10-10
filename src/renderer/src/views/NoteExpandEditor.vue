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
          <CardTypeDropdownMenu
            ref="cardTypeDropdownMenu"
            :is-open="showCardTypeMenu"
            :current-card-type="editedNote?.cardType"
            :offset="{ x: -50, y: 10 }"
            @update:card-type="updateCardType"
            @close="closeCardTypeMenu"
          />
          <input
            v-if="editedNote"
            ref="addressInput"
            v-model="editedNote.address"
            type="text"
            placeholder="输入编码地址"
            @input="handleAddressInput"
            @keyup.enter="handleAddressEnter"
          />
        </div>
        <div class="toolbar-right">
          <div ref="infoBtnRef" class="install-btn" @click.stop="showCardBoxMenu">
            <div v-tooltip.bottom="{ content: '设置卡片盒', delay: { show: 1000 } }" class="icon">
              <Install
                theme="outline"
                size="18"
                fill="var(--color-icon-default)"
                :stroke-width="3"
              />
            </div>
            <!-- 添加卡片盒下拉菜单 -->
            <CardboxDropdownMenu
              ref="dropdownMenu"
              :is-open="isMenuOpen"
              :note-id="editedNote?.id"
              :current-cardbox-id="editedNote?.cardBoxId"
              :offset="{ x: -85, y: 5 }"
              @close="closeCardBoxMenu"
            />
          </div>
          <!-- 更多菜单 -->
          <div ref="moreBtnRef" class="more-btn" @click.stop="toggleMenu">
            <div v-tooltip.bottom="{ content: '更多', delay: { show: 1000 } }" class="icon">
              <More theme="outline" size="16" fill="var(--color-icon-default)" :stroke-width="3" />
            </div>
            <PopupMenu
              ref="popupMenuRef"
              :show="isMenuVisible"
              :menuItems="noteMenuItems"
              :position="menuPosition"
              :offset="{ x: -75, y: 5 }"
              @close="closeMenu"
              @itemClick="handleMenuItemClick"
            />
          </div>
        </div>
      </div>
      <div v-if="editedNote" class="note-timestamp">
        {{ formatDate(editedNote.createdAt) }}
      </div>
      <!-- 编辑器内容 -->
      <div class="content-area">
        <TipTapEditor
          v-if="editedNote"
          ref="tiptapEditor"
          v-model:content="editedNote.content"
          :editable="true"
          :enableDragHandle="true"
          @update:content="updateContent"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  watch,
  onBeforeUnmount,
  onMounted,
  computed,
  nextTick,
  onUnmounted,
  reactive
} from 'vue'
import { useRoute } from 'vue-router'
import { useNoteStore } from '../stores/noteStores'
import { CardType, Note } from '../types/Note'
import { formatDate } from '../utils/noteHelpers'
import { More, Install } from '@icon-park/vue-next'
import TipTapEditor from '../components/TipTapEditor.vue'
import CardboxDropdownMenu from '../components/CardboxDropdownMenu.vue'
import AppToolbar from '../components/AppToolbar.vue'
import { debounce } from 'lodash-es'
import PopupMenu from '../components/PopupMenu.vue'
import { useNoteMenu } from '../composables/useNoteMenu'
import type { MenuItem } from '../components/PopupMenu.vue'
import { storeToRefs } from 'pinia'
import CardTypeDropdownMenu from '../components/CardTypeDropdownMenu.vue'

const tiptapEditor = ref<any>(null)
const route = useRoute()
const noteStore = useNoteStore()
const noteId = route.params.id as string
const addressInput = ref<HTMLInputElement | null>(null)

const cardTypeDropdownMenu = ref<InstanceType<typeof CardTypeDropdownMenu> | null>(null)
const showCardTypeMenu = ref(false)
const indicatorButton = ref<HTMLElement | null>(null)

const cardTypeClass = computed(() => ({
  maincard: editedNote.value?.cardType === 'Maincard',
  bibcard: editedNote.value?.cardType === 'Bibcard',
  indexcard: editedNote.value?.cardType === 'Indexcard',
  hoplinkcard: editedNote.value?.cardType === 'Hoplinkcard'
}))

const toggleCardTypeMenu = (event: MouseEvent) => {
  event.stopPropagation()
  showCardTypeMenu.value = !showCardTypeMenu.value
  if (showCardTypeMenu.value && indicatorButton.value) {
    const rect = indicatorButton.value.getBoundingClientRect()
    menuPosition.x = rect.left
    menuPosition.y = rect.bottom
    showCardTypeMenu.value = true
    nextTick(() => {
      cardTypeDropdownMenu.value?.openMenu(menuPosition.x, menuPosition.y)
    })
  }
}

const closeCardTypeMenu = () => {
  showCardTypeMenu.value = false
}

const updateCardType = (newType: CardType) => {
  if (editedNote.value) {
    editedNote.value.cardType = newType
    saveNote()
  }
}

// 卡片盒列表
const dropdownMenu = ref<InstanceType<typeof CardboxDropdownMenu> | null>(null)
const isMenuOpen = ref(false)
const infoBtnRef = ref<HTMLElement | null>(null)

const showCardBoxMenu = (event: MouseEvent) => {
  event.preventDefault()
  isMenuOpen.value = !isMenuOpen.value
  if (isMenuOpen.value && infoBtnRef.value) {
    const rect = infoBtnRef.value.getBoundingClientRect()
    menuPosition.x = rect.left
    menuPosition.y = rect.bottom
    isMenuOpen.value = true
    nextTick(() => {
      dropdownMenu.value?.openMenu(menuPosition.x, menuPosition.y)
    })
  }
}
const closeCardBoxMenu = () => {
  isMenuOpen.value = false
}

// 更多按钮弹出菜单
const moreBtnRef = ref<HTMLElement | null>(null)
const popupMenuRef = ref<InstanceType<typeof PopupMenu> | null>(null)
const isMenuVisible = ref(false)
const menuPosition = reactive({ x: 0, y: 0 })

const { menuItems: noteMenuItems, resetDeleteState } = useNoteMenu({
  noteId: noteId,
  menuItems: ['star', 'sidebar', 'delete']
})
const toggleMenu = (event: MouseEvent) => {
  event.preventDefault()
  isMenuVisible.value = !isMenuVisible.value
  if (isMenuVisible.value && moreBtnRef.value) {
    const rect = moreBtnRef.value.getBoundingClientRect()
    menuPosition.x = rect.left
    menuPosition.y = rect.bottom
    isMenuVisible.value = true
    nextTick(() => {
      popupMenuRef.value?.openMenu()
    })
  }
}
const handleMenuItemClick = (item: MenuItem) => {
  item.action()
  if (item.name !== 'delete') {
    closeMenu()
  }
}

const closeMenu = () => {
  isMenuVisible.value = false
  resetDeleteState()
}

const { currentNote } = storeToRefs(noteStore)

const isContentModified = ref(false)
const lastSavedNote = ref(null)

// 监听笔记 ID 的变化，获取笔记
watch(
  () => noteId,
  async (newId) => {
    await noteStore.fetchNoteById(newId)
  },
  { immediate: true }
)

const editedNote = computed({
  get: () => currentNote.value,
  set: (newValue) => {
    if (newValue) {
      noteStore.updateCurrentNote(newValue)
      isContentModified.value = true
    }
  }
})

// 更新内容
const updateContent = (newContent: any) => {
  if (editedNote.value) {
    noteStore.updateNoteContent(editedNote.value.id, newContent)
    isContentModified.value = true
  }
}
// 添加处理地址输入的函数
const handleAddressInput = () => {
  if (editedNote.value) {
    isContentModified.value = true
    saveNote()
  }
}

// 检查内容是否改变
function isContentChanged(oldNote: Note, newNote: Note): boolean {
  return (
    JSON.stringify(oldNote.content) !== JSON.stringify(newNote.content) ||
    oldNote.address !== newNote.address ||
    oldNote.cardType !== newNote.cardType ||
    JSON.stringify(oldNote.tags) !== JSON.stringify(newNote.tags)
  )
}

// 自动保存
const autoSave = debounce(async () => {
  if (editedNote.value && editedNote.value.id && isContentModified.value) {
    if (!lastSavedNote.value || isContentChanged(lastSavedNote.value, editedNote.value)) {
      try {
        await noteStore.updateNote(editedNote.value.id, editedNote.value)
        lastSavedNote.value = JSON.parse(JSON.stringify(editedNote.value))
        isContentModified.value = false
        console.log('笔记已自动保存')
      } catch (error) {
        console.error('自动保存失败:', error)
      }
    }
  }
}, 2000)

// 监听笔记内容的变化
watch(
  () => ({
    content: editedNote.value?.content,
    address: editedNote.value?.address,
    cardType: editedNote.value?.cardType,
    tags: editedNote.value?.tags
  }),
  () => {
    if (editedNote.value) {
      isContentModified.value = true
      autoSave()
    }
  },
  { deep: true }
)

// 手动保存
const saveNote = async () => {
  if (editedNote.value && editedNote.value.id && isContentModified.value) {
    try {
      await noteStore.updateNote(editedNote.value.id, editedNote.value)
      lastSavedNote.value = JSON.parse(JSON.stringify(editedNote.value))
      isContentModified.value = false
      console.log('笔记已手动保存')
    } catch (error) {
      console.error('手动保存失败:', error)
    }
  }
}
// 定期保存
const autoSaveInterval = setInterval(() => {
  if (editedNote.value) {
    autoSave()
  }
}, 30000)

onUnmounted(() => {
  clearInterval(autoSaveInterval)
  autoSave.cancel()
  noteStore.updateCurrentNoteSaveStatus('saved')
})

// 组件卸载前保存
onBeforeUnmount(async () => {
  await saveNote()
})

// 聚焦地址输入框
const focusAddressInput = () => {
  nextTick(() => {
    addressInput.value?.focus()
  })
}

// 修改 focusEditor 函数
const focusEditor = () => {
  nextTick(() => {
    tiptapEditor.value?.focus('end')
  })
}

// 添加新的处理函数
const handleAddressEnter = (event: KeyboardEvent) => {
  event.preventDefault() // 阻止默认行为
  focusEditor()
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
  margin-left: 35px;
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
  margin-bottom: 20px;
  margin-left: 33px;
  user-select: none;
}

.toolbar-right {
  display: flex;
  // gap: 10px;
  position: relative;
  // margin-right: 10px;
}

.install-btn,
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
      width: 18px;
      height: 18px;
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
