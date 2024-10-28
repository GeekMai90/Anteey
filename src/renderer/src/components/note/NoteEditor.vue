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
        <div ref="infoBtnRef" class="install-btn" @click.stop="showCardBoxMenu">
          <div v-tooltip.bottom="{ content: '设置卡片盒', delay: { show: 1000 } }" class="icon">
            <Install theme="outline" size="16" fill="#b6b6b6" :stroke-width="3" />
          </div>
          <!-- 添加卡片盒下拉菜单 -->
          <CardboxDropdownMenu
            ref="dropdownMenu"
            :is-open="isMenuOpen"
            :note-id="currentNote?.id"
            :current-cardbox-id="currentNote?.cardBoxId"
            :offset="{ x: -120, y: 5 }"
            @close="closeCardBoxMenu"
          />
        </div>

        <div ref="moreBtnRef" class="more-btn" @click.stop="toggleMenu">
          <div v-tooltip.bottom="{ content: '更多', delay: { show: 1000 } }" class="icon">
            <More theme="outline" size="16" fill="var(--color-icon-default)" :stroke-width="3" />
          </div>
        </div>
      </div>
    </div>
    <!-- 编辑器内容 -->
    <div class="editor-content">
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
          @update:card-type="handleCardTypeUpdate"
          @close="closeCardTypeMenu"
        />
        <input
          v-if="currentNote"
          ref="addressInput"
          v-model="currentNote.address"
          type="text"
          placeholder="输入编码地址"
          @input="handleAddressUpdate"
          @keyup.enter="handleAddressEnter"
        />
      </div>
      <div class="content-area">
        <div class="content-wrapper">
          <TipTapEditor
            v-if="currentNote"
            ref="tiptapEditor"
            v-model:content="currentNote.content"
            :note-id="currentNote?.id"
            :editable="true"
            :enableDragHandle="true"
            @update:content="debouncedContentUpdate"
          />
        </div>
      </div>
    </div>
    <PopupMenu
      ref="popupMenuRef"
      :show="isMenuVisible"
      :menuItems="noteMenuItems"
      :position="menuPosition"
      :offset="{ x: -140, y: 5 }"
      @close="closeMenu"
      @itemClick="handleMenuItemClick"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { CardType } from '@renderer/types/Note'
import { useNoteStore } from '@renderer/stores/note-store'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'
import { useRouter } from 'vue-router'
import { ExpandTextInput, Install, More } from '@icon-park/vue-next'
import CardboxDropdownMenu from '@renderer/components/cardbox/CardboxDropdownMenu.vue'
import { debounce } from 'lodash-es'
import { storeToRefs } from 'pinia'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import CardTypeDropdownMenu from '@renderer/components/note/CardTypeDropdownMenu.vue'

const props = defineProps<{
  noteId: string
}>()

const noteStore = useNoteStore()
const { currentNote } = storeToRefs(noteStore)

// 监听笔记 ID 的变化，获取笔记
watch(
  () => props.noteId,
  async (newId) => {
    if (newId) {
      await noteStore.fetchNoteById(newId)
    }
  },
  { immediate: true }
)

// 地址更新（不需要防抖）
const handleAddressUpdate = async (newAddress: string) => {
  try {
    await noteStore.updateNoteAddress(props.noteId, newAddress)
  } catch (error) {
    // 处理错误
  }
}
// 卡片类型更新
const handleCardTypeUpdate = async (newType: CardType) => {
  try {
    await noteStore.updateNoteCardType(props.noteId, newType)
  } catch (error) {
    // 处理错误
  }
}
// 防抖的内容更新
const debouncedContentUpdate = debounce(async (newContent: any) => {
  try {
    await noteStore.updateNoteContent(props.noteId, newContent)
  } catch (error) {
    // 处理错误，可能显示提示等
  }
}, 300)

const cardTypeDropdownMenu = ref<InstanceType<typeof CardTypeDropdownMenu> | null>(null)
const showCardTypeMenu = ref(false)
const indicatorButton = ref<HTMLElement | null>(null)

const cardTypeClass = computed(() => ({
  maincard: currentNote.value?.cardType === 'Maincard',
  bibcard: currentNote.value?.cardType === 'Bibcard',
  indexcard: currentNote.value?.cardType === 'Indexcard',
  hoplinkcard: currentNote.value?.cardType === 'Hoplinkcard'
}))

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

const closeCardTypeMenu = () => {
  showCardTypeMenu.value = false
}

// 更多按钮弹出菜单
const moreBtnRef = ref<HTMLElement | null>(null)
const popupMenuRef = ref<InstanceType<typeof PopupMenu> | null>(null)
const isMenuVisible = ref(false)
const menuPosition = reactive({ x: 0, y: 0 })

const { menuItems: noteMenuItems, resetDeleteState } = useNoteMenu({
  noteId: props.noteId,
  menuItems: ['star', 'sidebar', 'copyNoteLink', 'exportNote', 'delete']
})
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

const router = useRouter()
const addressInput = ref<HTMLInputElement | null>(null)
const tiptapEditor = ref<InstanceType<any> | null>(null)
// const emit = defineEmits(['close', 'save', 'expand', 'toggleOptions'])

const isExpandingToExpandEditor = ref(false)

// 卡片盒列表
const dropdownMenu = ref<InstanceType<typeof CardboxDropdownMenu> | null>(null)
const isMenuOpen = ref(false)
const infoBtnRef = ref<HTMLElement | null>(null)

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

// 添加新的处理函数
const handleAddressEnter = (event: KeyboardEvent) => {
  event.preventDefault() // 阻止默认行为
  focusEditor()
}

// 展开编辑器
const handleExpand = async () => {
  isExpandingToExpandEditor.value = true
  if (currentNote.value?.id) {
    router.push({ name: 'NoteExpandEditor', params: { id: currentNote.value.id } })
  }
  noteStore.closeNoteEditor()
}

// defineExpose({ handleAutoSave, focusAddressInput })
defineExpose({ focusAddressInput, focusEditor })
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
