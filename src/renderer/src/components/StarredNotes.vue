<!-- src/components/StarredNotes.vue -->
<template>
  <div class="starred-notes">
    <div class="starred-header" @click="toggleStarredNotes">
      <!-- <div class="icon">
        <Star theme="filled" size="16" :fill="isExpanded ? '#FFD700' : '#808080'" />
      </div> -->
      <span>星标</span>
      <div class="toggle-icon">
        <div class="icon">
          <Down v-if="isExpanded" theme="outline" size="18" fill="var(--color-icon-default)" />
          <Right v-else theme="outline" size="18" fill="var(--color-icon-default)" />
        </div>
      </div>
    </div>
    <!-- <transition name="fade"> -->
    <div v-if="isExpanded" class="starred-notes-container">
      <div v-for="note in starredNotes" :key="note.id" class="starred-note-card">
        <div class="starred-note-content">
          <StarredNotesCard :note="note" @click.stop="openNote(note)" />
        </div>
      </div>
    </div>
    <!-- </transition> -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Right, Down } from '@icon-park/vue-next'
import { useNoteStore } from '../stores/noteStores'
import { Note } from '@renderer/types/Note'
import { useRouter } from 'vue-router'
import StarredNotesCard from './StarredNotesCard.vue'

const noteStore = useNoteStore()
const isExpanded = ref(true)
const starredNotes = computed(() => noteStore.starredNotes)
const router = useRouter()

// onMounted(async () => {
//   await fetchStarredNotes()
// })

const toggleStarredNotes = () => {
  isExpanded.value = !isExpanded.value
}

// const fetchStarredNotes = async () => {
//   starredNotes.value = await noteStore.fetchStarredNotes()
// }

const openNote = (note: Note) => {
  console.log('Clicked note:', note)
  console.log('Current starredNotes:', starredNotes.value)
  router.push({ name: 'NoteExpandEditor', params: { id: note.id.toString() } })
}
</script>

<style scoped lang="scss">
.starred-notes {
  margin-top: 10px;
  padding: 0 10px;

  .starred-header {
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 6px 12px;
    border-radius: 8px;
    margin-bottom: 5px;

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
          width: 14px;
          height: 14px;
        }
      }
    }
  }
}
.starred-notes-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-left: 10px;
  .starred-note-content {
    cursor: pointer;
    &:hover {
      background-color: var(--color-hover-sidebar);
    }
  }
}
</style>
