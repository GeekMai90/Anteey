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
          @click="(e: any) => toggleCardTypeMenu(e)"
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
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStores'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'
import { useRouter } from 'vue-router'
import { ExpandTextInput, Install, More } from '@icon-park/vue-next'
import CardboxDropdownMenu from '@renderer/components/cardbox/CardboxDropdownMenu.vue'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import CardTypeDropdownMenu from '@renderer/components/note/CardTypeDropdownMenu.vue'
import { useMenu } from '@renderer/composables/useMenu'
import { message } from '@renderer/utils/message'

const props = defineProps<{
  noteId: string
}>()
const noteStore = useNoteStore()

// === 生命周期钩子 ===

onMounted(async () => {
  // 1. 组件挂载时获取笔记
  await noteStore.fetchNote(props.noteId)
  // 2. 激活笔记编辑状态
  noteStore.activateNote(props.noteId)
  // 3. 添加到最近笔记
  noteStore.addToRecentNotes(props.noteId)
})

// === 计算属性 ===
// 获取当前编辑的笔记数据
const currentNote = computed(() => {
  // console.log('computed 执行, activeNotes:', noteStore.activeNotes)
  return noteStore.activeNotes[props.noteId]
})

// === 地址输入处理 ===
// 使用本地状态来管理输入
const localAddress = ref('')
const addressUpdateTimer = ref<any>(null)

// 监听 currentNote 的变化，同步初始地址
watch(
  () => currentNote.value,
  (newNote) => {
    if (newNote?.address) {
      localAddress.value = newNote.address
    }
  },
  { immediate: true }
) // 添加 immediate: true 确保首次加载时也执行

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

// 处理编辑器内容更新
const handleContentUpdate = (newContent: any) => {
  if (!currentNote.value) return

  // 立即更新本地状态
  currentNote.value.content = newContent
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
const tiptapEditor = ref<InstanceType<any> | null>(null)
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
  isExpandingToExpandEditor.value = true

  // 先清除定时器
  if (updateState.updateTimer) {
    clearTimeout(updateState.updateTimer)
  }

  try {
    // 1. 获取编辑器的最终状态并保存
    const finalContent = tiptapEditor.value?.editor?.getJSON() || updateState.lastContent
    if (finalContent) {
      await noteStore.updateNoteContent(currentNote.value.id, finalContent)
    }

    // 2. 再次获取笔记确认数据已保存
    await noteStore.fetchNote(currentNote.value.id)

    // 3. 保存成功后再跳转
    if (currentNote.value?.id) {
      // 4. 先关闭当前编辑器
      noteStore.closeNoteEditor()

      // 5. 最后进行跳转
      await router.push({ name: 'NoteExpandEditor', params: { id: currentNote.value.id } })
    }
  } catch (error) {
    console.error('保存失败:', error)
    message.error('保存失败')
    isExpandingToExpandEditor.value = false
  }
}

// 组件卸载时清理
onBeforeUnmount(async () => {
  console.log('NoteEditor 组件卸载前')
  if (updateState.updateTimer) {
    clearTimeout(updateState.updateTimer)
  }
  if (addressUpdateTimer.value) {
    clearTimeout(addressUpdateTimer.value)
  }
  // 如果有未保存的内容，立即保存
  if (currentNote.value && updateState.lastContent) {
    try {
      // 确保内容是编辑器的最终状态
      const finalContent = tiptapEditor.value?.editor?.getJSON() || updateState.lastContent

      await noteStore.saveNoteContentImmediately(currentNote.value.id, finalContent)
    } catch (error) {
      console.error('保存失败:', error)
      message.error('保存失败')
    }
  }
  // 停用笔记编辑状态, 如果不是跳转到展开编辑器进行编辑，则停用笔记编辑状态
  if (!isExpandingToExpandEditor.value) {
    noteStore.deactivateNote(props.noteId)
  }
})

// 暴露方法给父组件
defineExpose({
  focusAddressInput,
  focusEditor
})
</script>

<style lang="scss" scoped>
.note-editor {
  background-color: var(--color-bg-primary);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  height: 650px;
  max-height: 650px;
  width: 640px;
  max-width: 100%;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-primary);

  // 顶部工具栏
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px 0 20px;
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
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-left: 20px;
      width: 100%;

      input {
        width: 100%;
        padding: 6px 0;
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
        margin-right: 8px;
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
        padding-bottom: 30px; // 添加底部填充
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
}
</style>
