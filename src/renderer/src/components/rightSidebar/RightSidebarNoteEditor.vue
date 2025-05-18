<!-- src/components/RightSidebarNoteEditor.vue -->
<template>
  <div class="right-sidebar-note-editor" :class="{ 'is-collapsed': isCollapsed }">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <!-- 展开编辑器按钮 -->
      <IconButton
        :icon="isCollapsed ? Right : Down"
        size="default"
        fill="var(--color-icon-default)"
        @click="handleExpand"
      />

      <!-- 右侧工具栏 -->
      <div class="toolbar-right">
        <!-- 在主面板打开按钮 -->
        <IconButton
          :icon="Afferent"
          :tooltip="{ content: '在主面板打开', placement: 'top', delay: { show: 1000 } }"
          size="default"
          fill="var(--color-icon-default)"
          @click="openInMainPanel"
        />

        <!-- 卡片盒设置按钮 -->
        <CardboxButton
          v-if="currentNote"
          :note-id="currentNote.id"
          :current-cardbox-id="currentNote.cardBoxId"
          size="default"
        />

        <!-- 更多按钮 -->
        <MoreButton
          v-if="currentNote"
          :note-id="currentNote.id"
          size="default"
          :menu-items="['star', 'copyQuote', 'share', 'exportNote']"
        />

        <!-- 关闭按钮 -->
        <IconButton
          :icon="CloseOne"
          :tooltip="{ content: '关闭', placement: 'top', delay: { show: 1000 } }"
          size="default"
          fill="var(--color-icon-default)"
          @click="handleRemoveNoteFromRightSidebar"
        />
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
      <div class="content-area">
        <div class="content-wrapper">
          <TipTapEditor
            v-if="currentNote"
            ref="tiptapEditor"
            v-model:content="currentNote.content"
            :note-id="currentNote.id"
            :editable="true"
            :enableDragHandle="false"
            :show-character-count="false"
            :enable-add-paragraph-area="false"
            @update:content="handleContentUpdate"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'
import { Right, Down, CloseOne, Afferent } from '@icon-park/vue-next'
import { useMenu } from '@renderer/composables/useMenu'
import { message } from '@renderer/utils/message'
import CardTypeDropdownMenu from '@renderer/components/note/CardTypeDropdownMenu.vue'
import { CardType, Note } from '@shared/types'
import { debounce } from 'lodash-es'
import { EditorState } from '@tiptap/pm/state/dist'
import { useRouter } from 'vue-router/dist/vue-router'
import MoreButton from '@renderer/components/common/MoreButton.vue'
import CardboxButton from '@renderer/components/common/CardboxButton.vue'
import IconButton from '@renderer/components/ui/buttons/IconButton.vue'

const props = defineProps<{
  noteId: string
}>()

const addressInput = ref<HTMLInputElement | null>(null)
const tiptapEditor = ref<InstanceType<any> | null>(null)
const noteStore = useNoteStore()
const currentNote = ref<Note | null>(null)
const router = useRouter()

// 初始化笔记数据
const initializeNote = async (noteId: string) => {
  try {
    const note = await noteStore.fetchNote(noteId)
    if (note) {
      currentNote.value = note
      // 添加到最近笔记
      noteStore.addToRecentNotes(noteId)
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
    localAddress.value = currentNote.value?.address || ''
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
    noteStore.updateNoteAddress(currentNote.value!.id, localAddress.value)
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
    currentNote.value.cardType = newType as CardType
    try {
      await noteStore.updateNoteCardType(currentNote.value.id, newType as CardType)
      closeCardTypeMenu()
    } catch (error) {
      console.error('更新卡片类型失败:', error)
      message.error('更新卡片类型失败')
    }
  }
}

// === 辅助函数 ===
// 聚焦编辑器
const focusEditor = () => {
  nextTick(() => {
    tiptapEditor.value?.focus('start')
  })
}

const handleRemoveNoteFromRightSidebar = () => {
  noteStore.removeNoteFromRightSidebar(props.noteId)
}

// 聚焦地址输入框
const focusAddressInput = () => {
  nextTick(() => {
    addressInput.value?.focus()
  })
}

defineExpose({ focusAddressInput })

// 1. 修改 isCollapsed 的定义，使用 store 中的状态
const isCollapsed = computed(() => noteStore.isNoteCollapsed(props.noteId))

// 2. 修改 handleExpand 方法
const handleExpand = () => {
  noteStore.toggleNoteCollapse(props.noteId)
}

// 打开笔记到主面板
const openInMainPanel = () => {
  saveContent.flush()
  router.push(`/note/${props.noteId}`)
}
</script>

<style lang="scss" scoped>
.right-sidebar-note-editor {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-card);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  height: 600px;
  max-height: 600px;
  width: 640px;
  max-width: 100%;
  position: relative;
  transition: height 0.3s ease;
  // 默认状态（展开）
  height: auto;
  max-height: calc(100vh - 100px); // 设置一个最大高度，防止内容过多时超出屏幕
  overflow-y: auto;

  // 折叠状态
  &.is-collapsed {
    height: 160px; // 或者您想要的折叠高度
    overflow: hidden;
  }

  // 顶部工具栏
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 10px 0px 10px;
    position: relative;

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 2px; // 添加按钮之间的间距
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
      /* margin-bottom: 20px; */
      display: flex;
      align-items: center;
      height: 40px;
      width: 100%;
      position: relative; // 添加相对定位作为参考
      margin-left: 30px;
      margin-bottom: 6px;

      input {
        display: flex;
        width: 100%;
        height: 100%;
        border: none;
        outline: none;
        font-size: 1rem;
        font-weight: bold;
        background-color: transparent;
        line-height: 1;
        padding: 0;
        margin: 0;
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
    }
    .note-indicator {
      position: absolute; // 改为绝对定位
      left: -10px;
      top: 52%;
      transform: translateY(-50%); // 垂直居中
      width: 4px;
      height: 12px;
      border-radius: 2px;
      display: block;
      flex-shrink: 0;
      cursor: pointer;
      border: none;
      outline: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      // 添加微光效果
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

      &.hoplinkcard {
        background-color: var(--color-pink);
        &::after {
          color: var(--color-pink);
        }
      }

      &:hover {
        width: 6px;
        height: 20px; // 增加高度变化
        transform: translateY(-50%) translateX(-1px); // 合并transform

        &::after {
          opacity: 0.5; // 显示光晕效果
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
        padding-bottom: 20px; // 添加底部填充
        width: 100%;
      }
    }

    :deep(.tiptap-container) {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      padding: 0 4px;
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
  :deep(.tiptap) {
    margin-left: 0 !important ;
    margin-right: 0 !important;
    padding-left: 1.5rem !important;
    padding-right: 1.5rem !important;
  }
}
</style>
