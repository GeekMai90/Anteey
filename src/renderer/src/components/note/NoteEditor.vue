<!-- src/components/NoteEditor.vue -->
<template>
  <div class="note-editor">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <!-- 展开编辑器按钮 -->
      <ExpandButton v-if="currentNote" :note-id="currentNote.id" />

      <div class="toolbar-right">
        <!-- 卡片盒设置按钮 -->
        <CardboxButton
          v-if="currentNote"
          :note-id="currentNote.id"
          :current-cardbox-id="currentNote.cardBoxId"
        />

        <!-- 更多功能菜单按钮 -->
        <MoreButton
          v-if="currentNote"
          :note-id="currentNote.id"
          :menu-items="[
            'star',
            'convertToFlashcard',
            'sidebar',
            'toggleIndex',
            'copyQuote',
            'exportNote',
            'delete'
          ]"
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
        <input
          v-if="currentNote"
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
import { useNoteStore } from '@renderer/stores/noteStore'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'
import CardTypeDropdownMenu from '@renderer/components/note/CardTypeDropdownMenu.vue'
import { useMenu } from '@renderer/composables/useMenu'
import { message } from '@renderer/utils/message'
import { CardType, Note } from '@shared/types'
import { debounce } from 'lodash-es'
import ExpandButton from '@renderer/components/common/ExpandButton.vue'
import CardboxButton from '@renderer/components/common/CardboxButton.vue'
import MoreButton from '@renderer/components/common/MoreButton.vue'

const props = defineProps<{
  noteId: string
}>()
const noteStore = useNoteStore()
const currentNote = ref<Note | null>(null)

// 添加版本创建的状态控制
const lastVersionTime = ref<Date | null>(null)
const VERSION_INTERVAL = 5 * 60 * 1000 // 5分钟

// 创建历史版本的方法
const createVersion = async () => {
  if (!currentNote.value) return

  // 检查是否达到创建间隔
  const now = new Date()
  if (lastVersionTime.value && now.getTime() - lastVersionTime.value.getTime() < VERSION_INTERVAL) {
    return
  }

  const safeContent = JSON.parse(JSON.stringify(currentNote.value.content))

  try {
    await window.electronAPI.noteVersion.createNoteVersion({
      noteId: currentNote.value.id,
      content: safeContent,
      address: currentNote.value.address,
      cardType: currentNote.value.cardType,
      createdAt: currentNote.value.createdAt
    })
    lastVersionTime.value = now
  } catch (error) {
    console.error('创建版本失败:', error)
  }
}

// === 生命周期钩子 ===

// 初始化笔记数据
const initializeNote = async (noteId: string) => {
  try {
    const note = await noteStore.fetchNote(noteId)
    if (note) {
      currentNote.value = note
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
const isComposing = ref(false)

// 监听 currentNote 的变化，同步初始地址
watch(
  () => currentNote.value?.address,
  (newAddress) => {
    if (newAddress !== undefined) {
      localAddress.value = newAddress
    }
  },
  { immediate: true }
)

// 使用防抖处理地址更新
const updateAddress = debounce(async (address: string) => {
  if (!currentNote.value) return

  try {
    console.log('NoteEditor.vue→ 更新笔记地址:', { noteId: currentNote.value.id, address })
    // 直接更新数据库
    await noteStore.updateNoteAddress(currentNote.value.id, address)
    // 更新本地状态
    if (currentNote.value) {
      currentNote.value.address = address
    }
  } catch (error) {
    console.error('更新地址失败:', error)
    message.error('更新地址失败')
    // 只在出错时回滚
    localAddress.value = currentNote.value?.address || ''
  }
}, 500)

// 处理地址输入
const handleAddressInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const newValue = input.value

  // 直接更新本地状态
  localAddress.value = newValue

  // 如果不是在输入法编辑状态，则触发更新
  if (!isComposing.value) {
    updateAddress(newValue)
  }
}

// 处理输入法开始
const handleCompositionStart = () => {
  isComposing.value = true
}

// 处理输入法结束
const handleCompositionEnd = (event: CompositionEvent) => {
  isComposing.value = false
  // 在输入法结束后，手动触发一次更新
  const input = event.target as HTMLInputElement
  updateAddress(input.value)
}

// 修改回车键处理函数
const handleAddressEnter = (event: KeyboardEvent) => {
  // 如果正在输入法输入中，不做任何处理
  if (isComposing.value) {
    return
  }

  event.preventDefault()
  // 强制执行一次更新
  updateAddress.flush()
  focusEditor()
}

// === 内容更新处理 ===

// 使用一个更保守的保存策略
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

// 处理编辑器内容更新

const handleContentUpdate = async (newContent: any) => {
  if (!currentNote.value) return

  try {
    // 确保内容是可序列化的
    const safeContent = JSON.parse(JSON.stringify(newContent))

    // 更新本地状态
    currentNote.value.content = safeContent

    // 触发防抖保存
    saveContent(currentNote.value.id, safeContent)
    // 处理版本创建
    await createVersion()
  } catch (error) {
    console.error('Content serialization error:', error)
  }
}

// === 尝试一下增加新的保存功能 ===

// 在组件卸载前确保所有待保存的内容都已保存
onBeforeUnmount(async () => {
  saveContent.flush()

  // 添加到最近笔记
  noteStore.addToRecentNotes(props.noteId)
  // 创建版本
  if (currentNote.value) {
    await createVersion()
  }
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
  menuRef: cardTypeDropdownMenuRef
})

// 卡片类型，根据当前笔记的卡片类型设置样式
const cardTypeClass = computed(() => ({
  maincard: currentNote.value?.cardType === 'Maincard',
  bibcard: currentNote.value?.cardType === 'Bibcard',
  indexcard: currentNote.value?.cardType === 'Indexcard',
  draftcard: currentNote.value?.cardType === 'Draftcard'
  // hoplinkcard: currentNote.value?.cardType === 'Hoplinkcard'
}))

// 处理卡片类型选择和更新
const handleCardTypeSelect = async (newType: string) => {
  if (currentNote.value) {
    currentNote.value.cardType = newType as CardType
    try {
      await noteStore.updateNoteCardType(props.noteId, newType as CardType)
      closeCardTypeMenu()
    } catch (error) {
      console.error('更新卡片类型失败:', error)
      message.error('更新卡片类型失败')
    }
  }
}

const addressInput = ref<HTMLInputElement | null>(null)
const tiptapEditor = ref<InstanceType<any> | null>(null)

// === 卡片盒菜单管理 ===

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
  height: 750px;
  max-height: 80vh;
  width: 900px;
  max-width: 90vw;
  position: relative;
  overflow: visible;
  box-shadow: var(--shadow-primary);

  // 顶部工具栏
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px 0 20px;
    position: relative;

    .toolbar-right {
      display: flex;
    }
  }

  .editor-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    width: 100%;
    overflow: hidden; // 防止双重滚动条

    .address-input {
      /* margin-bottom: 20px; */
      display: flex;
      align-items: center;
      height: 40px;
      width: 100%;
      position: relative; // 添加相对定位作为参考
      margin-left: 65px;

      input {
        display: flex;
        width: 100%;
        height: 100%;
        border: none;
        outline: none;
        font-size: 1.2rem;
        font-weight: bold;
        background-color: transparent;
        line-height: 40px; // 设置行高，通常设置为 1.2 到 1.5 之间的值
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

      .note-indicator {
        position: absolute; // 改为绝对定位
        left: -12px;
        top: 50%;
        transform: translateY(-50%); // 垂直居中
        width: 4px;
        height: 15px;
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

        &.draftcard {
          background-color: var(--color-draft);
          &::after {
            color: var(--color-draft);
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
        width: 100%;

        :deep(.tiptap) {
          flex: 1;
          min-height: 100%; // 修改这里，移除预留标签面板的空间
          padding-bottom: 20px;
        }
      }
    }

    :deep(.tiptap-container) {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      padding: 0 40px;
      position: relative;
    }

    :deep(.tiptap) {
      min-width: calc(100% - 150px);
      min-height: 100%;
      overflow-y: auto;
      padding-bottom: 60px;
    }
  }
}
</style>
