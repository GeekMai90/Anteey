<template>
  <div class="trash-note-card">
    <div class="note-header">
      <span class="note-indicator" :class="cardTypeClass"></span>
      <h3 class="note-title">{{ note.address }}</h3>
      <div class="note-buttons">
        <button class="note-button" @click.stop="handleMoreClick">
          <More theme="outline" size="18" fill="#444" />
        </button>
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

const props = defineProps<{
  note: Note
}>()

const emit = defineEmits(['toggleMenu'])

const noteContent = ref<HTMLDivElement | null>(null)

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

const handleMoreClick = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  emit('toggleMenu', props.note.id, {
    x: rect.left,
    y: rect.bottom,
    width: rect.width,
    height: rect.height
  })
}
</script>

<style lang="scss" scoped>
.trash-note-card {
  background-color: var(--color-note-card-bg);
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
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
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
