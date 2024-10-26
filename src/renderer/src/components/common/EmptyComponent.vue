<template>
  <div class="empty-component"></div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  // 确保组件加载后立即返回
  setTimeout(() => {
    if (router.currentRoute.value.name === 'temp') {
      router.back()
    }
  }, 0)
})
</script>

<style scoped>
.empty-component {
  display: none;
}
</style>
