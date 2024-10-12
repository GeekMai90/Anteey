<!-- src/components/NoteEditor.vue -->
<template>
  <div class="note-editor">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <!-- 展开编辑器 -->
      <div
        v-tooltip.bottom="{ content: '展开编辑器', delay: { show: 1000 } }"
        class="expand-btn"
        @click="handleExpand"
      >
        <div class="icon">
          <ExpandTextInput theme="outline" size="16" fill="#b6b6b6" :stroke-width="3" />
        </div>
      </div>
      <div class="toolbar-right">
        <div ref="infoBtnRef" class="install-btn" @click.stop="showCardBoxMenu">
          <div v-tooltip.bottom="{ content: '设置卡片盒', delay: { show: 1000 } }" class="icon">
            <Install theme="outline" size="16" fill="#b6b6b6" :stroke-width="3" />
          </div>
          <!-- 添加卡片盒下拉菜单 -->
          <CardboxDropdownMenu
            ref="dropdownMenu"
            :is-open="isMenuOpen"
            :note-id="editedNote?.id"
            :current-cardbox-id="editedNote?.cardBoxId"
            :offset="{ x: -120, y: 5 }"
            @close="closeCardBoxMenu"
          />
        </div>

        <div ref="moreBtnRef" class="more-btn" @click.stop="toggleMenu">
          <div v-tooltip.bottom="{ content: '更多', delay: { show: 1000 } }" class="icon">
            <More theme="outline" size="16" fill="var(--color-icon-default)" :stroke-width="3" />
          </div>
        </div>
      </div>
    </div>
    <!-- 编辑器内容 -->
    <div class="editor-content">
      <div class="address-input">
        <div
          ref="indicatorButton"
          class="note-indicator"
          :class="cardTypeClass"
          @click.stop="toggleCardTypeMenu"
        ></div>
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
      <div class="content-area">
        <div class="content-wrapper">
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
    <!-- 卡片类型选择菜单 -->
    <div v-if="showCardTypeMenu" class="card-type-menu" :style="menuStyle" @click.stop>
      <div
        v-for="type in cardTypes"
        :key="type"
        :class="{ active: editedNote?.cardType === type }"
        class="card-type-item"
        @click="selectCardType(type)"
      >
        <div class="icon">
          <component :is="getIcon(type)" theme="outline" size="16" fill="#b6b6b6" />
        </div>
        <div class="name">{{ getTypeLabel(type) }}</div>
      </div>
    </div>
    <PopupMenu
      ref="popupMenuRef"
      :show="isMenuVisible"
      :menuItems="noteMenuItems"
      :position="menuPosition"
      :offset="{ x: -140, y: 5 }"
      @close="closeMenu"
      @itemClick="handleMenuItemClick"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onUnmounted, reactive, ref, watch } from 'vue'
import { CardType, Note } from '../types/Note'
import { useNoteStore } from '../stores/noteStores'
import TipTapEditor from '../components/TipTapEditor.vue'
import { useRouter } from 'vue-router'
import {
  Notes,
  BookOpen,
  ViewList,
  Link,
  ExpandTextInput,
  Install,
  More
} from '@icon-park/vue-next'
import CardboxDropdownMenu from './CardboxDropdownMenu.vue'
import { debounce } from 'lodash-es'
import { storeToRefs } from 'pinia'
import PopupMenu from './PopupMenu.vue'
import { useNoteMenu } from '../composables/useNoteMenu'
import type { MenuItem } from './PopupMenu.vue'
const props = defineProps<{
  noteId: string
}>()

// 更多按钮弹出菜单
const moreBtnRef = ref<HTMLElement | null>(null)
const popupMenuRef = ref<InstanceType<typeof PopupMenu> | null>(null)
const isMenuVisible = ref(false)
const menuPosition = reactive({ x: 0, y: 0 })

const { menuItems: noteMenuItems, resetDeleteState } = useNoteMenu({
  noteId: props.noteId,
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

const router = useRouter()
const addressInput = ref<HTMLInputElement | null>(null)
const tiptapEditor = ref<InstanceType<any> | null>(null)
// const emit = defineEmits(['close', 'save', 'expand', 'toggleOptions'])

const isExpandingToExpandEditor = ref(false)

const noteStore = useNoteStore()
const { currentNote } = storeToRefs(noteStore)

const isContentModified = ref(false)
const lastSavedNote = ref(null)

// 监听笔记 ID 的变化，获取笔记
watch(
  () => props.noteId,
  async (newId) => {
    if (newId) {
      await noteStore.fetchNoteById(newId)
    }
  },
  { immediate: true }
)
const editedNote = computed(() => currentNote.value)

// 更新内容
const updateContent = debounce((newContent: any) => {
  if (editedNote.value) {
    noteStore.updateNoteContent(editedNote.value.id, newContent)
    isContentModified.value = true
  }
}, 300)
// 添加处理地址输入的函数
const handleAddressInput = debounce(() => {
  if (editedNote.value) {
    isContentModified.value = true
    saveNote()
  }
}, 300)

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

onUnmounted(() => {
  clearInterval(autoSaveInterval)
  autoSave.cancel()
  noteStore.updateCurrentNoteSaveStatus('saved')
})

// 组件卸载前保存
onBeforeUnmount(async () => {
  await saveNote()
})

// 定期保存
const autoSaveInterval = setInterval(() => {
  if (editedNote.value) {
    autoSave()
  }
}, 30000)

// onMounted(loadNote)

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

// 展开编辑器
const handleExpand = async () => {
  await saveNote()
  isExpandingToExpandEditor.value = true
  if (editedNote.value?.id) {
    router.push({ name: 'NoteExpandEditor', params: { id: editedNote.value.id } })
  }
  noteStore.closeNoteEditor()
}

// defineExpose({ handleAutoSave, focusAddressInput })
defineExpose({ focusAddressInput, focusEditor })
</script>

<style lang="scss" scoped>
.note-editor {
  background-color: var(--color-bg-primary);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  height: 600px;
  max-height: 600px;
  width: 640px;
  max-width: 100%;
  position: relative;

  // 顶部工具栏
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    position: relative;

    .expand-btn {
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

    .install-btn {
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

      :deep(.dropdown-menu) {
        transform: translateX(-70%);
      }

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

      :deep(.note-options-menu) {
        transform: translateX(-80%);
      }

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

    .toolbar-right {
      display: flex;
      // gap: 10px;
    }
  }

  .editor-content {
    display: flex;
    flex-direction: column;
    // flex-grow: 1;
    flex: 1;
    min-height: 0;
    // padding: 0 10px 0 20px;
    width: 100%;
    // padding: 0 10px;
    overflow: hidden; // 防止双重滚动条

    .address-input {
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-left: 27px;
      width: 100%;

      input {
        width: 100%;
        padding: 8px 0;
        border: none;
        outline: none;
        font-size: 1.3rem;
        font-weight: bold;
        background-color: transparent;
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

      .note-indicator {
        width: 4px;
        height: 14px;
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
    }

    .content-area {
      flex-grow: 1;
      display: flex;
      overflow-y: auto;
      min-height: 0;
      width: 100%;
      height: 100%;
      // max-width: 640px;
      // margin: 0 auto;

      .content-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 100%;
        padding-bottom: 50px; // 添加底部填充
        width: 100%;
      }
    }

    :deep(.tiptap-container) {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      padding: 0 10px;
      position: relative;
    }

    :deep(.tiptap) {
      // min-width: calc(640px - 64px);
      min-width: calc(100% - 40px);
      // width: 100%;
      min-height: 100%;
      overflow-y: auto;
      // overflow: hidden;
      padding-bottom: 60px;
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
          width: 16px; // 或者您想要的大小
          height: 16px; // 或者您想要的大小
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
}
</style>
