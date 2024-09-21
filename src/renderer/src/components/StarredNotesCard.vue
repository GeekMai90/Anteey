// src/components/StarredNotesCard.vue
<template>
  <div class="starred-note-card">
    <div class="note-header">
      <span class="note-indicator" :class="cardTypeClass"></span>
      <h3 class="note-title">{{ note.address }}</h3>
    </div>
    <div ref="noteContent" class="note-content">
      <TipTapEditor
        v-model:content="localNote.content"
        :editable="false"
        :enable-drag-handle="isDragHandleEnabled"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Note } from '@renderer/types/Note'
import { computed, ref, watch, toRef } from 'vue'
import TipTapEditor from '@renderer/components/TipTapEditor.vue'

const props = defineProps<{
  note: Note
}>()

// const emit = defineEmits(['edit'])
const isDragHandleEnabled = ref(false)
// const noteStore = useNoteStore()

const localNote = toRef(props, 'note')

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
.starred-note-card {
  background-color: var(--body-bg);
  border: 1px solid var(--time-card-border-color);
  border-radius: 8px;
  // padding: 15px 0px 10px 0;
  // margin-bottom: 5px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  // height: 60px;
  overflow: hidden;
  // box-shadow: var(--shadow-card);
  // 文字不可选中
  user-select: none;
  .note-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    // margin-bottom: 10px;
    position: relative;
    // margin-left: 2rem;
    // padding-left: 2rem;
    padding: 0 15px 0 15px; // 调整左右内边距
    // height: 30px;

    .note-indicator {
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 8px;
      border-radius: 2px;
      // margin-right: 10px;

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
      font-size: 12px;
      font-weight: bold;
      color: var(--color-text-primary);
    }
  }
  .note-content {
    flex-grow: 1;
    color: var(--color-text-primary);
    text-align: left;
    height: 20px;
    // margin-bottom: 10px;
    // min-height: 60px;
    // max-height: 300px;
    overflow: hidden;
    position: relative;
    font-size: 13px;
  }

  :deep(.tiptap) {
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding-left: 15px !important;
    padding-right: 0rem !important;
    height: 100%;
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      font-size: 13px;
      line-height: 1.4 !important;
    }
    p {
      line-height: 1.4 !important; /* 这会将行高设置为字体大小的 1.5 倍 */
    }
  }
}
</style>
