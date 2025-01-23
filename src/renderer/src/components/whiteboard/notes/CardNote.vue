<template>
  <div class="card-note" :class="{ 'not-editing': !props.isEditing }">
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
            <Install theme="outline" size="18" fill="var(--color-icon-default)" :stroke-width="3" />
          </div>
          <!-- 添加卡片盒下拉菜单 -->
          <CardboxDropdownMenu
            ref="cardboxMenuRef"
            :is-open="cardboxMenuState.isOpen"
            :position="cardboxMenuState.position"
            :note-id="note?.id"
            :current-cardbox-id="note?.cardBoxId"
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
    <div class="address-input" :class="{ 'not-editing': !props.isEditing }">
      <!-- 笔记类型指示器 -->
      <div
        ref="indicatorButton"
        class="note-indicator"
        :class="cardTypeClass"
        @click="toggleCardTypeMenu"
      ></div>
      <!-- 笔记类型下拉菜单 -->
      <CardTypeDropdownMenu
        ref="cardTypeDropdownMenuRef"
        :is-open="cardTypeMenuState.isOpen"
        :position="cardTypeMenuState.position"
        :current-card-type="note?.cardType"
        @close="closeCardTypeMenu"
        @select="handleCardTypeSelect"
      />
      <!-- 地址输入框 -->
      <input
        v-if="note"
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
          v-if="note"
          ref="tiptapEditor"
          v-model:content="note.content"
          :note-id="note.id"
          :editable="props.isEditing"
          :enable-drag-handle="false"
          @update:content="handleContentUpdate"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'
import CardTypeDropdownMenu from '@renderer/components/note/CardTypeDropdownMenu.vue'
import { useMenu } from '@renderer/composables/useMenu'
import { message } from '@renderer/utils/message'
import { CardType, type Note } from '@shared/types'
import { debounce } from 'lodash-es'
import { Install, More, ExpandTextInput } from '@icon-park/vue-next'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import CardboxDropdownMenu from '@renderer/components/cardbox/CardboxDropdownMenu.vue'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  noteId: string
  isEditing: boolean
  isAutoHeight?: boolean
  style?: any
}>()

const noteStore = useNoteStore()
const note = ref<Note | null>(null)

// === 初始化笔记数据 ===
const initializeNote = async (noteId: string) => {
  try {
    const fetchedNote = await noteStore.fetchNote(noteId)
    if (fetchedNote) {
      note.value = fetchedNote
    }
  } catch (error) {
    console.error('加载笔记失败:', error)
    message.error('加载笔记失败')
  }
}

// 监听 noteId 变化
watch(
  () => props.noteId,
  (newId) => {
    if (newId) {
      initializeNote(newId)
    }
  },
  { immediate: true }
)

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
const tiptapEditor = ref<any>(null)

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

const cardTypeClass = computed(() => ({
  maincard: note.value?.cardType === 'Maincard',
  bibcard: note.value?.cardType === 'Bibcard',
  indexcard: note.value?.cardType === 'Indexcard'
}))

const handleCardTypeSelect = async (newType: string) => {
  if (note.value) {
    note.value.cardType = newType as CardType
    try {
      await noteStore.updateNoteCardType(props.noteId, newType as CardType)
      closeCardTypeMenu()
    } catch (error) {
      console.error('更新卡片类型失败:', error)
      message.error('更新卡片类型失败')
    }
  }
}

// === 工具函数 ===
const focusEditor = () => {
  nextTick(() => {
    tiptapEditor.value?.focus('end')
  })
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
  noteId: props.noteId,
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
.card-note {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 10px 0px;
  // background-color: inherit;
  border-radius: 8px;
  overflow: hidden;

  .editor-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    width: 100%;
    overflow: hidden;
    transition: height 0.2s ease-out;

    .content-area {
      flex-grow: 1;
      display: flex;
      overflow-y: auto;
      min-height: 0;
      width: 100%;

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
      overflow: visible;
      height: auto !important;
      position: relative;
      background-color: inherit;
    }

    :deep(.tiptap) {
      min-width: calc(100% - 40px);
      overflow: visible;
      height: auto !important;
      min-height: 100px;
      padding-left: 2rem;
      padding-right: 2rem;
      background-color: inherit;
    }
  }

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
          width: 16px;
          height: 16px;
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
      // gap: 10px;
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
          width: 16px;
          height: 16px;
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
    height: 40px;
    width: 100%;
    position: relative;
    margin-left: 35px;
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
      font-size: 1.2rem;
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

  &.not-editing {
    .content-area {
      overflow: hidden;
      pointer-events: none;
    }

    :deep(.tiptap-container) {
      overflow: hidden;
      pointer-events: none;
    }

    :deep(.tiptap) {
      overflow: hidden;
      pointer-events: none;
    }
  }
}
</style>
