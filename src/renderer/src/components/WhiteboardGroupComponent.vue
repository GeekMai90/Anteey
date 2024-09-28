<template>
  <div class="whiteboard-group">
    <div class="group-header">
      <div class="group-title">{{ group.name }}</div>
      <div class="group-actions">
        <button @click="addItem">添加项目</button>
        <button @click="removeItem">删除项目</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {}
</script>

<style lang="scss" scoped></style>
