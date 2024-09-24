<!-- src/renderer/src/views/WhiteboardView.vue -->
<template>
  <div class="whiteboard-view">
    <div class="fixed-header">
      <AppToolbar />
    </div>
    <div ref="containerRef" class="whiteboard-container">
      <WhiteboardThumbnail
        v-for="whiteboard in whiteboards"
        :key="whiteboard.id"
        :whiteboard="whiteboard"
        @click="openWhiteboard(whiteboard.id)"
        @update-position="updateWhiteboardPosition"
      />
      <button class="add-board-btn" @click="createNewWhiteboard">新建画布</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppToolbar from '@renderer/components/AppToolbar.vue'
import { useRouter } from 'vue-router'
import WhiteboardThumbnail from '@renderer/components/WhiteboardThumbnail.vue'
import { useWhiteboardStore } from '@renderer/stores/whiteboardStores'
import type { CreateWhiteboardInput, Whiteboard } from '@renderer/types/Note'

const router = useRouter()
const whiteboardStore = useWhiteboardStore()
const whiteboards = ref<Whiteboard[]>([])
const containerRef = ref<HTMLElement | null>(null)

// 获取顶层白板
onMounted(async () => {
  await whiteboardStore.getTopLevelWhiteboards()
  whiteboards.value = whiteboardStore.whiteboards
  console.log('whiteboards', whiteboards.value)
})

const openWhiteboard = (id: string) => {
  router.push({ name: 'whiteboardDetail', params: { id } })
}

const createNewWhiteboard = async () => {
  const input: CreateWhiteboardInput = {
    name: '新白板',
    isRoot: true,
    position: { x: 0, y: 0 }
  }
  try {
    const newWhiteboard = await whiteboardStore.createWhiteboard(input)
    // if (newWhiteboard) {
    //   whiteboards.value.push(newWhiteboard)
    // }
    return newWhiteboard
  } catch (error) {
    console.error('Failed to create whiteboard:', error)
  }
}

const updateWhiteboardPosition = (id: string, x: number, y: number) => {
  // 更新白板位置的逻辑
  const whiteboard = whiteboards.value.find((wb) => wb.id === id)
  if (whiteboard) {
    whiteboard.position = { x, y }
    // 这里可以调用 store 方法来持久化位置更改
    // whiteboardStore.updateWhiteboardPosition(id, x, y)
  }
}
</script>

<style scoped>
.whiteboard-view {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-primary);
  overflow: hidden;
}
.fixed-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--color-bg-primary);
}
.whiteboard-container {
  flex: 1;
  position: relative;
  width: 100%;
  height: 100%;
  background-color: var(--color-bg-primary);
  overflow: auto;
}

.board {
  position: absolute;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 10px;
  cursor: move;
  user-select: none;
}

.board-content {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 10px;
  height: 10px;
  background-color: #ccc;
  cursor: se-resize;
}

.add-board-btn {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
</style>
