<!-- src/renderer/src/components/RecentNotes.vue -->
<template>
  <div class="recent-notes">
    <div class="recent-header" @click="toggleRecentNotes">
      <span>最近</span>
      <div class="toggle-icon">
        <div class="icon">
          <Down v-if="isExpanded" theme="outline" size="18" fill="var(--color-icon-default)" />
          <Right v-else theme="outline" size="18" fill="var(--color-icon-default)" />
        </div>
      </div>
    </div>
    <div v-if="isExpanded" class="recent-notes-container">
      <div
        v-for="note in filteredRecentNotes"
        :key="note.id"
        class="recent-note-card"
        @click="openNote(note)"
      >
        <StarredNotesCard :key="`${note.id}-${note.updatedAt}`" :note="note" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStores'
import { useRouter } from 'vue-router'
import { Down, Right } from '@icon-park/vue-next'
import StarredNotesCard from '@renderer/components/layout/StarredNotesCard.vue'
import { Note } from '@shared/types'
import { storeToRefs } from 'pinia'
import { useAppearanceStore } from '@renderer/stores/appearanceStore'

const noteStore = useNoteStore()
const router = useRouter()
const appearanceStore = useAppearanceStore()
const isExpanded = ref(appearanceStore.settings?.recentExpanded ?? true)

const { recentNotes } = storeToRefs(noteStore)

// 添加计算属性过滤已删除的笔记
const filteredRecentNotes = computed(() => {
  return recentNotes.value.filter((note) => !note.isDeleted)
})

const toggleRecentNotes = () => {
  isExpanded.value = !isExpanded.value
}

const openNote = (note: Note) => {
  router.push({ name: 'NoteExpandEditor', params: { id: note.id.toString() } })
}
</script>

<style scoped lang="scss">
.recent-notes {
  margin-top: 5px;
  padding: 0 10px;
  border-radius: 8px;

  .recent-header {
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 6px 8px 6px 10px;
    border-radius: 8px;
    margin-bottom: 5px;
    user-select: none;
    color: var(--color-text-secondary);
    &:hover {
      background-color: var(--color-hover-sidebar);
    }

    span {
      flex-grow: 1;
      font-size: 12px;
    }

    .toggle-icon {
      transition: transform 0.3s ease;
      .icon {
        background: none;
        border: none;
        cursor: pointer;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        padding: 0;

        // &:hover:not(:disabled) {
        //   background-color: rgba(0, 0, 0, 0.05);
        // }

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
    }
  }
}
.recent-notes-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-left: 10px;
  border-radius: 8px;
  .starred-note-content {
    border-radius: 8px;
    &:hover {
      background-color: var(--color-hover-sidebar);
    }
  }
}
.ghost-class {
  opacity: 0.5;
  background: #c8ebfb;
}

.recent-notes-container {
  .recent-note-card {
    transition: all 0.3s;
    cursor: pointer;
  }
}
</style>
