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
          v-model="currentNote.address"
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
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStores'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'
import { useRouter } from 'vue-router'
import { ExpandTextInput, Install, More } from '@icon-park/vue-next'
import CardboxDropdownMenu from '@renderer/components/cardbox/CardboxDropdownMenu.vue'
import { debounce } from 'lodash-es'
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
})

// === 计算属性 ===
// 获取当前编辑的笔记数据
const currentNote = computed(() => {
  console.log('computed 执行, activeNotes:', noteStore.activeNotes)
  return noteStore.activeNotes[props.noteId]
})

// === 地址输入处理 ===
// 使用防抖处理地址输入，避免频繁更新
const handleAddressInput = debounce(async () => {
  if (currentNote.value) {
    try {
      await noteStore.updateNoteAddress(props.noteId, currentNote.value.address)
      console.log('地址更新成功')
    } catch (error) {
      console.error('更新地址失败:', error)
      message.error('更新地址失败')
    }
  }
}, 300) // 300ms 的防抖
// 处理回车键
const handleAddressEnter = (event: KeyboardEvent) => {
  event.preventDefault() // 阻止默认行为
  handleAddressInput.flush() // 立即执行防抖函数
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

// 添加一个立即保存的函数
const saveContentImmediately = async () => {
  if (!currentNote.value || !updateState.lastContent) return

  try {
    await noteStore.updateNoteContent(currentNote.value.id, updateState.lastContent)
    console.log('内容已保存')
  } catch (error) {
    console.error('保存失败:', error)
    message.error('保存失败')
  }
}

// 处理编辑器内容更新
const handleContentUpdate = (newContent: any) => {
  if (!currentNote.value) return

  // 保存当前光标位置
  const editor = tiptapEditor.value?.editor
  const selection = editor?.state.selection

  // 使用防抖进行更新
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

// 组件卸载时清理
onBeforeUnmount(async () => {
  console.log('NoteEditor 组件卸载前')
  if (updateState.updateTimer) {
    clearTimeout(updateState.updateTimer)
  }
  // 执行最后一次保存
  await saveContentImmediately()
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

// const closeMenu = () => {
//   isMenuVisible.value = false
//   resetDeleteState()
// }

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
  // 先保存内容
  if (updateState.updateTimer) {
    clearTimeout(updateState.updateTimer)
  }
  try {
    await saveContentImmediately()
    // 保存成功后再跳转
    if (currentNote.value?.id) {
      router.push({ name: 'NoteExpandEditor', params: { id: currentNote.value.id } })
    }
    noteStore.closeNoteEditor()
  } catch (error) {
    console.error('保存失败:', error)
    message.error('保存失败')
  }
}
// 组件卸载时清理
onBeforeUnmount(() => {
  console.log('NoteEditor 组件卸载前')
  if (updateState.updateTimer) {
    clearTimeout(updateState.updateTimer)
  }
})

// 暴露方法给父组件
defineExpose({
  focusAddressInput,
  focusEditor
})

// defineExpose({ handleAutoSave, focusAddressInput })
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

  // .card-type-menu {
  //   position: fixed;
  //   background-color: var(--color-bg-primary);
  //   border-radius: 8px;
  //   box-shadow: var(--shadow-primary);
  //   z-index: 1000;
  //   padding: 8px 0;
  //   width: auto;
  //   align-items: center;

  //   .card-type-item {
  //     display: flex;
  //     align-items: center;
  //     width: 150px;
  //     padding: 2px 8px;
  //     border: none;
  //     background: none;
  //     cursor: pointer;
  //     transition: background-color 0.2s;
  //     border-radius: 8px;
  //     margin: 2px 8px;

  //     .icon {
  //       background: none;
  //       border: none;
  //       cursor: pointer;
  //       width: 28px;
  //       height: 28px;
  //       display: flex;
  //       align-items: center;
  //       justify-content: center;
  //       border-radius: 6px;
  //       transition: background-color 0.2s;
  //       padding: 0;
  //       margin-right: 5px;

  //       &:hover:not(:disabled) {
  //         background-color: var(--color-hover-bg);
  //       }

  //       &:disabled {
  //         opacity: 0.5;
  //         cursor: not-allowed;
  //       }

  //       // 新增以下样式来处理 i-icon 类
  //       :deep(.i-icon) {
  //         display: flex;
  //         align-items: center;
  //         justify-content: center;
  //         width: 100%;
  //         height: 100%;
  //       }

  //       :deep(svg) {
  //         width: 16px; // 或者您想要的大小
  //         height: 16px; // 或者您想要的大小
  //       }
  //     }

  //     .name {
  //       flex-grow: 0;
  //       text-align: left;
  //       color: var(--color-text-primary);
  //       font-size: 14px;
  //       white-space: nowrap; // 防止文字换行
  //       writing-mode: horizontal-tb; // 确保文字是水平排列的
  //     }

  //     &:hover {
  //       background-color: var(--color-hover-bg);
  //     }

  //     &.active {
  //       background-color: var(--color-menu-active-bg);
  //       // border: 1px solid var(--color-primary);
  //     }
  //   }
  // }
}
</style>
