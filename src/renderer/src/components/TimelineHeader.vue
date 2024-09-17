// src/components/TimelineHeader.vue

<template>
  <div class="timeline-header-container">
    <div class="timeline-header">
      <h1 class="title">时间线</h1>
      <button class="add-note-button" @click="noteStore.createAndOpenNewNote">
        <span class="plus-icon">+</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNoteStore } from '../stores/noteStores'

const noteStore = useNoteStore()

// const emit = defineEmits(['addNote']);// 定义一个事件，用于添加笔记

// const addNote = () => {
//   emit('addNote')// 触发事件
// }
</script>

<style lang="scss">
.timeline-header-container {
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  padding: 0 20px;

  .timeline-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: var(--body-bg);
    margin-bottom: 20px;
    width: 100%;
  }
}

.title {
  margin: 0;
  font-size: 1.5em;
  flex-grow: 1;
}

.add-note-button {
  color: var(--icon-default-color);
  background: none;
  border: none;
  background-color: var(--primary-color);
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-family: Arial, sans-serif;
  /* 设置字体 */
  font-size: 24px;
  /* 设置字体大小 */
  line-height: 1;
  /* 确保行高不会影响对齐 */
}

.plus-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
