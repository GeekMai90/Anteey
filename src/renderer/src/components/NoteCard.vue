// src/components/NoteCard.vue
<template>
  <div class="note-card" @dblclick="useNoteStore().openNoteEditor(note.id)">
    <div class="note-header">
      <span class="note-indicator" :class="cardTypeClass"></span>
      <h3 class="note-title">{{ note.address }}</h3>

      <div class="note-buttons">
        <div class="note-button" @click.stop="expandNote">
          <div class="icon">
            <ExpandTextInput theme="outline" size="20" fill="#b6b6b6" />
          </div>
        </div>
        <div class="note-button" @click.stop="toggleOptionsMenu">
          <div class="icon">
            <More theme="outline" size="20" fill="#b6b6b6" />
          </div>
        </div>

        <div v-if="isOptionsMenuVisible" v-click-outside="closeOptionsMenu">
          <NoteOptionsMenu
            ref="noteOptionsMenu"
            :noteId="props.note.id"
            @close="closeOptionsMenu"
          />
        </div>
      </div>
    </div>
    <div ref="noteContent" class="note-content">
      <TipTapEditor
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
import { computed, onMounted, onUpdated, ref, watch, toRef } from 'vue'
import NoteOptionsMenu from '@renderer/components/NoteOptionsMenu.vue'
import { useRouter } from 'vue-router'
import TipTapEditor from '@renderer/components/TipTapEditor.vue'
import { useNoteStore } from '@renderer/stores/noteStores'

const props = defineProps<{
  note: Note
}>()

// const emit = defineEmits(['edit'])
const isDragHandleEnabled = ref(false)
// const noteStore = useNoteStore()

const localNote = toRef(props, 'note')

// 笔记选项菜单
const isOptionsMenuVisible = ref(false)
const noteOptionsMenu = ref<InstanceType<typeof NoteOptionsMenu> | null>(null)

const toggleOptionsMenu = () => {
  isOptionsMenuVisible.value = !isOptionsMenuVisible.value
}

const closeOptionsMenu = () => {
  isOptionsMenuVisible.value = false
  noteOptionsMenu.value?.resetState()
}

// const closeOptionsMenu = () => {
//   isOptionsMenuVisible.value = false
//   noteOptionsMenu.value?.resetState()
// }

// const handleNoteDeleted = async () => {
//   console.log('Note deleted, updating UI')
//   await noteStore.fetchNotes() // 重新获取笔记列表
//   noteStore.closeNoteEditor()
//   closeOptionsMenu()
//   console.log('UI updated after note deletion')
// }

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
watch(
  () => props.note,
  (newNote, oldNote) => {
    if (newNote.id !== oldNote.id || newNote.isDeleted !== oldNote.isDeleted) {
      console.log('Note changed, updating local note')
      localNote.value = newNote
    }
  },
  { deep: true }
)
</script>

<style lang="scss" scoped>
.note-card {
  background-color: var(--body-bg);
  border: 1px solid var(--time-card-border-color);
  border-radius: 8px;
  padding: 15px 0px 10px 0;
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  // box-shadow: var(--shadow-card);
  .note-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    position: relative;
    // margin-left: 2rem;
    // padding-left: 2rem;
    padding: 0 15px 0 24px; // 调整左右内边距
    height: 30px;

    .note-indicator {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 13px;
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
      font-size: 1.3rem;
      font-weight: bold;
      color: var(--color-text-primary);
    }
    .note-buttons {
      position: absolute;
      top: 0;
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
  :deep(.note-options-menu) {
    transform: translateX(-66%);
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

  :deep(.tiptap) {
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding-left: 1.5rem !important;
    padding-right: 1.5rem !important;
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
  font-size: 0.8em;
  color: var(--color-text-secondary);
  align-self: flex-end;
  margin-right: 15px;
}

// :deep(.tiptap) {
//   margin-left: 0;
// }
</style>
