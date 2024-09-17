// src/components/NoteCard.vue
<template>
  <div class="note-card" @dblclick="useNoteStore().openNoteEditor(note.id)">
    <div class="note-header">
      <span class="note-indicator" :class="cardTypeClass"></span>
      <h3 class="note-title">{{ note.address }}</h3>

      <div class="note-buttons">
        <button class="note-button" @click.stop="expandNote">
          <ExpandTextInput theme="outline" size="20" fill="#b6b6b6" />
        </button>
        <button class="note-button" @click.stop="toggleOptionsMenu">
          <!--  -->
          <More theme="outline" size="20" fill="#b6b6b6" />
        </button>
      </div>
      <div v-if="isOptionsMenuVisible" v-click-outside="closeOptionsMenu">
        <NoteOptionsMenu
          @share="handleShare"
          @star="handleStar"
          @show-sidebar="handleShowSidebar"
          @copy="handleCopy"
          @show-history="handleShowHistory"
          @delete="handleDelete"
          @close="closeOptionsMenu"
        />
      </div>
    </div>
    <div class="note-content marked-content" ref="noteContent">
      <TipTapEditor
        v-model:content="props.note.content"
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
import { computed, onMounted, onUpdated, ref, watch } from 'vue'
import NoteOptionsMenu from '@renderer/components/NoteOptionsMenu.vue'
import { useNoteOptions } from '@renderer/composable/useNoteOptions'
import { useRouter } from 'vue-router'
import TipTapEditor from '@renderer/components/TipTapEditor.vue'
import { useNoteStore } from '@renderer/stores/noteStores'

const props = defineProps<{
  note: Note
}>()

const emit = defineEmits(['edit'])
const isDragHandleEnabled = ref(false)

const {
  isOptionsMenuVisible,
  toggleOptionsMenu,
  closeOptionsMenu,
  handleShare,
  handleStar,
  handleShowSidebar,
  handleCopy,
  handleShowHistory,
  handleDelete
} = useNoteOptions(props.note.id)

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
</script>

<style lang="scss" scoped>
.note-card {
  background-color: var(--body-bg);
  border: 1px solid var(--time-card-border-color);
  border-radius: 8px;
  padding: 15px 0px 15px 0;
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
}

.note-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  position: relative;
  margin-left: 2rem;
}

.note-indicator {
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
  gap: 3px;
  visibility: hidden;
}

.note-card:hover .note-buttons {
  visibility: visible;
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

.note-button {
  background: none;
  border: none;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: background-color 0.2s;
  padding: 0;
  margin-right: 10px;

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
    width: 16px; // 或者您想要的大小
    height: 16px; // 或者您想要的大小
  }
}

.note-timestamp {
  font-size: 0.8em;
  color: var(--color-text-secondary);
  align-self: flex-end;
  margin-right: 2rem;
}
</style>
