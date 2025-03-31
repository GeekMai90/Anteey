<!-- src/components/StarredNotesCard.vue -->
<template>
  <div class="starred-note-card">
    <div class="note-header">
      <span class="note-indicator" :class="cardTypeClass"></span>
      <h3 class="note-title">{{ note.address || '无编码地址' }}</h3>
    </div>
    <div ref="noteContent" class="note-content">
      <JsonContentRenderer :key="note.id" :content="note.content" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Note } from '@shared/types'
import { computed } from 'vue'
import JsonContentRenderer from '@renderer/components/note/JsonContentRenderer.vue'

const props = defineProps<{
  note: Note
}>()

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
    default:
      return ''
  }
})
</script>

<style lang="scss" scoped>
.starred-note-card {
  box-shadow: inset 0 0 0 1px rgba(var(--color-sidebar-icon-bg), 0.05);
  border-radius: 8px;
  padding: 2px 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
  user-select: none;
  .note-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    padding: 2px 15px 0 15px;

    .note-indicator {
      position: absolute;
      left: 8px;
      top: 54%;
      transform: translateY(-50%);
      width: 4px;
      height: 8px;
      border-radius: 2px;

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
      color: var(--color-sidebar-text);
    }
  }
  .note-content {
    flex-grow: 1;
    color: var(--color-sidebar-text);
    text-align: left;
    height: 20px;
    overflow: hidden;
    position: relative;
    font-size: 13px;
    padding: 0 15px;
  }

  :deep(.json-content) {
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
    strong,
    b {
      color: var(--color-text-black) !important;
    }
  }
}
</style>
