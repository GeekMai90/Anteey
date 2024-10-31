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
      ref="toolbarRef"
      :isCardBoxMenuOpen="showCardBoxMenu"
      :cardBoxes="cardBoxes"
      :selectedCardBox="selectedCardBox"
      :noteId="noteId"
      :moreMenuItems="whiteboardMenuItems"
      @expand="handleExpand"
      @toggle-cardbox-menu="toggleCardBoxMenu"
      @start-connection="startConnection"
      @select-card-box="selectCardBox"
      @close-cardbox-menu="showCardBoxMenu = false"
      @more-menu-item-click="handleMoreMenuItemClick"
    />

    <!-- 编辑器内容 -->
    <div class="editor-content" :style="editorContentStyle" @mousedown.stop="handleEditorMouseDown">
      <div
        class="address-input"
        :class="{ 'not-editing': !isEditing }"
        @mousedown.stop="handleAddressMouseDown"
      >
        <!-- 笔记类型指示器，点击可切换笔记类型 -->
        <div
          ref="indicatorButton"
          class="note-indicator"
          :class="cardTypeClass"
          @click="(e) => toggleCardTypeMenu(e)"
        ></div>
        <!-- 笔记类型下拉菜单组件 -->
        <CardTypeDropdownMenu
          ref="cardTypeDropdownMenuRef"
          :is-open="cardTypeMenuState.isOpen"
          :position="cardTypeMenuState.position"
          :current-card-type="currentNote?.cardType"
          @close="closeCardTypeMenu"
          @select="handleCardTypeSelect"
        />
        <!-- 笔记地址输入框 -->
        <input
          v-if="currentNote"
          ref="addressInput"
          v-model="localAddress"
          type="text"
          placeholder="输入编码地址"
          @input="handleAddressInput"
          @keyup.enter="handleAddressEnter"
        />
      </div>
      <div
        ref="editorContainerRef"
        class="content-area"
        :style="contentAreaStyle"
        @mousedown.stop="handleEditorMouseDown"
      >
        <TipTapEditor
          v-if="currentNote"
          ref="tiptapEditor"
          v-model:content="currentNote.content"
          :note-id="currentNote.id"
          :editable="true"
          :enableDragHandle="true"
          @update:content="handleContentUpdate"
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
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  ComputedRef,
  CSSProperties,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch
} from 'vue'
import { CardBox, WhiteboardNote } from '@renderer/types/Note'
import { useNoteStore } from '@renderer/stores/noteStores'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'
import { useRouter } from 'vue-router'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'
import { useWhiteboardStore } from '@renderer/stores/whiteboardStores'
import { storeToRefs } from 'pinia'
import { onClickOutside } from '@vueuse/core'
import { useResizeObserver } from '@vueuse/core'
import WhiteboardNoteToolbar from '@renderer/components/whiteboard/WhiteboardNoteToolbar.vue'
import CardTypeDropdownMenu from '@renderer/components/note/CardTypeDropdownMenu.vue'
import { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import { message } from '@renderer/utils/message'
import { reactive } from 'vue'
import { useMenu } from '@renderer/composables/useMenu'

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

const handleMoreMenuItemClick = (item: MenuItem) => {
  item.action()
}
const handleEditorMouseDown = (event: MouseEvent) => {
  if (!isEditing.value) {
    event.preventDefault()
    event.stopPropagation()
    emit('drag-start', event)
  }
}

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

// const { menuItems } = useNoteMenu(props.noteId)

// 笔记的保存功能

// === 生命周期钩子 ===

onMounted(async () => {
  // 1. 组件挂载时获取笔记
  await noteStore.fetchNote(props.noteId)
  // 2. 激活笔记编辑状态
  noteStore.activateNote(props.noteId)
})

// === 计算属性 ===
// 获取当前编辑的笔记数据
const currentNote = computed(() => {
  console.log('computed 执行, activeNotes:', noteStore.activeNotes)
  return noteStore.activeNotes[props.noteId]
})

// === 地址输入处理 ===
// 使用本地状态来管理输入
const localAddress = ref('')
const addressUpdateTimer = ref<any>(null)

onMounted(() => {
  if (currentNote.value) {
    localAddress.value = currentNote.value.address
  }
})

// 监听 currentNote 的变化，同步地址
watch(
  () => currentNote.value?.address,
  (newAddress) => {
    if (newAddress !== undefined && newAddress !== localAddress.value) {
      localAddress.value = newAddress
    }
  }
)

// 处理地址输入
const handleAddressInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  localAddress.value = input.value

  if (currentNote.value) {
    currentNote.value.address = input.value
  }

  if (addressUpdateTimer.value) {
    clearTimeout(addressUpdateTimer.value)
  }

  addressUpdateTimer.value = setTimeout(async () => {
    try {
      await noteStore.updateNoteAddress(props.noteId, localAddress.value)
    } catch (error) {
      console.error('更新地址失败:', error)
      message.error('更新地址失败')
    }
  }, 300)
}

// 处理回车键
const handleAddressEnter = (event: KeyboardEvent) => {
  event.preventDefault() // 阻止默认行为
  if (addressUpdateTimer.value) {
    clearTimeout(addressUpdateTimer.value)
    noteStore.updateNoteAddress(props.noteId, localAddress.value)
  }
  focusEditor() // 聚焦到编辑器
}

// === 内容更新处理 ===
// 编辑器内容更新状态管理
const updateState = reactive({
  pending: false,
  lastContent: null as any,
  updateTimer: null as any,
  saveTimeout: 2000 // 保存延迟时间，可以根据实际需求调整
})
const tiptapEditor = ref<any>(null)
// 处理编辑器内容更新
const handleContentUpdate = (newContent: any) => {
  if (!currentNote.value) return

  // 立即更新 lastContent，不要等待防抖
  updateState.lastContent = newContent

  // 保存当前光标位置
  const editor = tiptapEditor.value?.editor
  const selection = editor?.state.selection

  // 使用防抖进行保存
  if (updateState.updateTimer) {
    clearTimeout(updateState.updateTimer)
  }

  updateState.updateTimer = setTimeout(async () => {
    try {
      await noteStore.updateNoteContent(currentNote.value.id, newContent)

      // 恢复光标位置
      nextTick(() => {
        if (editor && selection) {
          editor.commands.setTextSelection(selection.$head.pos)
        }
      })
    } catch (error) {
      console.error('内容更新失败:', error)
      message.error('保存失败')
    }
  }, updateState.saveTimeout)
}

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
  indexcard: currentNote.value?.cardType === 'Indexcard'
  // hoplinkcard: currentNote.value?.cardType === 'Hoplinkcard'
}))

// 处理卡片类型选择和更新
const handleCardTypeSelect = async (newType: string) => {
  if (currentNote.value) {
    try {
      await noteStore.updateNoteCardType(props.noteId, newType)
      closeCardTypeMenu()
    } catch (error) {
      console.error('更新卡片类型失败:', error)
      message.error('更新卡片类型失败')
    }
  }
}

// 白板笔记的菜单项
const { menuItems: whiteboardMenuItems } = useNoteMenu({
  noteId: props.noteId,
  whiteboardNoteId: props.item.id,
  onRestoreDefaultHeight: restoreDefaultHeight,
  menuItems: ['star', 'sidebar', 'restoreDefaultHeight', 'trashFromWhiteboard']
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
  if (!currentNote.value?.id) {
    console.error('NoteEditor.vue → 编辑的笔记为空')
    return
  }
  try {
    selectedCardBox.value = box
    const newCardBoxId = box.id
    const updatedNote = await noteStore.updateNoteCardBox(currentNote.value.id, newCardBoxId)
    if (updatedNote) {
      // currentNote.value = updatedNote
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
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick)
  if (currentNote.value?.cardBoxId) {
    const currentCardBox = cardBoxes.value.find((box) => box.id === currentNote.value.cardBoxId)
    if (currentCardBox) {
      selectedCardBox.value = currentCardBox
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
})

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

// 展开编辑器
const handleExpand = async () => {
  isExpandingToExpandEditor.value = true
  if (currentNote.value?.id) {
    router.push({ name: 'NoteExpandEditor', params: { id: currentNote.value.id } })
  }
  noteStore.closeNoteEditor()
}

defineExpose({ focusAddressInput, restoreDefaultHeight })
</script>

<style lang="scss" scoped>
.whiteboard-note-component {
  background-color: var(--color-note-card-bg);
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
