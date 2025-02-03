<template>
  <div class="trash-note-card">
    <div class="note-header">
      <span class="note-indicator" :class="cardTypeClass"></span>
      <h3 class="note-title">{{ note.address }}</h3>
      <div class="note-buttons">
        <div ref="moreBtnRef" class="note-button" @click.stop="toggleMoreMenu">
          <div v-tooltip.bottom="{ content: '更多', delay: { show: 1000 } }" class="icon">
            <More theme="outline" size="16" fill="var(--color-icon-default)" :stroke-width="3" />
          </div>
          <PopupMenu
            ref="moreMenuRef"
            :show="moreMenuState.isOpen"
            :button-ref="moreBtnRef"
            :menuItems="menuItems"
            @close="closeMoreMenu"
            @itemClick="handleMenuItemClick"
          />
        </div>
      </div>
    </div>
    <div ref="noteContent" class="note-content">
      <TipTapRender :content="note.content" :editable="false" :enable-drag-handle="false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Note } from '@shared/types'
import { More } from '@icon-park/vue-next'
import TipTapRender from '@renderer/components/tiptap/TipTapRender.vue'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import { useMenu } from '@renderer/composables/useMenu'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'

const props = defineProps<{
  note: Note
}>()

const noteContent = ref<HTMLDivElement | null>(null)

const moreBtnRef = ref<HTMLElement | null>(null)
const moreMenuRef = ref<HTMLElement | null>(null)

const { menuItems } = useNoteMenu({
  noteId: props.note.id,
  menuItems: ['restore', 'permanentDelete']
})

const {
  menuState: moreMenuState,
  toggleMenu: toggleMoreMenu,
  closeMenu: closeMoreMenu
} = useMenu({
  buttonRef: moreBtnRef,
  menuRef: moreMenuRef
})

const handleMenuItemClick = (item: MenuItem) => {
  item.action()
}

const cardTypeClass = computed(() => {
  switch (props.note.cardType) {
    case 'Maincard':
      return 'maincard'
    case 'Bibcard':
      return 'bibcard'
    case 'Indexcard':
      return 'indexcard'
    case 'Hoplinkcard':
      return 'hoplinkcard'
    default:
      return ''
  }
})
</script>

<style lang="scss" scoped>
.trash-note-card {
  background-color: var(--color-bg-note-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px;
  position: relative;
  width: 100%;
  height: var(--card-height, 300px);
  overflow: hidden;
  box-shadow: 0px 2px 6px rgb(0 0 0 / 12%);
  display: flex;
  flex-direction: column;
}

.note-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.note-indicator {
  width: 4px;
  height: 16px;
  border-radius: 2px;
  margin-right: 8px;

  &.maincard {
    background-color: #00c8a8;
  }

  &.bibcard {
    background-color: #ff9f1c;
  }

  &.indexcard {
    background-color: #4361ee;
  }

  &.hoplinkcard {
    background-color: #f72585;
  }
}

.note-title {
  flex-grow: 1;
  margin: 0;
  font-size: 14px;
  font-weight: bold;
  color: var(--text-default-color);
}

.note-buttons {
  visibility: hidden;
}

.trash-note-card:hover .note-buttons {
  visibility: visible;
}

.note-button {
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
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &:hover {
    background-color: var(--color-hover-button);
  }
}

.note-content {
  flex-grow: 1;
  overflow: hidden;
  position: relative;
}

:deep(.tiptap) {
  height: 100%;
  overflow-y: auto;
  font-size: 12px;
  color: var(--text-default-color);
  margin: 0;
  padding: 0;
}
</style>
