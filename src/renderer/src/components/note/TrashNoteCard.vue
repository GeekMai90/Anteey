<template>
  <div class="trash-note-card" @dblclick="handleDoubleClick">
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
      <JsonContentRenderer :content="note.content" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Note } from '@shared/types'
import { More } from '@icon-park/vue-next'
import JsonContentRenderer from '@renderer/components/note/JsonContentRenderer.vue'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import { useMenu } from '@renderer/composables/useMenu'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'
import { useNoteStore } from '@renderer/stores/noteStore'

const props = defineProps<{
  note: Note
}>()

const noteStore = useNoteStore()
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

const handleDoubleClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  const menuButton = target.closest('.note-buttons')
  if (menuButton) {
    return
  }

  noteStore.openNoteEditor(props.note.id)
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
    case 'Draftcard':
      return 'draftcard'
    default:
      return ''
  }
})
</script>

<style lang="scss" scoped>
.trash-note-card {
  background-color: var(--color-bg-note-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0 0 6px 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  position: relative;
  width: 100%;
  height: 300px;
  min-height: 300px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
  user-select: none;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &:hover {
    border: 1px solid rgba(var(--color-primary-rgb), 0.4);
    box-shadow: 0 0 20px 1px rgba(var(--color-primary-rgb), 0.1);
    transform: translateY(-2px);
  }

  .note-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    padding: 0 15px 0 20px;
    min-height: 30px;
    margin: 10px 0 0 0;
    flex-shrink: 0;

    .note-indicator {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 14px;
      border-radius: 2px;
      margin-right: 10px;

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

      &.draftcard {
        background-color: var(--color-draft);
      }
    }

    .note-title {
      margin: 0;
      font-size: 1rem;
      font-weight: bold;
      color: var(--color-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: flex;
      align-items: center;
      height: 100%;
      line-height: 1;
    }

    .note-buttons {
      position: absolute;
      right: 0;
      display: flex;
      opacity: 0;
      transition: opacity 0.2s ease;
      margin-right: 10px;
      height: 100%;
      align-items: center;

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
  }

  &:hover .note-buttons {
    opacity: 1;
  }

  .note-content {
    flex: 1;
    color: var(--color-text-primary);
    text-align: left;
    min-height: 200px;
    overflow: hidden;
    position: relative;
    font-size: 15px;
    padding: 0 20px;
    display: flex;
    flex-direction: column;

    :deep(.tiptap) {
      flex: 1;
      overflow-y: auto;
      font-size: 15px;
      color: var(--color-text-primary);
      margin: 0;
      padding: 0;
      min-height: 200px;
    }
  }
}

@media (prefers-color-scheme: dark) {
  .trash-note-card {
    .note-header {
      .note-indicator {
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

        // 稍微亮一点的灰色
        &.draftcard {
          background-color: var(--color-draft);
        }
      }
    }
  }
}
</style>
