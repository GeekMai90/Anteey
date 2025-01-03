<!-- src/views/NoteExpandEditor.vue -->
<!-- 笔记展开编辑器组件 - 用于编辑单个笔记的主要界面 -->
<template>
  <div class="note-expand-editor">
    <!-- 顶部工具栏，包含返回和前进按钮 -->
    <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
    <!-- 编辑器内容 -->
    <div class="editor-content">
      <div class="editor-header">
        <!-- 地址输入区域 -->
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
            @keydown.enter="handleAddressEnter"
            @compositionstart="handleCompositionStart"
            @compositionend="handleCompositionEnd"
          />
        </div>
        <!-- 右侧工具栏 -->
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
              :position="cardboxMenuState.position"
              :note-id="currentNote?.id"
              :current-cardbox-id="currentNote?.cardBoxId"
              @close="closeCardboxMenu"
              @update="handleCardboxUpdate"
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
      <!-- 笔记创建时间显示 -->
      <div v-if="currentNote" class="note-timestamp">
        {{ formatDate(currentNote.createdAt) }}
      </div>
      <!-- 编辑器内容 -->
      <div class="content-container">
        <div class="editor-area">
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
        <!-- 添加反向链接面板 -->
        <div class="backlinks-area">
          <BacklinksPanel
            v-if="currentNote"
            :note-id="currentNote.id"
            :references="currentNote.references"
            @refresh="refreshNoteData"
          />
        </div>
        <!-- 标签面板 -->
        <TagsPanel
          v-if="currentNote"
          :note-id="currentNote.id"
          :tags="noteTags"
          @refresh="refreshNoteData"
        />
        <!-- 替换为新的图谱面板 -->
        <GraphPanel v-if="currentNote" :note-id="currentNote.id" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick, onBeforeUnmount, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from 'vue-router'
import { useNoteStore } from '@renderer/stores/noteStores'
import { formatDate } from '@renderer/utils/noteHelpers'
import { More, Install } from '@icon-park/vue-next'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'
import CardboxDropdownMenu from '@renderer/components/cardbox/CardboxDropdownMenu.vue'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import CardTypeDropdownMenu from '@renderer/components/note/CardTypeDropdownMenu.vue'
import { message } from '@renderer/utils/message'
import { useMenu } from '@renderer/composables/useMenu'
import BacklinksPanel from '@renderer/components/note/BacklinksPanel.vue'
import { CardType, Note } from '@renderer/types/Note'
import { debounce } from 'lodash-es'
// import { EditorState } from '@tiptap/pm/state/dist'
import TagsPanel from '@renderer/components/note/TagsPanel.vue'
import { useTagStore } from '@renderer/stores/tagStore'
import GraphPanel from '@renderer/components/note/GraphPanel.vue'
// === 组件状态管理 ===
const tiptapEditor = ref<any>(null)
const route = useRoute()
const noteStore = useNoteStore()
const noteId = route.params.id as string
const addressInput = ref<HTMLInputElement | null>(null)
const currentNote = ref<Note | null>(null)
// 1. 添加一个 ref 来存储笔记的标签
const noteTags = ref<{ id: string; name: string }[]>([])

const tagStore = useTagStore()

// 2. 添加获取笔记标签的方法
const fetchNoteTags = async (noteId: string) => {
  try {
    const tags = await tagStore.getNoteTags(noteId) // 需要在 noteStore 中添加这个方法
    noteTags.value = tags
  } catch (error) {
    console.error('获取笔记标签失败:', error)
    message.error('获取笔记标签失败')
  }
}

// 初始化笔记数据
const initializeNote = async (noteId: string) => {
  try {
    const note = await noteStore.fetchNote(noteId)
    if (note) {
      currentNote.value = note
      await fetchNoteTags(noteId) // 获取笔记的标签

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
  const noteId = route.params.id
  if (noteId && typeof noteId === 'string') {
    initializeNote(noteId)
  }
})
// 监听路由参数变化，重新加载笔记
watch(
  () => route.params.id,
  (newId) => {
    if (newId && typeof newId === 'string') {
      initializeNote(newId)
    }
  }
)

// === 生命周期钩子 ===

// 刷新笔记数据
const refreshNoteData = async () => {
  try {
    // 检查 currentNote.value 和 id 是否存在
    if (!currentNote.value?.id) {
      return
    }
    const updatedNote = await noteStore.fetchNote(currentNote.value.id)
    if (updatedNote) {
      currentNote.value = updatedNote
      await fetchNoteTags(updatedNote.id) // 刷新标签
    }
  } catch (error) {
    console.error('刷新笔记数据失败:', error)
    message.error('刷新笔记数据失败')
  }
}

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
    console.log('NoteExpandEditor.vue→ 更新笔记地址:', { noteId: currentNote.value.id, address })
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

// 处理回车键
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
// 使用防抖保存内容
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
const handleContentUpdate = (newContent: any) => {
  if (!currentNote.value) return

  try {
    // 确保内容是可序列化的
    const safeContent = JSON.parse(JSON.stringify(newContent))

    // 更新本地状态
    currentNote.value.content = safeContent

    // 触发防抖保存
    saveContent(currentNote.value.id, safeContent)
  } catch (error) {
    console.error('Content serialization error:', error)
  }
}

// === 尝试一下增加新的保存功能 ===
// 保存当前笔记内容的通用函数
const saveCurrentNote = async () => {
  if (!currentNote.value) return

  try {
    // 立即执行所有待保存的内容
    saveContent.flush()

    const editor = tiptapEditor.value?.editor
    if (editor) {
      const content = editor.getJSON()
      // 使用和 saveContent 相同的方式处理内容
      const safeContent = JSON.parse(JSON.stringify(content))
      await noteStore.updateNoteContent(currentNote.value.id, safeContent)
    }
  } catch (error) {
    console.error('保存笔记失败:', error)
    message.error('saveCurrentNote保存失败')
    throw error
  }
}

// 路由离开前保存
onBeforeRouteLeave(async (_to, _from, next) => {
  try {
    await saveCurrentNote()
    next()
  } catch (error) {
    // 可以选择是否阻止路由切换
    // next(false) // 阻止路由切换
    next() // 继续路由切换
  }
})

// 路由更新前保存
onBeforeRouteUpdate(async (to, from, next) => {
  try {
    if (from.params.id !== to.params.id) {
      await saveCurrentNote()
    }
    next()
  } catch (error) {
    next()
  }
})

// 在组件卸载前确保所有待保存的内容都已保存
onBeforeUnmount(() => {
  saveContent.flush()
  // 添加到最近笔记
  noteStore.addToRecentNotes(noteId)
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
}))

// 处理卡片类型选择和更新
const handleCardTypeSelect = async (newType: string) => {
  if (currentNote.value) {
    currentNote.value.cardType = newType as CardType
    try {
      await noteStore.updateNoteCardType(noteId, newType as CardType)
      closeCardTypeMenu()
    } catch (error) {
      console.error('更新卡片类型失败:', error)
      message.error('更新卡片类型失败')
    }
  }
}

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

// 处理卡片盒更新
const handleCardboxUpdate = async (cardBoxId: string) => {
  // 可以选择是否立即更新父组件状态
  if (currentNote.value) {
    currentNote.value.cardBoxId = cardBoxId
  }
  // // 后台刷新数据
  // await refreshNoteData()
}

// === 更多功能菜单管理 ===
const { menuItems: noteMenuItems, resetDeleteState } = useNoteMenu({
  noteId: noteId,
  menuItems: ['star', 'convertToFlashcard', 'sidebar', 'copyQuote', 'share', 'exportNote', 'delete']
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

// === 辅助函数 ===
// 聚焦编辑器
const focusEditor = () => {
  nextTick(() => {
    tiptapEditor.value?.focus('start')
  })
}

// 组件卸载时清理
// onBeforeUnmount(async () => {
//   // 如果有未保存的内容，立即保存
//   if (currentNote.value && updateState.lastContent) {
//     try {
//       // 确保内容是编辑器的最终状态
//       const finalContent = tiptapEditor.value?.editor?.getJSON() || updateState.lastContent
//       await noteStore.saveNoteContentImmediately(currentNote.value.id, finalContent)
//     } catch (error) {
//       console.error('保存失败:', error)
//       message.error('保存失败')
//     }
//   }
// })
</script>

<style scoped lang="scss">
.note-expand-editor {
  display: flex;
  flex-direction: column;
  // height: 100%;
  height: 100vh;
  background-color: var(--color-bg-primary);
  width: 100%;
  position: relative;
}

.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  // flex-grow: 1;
  /* padding: 20px calc((100% - 900px)/2); */
  padding: 20px;
  overflow-y: auto; // 让整个内容区可滚动
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  .content-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    min-height: min-content; // 确保容器可以根据内容增长
  }

  .content-area {
    flex-grow: 1;
    display: flex;
    // overflow: hidden;
    position: relative;
    min-height: 0;
  }
  .editor-area {
    width: 100%;
  }
  .backlinks-area {
    width: 100%;
    margin-top: 40px; // 添加一些间距
    flex-shrink: 0; // 防止面板被压缩
    // background: var(--color-bg-secondary);
  }

  :deep(.tiptap-container) {
    width: 100%;
    padding: 0 10px;
    position: relative;
  }

  :deep(.tiptap) {
    width: 100%;
    min-width: calc(100% - 40px);
    min-height: 300px;
  }
}

.more-menu-container {
  position: relative;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-left: 24px;
  z-index: 500;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.address-input {
  /* margin-bottom: 20px; */
  display: flex;
  align-items: center;
  height: 40px;
  width: 100%;
  position: relative; // 添加相对定位作为参考
  margin-left: 10px;

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
}
.note-indicator {
  position: absolute; // 改为绝对定位
  left: -10px;
  top: 52%;
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

  &:hover {
    width: 6px;
    height: 20px; // 增加高度变化
    transform: translateY(-50%) translateX(-1px); // 合并transform

    &::after {
      opacity: 0.5; // 显示光晕效果
    }
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
        width: 18px; // 或者您想要的大小
        height: 18px; // 或者您想要的大小
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
    }
  }
}

.note-timestamp {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-bottom: 20px;
  margin-left: 34px;
  user-select: none;
}

.toolbar-right {
  display: flex;
  position: relative;
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
      width: 18px;
      height: 18px;
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

.dropdown-container {
  position: relative;
}
</style>
