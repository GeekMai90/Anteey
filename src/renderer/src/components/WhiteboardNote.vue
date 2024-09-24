<template>
  <div class="whiteboard-note">
    <div class="note-header">
      <div class="note-title">{{ note.title }}</div>
      <div class="note-actions">
        <button @click="editNote">编辑</button>
        <button @click="deleteNote">删除</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WhiteboardNote'
}
</script>

<style lang="scss" scoped></style>
