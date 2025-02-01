<template>
  <div
    class="card-node"
    :class="{ selected: selected, resizing: isResizing }"
    :style="nodeStyle"
    @dblclick="handleDoubleClick"
  >
    <div class="card-node-background">
      <div class="background-base"></div>
      <div class="background-theme" :style="{ backgroundColor: nodeStyle.backgroundColor }"></div>
    </div>

    <NodeToolbar :is-visible="selected" :position="data.toolbarPosition || Position.Top">
      <div class="toolbar-buttons">
        <div class="color-picker-wrapper">
          <button
            v-tooltip.top="{ content: '卡片颜色', delay: { show: 1000 } }"
            title="卡片颜色"
            @click="showColorPicker = !showColorPicker"
          >
            <Platte theme="outline" size="18" fill="var(--color-icon-default)" :stroke-width="3" />
          </button>
          <div v-if="showColorPicker" class="color-picker-panel">
            <div
              v-for="color in themeColors"
              :key="color.border"
              class="color-item"
              :style="{
                backgroundColor: color.bg,
                borderColor: color.border
              }"
              @click="handleColorSelect(color)"
            />
          </div>
        </div>

        <button
          v-tooltip.top="{ content: '聚焦卡片', delay: { show: 1000 } }"
          title="聚焦节点"
          @click="handleFocus"
        >
          <Aiming theme="outline" size="18" fill="var(--color-icon-default)" :stroke-width="3" />
        </button>
        <button
          v-tooltip.top="{ content: '删除卡片', delay: { show: 1000 } }"
          @click="handleDelete"
        >
          <Delete theme="outline" size="18" fill="var(--color-icon-default)" :stroke-width="3" />
        </button>
        <button v-tooltip.top="{ content: '编辑卡片', delay: { show: 1000 } }" @click="handleEdit">
          <Edit theme="outline" size="18" fill="var(--color-icon-default)" :stroke-width="3" />
        </button>
      </div>
    </NodeToolbar>

    <Handle id="top-source" type="source" :position="Position.Top" class="handle top" />
    <Handle id="right-source" type="source" :position="Position.Right" class="handle right" />
    <Handle id="bottom-source" type="source" :position="Position.Bottom" class="handle bottom" />
    <Handle id="left-source" type="source" :position="Position.Left" class="handle left" />

    <!-- 笔记内容区域 -->
    <div class="card-content" @mousedown="handleContentMouseDown" @click="handleContentClick">
      <div v-if="note" class="note-header">
        <!-- 顶部工具栏 -->
        <div class="toolbar">
          <!-- 展开编辑器按钮 -->
          <div
            v-tooltip.bottom="{ content: '展开编辑器', delay: { show: 1000 } }"
            class="expand-btn"
            @click="handleExpand"
          >
            <div class="icon">
              <ExpandTextInput
                theme="outline"
                size="16"
                fill="var(--color-icon-default)"
                :stroke-width="3"
              />
            </div>
          </div>
          <div class="toolbar-right">
            <!-- 卡片盒设置按钮 -->
            <div ref="cardboxBtnRef" class="install-btn" @click.stop="toggleCardboxMenu">
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
                ref="cardboxMenuRef"
                :is-open="cardboxMenuState.isOpen"
                :buttonRef="cardboxBtnRef"
                :note-id="note?.id"
                :current-cardbox-id="note?.cardBoxId"
                @close="closeCardboxMenu"
                @update="handleCardboxUpdate"
              />
            </div>
            <!-- 更多功能菜单按钮 -->
            <div ref="moreBtnRef" class="more-btn" @click.stop="toggleMoreMenu">
              <div v-tooltip.bottom="{ content: '更多', delay: { show: 1000 } }" class="icon">
                <More
                  theme="outline"
                  size="16"
                  fill="var(--color-icon-default)"
                  :stroke-width="3"
                />
              </div>
              <!-- 更多功能菜单按钮 -->
              <PopupMenu
                ref="moreMenuRef"
                :show="moreMenuState.isOpen"
                :buttonRef="moreBtnRef"
                :menuItems="noteMenuItems"
                @close="closeMoreMenu"
                @itemClick="handleMenuItemClick"
              />
            </div>
          </div>
        </div>

        <!-- 笔记类型指示器和地址输入 -->
        <div class="address-input" :class="{ 'not-editing': !isEditing }">
          <div
            ref="indicatorButton"
            class="note-indicator"
            :class="cardTypeClass"
            @click="toggleCardTypeMenu"
          ></div>
          <CardTypeDropdownMenu
            ref="cardTypeDropdownMenuRef"
            :is-open="cardTypeMenuState.isOpen"
            :position="cardTypeMenuState.position"
            :current-card-type="note?.cardType"
            @close="closeCardTypeMenu"
            @select="handleCardTypeSelect"
          />
          <input
            ref="addressInput"
            v-model="localAddress"
            type="text"
            placeholder="输入编码地址"
            @input="handleAddressInput"
            @keydown.enter="handleAddressEnter"
            @compositionstart="handleCompositionStart"
            @compositionend="handleCompositionEnd"
          />
        </div>
      </div>

      <div class="note-content">
        <MindboardTipTapEditor
          v-if="note"
          ref="editor"
          v-model:content="note.content"
          :editable="isEditing"
          :enable-drag-handle="false"
          :note-id="note.id"
          @update:content="handleContentUpdate"
          @blur="handleEditorBlur"
          @click="handleEditorClick"
        />
      </div>
    </div>

    <NodeResizer :width="250" :min-width="250" :min-height="250" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Position, Handle, useVueFlow } from '@vue-flow/core'
import { NodeToolbar } from '@vue-flow/node-toolbar'
import { NodeResizer } from '@vue-flow/node-resizer'
import { Aiming, Platte, Delete, Edit, Install, More, ExpandTextInput } from '@icon-park/vue-next'
import MindboardTipTapEditor from '@renderer/components/mindboard/custom/MindboardTipTapEditor.vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import type { CardType, Note } from '@shared/types'
import CardTypeDropdownMenu from '@renderer/components/note/CardTypeDropdownMenu.vue'
import { message } from '@renderer/utils/message'
import { debounce } from 'lodash-es'
import { useMenu } from '@renderer/composables/useMenu'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import CardboxDropdownMenu from '@renderer/components/cardbox/CardboxDropdownMenu.vue'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import { useRouter } from 'vue-router'
import './customResizer.css'
const isResizing = ref(false)

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  }
})

// 节点样式
const nodeStyle = ref({
  width: props.data.width,
  height: props.data.height,
  backgroundColor: props.data.backgroundColor || 'var(--color-bg-primary)',
  borderColor: props.data.borderColor || 'var(--color-border)'
})

// 笔记数据相关
const noteStore = useNoteStore()
const note = ref<Note | null>(null)

// 初始化笔记数据
const initializeNote = async (noteId: string) => {
  try {
    const fetchedNote = await noteStore.fetchNote(noteId)
    if (fetchedNote) {
      note.value = fetchedNote
      // 更新地址输入框
      localAddress.value = fetchedNote.address
    }
  } catch (error) {
    console.error('加载笔记失败:', error)
    message.error('加载笔记失败')
  }
}

// 监听笔记ID变化
watch(
  () => props.data.noteId,
  (newId) => {
    if (newId) {
      initializeNote(newId)
    }
  },
  { immediate: true }
)

// 卡片类型样式
const cardTypeClass = computed(() => ({
  maincard: note.value?.cardType === 'Maincard',
  bibcard: note.value?.cardType === 'Bibcard',
  indexcard: note.value?.cardType === 'Indexcard'
}))

// Vue Flow 相关
const { updateNodeData, removeNodes, zoomOnScroll, panOnScroll } = useVueFlow()
const vueFlowInstance = useVueFlow()

// 颜色选择器相关
const showColorPicker = ref(false)
const themeColors = [
  {
    border: 'var(--color-border)',
    bg: 'transparent'
  },
  {
    border: 'var(--color-primary)',
    bg: 'rgba(var(--color-primary-rgb), 0.04)'
  },
  {
    border: 'var(--color-yellow)',
    bg: 'rgba(var(--color-yellow-rgb), 0.04)'
  },
  {
    border: 'var(--color-blue)',
    bg: 'rgba(var(--color-blue-rgb), 0.04)'
  },
  {
    border: 'var(--color-danger)',
    bg: 'rgba(var(--color-danger-rgb), 0.04)'
  }
]

// 处理颜色选择
const handleColorSelect = (color: any) => {
  nodeStyle.value.borderColor = color.border
  nodeStyle.value.backgroundColor = color.bg
  updateNodeData(props.id, {
    borderColor: color.border,
    backgroundColor: color.bg
  })
  showColorPicker.value = false
}

// 处理聚焦
const handleFocus = () => {
  const node = vueFlowInstance.findNode(props.id)
  if (node) {
    vueFlowInstance.setCenter(node.position.x + 100, node.position.y + 100, {
      duration: 800,
      zoom: 1
    })
  }
}

// 处理删除
const handleDelete = () => {
  removeNodes([props.id])
}

// 编辑状态
const isEditing = ref(false)

// === 地址输入处理 ===
const localAddress = ref('')
const isComposing = ref(false)
const addressInput = ref<HTMLInputElement | null>(null)

// 监听笔记地址变化
watch(
  () => note.value?.address,
  (newAddress) => {
    if (newAddress) {
      localAddress.value = newAddress
    }
  },
  { immediate: true }
)

// 防抖处理地址更新
const updateAddress = debounce(async (address: string) => {
  if (!note.value) return

  try {
    await noteStore.updateNoteAddress(note.value.id, address)
  } catch (error) {
    console.error('更新地址失败:', error)
    message.error('更新地址失败')
    localAddress.value = note.value?.address || ''
  }
}, 500)

const handleAddressInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const newValue = input.value
  localAddress.value = newValue

  if (!isComposing.value) {
    updateAddress(newValue)
  }
}

const handleCompositionStart = () => {
  isComposing.value = true
}

const handleCompositionEnd = () => {
  isComposing.value = false
}

const handleAddressEnter = (event: KeyboardEvent) => {
  if (isComposing.value) return
  event.preventDefault()
  focusEditor()
}

// === 内容更新处理 ===
const editor = ref<any>(null)

const saveContent = debounce(
  async (noteId: string, content: any) => {
    try {
      await noteStore.updateNoteContent(noteId, content)
    } catch (error) {
      console.error('保存笔记失败:', error)
      message.error('保存失败')
    }
  },
  2000,
  { trailing: true }
)

const handleContentUpdate = (newContent: any) => {
  if (!note.value) return

  try {
    const safeContent = JSON.parse(JSON.stringify(newContent))
    note.value.content = safeContent
    // 直接更新数据库中的笔记内容
    saveContent(note.value.id, safeContent)
  } catch (error) {
    console.error('Content serialization error:', error)
  }
}

// === 卡片类型菜单管理 ===
const indicatorButton = ref<HTMLElement | null>(null)
const cardTypeDropdownMenuRef = ref<HTMLElement | null>(null)

const {
  menuState: cardTypeMenuState,
  toggleMenu: toggleCardTypeMenu,
  closeMenu: closeCardTypeMenu
} = useMenu({
  buttonRef: indicatorButton,
  menuRef: cardTypeDropdownMenuRef
})

const handleCardTypeSelect = async (newType: string) => {
  if (note.value) {
    note.value.cardType = newType as CardType
    try {
      await noteStore.updateNoteCardType(note.value.id, newType as CardType)
      closeCardTypeMenu()
    } catch (error) {
      console.error('更新卡片类型失败:', error)
      message.error('更新卡片类型失败')
    }
  }
}

// === 双击处理 ===
const handleDoubleClick = (event: any) => {
  event.stopPropagation()
  if (props.selected && !isEditing.value) {
    enterEditMode()
  }
}

// === 工具函数 ===
const focusEditor = () => {
  nextTick(() => {
    editor.value?.focus('end')
  })
}

// 编辑模式管理
const enterEditMode = () => {
  isEditing.value = true
  updateNodeData(props.id, { draggable: false })
  // 禁用画布缩放
  zoomOnScroll.value = false
  panOnScroll.value = false
  nextTick(() => {
    if (editor.value) {
      editor.value.focus()
    }
  })
}

const exitEditMode = () => {
  isEditing.value = false
  updateNodeData(props.id, { draggable: true })
  // 恢复画布缩放
  zoomOnScroll.value = true
  panOnScroll.value = true
}

// 事件处理函数
const handleEditorClick = (event: any) => {
  if (!isEditing.value) {
    event.stopPropagation()
    if (event.target) {
      const nodeElement = event.target.closest('.card-node')
      if (nodeElement) {
        nodeElement.click()
      }
    }
  }
}

const handleContentClick = (event: any) => {
  if (!isEditing.value) {
    event.preventDefault()
  }
}

const handleContentMouseDown = (event: any) => {
  if (isEditing.value) {
    event.stopPropagation()
  }
}

const handleEditorBlur = () => {
  exitEditMode()
}

const handleEdit = () => {
  enterEditMode()
}

// 点击外部关闭颜色选择器
const handleClickOutside = (event: any) => {
  const target = event.target
  if (!target.closest('.color-picker-wrapper')) {
    showColorPicker.value = false
  }
}

// 生命周期钩子
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 监听选中状态变化
watch(
  () => props.selected,
  (newSelected) => {
    if (!newSelected && isEditing.value) {
      exitEditMode()
    }
  }
)

// === 卡片盒菜单管理 ===
const cardboxBtnRef = ref<HTMLElement | null>(null)
const cardboxMenuRef = ref<HTMLElement | null>(null)
const {
  menuState: cardboxMenuState,
  toggleMenu: toggleCardboxMenu,
  closeMenu: closeCardboxMenu
} = useMenu({
  buttonRef: cardboxBtnRef,
  menuRef: cardboxMenuRef
})

// 处理卡片盒更新
const handleCardboxUpdate = async (cardBoxId: string) => {
  if (note.value) {
    note.value.cardBoxId = cardBoxId
  }
}

// === 更多功能菜单管理 ===
const { menuItems: noteMenuItems, resetDeleteState } = useNoteMenu({
  noteId: computed(() => note.value?.id || '').value,
  menuItems: ['star', 'sidebar']
})

const moreBtnRef = ref<HTMLElement | null>(null)
const moreMenuRef = ref<HTMLElement | null>(null)
const {
  menuState: moreMenuState,
  toggleMenu: toggleMoreMenu,
  closeMenu: closeMoreMenu
} = useMenu({
  buttonRef: moreBtnRef,
  menuRef: moreMenuRef,
  onClose: () => {
    resetDeleteState()
  }
})

// 更多菜单点击事件
const handleMenuItemClick = (item: MenuItem) => {
  item.action()
  if (item.name !== 'delete') {
    closeMoreMenu()
  }
}

const router = useRouter()

// 处理展开编辑器
const handleExpand = async () => {
  if (!note.value) return
  saveContent.flush()
  await router.push({ name: 'NoteExpandEditor', params: { id: note.value.id } })
  noteStore.closeNoteEditor()
}
</script>

<style lang="scss" scoped>
.card-node {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  cursor: grab;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;

  // 背景层
  .card-node-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 7px;
    pointer-events: none;
    z-index: -1;
    overflow: hidden;

    .background-base {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--color-bg-primary);
    }

    .background-theme {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }
  }

  &.selected {
    border: 2px solid var(--color-primary);
    padding: 11px;

    .card-node-background {
      border-radius: 6px;
    }
  }

  // 连接点样式
  :deep(.handle) {
    width: 10px;
    height: 10px;
    background: var(--color-primary);
    border: 2px solid var(--color-bg-primary);
    border-radius: 50%;
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 2;

    &.top {
      top: -7px;
    }
    &.right {
      right: -7px;
    }
    &.bottom {
      bottom: -7px;
    }
    &.left {
      left: -7px;
    }
  }

  &:hover {
    :deep(.handle) {
      opacity: 1;
    }
  }

  // 笔记内容区域
  .card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
    width: 100%;
    min-height: 0;

    .note-header {
      display: flex;
      flex-direction: column;
      padding: 0;
      flex-shrink: 0;

      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0px;
        position: relative;
        height: 20px;
      }
    }

    .note-content {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
      height: 100%;

      &:has(:deep(.ProseMirror[contenteditable='true'])) {
        cursor: text;
      }

      :deep(.ProseMirror) {
        cursor: grab;
        flex: 1;
        min-height: 26px;

        &[contenteditable='true'] {
          cursor: text;
        }
      }

      :deep(.tiptap) {
        padding: 0 8px;
        height: 100%;
      }
    }
  }
}

// 工具栏样式
.toolbar-buttons {
  display: flex;
  gap: 4px;

  button {
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    width: 40px;
    height: 40px;
    padding: 10px;
    border-radius: 8px;
    cursor: pointer;

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

    &:hover {
      background-color: var(--sidebar-hover-bg);
    }
  }
}

// 颜色选择器样式
.color-picker-wrapper {
  position: relative;
  display: inline-block;

  .color-picker-panel {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    padding: 8px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: var(--shadow-card);
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
    z-index: 1000;

    .color-item {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 2px solid;
      cursor: pointer;
      transition: transform 0.2s;

      &:hover {
        transform: scale(1.1);
      }
    }
  }
}

// 添加新的样式
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0px 20px 0 20px;
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
    padding: 2px;
    // margin: 2px;

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
        width: 14px;
        height: 14px;
      }
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
    padding: 2px;

    :deep(.dropdown-menu) {
      transform: translateX(-70%);
    }

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
        width: 14px;
        height: 14px;
      }
    }

    &:hover {
      background-color: var(--color-hover-button);
    }

    &:active {
      background-color: rgba(0, 0, 0, 0.1);
    }
  }
}

.address-input {
  display: flex;
  align-items: center;
  height: 30px;
  width: 100%;
  position: relative;
  margin-left: 10px;
  cursor: text;

  &.not-editing {
    cursor: grab;
    &:active {
      cursor: grabbing;
    }
    .note-indicator,
    input {
      cursor: grab;
      pointer-events: none;
      &:active {
        cursor: grabbing;
      }
    }
  }

  input {
    display: flex;
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    font-size: 1rem;
    font-weight: bold;
    background-color: transparent;
    line-height: 40px;
    padding: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: text;

    &::placeholder {
      display: flex;
      color: var(--color-text-placeholder);
      font-size: 1rem;
      font-weight: normal;
      opacity: 0.7;
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      left: 0;
    }

    &:focus::placeholder {
      opacity: 0.5;
    }
  }

  .note-indicator {
    position: absolute;
    left: -10px;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 15px;
    border-radius: 2px;
    display: block;
    flex-shrink: 0;
    cursor: pointer;
    border: none;
    outline: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: inherit;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 0 8px 2px currentColor;
    }

    &.maincard {
      background-color: var(--color-primary);
      &::after {
        color: var(--color-primary);
      }
    }

    &.bibcard {
      background-color: var(--color-yellow);
      &::after {
        color: var(--color-yellow);
      }
    }

    &.indexcard {
      background-color: var(--color-blue);
      &::after {
        color: var(--color-blue);
      }
    }

    &:hover {
      width: 6px;
      height: 20px;
      transform: translateY(-50%) translateX(-1px);

      &::after {
        opacity: 0.5;
      }
    }
  }
}
</style>
