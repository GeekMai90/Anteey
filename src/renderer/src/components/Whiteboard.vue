<template>
  <div class="whiteboard-container">
    <canvas ref="canvasRef"></canvas>
    <div class="toolbar">
      <button @click="addCard">Add Card</button>
      <button @click="toggleConnectionMode">
        {{ isConnectingCards ? 'Cancel Connection' : 'Connect Cards' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fabric } from 'fabric'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isConnectingCards = ref(false)
let canvas: fabric.Canvas
let selectedCards: fabric.Object[] = []

onMounted(() => {
  if (canvasRef.value) {
    canvas = new fabric.Canvas(canvasRef.value, {
      width: 800,
      height: 600,
      backgroundColor: '#f0f0f0'
    })
    initializeCanvas()
  }
})

const initializeCanvas = () => {
  canvas.on('selection:created', handleSelection)
  canvas.on('selection:updated', handleSelection)
  canvas.on('selection:cleared', () => {
    selectedCards = []
  })
}

const handleSelection = (event: fabric.IEvent) => {
  const selection = event.selected
  if (selection && selection.length > 0) {
    selectedCards = selection
  }
}

const addCard = () => {
  const card = createCard('New Card', Math.random() * 600, Math.random() * 400)
  canvas.add(card)
  canvas.renderAll()
}

const createCard = (content: string, left: number, top: number) => {
  const card = new fabric.Rect({
    left,
    top,
    width: 150,
    height: 100,
    fill: 'white',
    stroke: 'black',
    strokeWidth: 2,
    rx: 10,
    ry: 10
  })

  const text = new fabric.Text(content, {
    left: left + 10,
    top: top + 10,
    fontSize: 16
  })

  return new fabric.Group([card, text], {
    left,
    top,
    selectable: true,
    hasControls: true
  })
}

const toggleConnectionMode = () => {
  isConnectingCards.value = !isConnectingCards.value
  if (isConnectingCards.value) {
    canvas.selection = false
  } else {
    canvas.selection = true
    selectedCards = []
  }
}

const connectCards = () => {
  if (selectedCards.length === 2) {
    const [card1, card2] = selectedCards
    const line = new fabric.Line(
      [
        card1.left! + card1.width! / 2,
        card1.top! + card1.height! / 2,
        card2.left! + card2.width! / 2,
        card2.top! + card2.height! / 2
      ],
      {
        stroke: 'black',
        strokeWidth: 2,
        selectable: false
      }
    )

    canvas.add(line)
    canvas.renderAll()
    selectedCards = []
    isConnectingCards.value = false
  }
}
</script>

<style scoped>
.whiteboard-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.toolbar {
  margin-top: 10px;
}

button {
  margin: 0 5px;
  padding: 5px 10px;
}
</style>
