<template>
  <div class="note-preview-card">
    <div class="note-header">
      <span class="note-indicator"></span>
      <h3 class="note-title">{{ note.address }}</h3>
    </div>
    <div ref="noteContent" class="note-content marked-content">
      <TipTapEditor v-model:content="note.content" :editable="false" :enable-drag-handle="false" />
      <!-- <div v-if="isOverflowing" class="fade-out"></div> -->
    </div>
    <div class="note-timestamp">
      {{ formatDate(note.createdAt) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { Note } from '@renderer/types/Note'
import { formatDate } from '@renderer/utils/noteHelpers'
import { ref } from 'vue'
import TipTapEditor from '@renderer/components/TipTapEditor.vue'

const props = defineProps<{
  note: Note
}>()

const noteContent = ref<HTMLDivElement | null>(null)
// const isOverflowing = ref(false);

// const checkOverflow = () => {
//   if (noteContent.value) {
//     isOverflowing.value = noteContent.value.scrollHeight > noteContent.value.clientHeight;
//   }
// };

// onMounted(() => {
//   checkOverflow();
// });

// onUpdated(() => {
//   checkOverflow();
// });

// watch(() => props.note.content, () => {
//   checkOverflow();
// });
</script>

<style lang="scss" scoped>
.note-preview-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}

.note-header {
  display: flex;
  align-items: center;
  margin-bottom: 2px;
}

.note-indicator {
  width: 4px;
  height: 10px;
  background-color: #00c8a8;
  border-radius: 2px;
  margin-right: 10px;
}

.note-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: bold;
  color: #333;
}

.note-content {
  flex-grow: 1;
  color: #444;
  text-align: left;
  // margin-bottom: 10px;
  overflow-y: auto;
  max-height: calc(100% - 40px); // 调整这个值以适应你的布局
  font-size: 0.8rem;
}

.note-content::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
  /* Chrome, Safari, Opera */
}

// .fade-out {
//   content: '';
//   position: absolute;
//   bottom: 0;
//   left: 0;
//   width: 100%;
//   height: 40px;
//   background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1));
//   pointer-events: none;
// }

.note-timestamp {
  font-size: 0.6em;
  color: #999;
  align-self: flex-end;
}

// 自定义 TipTapEditor 样式
:deep(.ProseMirror) {
  min-height: auto;
  max-height: none;
  overflow: visible;
}

:deep(.tiptap) {
  margin-left: 0;
  margin-right: 0;
  padding-left: 0;
  padding-right: 0;
}
</style>
