<template>
  <div class="whiteboard-subboard">
    <div class="subboard-header">
      <div class="subboard-title">{{ subboard.name }}</div>
      <div class="subboard-actions">
        <button @click="addItem">添加项目</button>
        <button @click="removeItem">删除项目</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WhiteboardSubboard'
}
</script>

<style lang="scss" scoped></style>
