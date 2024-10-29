<!-- src/views/NoteExpandEditor.vue -->
<template>
  <div class="note-expand-editor">
    <!-- 顶部工具栏 -->
    <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
    <!-- 编辑器内容 -->
    <div class="editor-content">
      <div class="editor-header">
        <div class="address-input">
          <div
            ref="indicatorButton"
            class="note-indicator"
            :class="cardTypeClass"
            @click.stop="toggleCardTypeMenu"
          ></div>
          <CardTypeDropdownMenu
            ref="cardTypeDropdownMenu"
            :is-open="showCardTypeMenu"
            :current-card-type="currentNote?.cardType"
            :offset="{ x: -50, y: 10 }"
            @close="closeCardTypeMenu"
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
        <div class="toolbar-right">
          <div ref="infoBtnRef" class="install-btn" @click.stop="showCardBoxMenu">
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
              ref="dropdownMenu"
              :is-open="isMenuOpen"
              :note-id="currentNote?.id"
              :current-cardbox-id="currentNote?.cardBoxId"
              :offset="{ x: -85, y: 5 }"
              @close="closeCardBoxMenu"
            />
          </div>
          <!-- 更多菜单 -->
          <div ref="moreBtnRef" class="more-btn" @click.stop="toggleMenu">
            <div v-tooltip.bottom="{ content: '更多', delay: { show: 1000 } }" class="icon">
              <More theme="outline" size="16" fill="var(--color-icon-default)" :stroke-width="3" />
            </div>
            <PopupMenu
              ref="popupMenuRef"
              :show="isMenuVisible"
              :menuItems="noteMenuItems"
              :position="menuPosition"
              :offset="{ x: -75, y: 5 }"
              @close="closeMenu"
              @itemClick="handleMenuItemClick"
            />
          </div>
        </div>
      </div>
      <div v-if="currentNote" class="note-timestamp">
        {{ formatDate(currentNote.createdAt) }}
      </div>
      <!-- 编辑器内容 -->
      <div class="content-area">
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
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick, reactive } from 'vue'
import { useRoute } from 'vue-router'
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
import { debounce } from 'lodash-es'
import { message } from '@renderer/utils/message'

const tiptapEditor = ref<any>(null)
const route = useRoute()
const noteStore = useNoteStore()
const noteId = route.params.id as string
const addressInput = ref<HTMLInputElement | null>(null)

// 1. 组件挂载时获取笔记
onMounted(async () => {
  console.log('组件挂载, noteId:', noteId)
  await noteStore.fetchNote(noteId)
})

// 使用计算属性获取当前编辑的笔记
const currentNote = computed(() => {
  console.log('computed 执行, activeNotes:', noteStore.activeNotes)
  return noteStore.activeNotes[noteId]
})

// 处理地址输入
const handleAddressInput = debounce(async () => {
  if (currentNote.value) {
    try {
      await noteStore.updateNoteAddress(noteId, currentNote.value.address)
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
const handleContentUpdate = (newContent: any) => {
  console.log('内容更新:', newContent)
}
// 卡片类型菜单
const cardTypeDropdownMenu = ref<InstanceType<typeof CardTypeDropdownMenu> | null>(null)
const showCardTypeMenu = ref(false)
const indicatorButton = ref<HTMLElement | null>(null)

// 卡片类型
const cardTypeClass = computed(() => ({
  maincard: currentNote.value?.cardType === 'Maincard',
  bibcard: currentNote.value?.cardType === 'Bibcard',
  indexcard: currentNote.value?.cardType === 'Indexcard'
  // hoplinkcard: currentNote.value?.cardType === 'Hoplinkcard'
}))

// 打开卡片类型菜单
const toggleCardTypeMenu = (event: MouseEvent) => {
  event.stopPropagation()
  showCardTypeMenu.value = !showCardTypeMenu.value
  if (showCardTypeMenu.value && indicatorButton.value) {
    const rect = indicatorButton.value.getBoundingClientRect()
    menuPosition.x = rect.left
    menuPosition.y = rect.bottom
    showCardTypeMenu.value = true
    nextTick(() => {
      cardTypeDropdownMenu.value?.openMenu(menuPosition.x, menuPosition.y)
    })
  }
}

// 关闭卡片类型菜单
const closeCardTypeMenu = () => {
  showCardTypeMenu.value = false
}

// const updateCardType = (newType: CardType) => {
//   if (editedNote.value) {
//     editedNote.value.cardType = newType
//     saveNote()
//   }
// }

// 卡片盒菜单
const dropdownMenu = ref<InstanceType<typeof CardboxDropdownMenu> | null>(null)
const isMenuOpen = ref(false)
const infoBtnRef = ref<HTMLElement | null>(null)

// 卡片盒菜单
const showCardBoxMenu = (event: MouseEvent) => {
  event.preventDefault()
  isMenuOpen.value = !isMenuOpen.value
  if (isMenuOpen.value && infoBtnRef.value) {
    const rect = infoBtnRef.value.getBoundingClientRect()
    menuPosition.x = rect.left
    menuPosition.y = rect.bottom
    isMenuOpen.value = true
    nextTick(() => {
      dropdownMenu.value?.openMenu(menuPosition.x, menuPosition.y)
    })
  }
}
const closeCardBoxMenu = () => {
  isMenuOpen.value = false
}

// 更多按钮弹出菜单
const moreBtnRef = ref<HTMLElement | null>(null)
const popupMenuRef = ref<InstanceType<typeof PopupMenu> | null>(null)
const isMenuVisible = ref(false)
const menuPosition = reactive({ x: 0, y: 0 })

// 更多菜单
const { menuItems: noteMenuItems, resetDeleteState } = useNoteMenu({
  noteId: noteId,
  menuItems: ['star', 'share', 'sidebar', 'copyNoteLink', 'exportNote', 'delete', 'copyQuote']
})

// 更多菜单点击事件
const toggleMenu = (event: MouseEvent) => {
  event.preventDefault()
  isMenuVisible.value = !isMenuVisible.value
  if (isMenuVisible.value && moreBtnRef.value) {
    const rect = moreBtnRef.value.getBoundingClientRect()
    menuPosition.x = rect.left
    menuPosition.y = rect.bottom
    isMenuVisible.value = true
    nextTick(() => {
      popupMenuRef.value?.openMenu()
    })
  }
}

// 更多菜单点击事件
const handleMenuItemClick = (item: MenuItem) => {
  item.action()
  if (item.name !== 'delete') {
    closeMenu()
  }
}

const closeMenu = () => {
  isMenuVisible.value = false
  resetDeleteState()
}

// 聚焦编辑器
const focusEditor = () => {
  nextTick(() => {
    tiptapEditor.value?.focus('start')
  })
}

// 在组件挂载后将笔记添加到最近笔记
onMounted(() => {
  // focusAddressInput()
  if (noteId) {
    noteStore.addToRecentNotes(noteId)
  }
})
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
  overflow: auto;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;

  .content-area {
    flex-grow: 1;
    display: flex;
    // overflow: hidden;
    position: relative;
    min-height: 0;
  }

  :deep(.tiptap-container) {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    padding: 0 10px;
    position: relative;
  }

  :deep(.tiptap) {
    // width: 100%;
    min-width: calc(100% - 40px);
    min-height: 100%;
    overflow-y: auto;
  }
}

.more-menu-container {
  position: relative;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-left: 20px;
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

  input {
    display: flex;
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    font-size: 1.5rem;
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
  width: 4px;
  height: 15px;
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
      // border: 1px solid var(--color-primary);
    }
  }
}

.note-timestamp {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-bottom: 20px;
  margin-left: 33px;
  user-select: none;
}

.toolbar-right {
  display: flex;
  // gap: 10px;
  position: relative;
  // margin-right: 10px;
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
