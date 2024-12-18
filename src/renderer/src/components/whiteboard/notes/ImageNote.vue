<template>
  <div class="image-note" :style="containerStyle">
    <img :src="imageUrl" :style="imageStyle" @load="handleImageLoad" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CSSProperties } from 'vue'

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

// 容器样式
const containerStyle = computed(() => ({
  backgroundColor: props.style?.backgroundColor || 'var(--color-bg-primary)'
}))

// 图片样式
const imageStyle = computed(
  (): CSSProperties => ({
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    pointerEvents: 'none' as const
  })
)

const handleImageLoad = () => {
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
  border-radius: 12px;
  overflow: hidden;
  background-color: var(--color-bg-primary);

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
    user-select: none;
    -webkit-user-drag: none;
  }
}
</style>
