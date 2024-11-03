<template>
  <div class="canvas-container">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Canvas, ICanvas } from 'fabric' // 修改导入方式

const canvasRef = ref<HTMLCanvasElement | null>(null)
let canvas: ICanvas

onMounted(() => {
  if (!canvasRef.value) return

  // 初始化画布
  canvas = new Canvas(canvasRef.value, {
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#ffffff'
  })

  // 设置自由绘画模式
  canvas.isDrawingMode = true
  if (canvas.freeDrawingBrush) {
    canvas.freeDrawingBrush.width = 2
    canvas.freeDrawingBrush.color = '#000000'
  }

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    canvas.setDimensions({
      width: window.innerWidth,
      height: window.innerHeight
    })
  })
})
</script>

<style scoped>
.canvas-container {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
}

canvas {
  width: 100%;
  height: 100%;
}
</style>
