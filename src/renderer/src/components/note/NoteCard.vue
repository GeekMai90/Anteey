<!-- src/components/NoteCard.vue -->
<template>
  <div class="note-card">
    <div class="note-header">
      <span class="note-indicator" :class="cardTypeClass"></span>
      <h3 class="note-title">{{ note.address }}</h3>

      <div class="note-buttons">
        <!-- 使用封装的展开按钮 -->
        <ExpandButton :note-id="note.id" />
        <!-- 使用封装的AI按钮 -->
        <AIButton :note-id="note.id" />
        <!-- 添加卡片盒设置按钮 -->
        <CardboxButton :note-id="note.id" :current-cardbox-id="note.cardBoxId || undefined" />
        <!-- 使用封装的更多按钮 -->
        <MoreButton
          :note-id="note.id"
          :menu-items="[
            'star',
            'convertToFlashcard',
            'sidebar',
            'toggleIndex',
            'copyQuote',
            'share',
            'exportNote',
            'delete'
          ]"
        />
      </div>
    </div>
    <div ref="noteContent" class="note-content" @dblclick="useNoteStore().openNoteEditor(note.id)">
      <JsonContentRenderer
        :key="note.id"
        :content="note.content"
        :editable="false"
        :enable-drag-handle="false"
      />
    </div>
    <div class="note-timestamp">
      <div class="note-tags">
        <div
          v-for="tag in noteTags"
          :key="tag.id"
          class="tag-item"
          @click.stop="handleTagClick(tag.id)"
        >
          <span class="tag-symbol">#</span>
          <span class="tag-name">{{ tag.name }}</span>
        </div>
      </div>
      <div class="timestamp-section">
        <FlashcardIndicator
          :is-flashcard="note.isFlashcard"
          :fsrs-state="note.flashcard?.fsrs?.state"
        />
        {{ formatDate(note.createdAt) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Note } from '@shared/types'
import { formatDate } from '@renderer/utils/noteHelpers'
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useTagStore } from '@renderer/stores/tagStore'
import JsonContentRenderer from '@renderer/components/note/JsonContentRenderer.vue'
import type { Tag } from '@shared/types'
import AIButton from '@renderer/components/common/AIButton.vue'
import MoreButton from '@renderer/components/common/MoreButton.vue'
import CardboxButton from '@renderer/components/common/CardboxButton.vue'
import ExpandButton from '@renderer/components/common/ExpandButton.vue'
import FlashcardIndicator from '@renderer/components/common/FlashcardIndicator.vue'

const props = defineProps<{
  note: Note
}>()

console.log('props.note', props.note)

const cardTypeClass = computed(() => {
  if (props.note.cardType === 'Maincard' && props.note.isIndexed) {
    return 'indexed-maincard'
  }

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

// 添加标签相关代码
const tagStore = useTagStore()
const noteTags = ref<Tag[]>([])

const fetchNoteTags = async () => {
  noteTags.value = await tagStore.getNoteTags(props.note.id)
}

// 标签点击处理
const router = useRouter()
const handleTagClick = (tagId: string) => {
  router.push({
    name: 'cardbox',
    query: {
      tags: tagId,
      box: 'all'
    }
  })
}

onMounted(async () => {
  // 只获取标签，不再获取 agents
  await fetchNoteTags()
})
</script>

<style lang="scss" scoped>
.note-card {
  background-color: var(--color-bg-note-card);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--color-border-light);
  transition: all 0.3s ease;
  padding: 15px 0px 6px 0;
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  cursor: pointer;
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: var(--color-primary);
  }
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
      top: 51%;
      transform: translateY(-50%);
      width: 4px;
      height: 14px;
      border-radius: 2px;
      margin-right: 10px;

      &.indexed-maincard {
        background-color: var(--color-blue);
      }

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
    @media (prefers-color-scheme: dark) {
      .note-indicator {
        &.indexed-maincard {
          background-color: var(--color-blue);
        }

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
    }
    .note-title {
      margin: 0;
      font-size: 1.1rem;
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
      .note-button,
      .more-btn,
      .ai-btn {
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
          color: var(---color-text-primary);
          font-size: 13px;
          font-weight: 400;
          margin-left: 6px;
          white-space: nowrap;
          writing-mode: horizontal-tb;
        }

        &:hover {
          background-color: var(--color-icon-hover-bg);
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
    padding: 0 25px;
    // min-height: 60px;
    // max-height: 300px;
    height: 230px;
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
  color: var(--color-text-tertiary);
  padding: 8px 15px; // 增加上下内边距
  // margin-top: 10px; // 增加与内容区域的间距
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 32px; // 设置最小高度

  .note-tags {
    display: flex;
    gap: 6px;
    flex: 0 1 auto; // 改为自动收缩
    align-items: center;
    margin-right: 12px;
    max-width: 500px; // 设置最大宽度
    overflow: hidden; // 超出隐藏
    white-space: nowrap; // 不换行

    .tag-item {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      height: 22px;
      padding: 0 8px;
      background: var(--color-primary-light);
      border: 1px solid transparent;
      border-radius: 11px;
      font-size: 12px;
      transition: all 0.2s ease;
      cursor: pointer;
      flex-shrink: 0; // 防止标签被压缩

      &:hover {
        border-color: var(--color-primary);
      }

      .tag-symbol {
        color: var(--color-primary);
        font-size: 12px;
      }

      .tag-name {
        color: var(--color-primary);
        font-weight: 400;
      }
    }
  }

  .timestamp-section {
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    flex-shrink: 0; // 防止时间戳被压缩
  }
}
</style>
