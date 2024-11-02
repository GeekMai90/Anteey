<!-- src/components/WhiteboardNoteEditor.vue -->
<template>
  <div class="whiteboard-note-editor">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
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
        <!-- 卡片盒设置按钮 -->
        <div ref="cardboxBtnRef" class="install-btn" @click.stop="toggleCardboxMenu">
          <div v-tooltip.bottom="{ content: '设置卡片盒', delay: { show: 1000 } }" class="icon">
            <Install theme="outline" size="18" fill="var(--color-icon-default)" :stroke-width="3" />
          </div>
          <!-- 添加卡片盒下拉菜单 -->
          <CardboxDropdownMenu
            ref="cardboxMenuRef"
            :is-open="cardboxMenuState.isOpen"
            :position="cardboxMenuState.position"
            :note-id="currentNote?.id"
            :current-cardbox-id="currentNote?.cardBoxId"
            @close="closeCardboxMenu"
          />
        </div>

        <!-- 更多功能菜单按钮 -->
        <div ref="moreBtnRef" class="more-btn" @click.stop="toggleMoreMenu">
          <div v-tooltip.bottom="{ content: '更多', delay: { show: 1000 } }" class="icon">
            <More theme="outline" size="16" fill="var(--color-icon-default)" :stroke-width="3" />
          </div>
          <!-- 更多功能菜单按钮 -->
          <PopupMenu
            ref="moreMenuRef"
            :show="moreMenuState.isOpen"
            :position="moreMenuState.position"
            :menuItems="noteMenuItems"
            @close="closeMoreMenu"
            @itemClick="handleMenuItemClick"
          />
        </div>
      </div>
    </div>
    <!-- 编辑器内容 -->
    <div class="editor-content">
      <div class="address-input">
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
      <div class="content-area">
        <div class="content-wrapper">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStores'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'
import { useRouter } from 'vue-router'
import { ExpandTextInput, Install, More } from '@icon-park/vue-next'
import CardboxDropdownMenu from '@renderer/components/cardbox/CardboxDropdownMenu.vue'

import { message } from '@renderer/utils/message'
import { useMenu } from '@renderer/composables/useMenu'
import { MenuItem } from '../common/PopupMenu.vue'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'
import { CardType, Note } from '@renderer/types/Note'
import { debounce } from 'lodash-es'
import { EditorState } from '@tiptap/pm/state/dist'

const props = defineProps<{
  noteId: string
}>()
const noteStore = useNoteStore()
const currentNote = ref<Note | null>(null)
const tiptapEditor = ref<any>(null)

// === 生命周期钩子 ===

// 初始化笔记数据
const initializeNote = async (noteId: string) => {
  try {
    const note = await noteStore.fetchNote(noteId)
    if (note) {
      currentNote.value = note
      // 添加到最近笔记
      noteStore.addToRecentNotes(noteId)
      focusEditor()
    } else {
      message.error('笔记不存在')
    }
  } catch (error) {
    console.error('加载笔记失败:', error)
    message.error('加载笔记失败')
  }
}
// 组件挂载时加载笔记
onMounted(() => {
  const noteId = props.noteId
  if (noteId && typeof noteId === 'string') {
    initializeNote(noteId)
  }
})
// 监听路由参数变化，重新加载笔记
watch(
  () => props.noteId,
  (newId) => {
    if (newId && typeof newId === 'string') {
      initializeNote(newId)
    }
  }
)

// === 地址输入处理 ===
// 使用本地状态来管理输入
const localAddress = ref('')
const addressUpdateTimer = ref<any>(null)

// 监听 currentNote 的变化，同步初始地址
watch(
  () => currentNote.value?.address,
  (newAddress) => {
    if (newAddress) {
      localAddress.value = newAddress
    }
  },
  { immediate: true }
)

// 使用防抖处理地址更新
const updateAddress = debounce(async (address: string) => {
  if (!currentNote.value) return

  try {
    const updatedNote = await noteStore.updateNoteAddress(currentNote.value.id, address)
    // 更新本地状态
    currentNote.value = updatedNote
  } catch (error) {
    console.error('更新地址失败:', error)
    message.error('更新地址失败')
    // 回滚到最后一个有效的地址
    localAddress.value = currentNote.value.address
  }
}, 300)

// 处理地址输入
const handleAddressInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  localAddress.value = input.value
  updateAddress(input.value)
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
// 使用防抖保存内容
const saveContent = debounce(
  async (noteId: string, content: any, selection?: EditorState['selection']) => {
    try {
      await noteStore.updateNoteContent(noteId, content)

      // 恢复光标位置
      nextTick(() => {
        const editor = tiptapEditor.value?.editor
        if (editor && selection) {
          editor.commands.setTextSelection(selection.$head.pos)
        }
      })
    } catch (error) {
      console.error('保存笔记失败:', error)
      message.error('保存失败')
    }
  },
  2000
) // 2秒的防抖时间

// 处理编辑器内容更新
const handleContentUpdate = (newContent: any) => {
  if (!currentNote.value) return

  // 1. 立即更新本地状态，保持编辑器响应
  currentNote.value.content = newContent

  // 2. 保存当前光标位置
  const editor = tiptapEditor.value?.editor
  const selection = editor?.state.selection

  // 3. 使用防抖保存
  saveContent(currentNote.value.id, newContent, selection)
}

// 在组件卸载前确保所有待保存的内容都已保存
onBeforeUnmount(() => {
  saveContent.flush()
})

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
      currentNote.value.cardType = newType as CardType
      await noteStore.updateNoteCardType(props.noteId, newType as CardType)
      closeCardTypeMenu()
    } catch (error) {
      console.error('更新卡片类型失败:', error)
      message.error('更新卡片类型失败')
    }
  }
}

// === 更多功能菜单管理 ===
const { menuItems: noteMenuItems, resetDeleteState } = useNoteMenu({
  noteId: props.noteId,
  menuItems: ['star', 'share', 'sidebar', 'copyNoteLink', 'exportNote', 'delete', 'copyQuote']
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
const addressInput = ref<HTMLInputElement | null>(null)
// const emit = defineEmits(['close', 'save', 'expand', 'toggleOptions'])

const isExpandingToExpandEditor = ref(false)

// === 卡片盒菜单管理 ===
const cardboxBtnRef = ref<HTMLElement | null>(null)
const cardboxMenuRef = ref<HTMLElement | null>(null)
const {
  menuState: cardboxMenuState,
  toggleMenu: toggleCardboxMenu,
  closeMenu: closeCardboxMenu
} = useMenu({
  buttonRef: cardboxBtnRef,
  menuRef: cardboxMenuRef,
  onClose: () => {
    console.log('卡片盒菜单已关闭')
  }
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

// 修改展开编辑器的处理函数
const handleExpand = async () => {
  saveContent.flush()
  isExpandingToExpandEditor.value = true
  await router.push({ name: 'NoteExpandEditor', params: { id: props.noteId } })
}

// 暴露方法给父组件
defineExpose({
  focusAddressInput,
  focusEditor
})
</script>

<style lang="scss" scoped>
.whiteboard-note-editor {
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
