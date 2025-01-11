<!-- src/renderer/src/components/layout/RecentNotes.vue -->
<template>
  <div class="recent-notes">
    <div class="recent-notes-container">
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
import { computed, watch } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useRouter } from 'vue-router'
import StarredNotesCard from '@renderer/components/layout/StarredNotesCard.vue'
import { Note } from '@shared/types'
import { storeToRefs } from 'pinia'

const noteStore = useNoteStore()
const router = useRouter()

const { recentNotes } = storeToRefs(noteStore)

const props = defineProps<{
  active: boolean
}>()

watch(
  () => props.active,
  async (newActive) => {
    if (newActive) {
      await noteStore.getRecentNotes(10)
    }
  }
)

const filteredRecentNotes = computed(() => {
  return recentNotes.value.filter((note) => !note.isDeleted)
})

const openNote = (note: Note) => {
  router.push({ name: 'NoteExpandEditor', params: { id: note.id.toString() } })
}
</script>

<style scoped lang="scss">
.recent-notes {
  border-radius: 8px;
}

.recent-notes-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0;
  border-radius: 8px;

  .recent-note-card {
    transition: all 0.3s;
    cursor: pointer;
    border-radius: 8px;
    &:hover {
      background: rgba(var(--color-sidebar-icon-bg), 0.04);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
  }
}
</style>
