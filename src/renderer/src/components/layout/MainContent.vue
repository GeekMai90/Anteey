<template>
  <el-container class="main-content">
    <el-header height="50px">
      <TopToolbar />
    </el-header>
    <el-main class="content-area">
      <ContentArea />
    </el-main>
  </el-container>
</template>

<script setup>
import TopToolbar from '@renderer/components/TopToolbar.vue'
import ContentArea from '@renderer/components/ContentArea.vue'
</script>

<style scoped>
.main-content {
  height: 100%;
  /* 改回 100% */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 防止出现滚动条 */
}

.content-area {
  flex: 1;
  overflow-y: auto;
  /* 允许内容区域滚动 */
  padding: 20px;
}
</style>
