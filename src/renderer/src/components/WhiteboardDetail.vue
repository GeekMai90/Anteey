<!-- WhiteboardDetail.vue -->
<template>
  <div class="whiteboard-detail">
    <h2>{{ whiteboard.name }}</h2>
    <div class="whiteboard-canvas" ref="canvasRef">
      <div
        v-for="card in whiteboard.cards"
        :key="card.id"
        class="card"
        :style="{ left: card.x + 'px', top: card.y + 'px' }"
        @mousedown="startDrag(card, $event)"
      >
        {{ card.content }}
      </div>
    </div>
    <button @click="addNewCard">Add New Card</button>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useWhiteboardStore } from '@renderer/stores/whiteboardStores'

const route = useRoute()
const whiteboardStore = useWhiteboardStore()
const whiteboard = ref(null)
const canvasRef = ref(null)

let isDragging = false
let currentCard = null
let startX = 0
let startY = 0

onMounted(async () => {
  const id = route.params.id as string
  whiteboard.value = await whiteboardStore.fetchWhiteboard(id)

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})

const startDrag = (card, event) => {
  isDragging = true
  currentCard = card
  startX = event.clientX - card.x
  startY = event.clientY - card.y
}

const onMouseMove = (event) => {
  if (!isDragging) return

  const newX = event.clientX - startX
  const newY = event.clientY - startY

  currentCard.x = newX
  currentCard.y = newY
}

const onMouseUp = () => {
  if (isDragging) {
    whiteboardStore.updateCardPosition(currentCard)
    isDragging = false
    currentCard = null
  }
}

const addNewCard = () => {
  const newCard = {
    id: Date.now().toString(),
    content: 'New Card',
    x: 100,
    y: 100
  }
  whiteboard.value.cards.push(newCard)
  whiteboardStore.addCard(whiteboard.value.id, newCard)
}
</script>

<style lang="scss" scoped>
.whiteboard-detail {
  width: 100%;
  height: 100vh;
  position: relative;
}

.whiteboard-canvas {
  width: 100%;
  height: calc(100% - 60px);
  position: relative;
  overflow: auto;
}

.card {
  position: absolute;
  width: 200px;
  height: 100px;
  background-color: white;
  border: 1px solid #ccc;
  padding: 10px;
  cursor: move;
}
</style>
