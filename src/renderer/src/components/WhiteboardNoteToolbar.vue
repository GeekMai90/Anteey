<template>
  <div class="note-editor">
    <div class="toolbar">
      <div
        v-tooltip.bottom="{ content: '展开编辑器', delay: { show: 1000 } }"
        class="expand-btn"
        @click="$emit('expand')"
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
        <div ref="cardBoxBtnRef" class="install-btn" @click.stop="toggleCardboxMenu">
          <div v-tooltip.bottom="{ content: '设置卡片盒', delay: { show: 1000 } }" class="icon">
            <Install theme="outline" size="16" fill="var(--color-icon-default)" :stroke-width="3" />
          </div>
        </div>
        <div class="connect-btn" @click="$emit('start-connection', $event)">
          <div v-tooltip.bottom="{ content: '连线', delay: { show: 1000 } }" class="icon">
            <Connection
              theme="outline"
              size="16"
              fill="var(--color-icon-default)"
              :stroke-width="3"
            />
          </div>
        </div>
        <div ref="moreBtnRef" class="more-btn" @click.stop="toggleMenu">
          <div v-tooltip.bottom="{ content: '更多', delay: { show: 1000 } }" class="icon">
            <More theme="outline" size="16" fill="var(--color-icon-default)" :stroke-width="3" />
          </div>
        </div>
      </div>
    </div>
    <CardboxDropdownMenu
      ref="cardboxDropdownMenu"
      :is-open="isCardboxMenuOpen"
      :note-id="noteId"
      :current-cardbox-id="currentCardboxId || ''"
      :offset="{ x: -70, y: 5 }"
      @close="closeCardboxMenu"
    />
    <PopupMenu
      ref="popupMenuRef"
      :show="isMenuVisible"
      :menuItems="moreMenuItems"
      :position="menuPosition"
      :offset="{ x: -70, y: 5 }"
      @close="closeMenu"
      @itemClick="handleMenuItemClick"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import { ExpandTextInput, Install, More, Connection } from '@icon-park/vue-next'
import CardboxDropdownMenu from './CardboxDropdownMenu.vue'
import PopupMenu from './PopupMenu.vue'
import type { MenuItem } from './PopupMenu.vue'
import { useNoteStore } from '@renderer/stores/noteStores'

const props = defineProps<{
  noteId: string
  moreMenuItems: MenuItem[]
}>()

defineEmits(['expand', 'start-connection'])

const noteStore = useNoteStore()
const currentCardboxId = computed(() => {
  const note = noteStore.getNoteById(props.noteId)
  return note?.cardBoxId || null
})

// 卡片盒下拉菜单
const cardboxDropdownMenu = ref<InstanceType<typeof CardboxDropdownMenu> | null>(null)
const isCardboxMenuOpen = ref(false)
const cardBoxBtnRef = ref<HTMLElement | null>(null)

const toggleCardboxMenu = (event: MouseEvent) => {
  event.preventDefault()
  isCardboxMenuOpen.value = !isCardboxMenuOpen.value
  if (isCardboxMenuOpen.value && cardBoxBtnRef.value) {
    const rect = cardBoxBtnRef.value.getBoundingClientRect()
    nextTick(() => {
      cardboxDropdownMenu.value?.openMenu(rect.left, rect.bottom)
    })
  }
}

const closeCardboxMenu = () => {
  isCardboxMenuOpen.value = false
}

// 更多按钮弹出菜单
const moreBtnRef = ref<HTMLElement | null>(null)
const popupMenuRef = ref<InstanceType<typeof PopupMenu> | null>(null)
const isMenuVisible = ref(false)
const menuPosition = ref({ x: 0, y: 0 })

const toggleMenu = (event: MouseEvent) => {
  event.preventDefault()
  isMenuVisible.value = !isMenuVisible.value
  if (isMenuVisible.value && moreBtnRef.value) {
    const rect = moreBtnRef.value.getBoundingClientRect()
    menuPosition.value = { x: rect.left, y: rect.bottom }
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
}
</script>

<style lang="scss" scoped>
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
  .connect-btn,
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
</style>
