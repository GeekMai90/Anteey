<!-- src/components/WhiteNoteComponent.vue -->
<template>
  <div
    :id="`note-${props.noteId}`"
    ref="noteRef"
    class="whiteboard-note-component"
    :class="['whiteboard-note', { hovered: isHovered, editing: isEditing, selected: isSelected }]"
    :style="noteStyle"
    @click="handleClick"
    @mousedown.stop="handleMouseDown"
    @touchstart.stop="handleTouchStart"
    @dblclick="startEditing"
    @v-click-outside="stopEditing"
    @mouseenter="handleNoteHover(true)"
    @mouseleave="handleNoteHover(false)"
  >
    <!-- 顶部工具栏 -->
    <WhiteboardNoteToolbar
      :isCardBoxMenuOpen="showCardBoxMenu"
      :cardBoxes="cardBoxes"
      :selectedCardBox="selectedCardBox"
      @expand="handleExpand"
      @toggle-cardbox-menu="toggleCardBoxMenu"
      @start-connection="startConnection"
      @open-menu="openMenu"
      @close-menu="closeMenu"
      @select-card-box="selectCardBox"
      @close-cardbox-menu="showCardBoxMenu = false"
    />

    <!-- 编辑器内容 -->
    <div class="editor-content" :style="editorContentStyle">
      <div
        class="address-input"
        :class="{ 'not-editing': !isEditing }"
        @mousedown.stop="handleAddressMouseDown"
      >
        <div
          ref="indicatorButton"
          class="note-indicator"
          :class="cardTypeClass"
          @mousedown.stop="handleIndicatorMouseDown"
        ></div>
        <input
          ref="addressInput"
          v-model="editedNote.address"
          type="text"
          placeholder="输入编码地址"
          @keyup.enter="focusEditor"
        />
      </div>
      <div ref="editorContainerRef" class="content-area" :style="contentAreaStyle">
        <TipTapEditor
          ref="tiptapEditorRef"
          :content="editedNote.content"
          :editable="isEditing"
          :enableDragHandle="true"
          @update:content="updateContent"
        />
      </div>
    </div>
    <div class="resize-handle top" @mousedown="startResize('top', $event)"></div>
    <div class="resize-handle right" @mousedown="startResize('right', $event)"></div>
    <div class="resize-handle bottom" @mousedown="startResize('bottom', $event)"></div>
    <div class="resize-handle left" @mousedown="startResize('left', $event)"></div>
    <div class="resize-handle top-left" @mousedown="startResize('top-left', $event)"></div>
    <div class="resize-handle top-right" @mousedown="startResize('top-right', $event)"></div>
    <div class="resize-handle bottom-right" @mousedown="startResize('bottom-right', $event)"></div>
    <div class="resize-handle bottom-left" @mousedown="startResize('bottom-left', $event)"></div>
    <PopupMenu ref="popupMenuRef" :menuItems="whiteboardMenuItems" />
    <!-- 卡片类型选择菜单 -->
    <CardTypeMenu
      v-model="editedNote.cardType"
      :show="showCardTypeMenu"
      :position="menuPosition"
      @close="showCardTypeMenu = false"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  ComputedRef,
  CSSProperties,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  ref,
  watch
} from 'vue'
import { Note, CardBox, WhiteboardNote } from '../types/Note'
import { useNoteStore } from '../stores/noteStores'
import TipTapEditor from '../components/TipTapEditor.vue'
import { useRouter } from 'vue-router'
import { debounce } from 'lodash-es'
import PopupMenu from '@renderer/components/PopupMenu.vue'
import { useNoteMenu } from '@renderer/composable/useNoteMenu'
import { useWhiteboardStore } from '../stores/whiteboardStores'
import { storeToRefs } from 'pinia'
import { onClickOutside } from '@vueuse/core'
import { useResizeObserver } from '@vueuse/core'
import WhiteboardNoteToolbar from './WhiteboardNoteToolbar.vue'
import CardTypeMenu from './CardTypeMenu.vue'

const props = defineProps<{
  noteId: string
  width?: number
  height?: number
  item: WhiteboardNote
  isHovered: boolean
  isSelected: boolean
}>()

const router = useRouter()
const addressInput = ref<HTMLInputElement | null>(null)
const tiptapEditorRef = ref<InstanceType<any> | null>(null)
// const emit = defineEmits(['close', 'save', 'expand', 'toggleOptions'])
const noteStore = useNoteStore()
const whiteboardStore = useWhiteboardStore()
const isExpandingToExpandEditor = ref(false)
const showCardBoxMenu = ref(false)
const selectedCardBox = ref<CardBox | null>(null)
const showMoreActions = ref<string | null>(null)
const isEditing = ref(false)

const { getWhiteboardNoteById } = storeToRefs(whiteboardStore)
const currentWhiteboardNote = computed(() => getWhiteboardNoteById.value(props.item.id))

const minHeight = 150 // 设置最小高度
const editorContainerRef = ref<HTMLElement | null>(null)
const extraHeight = 150 // 工具栏和地址输入框的估计高度

const noteRef = ref(null)

const isHovering = ref(false)

const isAutoHeight = ref(currentWhiteboardNote.value?.isAutoHeight)

const emit = defineEmits([
  'hover',
  'resize-start',
  'start-connection',
  'note-interaction',
  'drag-start',
  'click'
])

const handleClick = (event: MouseEvent) => {
  emit('click', event)
}

const handleMouseDown = (event: MouseEvent) => {
  if (!isEditing.value) {
    event.preventDefault()
    emit('drag-start', event)
  }
}
const handleTouchStart = (event: TouchEvent) => {
  if (!isEditing.value) {
    event.preventDefault()
    emit('drag-start', event)
  }
}
const handleAddressMouseDown = (event: MouseEvent) => {
  if (!isEditing.value) {
    event.preventDefault()
    emit('drag-start', event)
  }
}

const handleNoteHover = (hovering: boolean) => {
  isHovering.value = hovering
  emit('hover', hovering)
}

// 编辑状态下可以滚动
const contentAreaStyle = computed(() => ({
  flexGrow: 1,
  overflowY: isAutoHeight.value ? ('hidden' as const) : ('visible' as const),
  maxHeight: isAutoHeight.value ? '100%' : 'none'
}))

onClickOutside(noteRef, () => {
  if (isEditing.value) {
    stopEditing()
  }
})

const emitNoteInteraction = (interacting: boolean) => {
  emit('note-interaction', interacting)
}

const stopEditing = () => {
  isEditing.value = false
  emitNoteInteraction(false)
}

const startEditing = (event: MouseEvent) => {
  event.stopPropagation()
  isEditing.value = true
  emitNoteInteraction(true)
  nextTick(() => {
    if (tiptapEditorRef.value) {
      tiptapEditorRef.value.$forceUpdate()
      focusEditor()
    }
  })
}

onUnmounted(() => {
  isEditing.value = false
  emitNoteInteraction(false)
})

// 使用计算属性获���最新的笔记大小
const whiteboardNoteSize = computed(() => {
  const note = whiteboardStore.whiteboardNotes.find((note) => note.id === props.item.id)
  return note?.size || { width: 350, height: minHeight }
})

const noteStyle = computed(() => ({
  width: `${whiteboardNoteSize.value.width}px`,
  height: `${whiteboardNoteSize.value.height}px`, // 始终使用保存的高度
  minHeight: `${minHeight}px`
}))
const editorContentStyle = computed(() => ({
  height: isAutoHeight.value ? `${whiteboardNoteSize.value.height}px` : '100%',
  overflowY: isAutoHeight.value ? 'hidden' : 'visible'
})) as ComputedRef<CSSProperties>

const contentHeight = ref(0)

watch(tiptapEditorRef, (newValue) => {
  if (newValue && newValue.$el instanceof HTMLElement) {
    useResizeObserver(newValue.$el, async (entries) => {
      const entry = entries[0]
      if (entry && isAutoHeight.value) {
        const newContentHeight = entry.contentRect.height
        if (Math.abs(newContentHeight - contentHeight.value) > 5) {
          contentHeight.value = newContentHeight
          requestAnimationFrame(smoothUpdateHeight)
        }
      }
    })
  }
})

// 平滑地更新高度
const smoothUpdateHeight = () => {
  if (!isAutoHeight.value || !tiptapEditorRef.value) return

  const currentHeight = editorContainerRef.value?.clientHeight || 0
  const targetHeight = Math.max(contentHeight.value + extraHeight, minHeight)
  if (editorContainerRef.value) {
    if (Math.abs(targetHeight - currentHeight) > 1) {
      const newHeight = currentHeight + (targetHeight - currentHeight) * 0.2
      editorContainerRef.value.style.height = `${newHeight - extraHeight}px`
      requestAnimationFrame(smoothUpdateHeight)
    } else {
      editorContainerRef.value.style.height = `${targetHeight - extraHeight}px`
      whiteboardStore.updateWhiteboardNoteSize(
        props.item.id,
        whiteboardNoteSize.value.width,
        targetHeight
      )
    }
  }
}

const updateHeight = async () => {
  if (!isAutoHeight.value) return

  await nextTick()
  if (editorContainerRef.value) {
    const tiptapContainer = editorContainerRef.value.querySelector('.tiptap') as HTMLElement
    if (tiptapContainer) {
      const currentHeight = editorContainerRef.value.clientHeight
      const contentHeight = tiptapContainer.scrollHeight
      if (contentHeight > currentHeight - extraHeight) {
        const newHeight = Math.max(contentHeight + extraHeight, minHeight)
        await whiteboardStore.updateWhiteboardNoteSize(
          props.item.id,
          whiteboardNoteSize.value.width,
          newHeight
        )
        editorContainerRef.value.style.height = `${newHeight - extraHeight}px`
      }
    }
  }
}
// 添加恢复默认高度的函数
const restoreDefaultHeight = () => {
  isAutoHeight.value = true
  whiteboardStore.updateWhiteboardNoteAutoHeight(props.item.id, true)
  updateHeight()
}

// 监听笔记大小的变化
watch(
  () => whiteboardNoteSize.value,
  (newSize, oldSize) => {
    console.log('Note size changed:', oldSize, '->', newSize)
    if (newSize.height !== oldSize.height) {
      nextTick(() => {
        if (editorContainerRef.value) {
          editorContainerRef.value.style.height = `${newSize.height}px`
        }
      })
    }
  },
  { deep: true }
)

const startResize = (direction: string, event: MouseEvent) => {
  console.log('开始调整大小', { id: props.item.id, isAutoHeight: false })
  whiteboardStore.updateWhiteboardNoteAutoHeight(props.item.id, false)
  isAutoHeight.value = false
  emit('resize-start', {
    direction,
    event,
    onResize: (newWidth: number, newHeight: number) => {
      whiteboardStore.updateWhiteboardNoteSize(props.item.id, newWidth, newHeight)
    }
  })
}
const startConnection = (event: MouseEvent) => {
  event.stopPropagation()
  console.log('Start connection clicked') // 添加这行来调试
  emit('start-connection', props.item)
}

const popupMenuRef = ref<{ openMenu: (x: number, y: number) => void } | null>(null)

// const { menuItems } = useNoteMenu(props.noteId)
const { menuItems: whiteboardMenuItems } = useNoteMenu({
  noteId: props.noteId,
  whiteboardNoteId: props.item.id,
  onRestoreDefaultHeight: restoreDefaultHeight,
  menuItems: ['star', 'sidebar', 'restoreDefaultHeight', 'trashFromWhiteboard']
})

const openMenu = (event: MouseEvent) => {
  event.preventDefault()
  popupMenuRef.value?.openMenu(event.clientX, event.clientY)
}
const closeMenu = () => {
  useNoteMenu({ noteId: props.noteId, whiteboardNoteId: props.item.id }).closePopupMenu()
}

// 笔记的保存功能

const emptyNote: Note = {
  id: '',
  type: 'note',
  address: '',
  cardType: 'Maincard',
  content: {
    type: 'doc',
    content: [{ type: 'paragraph' }]
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [],
  linkedTo: [],
  linkedFrom: [],
  cardBoxId: '',
  parentId: '',
  isDeleted: false,
  isStarred: false,
  starredOrder: 0,
  rightBarOrder: 0
}

const editedNote = ref<Note>({ ...emptyNote })
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')

// 数据是否加载完成
const isInitialized = ref(false)

// 加载笔记
const loadNote = async () => {
  if (props.noteId) {
    const note = await noteStore.getNoteById(props.noteId)
    if (note) {
      editedNote.value = JSON.parse(JSON.stringify(note))
      lastSavedNote = JSON.parse(JSON.stringify(note))
      isInitialized.value = true
    } else {
      console.error('WhiteboardNoteComponent.vue → 编辑的笔记为空')
    }
  } else {
    console.error('WhiteboardNoteComponent.vue → 编辑的笔记为空')
  }
}

// 在组件挂载时加载笔记
onMounted(() => {
  loadNote()
})

// 自动保存功能

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

// 是否有未保存的更改
const hasUnsavedChanges = ref(false)
// 自动保存计时器
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

// 上一次保存的笔记内容
let lastSavedNote = JSON.parse(JSON.stringify(editedNote.value))

// 监听笔记内容的变化
// 当笔记内容发生变化时，设置 hasUnsavedChanges 为 true，并重置自动保存计时器
watch(
  () => [
    editedNote.value.content,
    editedNote.value.address,
    editedNote.value.cardType,
    editedNote.value.tags
  ],
  () => {
    if (isInitialized.value && isContentChanged(lastSavedNote, editedNote.value)) {
      hasUnsavedChanges.value = true
      resetAutoSaveTimer()
    }
  },
  { deep: true }
)

// 重置自动保存计时器
const resetAutoSaveTimer = () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
  // 如果有未保存的更改，3秒后自动保存
  autoSaveTimer = setTimeout(() => {
    if (hasUnsavedChanges.value) {
      autoSave()
    }
  }, 5000)
}

// 自动保存
const autoSave = debounce(async () => {
  if (editedNote.value && editedNote.value.id && hasUnsavedChanges.value && isInitialized.value) {
    try {
      console.log('WhiteboardNoteComponent.vue → 正在保存笔记:', editedNote.value)
      noteStore.updateCurrentNoteSaveStatus('saving')
      const updatedNote = await noteStore.updateNote(editedNote.value.id, editedNote.value)

      noteStore.updateCurrentNoteSaveStatus('saved')
      console.log('WhiteboardNoteComponent.vue → 自动保存成功')

      lastSavedNote = JSON.parse(JSON.stringify(updatedNote))
      editedNote.value = updatedNote
      hasUnsavedChanges.value = false
    } catch (error) {
      console.error('WhiteboardNoteComponent.vue → 自动保存失败:', error)
      noteStore.updateCurrentNoteSaveStatus('error')
    }
  }
}, 2000)

onUnmounted(() => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
  autoSave.cancel()
  noteStore.updateCurrentNoteSaveStatus('saved')
})

// 更新内容
const updateContent = (newContent: any) => {
  console.log('updateContent 被执行了')
  if (editedNote.value) {
    editedNote.value.content = newContent
    console.log('isAutoHeight', isAutoHeight.value)
    if (isAutoHeight.value) {
      updateHeight()
    }
  }
}
// 手动保存
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
// 在组件卸载前保存笔记
onBeforeUnmount(async () => {
  await saveNote()
})

// 卡片盒列表
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
    console.error('NoteEditor.vue → 更新片盒失败:', error)
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
const menuPosition = ref({ x: 0, y: 0 })

const cardTypeClass = computed(() => ({
  maincard: editedNote.value?.cardType === 'Maincard',
  bibcard: editedNote.value?.cardType === 'Bibcard',
  indexcard: editedNote.value?.cardType === 'Indexcard',
  hoplinkcard: editedNote.value?.cardType === 'Hoplinkcard'
}))

const handleIndicatorMouseDown = (event: MouseEvent) => {
  event.stopPropagation()
  event.preventDefault()
  if (isEditing.value) {
    console.log('弹出卡片类型菜单')
    toggleCardTypeMenu(event)
  } else {
    emit('drag-start', event)
  }
}

const toggleCardTypeMenu = (event: MouseEvent) => {
  event.stopPropagation()
  event.preventDefault()
  showCardTypeMenu.value = !showCardTypeMenu.value
  if (showCardTypeMenu.value) {
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    menuPosition.value = {
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY
    }
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
    if (tiptapEditorRef.value && isEditing.value) {
      tiptapEditorRef.value.focus()
    }
  })
}

// 当 noteId 改变时聚焦（用于编辑现有笔记）
// watch(
//   () => props.noteId,
//   () => {
//     focusAddressInput()
//   }
// )

// 展开编辑器
const handleExpand = async () => {
  await saveNote()
  isExpandingToExpandEditor.value = true
  if (editedNote.value?.id) {
    router.push({ name: 'NoteExpandEditor', params: { id: editedNote.value.id } })
  }
  noteStore.closeNoteEditor()
}

defineExpose({ focusAddressInput, restoreDefaultHeight })
</script>

<style lang="scss" scoped>
.whiteboard-note-component {
  background-color: var(--color-bg-primary);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: var(--color-shadow-primary);
  transition: height 0.2s ease; // 添加平滑过渡效果
  overflow: visible;
  &.editing {
    border: 1px solid var(--color-primary);
    .content-area,
    .content-wrapper,
    :deep(.tiptap),
    :deep(.tiptap *) {
      cursor: default !important; // 使用默认光标
    }
  }

  .editor-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    width: 100%;
    overflow: hidden; // 修改这里
    transition: height 0.2s ease-out;

    .address-input {
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-left: 27px;

      &.not-editing {
        cursor: grab;
        &:active {
          cursor: grabbing;
        }
        .note-indicator,
        input {
          cursor: grab;
          &:active {
            cursor: grabbing;
          }
        }
      }

      input {
        width: 100%;
        padding: 8px 0;
        /* 移除左右内边距，保留上下内边距 */
        border: none;
        /* 移除所有边框 */
        outline: none;
        /* 移除聚焦时的轮廓 */
        font-size: 1.3rem;
        font-weight: bold;
        background-color: transparent;
        /* 确保背景透明 */

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
        &[readonly] {
          background-color: transparent;
          cursor: grab;
          &:active {
            cursor: grabbing;
          }
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
        z-index: 10; // 增加 z-index 确保它在最上层

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
      overflow: hidden; // 修改这里

      .content-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: visible;
        width: 100%;
      }
    }

    :deep(.tiptap-container) {
      width: 100%;
      overflow: visible;
      height: auto !important; // 强制移除固定高度
      position: relative;
    }

    :deep(.tiptap) {
      min-width: calc(100% - 40px);
      overflow: visible;
      height: auto !important; // 强制移除固定高度
      min-height: 100px;
      padding-left: 2rem;
      padding-right: 2rem;
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
.resize-handle {
  position: absolute;
  // background-color: #4a90e2;
  z-index: 10;

  &.top,
  &.bottom {
    left: 4px;
    right: 4px;
    height: 4px;
    cursor: ns-resize;
  }

  &.left,
  &.right {
    top: 4px;
    bottom: 4px;
    width: 4px;
    cursor: ew-resize;
  }

  &.top {
    top: 0;
  }
  &.right {
    right: 0;
  }
  &.bottom {
    bottom: 0;
  }
  &.left {
    left: 0;
  }

  &.top-left,
  &.top-right,
  &.bottom-left,
  &.bottom-right {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  &.top-left {
    top: -4px;
    left: -4px;
    cursor: nwse-resize;
  }
  &.top-right {
    top: -4px;
    right: -4px;
    cursor: nesw-resize;
  }
  &.bottom-left {
    bottom: -4px;
    left: -4px;
    cursor: nesw-resize;
  }
  &.bottom-right {
    bottom: -4px;
    right: -4px;
    cursor: nwse-resize;
  }
}
.whiteboard-item.selected {
  outline: 2px solid var(--color-primary);
  /* 或者使用其他你喜欢的样式来表示选中状态 */
}
</style>
