<template>
  <div class="whiteboard-note">
    <div class="whiteboard-note-content">
      <NoteCard :note="props.note" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
import NoteCard from './NoteCard.vue'
import { Note } from '@renderer/types/Note'
const props = defineProps<{
  note: Note
}>()
</script>

<style lang="scss" scoped>
.whiteboard-note {
  background-color: var(--color-bg-primary);
}
.whiteboard-note-content {
  background-color: var(--color-bg-primary);
  width: 200px;
  height: 150px;
}
</style>
