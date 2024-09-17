// src/components/NoteCard.vue
<template>
  <!-- <div class="note-card" @dblclick="$emit('edit', note.id)">  -->
  <div class="note-card" @dblclick="useNoteStore().openNoteEditor(note.id)">
    <div class="note-header">
      <span class="note-indicator" :class="cardTypeClass"></span>
      <h3 class="note-title">{{ note.address }}</h3>

      <div class="note-buttons">
        <button class="note-button" @click.stop="expandNote">
          <ExpandTextInput theme="outline" size="14" fill="var(--color-icon-default)" />
        </button>
        <button class="note-button" @click.stop="toggleOptionsMenu">
          <!--  -->
          <More theme="outline" size="14" fill="var(--color-icon-default)" />
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
    <!-- <div class="note-timestamp">
      {{ formatDate(note.updatedAt) }}
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { Note } from '@renderer/types/Note'
// import { formatDate } from "@/utils/noteHelpers";
import { More, ExpandTextInput } from '@icon-park/vue-next'
import { computed, onMounted, onUpdated, ref, watch } from 'vue'
// import { marked } from 'marked';
import NoteOptionsMenu from '@renderer/components/NoteOptionsMenu.vue'
import { useNoteOptions } from '@renderer/composable/useNoteOptions'
import { useRouter } from 'vue-router'
import TipTapEditor from '@renderer/components/TipTapEditor.vue'
import { useNoteStore } from '@renderer/stores/noteStores'
import { nextTick } from 'process'

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

// // 渲染 Markdown 内容
// const renderedContent = computed(() => {
//   return marked(props.note.content);
// });

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
    nextTick(() => {
      checkOverflow()
    })
  }
)
</script>

<style lang="scss" scoped>
.note-card {
  background-color: var(--timeline-card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 0px 0px 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  width: 100%; // 使用 100% 宽度
  height: var(--card-height);
  overflow: hidden; // 防止内容溢出
  box-shadow: 0px 2px 6px rgb(0 0 0 / 12%);
}

.note-header {
  display: flex;
  align-items: center;
  margin-bottom: 2px;
  position: relative;
  margin-left: 10px;
}

.note-indicator {
  width: 4px;
  height: 10px;
  // background-color: #00c8a8;
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

@media (prefers-color-scheme: dark) {
  .note-indicator {
    &.maincard {
      background-color: #00e6c0;
    }

    // 稍微亮一点的绿色
    &.bibcard {
      background-color: #ffb740;
    }

    // 稍微亮一点的橙色
    &.indexcard {
      background-color: #6c8eff;
    }

    // 稍微亮一点的蓝色
    &.hoplinkcard {
      background-color: #ff5fa2;
    }

    // 稍微亮一点的粉红色
  }
}

.note-title {
  margin: 0;
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--default-text-color);
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
  color: var(--text-default-color);
  text-align: left;
  margin-bottom: 10px;
  // min-height: 60px;
  max-height: 350px;
  overflow: hidden;
  position: relative;
}

.fade-out {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 10px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1));
  /* 模糊效果 */
  pointer-events: none;
  /* 确保不影响交互 */
}

.note-button {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px 4px;
  width: 18px;
  height: 18px;
}

.note-timestamp {
  font-size: 0.8em;
  color: var(--card-timestamp-color);
  align-self: flex-end;
}

:deep(.tiptap) {
  margin: 0;
  padding: 0 10px 0 10px;
  font-size: 14px;
}
</style>
