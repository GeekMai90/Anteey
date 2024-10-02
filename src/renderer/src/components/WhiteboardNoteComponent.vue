<!-- src/components/WhiteNoteComponent.vue -->
<template>
  <div
    :id="`note-${props.noteId}`"
    ref="noteRef"
    class="whiteboard-note-component"
    :class="['whiteboard-note', { hovered: isHovered, editing: isEditing }]"
    :style="noteStyle"
    @mousedown.stop
    @touchstart.stop
    @dblclick="startEditing"
    @v-click-outside="stopEditing"
    @mouseenter="handleNoteHover(true)"
    @mouseleave="handleNoteHover(false)"
  >
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <button @click="toggleHeightMode">
        {{ isFixedHeight ? '自动增高' : '固定高度' }}
      </button>
      <!-- 展开编辑器 -->
      <div
        v-tooltip.bottom="{ content: '展开编辑器', delay: { show: 1000 } }"
        class="expand-btn"
        @click="handleExpand"
      >
        <div class="icon">
          <ExpandTextInput theme="outline" size="16" fill="#b6b6b6" />
        </div>
      </div>
      <div class="toolbar-right">
        <div class="install-btn" @click="toggleCardBoxMenu">
          <div v-tooltip.bottom="{ content: '设置卡片盒', delay: { show: 1000 } }" class="icon">
            <Install theme="outline" size="16" fill="#b6b6b6" />
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
        <div class="connect-btn" @click="startConnection">
          <div v-tooltip.bottom="{ content: '连线', delay: { show: 1000 } }" class="icon">
            <Plus theme="outline" size="16" fill="var(--color-icon-default)" />
          </div>
        </div>
        <div class="more-btn" @click.stop="openMenu" @v-click-outside="closeMenu">
          <div v-tooltip.bottom="{ content: '更多', delay: { show: 1000 } }" class="icon">
            <More theme="outline" size="16" fill="var(--color-icon-default)" />
          </div>
        </div>
      </div>
    </div>
    <!-- 编辑器内容 -->
    <div class="editor-content" :style="editorContentStyle">
      <div class="address-input">
        <div
          ref="indicatorButton"
          class="note-indicator"
          :class="cardTypeClass"
          @click.stop="toggleCardTypeMenu"
        ></div>
        <input
          ref="addressInput"
          v-model="editedNote.address"
          type="text"
          placeholder="输入编码地址"
          @keyup.enter="focusEditor"
        />
      </div>
      <div class="content-area" :style="contentAreaStyle" @mousedown.stop @touchstart.stop>
        <div ref="editorContainerRef" class="content-wrapper" @mousedown.stop @touchstart.stop>
          <TipTapEditor
            ref="tiptapEditor"
            :content="editedNote.content"
            :editable="isEditing"
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
    <div class="resize-handle top" @mousedown="startResize('top', $event)"></div>
    <div class="resize-handle right" @mousedown="startResize('right', $event)"></div>
    <div class="resize-handle bottom" @mousedown="startResize('bottom', $event)"></div>
    <div class="resize-handle left" @mousedown="startResize('left', $event)"></div>
    <div class="resize-handle top-left" @mousedown="startResize('top-left', $event)"></div>
    <div class="resize-handle top-right" @mousedown="startResize('top-right', $event)"></div>
    <div class="resize-handle bottom-right" @mousedown="startResize('bottom-right', $event)"></div>
    <div class="resize-handle bottom-left" @mousedown="startResize('bottom-left', $event)"></div>
    <!-- <button class="connection-button" @click.stop="startConnection">
      <Plus theme="outline" size="16" fill="#FFF" />
    </button> -->
    <PopupMenu ref="popupMenuRef" :menuItems="whiteboardMenuItems" />
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
import { Note, CardType, CardBox, WhiteboardNote } from '../types/Note'
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
  More,
  Plus
} from '@icon-park/vue-next'
// import { useDebounceFn, useThrottleFn } from '@vueuse/core'
import CardboxDropdownMenu from './CardboxDropdownMenu.vue'
// import { isEqual } from 'lodash-es'
import { debounce } from 'lodash-es'
import PopupMenu from '@renderer/components/PopupMenu.vue'
import { useNoteMenu } from '@renderer/composable/useNoteMenu'
import { useWhiteboardStore } from '../stores/whiteboardStores'
import { storeToRefs } from 'pinia'
import { onClickOutside } from '@vueuse/core'

const props = defineProps<{
  noteId: string
  note: Note
  width?: number
  height?: number
  item: WhiteboardNote
  isHovered: boolean
}>()

const router = useRouter()
const addressInput = ref<HTMLInputElement | null>(null)
const tiptapEditor = ref<InstanceType<any> | null>(null)
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
const extraHeight = 120 // 工具栏和地址输入框的估计高度

const noteRef = ref(null)

const isHovering = ref(false)

const emit = defineEmits(['hover', 'resize-start', 'start-connection', 'note-interaction'])

const handleNoteHover = (hovering: boolean) => {
  isHovering.value = hovering
  emit('hover', hovering)
}

// 编辑状态下可以滚动
const contentAreaStyle = computed(() => ({
  flexGrow: 1,
  overflowY: isFixedHeight.value ? ('auto' as const) : ('visible' as const),
  maxHeight: isFixedHeight.value ? '100%' : 'none'
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
    if (tiptapEditor.value) {
      tiptapEditor.value.$forceUpdate()
      focusEditor()
    }
  })
}

onUnmounted(() => {
  isEditing.value = false
  emitNoteInteraction(false)
  // ... 其他卸载逻辑 ...
})

const toggleHeightMode = () => {
  isFixedHeight.value = !isFixedHeight.value
  manuallyResized.value = false
  updateHeight()
}

// 使用计算属性获取最新的笔记大小
const whiteboardNoteSize = computed(() => {
  const size = currentWhiteboardNote.value?.size || { width: 350, height: minHeight }
  return size
})

const noteStyle = computed(() => ({
  width: `${whiteboardNoteSize.value.width}px`,
  height: isFixedHeight.value ? `${whiteboardNoteSize.value.height}px` : 'auto',
  minHeight: `${minHeight}px`
}))
const editorContentStyle = computed(() => ({
  maxHeight: isFixedHeight.value ? `${whiteboardNoteSize.value.height - extraHeight}px` : 'none',
  overflowY: isFixedHeight.value ? 'auto' : 'visible'
})) as ComputedRef<CSSProperties>

const updateHeight = async () => {
  await nextTick()
  if (editorContainerRef.value) {
    const tiptapContainer = editorContainerRef.value.querySelector(
      '.tiptap-container'
    ) as HTMLElement
    if (tiptapContainer) {
      const newHeight = Math.max(tiptapContainer.scrollHeight + extraHeight, minHeight)
      if (newHeight !== whiteboardNoteSize.value.height && !isFixedHeight.value) {
        console.log('Updating height to:', newHeight)
        await whiteboardStore.updateWhiteboardNoteSize(
          props.item.id,
          whiteboardNoteSize.value.width,
          newHeight
        )
      }
    }
  }
}
onMounted(() => {
  updateHeight()
})
// 监听笔记大小的变化
watch(
  whiteboardNoteSize,
  (newSize, oldSize) => {
    console.log('Note size changed:', oldSize, '->', newSize)
    // 在这里可以添加额外的逻辑来响应大小变化
  },
  { deep: true }
)
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

// useResizeObserver(contentWrapperRef, (entries) => {
//   console.log('ResizeObserver triggered', entries[0].contentRect)
//   const entry = entries[0]
//   if (entry) {
//     const newHeight = entry.contentRect.height + 100 // 添加额外空间，如顶部工具栏
//     contentHeight.value = Math.max(newHeight, minHeight)
//   }
// })

const startResize = (direction: string, event: MouseEvent) => {
  emit('resize-start', {
    direction,
    event,
    onResize: (newWidth: number, newHeight: number) => {
      whiteboardStore.updateWhiteboardNoteSize(props.item.id, newWidth, newHeight)
      isFixedHeight.value = true
      manuallyResized.value = true
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
  menuItems: ['star', 'trashFromWhiteboard']
})

const openMenu = (event: MouseEvent) => {
  event.preventDefault()
  popupMenuRef.value?.openMenu(event.clientX, event.clientY)
}
const closeMenu = () => {
  useNoteMenu({ noteId: props.noteId, whiteboardNoteId: props.item.id }).closePopupMenu()
}

// 笔记选项菜单
// const isOptionsMenuVisible = ref(false)
// const noteOptionsMenu = ref<InstanceType<typeof NoteOptionsMenu> | null>(null)

// const toggleOptionsMenu = () => {
//   isOptionsMenuVisible.value = !isOptionsMenuVisible.value
// }

// const closeOptionsMenu = () => {
//   isOptionsMenuVisible.value = false
//   noteOptionsMenu.value?.resetState()
// }

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

// 加载笔记
const loadNote = async () => {
  try {
    editedNote.value = props.note
    console.log('NoteEditor.vue → 编辑的笔记:', editedNote.value)
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
      console.log('NoteEditor.vue → 正在保存笔记:', editedNote.value)
      noteStore.updateCurrentNoteSaveStatus('saving')
      const updatedNote = await noteStore.updateNote(editedNote.value.id, editedNote.value)

      // noteStore.updateNoteSaveStatus(editedNote.value.id, 'saved')
      noteStore.updateCurrentNoteSaveStatus('saved')
      console.log('NoteEditor.vue → 自动保存成功')

      // 更新最后保存的内容
      lastSavedNote = JSON.parse(JSON.stringify(updatedNote))

      // 更新编辑中的笔记
      editedNote.value = updatedNote
    } catch (error) {
      console.error('NoteEditor.vue → 自动保存失败:', error)
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

onMounted(() => {
  loadNote()
  nextTick(() => {
    updateContent(editedNote.value.content)
  })
})

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
    updateHeight()
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

// 更新内容
// const updateContent = (newContent: any) => {
//   if (editedNote.value) {
//     editedNote.value.content = newContent
//     // saveNote()
//   }
// }

// 当模态窗被关闭时，保存笔记
// const handleAutoSave = () => {
//   if (editedNote.value?.address || editedNote.value?.content || editedNote.value?.cardType) {
//     saveNote()
//   } else {
//     emit('close')
//   }
// }

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
    if (tiptapEditor.value && isEditing.value) {
      tiptapEditor.value.focus()
    }
  })
}

// 在组件挂载后聚焦
// onMounted(() => {
//   focusAddressInput()
// })

// 当 noteId 改变时聚焦（用于编辑现有笔记）
watch(
  () => props.noteId,
  () => {
    focusAddressInput()
  }
)

// 展开编辑器
const handleExpand = async () => {
  await saveNote()
  isExpandingToExpandEditor.value = true
  if (editedNote.value?.id) {
    router.push({ name: 'NoteExpandEditor', params: { id: editedNote.value.id } })
  }
  noteStore.closeNoteEditor()
}

// 打开选项菜单
// const openOptionsMenu = inject('openOptionsMenu') as (event: MouseEvent, noteId: string) => void

// const handleToggleOptions = (event: MouseEvent) => {
//   if (props.noteId) {
//     openOptionsMenu(event, props.noteId)
//   }
// }

// defineExpose({ handleAutoSave, focusAddressInput })
defineExpose({ focusAddressInput })
</script>

<style lang="scss" scoped>
.whiteboard-note-component {
  background-color: var(--color-bg-primary);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: var(--color-shadow-primary);
  transition: height 0.3s ease; // 添加平滑过渡效果
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
    .connect-btn,
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
    flex: 1;
    min-height: 0;
    width: 100%;
    overflow: hidden; // 修改这里

    .address-input {
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-left: 27px;

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
      // height: 100%;
      // overflow-y: auto;
      // padding: 0 10px;
      // position: relative;
      overflow: visible;
      height: auto !important; // 强制移除固定高度
    }

    :deep(.tiptap) {
      // min-width: calc(640px - 64px);
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
</style>
