<template>
  <div class="whiteboard-note">
    <div class="whiteboard-note-content">
      <NoteCard :note="props.note" />
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'
import NoteCard from './NoteCard.vue'

const props = defineProps({
  note: {
    type: Object,
    required: true
  }
})
</script>

<style lang="scss" scoped>
.whiteboard-note {
  background-color: var(--color-bg-primary);
}

.note-content {
  margin-top: 5px;
}
</style>
