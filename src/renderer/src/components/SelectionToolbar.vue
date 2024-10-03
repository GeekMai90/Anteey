<template>
  <div v-if="selectedCount > 1" class="selection-toolbar">
    <button class="toolbar-button" @click="alignTop">
      <AlignTop theme="outline" size="20" />
      <span>顶端对齐</span>
    </button>
    <button class="toolbar-button" @click="alignBottom">
      <AlignBottom theme="outline" size="20" />
      <span>底部对齐</span>
    </button>
    <button class="toolbar-button" @click="alignLeft">
      <AlignLeft theme="outline" size="20" />
      <span>左侧对齐</span>
    </button>
    <button class="toolbar-button" @click="alignRight">
      <AlignRight theme="outline" size="20" />
      <span>右侧对齐</span>
    </button>
    <button class="toolbar-button" @click="alignHorizontalCenter">
      <AlignHorizontally theme="outline" size="20" />
      <span>水平居中</span>
    </button>
    <button class="toolbar-button" @click="alignVerticalCenter">
      <AlignVertically theme="outline" size="20" />
      <span>垂直居中</span>
    </button>
    <button class="toolbar-button" @click="distributeVertically">
      <DistributeVertically theme="outline" size="20" />
      <span>垂直分布</span>
    </button>
    <button class="toolbar-button" @click="distributeHorizontally">
      <DistributeHorizontally theme="outline" size="20" />
      <span>水平分布</span>
    </button>
    <button class="toolbar-button" @click="horizontalStack">
      <WaterfallsH theme="outline" size="20" />
      <span>水平堆叠</span>
    </button>
    <button class="toolbar-button" @click="verticalStack">
      <WaterfallsV theme="outline" size="20" />
      <span>垂直堆叠</span>
    </button>
    <!-- 可以根据需要添加更多按钮 -->
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  AlignTop,
  AlignBottom,
  AlignLeft,
  AlignRight,
  AlignVertically,
  AlignHorizontally,
  DistributeVertically,
  DistributeHorizontally,
  WaterfallsV,
  WaterfallsH
} from '@icon-park/vue-next'
import { WhiteboardNote } from '@renderer/types/Note'

const props = defineProps<{
  selectedNotes: string[]
  whiteboardNotes: WhiteboardNote[]
}>()

const emit = defineEmits<{
  (e: 'update:notes', notes: WhiteboardNote[]): void
  (e: 'updateConnections'): void
}>()

const selectedCount = computed(() => props.selectedNotes.length)

const getSelectedNotes = () =>
  props.whiteboardNotes.filter((note) => props.selectedNotes.includes(note.id))

const alignTop = () => {
  if (selectedCount.value <= 1) return
  const topY = Math.min(...getSelectedNotes().map((note) => note.position.y))
  updateNotePositions((note) => ({ ...note.position, y: topY }))
}
const alignBottom = () => {
  if (selectedCount.value < 2) return
  const bottomY = Math.max(...getSelectedNotes().map((note) => note.position.y + note.size.height))
  updateNotePositions((note) => ({ ...note.position, y: bottomY - note.size.height }))
}

const alignLeft = () => {
  if (selectedCount.value <= 1) return
  const leftX = Math.min(...getSelectedNotes().map((note) => note.position.x))
  updateNotePositions((note) => ({ ...note.position, x: leftX }))
}
const alignRight = () => {
  if (selectedCount.value < 2) return
  const rightX = Math.max(...getSelectedNotes().map((note) => note.position.x + note.size.width))
  updateNotePositions((note) => ({ ...note.position, x: rightX - note.size.width }))
}

const alignHorizontalCenter = () => {
  if (selectedCount.value < 2) return
  const selectedNotes = getSelectedNotes()
  const leftX = Math.min(...selectedNotes.map((note) => note.position.x))
  const rightX = Math.max(...selectedNotes.map((note) => note.position.x + note.size.width))
  const centerX = (leftX + rightX) / 2
  updateNotePositions((note) => ({
    ...note.position,
    x: centerX - note.size.width / 2
  }))
}
const alignVerticalCenter = () => {
  if (selectedCount.value < 2) return
  const selectedNotes = getSelectedNotes()
  const topY = Math.min(...selectedNotes.map((note) => note.position.y))
  const bottomY = Math.max(...selectedNotes.map((note) => note.position.y + note.size.height))
  const centerY = (topY + bottomY) / 2
  updateNotePositions((note) => ({
    ...note.position,
    y: centerY - note.size.height / 2
  }))
}

const distributeVertically = () => {
  console.log('distributeVertically clicked')
  if (selectedCount.value < 2) return
  const sortedNotes = getSelectedNotes().sort((a, b) => a.position.y - b.position.y)
  const firstNote = sortedNotes[0]
  const lastNote = sortedNotes[sortedNotes.length - 1]
  const totalHeight = lastNote.position.y - firstNote.position.y

  updateNotePositions((note, index) => {
    let newY
    if (selectedCount.value === 2) {
      // 如果只有两个笔记，直接使用它们的当前位置
      newY = index === 0 ? firstNote.position.y : lastNote.position.y
    } else {
      // 如果有多个笔记，计算平均分布的位置
      const gap = totalHeight / (sortedNotes.length - 1)
      newY = firstNote.position.y + index * gap
    }
    console.log(`Distributing note ${note.id} vertically to y: ${newY}`)
    return { ...note.position, y: newY }
  })
}

const distributeHorizontally = () => {
  console.log('distributeHorizontally clicked')
  if (selectedCount.value < 2) return
  const sortedNotes = getSelectedNotes().sort((a, b) => a.position.x - b.position.x)
  const firstNote = sortedNotes[0]
  const lastNote = sortedNotes[sortedNotes.length - 1]
  const totalWidth = lastNote.position.x - firstNote.position.x

  updateNotePositions((note, index) => {
    let newX
    if (selectedCount.value === 2) {
      // 如果只有两个笔记，直接使用它们的当前位置
      newX = index === 0 ? firstNote.position.x : lastNote.position.x
    } else {
      // 如果有多个笔记，计算平均分布的位置
      const gap = totalWidth / (sortedNotes.length - 1)
      newX = firstNote.position.x + index * gap
    }
    console.log(`Distributing note ${note.id} horizontally to x: ${newX}`)
    return { ...note.position, x: newX }
  })
}
const verticalStack = () => {
  if (selectedCount.value < 2) return
  const selectedNotes = getSelectedNotes()
  const leftX = Math.min(...selectedNotes.map((note) => note.position.x))
  let currentY = Math.min(...selectedNotes.map((note) => note.position.y))

  const newPositions = selectedNotes
    .sort((a, b) => a.position.y - b.position.y)
    .map((note) => {
      const newPosition = {
        x: leftX,
        y: currentY
      }
      currentY += note.size.height + 10 // 10是笔记之间的间隔，可以根据需要调整
      return { id: note.id, position: newPosition }
    })

  updateNotePositions((note) => {
    const newPosition = newPositions.find((p) => p.id === note.id)?.position
    return newPosition || note.position
  })
}

const horizontalStack = () => {
  if (selectedCount.value < 2) return
  const selectedNotes = getSelectedNotes()
  const topY = Math.min(...selectedNotes.map((note) => note.position.y))
  let currentX = Math.min(...selectedNotes.map((note) => note.position.x))

  const newPositions = selectedNotes
    .sort((a, b) => a.position.x - b.position.x)
    .map((note) => {
      const newPosition = {
        x: currentX,
        y: topY
      }
      currentX += note.size.width + 10 // 10是笔记之间的间隔，可以根据需要调整
      return { id: note.id, position: newPosition }
    })

  updateNotePositions((note) => {
    const newPosition = newPositions.find((p) => p.id === note.id)?.position
    return newPosition || note.position
  })
}

const updateNotePositions = (
  positionUpdater: (note: WhiteboardNote, index: number) => { x: number; y: number }
) => {
  const updatedNotes = props.whiteboardNotes.map((note) => {
    if (props.selectedNotes.includes(note.id)) {
      const index = getSelectedNotes().findIndex((n) => n.id === note.id)
      const newPosition = positionUpdater(note, index)
      console.log(`Updating note ${note.id} position:`, note.position, '->', newPosition)
      return { ...note, position: newPosition }
    }
    return note
  })
  console.log('Emitting updated notes:', updatedNotes)
  emit('update:notes', updatedNotes)
  emit('updateConnections')
}
</script>

<style scoped>
.selection-toolbar {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: var(--color-bg-secondary);
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.toolbar-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  color: var(--color-text-primary);
  transition: background-color 0.3s;

  &:hover {
    background-color: var(--color-hover-button);
  }

  span {
    font-size: 12px;
    margin-top: 4px;
  }
}
</style>
