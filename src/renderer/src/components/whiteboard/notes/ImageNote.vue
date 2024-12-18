<template>
  <div class="image-note">
    <img :src="imageUrl" :style="imageStyle" @load="handleImageLoad" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  imageUrl?: string
  originalSize?: {
    width: number
    height: number
  }
  style?: {
    backgroundColor?: string
  }
}>()

const imageStyle = computed(() => ({
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain' as const,
  ...props.style
}))

const handleImageLoad = () => {
  // TODO: 实现图片加载完成后的处理逻辑
  console.log('Image loaded:', props.imageUrl)
}
</script>

<style lang="scss" scoped>
.image-note {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}
</style>
