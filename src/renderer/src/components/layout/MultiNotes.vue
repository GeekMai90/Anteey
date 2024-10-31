<template>
  <div class="multi-notes">
    <div class="toolbar">
      <!-- <div class="clear-button" @click="clearSidebarNotes">
        <div class="icon">
          <Clear theme="outline" size="20" fill="#b6b6b6" :stroke-width="3" />
        </div>
      </div> -->
    </div>

    <div class="notes-container">
      <div v-for="note in sidebarNotes" :key="note.id" class="note-item">
        <RightSidebarNoteEditor :noteId="note.id" @close="noteStore.closeNoteEditor" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStores'
import RightSidebarNoteEditor from '@renderer/components/layout/RightSidebarNoteEditor.vue'
// import { Clear } from '@icon-park/vue-next'

const noteStore = useNoteStore()
const sidebarNotes = computed(() => noteStore.rightSidebarNotes)

// const clearSidebarNotes = () => {
//   noteStore.clearRightSidebarNotes()
// }
</script>

<style scoped lang="scss">
.multi-notes {
  height: 100%;
  display: flex;
  flex-direction: column;

  .toolbar {
    // padding: 8px;
    display: flex;
    justify-content: flex-end;
    // border-bottom: 1px solid var(--color-border);

    .clear-button {
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;

      &:hover {
        background-color: var(--color-hover-bg);
      }
    }
  }

  .notes-container {
    flex: 1;
    overflow-y: auto;
    padding: 12px;

    .note-item {
      margin-bottom: 16px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}
</style>
