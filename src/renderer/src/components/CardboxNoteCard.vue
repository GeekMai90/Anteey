// src/components/NoteCard.vue
<template>
  <div class="note-card" @dblclick="useNoteStore().openNoteEditor(note.id)">
    <div class="note-header">
      <span class="note-indicator" :class="cardTypeClass"></span>
      <h3 class="note-title">{{ note.address }}</h3>

      <div class="note-buttons">
        <div class="note-button" @click.stop="expandNote">
          <div class="icon">
            <ExpandTextInput
              theme="outline"
              size="18"
              fill="var(--color-text-secondary)"
              :strokeWidth="3"
            />
          </div>
        </div>
        <div ref="moreBtnRef" class="note-button" @click.stop="toggleMenu">
          <div class="icon">
            <More theme="outline" size="18" fill="var(--color-text-secondary)" :strokeWidth="3" />
          </div>
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
    <div ref="noteContent" class="note-content">
      <TipTapEditor
        v-if="localNote"
        v-model:content="localNote.content"
        :editable="false"
        :enable-drag-handle="isDragHandleEnabled"
      />
      <div v-if="isOverflowing" class="fade-out"></div>
    </div>
    <div class="note-timestamp">
      {{ formatDate(note.updatedAt) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { Note } from '@renderer/types/Note'
import { formatDate } from '@renderer/utils/noteHelpers'
import { More, ExpandTextInput } from '@icon-park/vue-next'
import { computed, onMounted, onUpdated, ref, watch, reactive, nextTick } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStores'
import { useRouter } from 'vue-router'
import TipTapEditor from '@renderer/components/TipTapEditor.vue'
import PopupMenu from '@renderer/components/PopupMenu.vue'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'
import type { MenuItem } from '@renderer/components/PopupMenu.vue'
import { storeToRefs } from 'pinia'
import { useEventBus } from '@vueuse/core'

const props = defineProps<{
  note: Note
}>()

const noteStore = useNoteStore()
const { allNotes } = storeToRefs(noteStore)

const localNote = computed(() => {
  return allNotes.value.find((note) => note.id === props.note.id)
})

// const emit = defineEmits(['edit'])
const isDragHandleEnabled = ref(false)

const moreBtnRef = ref<HTMLElement | null>(null)
const popupMenuRef = ref<InstanceType<typeof PopupMenu> | null>(null)
const isMenuVisible = ref(false)
const menuPosition = reactive({ x: 0, y: 0 })

const { menuItems: noteMenuItems, resetDeleteState } = useNoteMenu({
  noteId: props.note.id,
  menuItems: ['star', 'sidebar', 'delete']
})

// const localNote = toRef(props, 'note')

// 处理内容超高时底部出现模糊效果
const noteContent = ref<HTMLDivElement | null>(null)
const isOverflowing = ref(false)

const checkOverflow = () => {
  if (noteContent.value) {
    isOverflowing.value = noteContent.value.scrollHeight > noteContent.value.clientHeight
  }
}

const router = useRouter()

const expandNote = () => {
  router.push({ name: 'NoteExpandEditor', params: { id: props.note.id } })
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

const handleMenuItemClick = async (item: MenuItem) => {
  await item.action()
  if (item.name === 'delete') {
    // 触发一个事件，通知父组件刷新笔记列表
    const eventBus = useEventBus('note-deleted')
    eventBus.emit()
  } else {
    closeMenu()
  }
}

const closeMenu = () => {
  isMenuVisible.value = false
  resetDeleteState()
}

onMounted(() => {
  checkOverflow()
})

onUpdated(() => {
  checkOverflow()
})

watch(
  () => props.note.content,
  () => {
    checkOverflow()
  }
)
</script>

<style lang="scss" scoped>
.note-card {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  padding: 10px 0px 0px 0;
  // margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  width: 100%; // 使用 100% 宽度
  height: var(--card-height);
  overflow: hidden; // 防止内容溢出
  box-shadow: var(--shadow-card);
  .note-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    position: relative;
    padding: 0 15px 0 25px; // 调整左右内边距
    height: 30px;

    .note-indicator {
      position: absolute;
      left: 15px;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 12px;
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
    }
    @media (prefers-color-scheme: dark) {
      .note-indicator {
        &.maincard {
          background-color: var(--color-primary);
        }

        // 稍微亮一点的绿色
        &.bibcard {
          background-color: var(--color-yellow);
        }

        // 稍微亮一点的橙色
        &.indexcard {
          background-color: var(--color-blue);
        }

        // 稍微亮一点的蓝色
        &.hoplinkcard {
          background-color: var(--color-pink);
        }
        // 稍微亮一点的粉红色
      }
    }
    .note-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: bold;
      color: var(--color-text-primary);
    }
    .note-buttons {
      position: absolute;
      top: -5px;
      right: 0;
      display: flex;
      // gap: 3px;
      opacity: 0; // 使用 opacity 代替 visibility
      transition: opacity 0.2s ease; // 添加过渡效果
      margin-right: 10px;
      .note-options-menu {
        :deep(.note-options-menu) {
          transform: translateX(-68%); // 居中对齐
        }
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

        &.delete {
          color: #ff4d4f;
        }
      }
    }
  }
  // 新增：确保菜单始终可见
  .note-options-menu {
    opacity: 1 !important;
    visibility: visible !important;
  }

  .note-content {
    flex-grow: 1;
    color: var(--color-text-primary);
    text-align: left;
    margin-bottom: 10px;
    min-height: 60px;
    max-height: 300px;
    overflow: hidden;
    position: relative;
    font-size: 15px;
  }
}

.note-card:hover .note-buttons {
  opacity: 1;
}

.fade-out {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 40px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1));
  /* 模糊效果 */
  pointer-events: none;
  /* 确保不影响交互 */
}

.note-timestamp {
  font-size: 10px;
  color: var(--color-text-secondary);
  align-self: flex-end;
  margin-right: 10px;
  margin-bottom: 5px;
}

:deep(.tiptap) {
  margin-left: 0;
  margin-right: 0;
  padding-left: 15px;
  padding-right: 15px;
}
</style>
