<template>
  <div
    v-if="selectedCount > 1"
    class="selection-toolbar"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <button
      v-tooltip.right="{ content: '顶部对齐', delay: { show: 1000 } }"
      class="toolbar-button"
      @click="alignTop"
    >
      <div class="icon">
        <AlignTop
          theme="outline"
          size="20"
          :fill="isHovered ? 'var(--color-text-primary)' : 'var(--color-icon-secondary)'"
        />
      </div>
    </button>
    <button
      v-tooltip.right="{ content: '底部对齐', delay: { show: 1000 } }"
      class="toolbar-button"
      @click="alignBottom"
    >
      <div class="icon">
        <AlignBottom
          theme="outline"
          size="20"
          :fill="isHovered ? 'var(--color-text-primary)' : 'var(--color-icon-secondary)'"
        />
      </div>
    </button>
    <button
      v-tooltip.right="{ content: '左侧对齐', delay: { show: 1000 } }"
      class="toolbar-button"
      @click="alignLeft"
    >
      <div class="icon">
        <AlignLeft
          theme="outline"
          size="20"
          :fill="isHovered ? 'var(--color-text-primary)' : 'var(--color-icon-secondary)'"
        />
      </div>
    </button>
    <button
      v-tooltip.right="{ content: '右侧对齐', delay: { show: 1000 } }"
      class="toolbar-button"
      @click="alignRight"
    >
      <div class="icon">
        <AlignRight
          theme="outline"
          size="20"
          :fill="isHovered ? 'var(--color-text-primary)' : 'var(--color-icon-secondary)'"
        />
      </div>
    </button>
    <button
      v-tooltip.right="{ content: '水平居中', delay: { show: 1000 } }"
      class="toolbar-button"
      @click="alignHorizontalCenter"
    >
      <div class="icon">
        <AlignHorizontally
          theme="outline"
          size="20"
          :fill="isHovered ? 'var(--color-text-primary)' : 'var(--color-icon-secondary)'"
        />
      </div>
    </button>
    <button
      v-tooltip.right="{ content: '垂直居中', delay: { show: 1000 } }"
      class="toolbar-button"
      @click="alignVerticalCenter"
    >
      <div class="icon">
        <AlignVertically
          theme="outline"
          size="20"
          :fill="isHovered ? 'var(--color-text-primary)' : 'var(--color-icon-secondary)'"
        />
      </div>
    </button>
    <button
      v-tooltip.right="{ content: '垂直分布', delay: { show: 1000 } }"
      class="toolbar-button"
      @click="distributeVertically"
    >
      <div class="icon">
        <DistributeVertically
          theme="outline"
          size="20"
          :fill="isHovered ? 'var(--color-text-primary)' : 'var(--color-icon-secondary)'"
        />
      </div>
    </button>
    <button
      v-tooltip.right="{ content: '水平分布', delay: { show: 1000 } }"
      class="toolbar-button"
      @click="distributeHorizontally"
    >
      <div class="icon">
        <DistributeHorizontally
          theme="outline"
          size="20"
          :fill="isHovered ? 'var(--color-text-primary)' : 'var(--color-icon-secondary)'"
        />
      </div>
    </button>
    <button
      v-tooltip.right="{ content: '水平堆叠', delay: { show: 1000 } }"
      class="toolbar-button"
      @click="horizontalStack"
    >
      <div class="icon">
        <WaterfallsH
          theme="outline"
          size="20"
          :fill="isHovered ? 'var(--color-text-primary)' : 'var(--color-icon-secondary)'"
        />
      </div>
    </button>
    <button
      v-tooltip.right="{ content: '垂直堆叠', delay: { show: 1000 } }"
      class="toolbar-button"
      @click="verticalStack"
    >
      <div class="icon">
        <WaterfallsV
          theme="outline"
          size="20"
          :fill="isHovered ? 'var(--color-text-primary)' : 'var(--color-icon-secondary)'"
        />
      </div>
    </button>
    <!-- 可以根据需要添加更多按钮 -->
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
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
import { WhiteboardNote, WhiteboardTextCard } from '@renderer/types/Whiteboard'

const props = defineProps<{
  selectedNotes: string[]
  whiteboardNotes: Array<WhiteboardNote | WhiteboardTextCard>
}>()

const emit = defineEmits<{
  (e: 'update:notes', notes: Array<WhiteboardNote | WhiteboardTextCard>): void
  (e: 'updateConnections'): void
}>()

const selectedCount = computed(() => props.selectedNotes.length)
const isHovered = ref(false)

const getSelectedItems = () =>
  props.whiteboardNotes.filter((item) => props.selectedNotes.includes(item.id))

const alignTop = () => {
  if (selectedCount.value <= 1) return
  const topY = Math.min(...getSelectedItems().map((item) => item.position.y))
  updateNotePositions((item) => ({ ...item.position, y: topY }))
}
const alignBottom = () => {
  if (selectedCount.value < 2) return
  const bottomY = Math.max(...getSelectedItems().map((item) => item.position.y + item.size.height))
  updateNotePositions((item) => ({ ...item.position, y: bottomY - item.size.height }))
}

const alignLeft = () => {
  if (selectedCount.value <= 1) return
  const leftX = Math.min(...getSelectedItems().map((item) => item.position.x))
  updateNotePositions((item) => ({ ...item.position, x: leftX }))
}
const alignRight = () => {
  if (selectedCount.value < 2) return
  const rightX = Math.max(...getSelectedItems().map((item) => item.position.x + item.size.width))
  updateNotePositions((item) => ({ ...item.position, x: rightX - item.size.width }))
}

const alignHorizontalCenter = () => {
  if (selectedCount.value < 2) return
  const selectedItems = getSelectedItems()
  const leftX = Math.min(...selectedItems.map((item) => item.position.x))
  const rightX = Math.max(...selectedItems.map((item) => item.position.x + item.size.width))
  const centerX = (leftX + rightX) / 2
  updateNotePositions((item) => ({
    ...item.position,
    x: centerX - item.size.width / 2
  }))
}
const alignVerticalCenter = () => {
  if (selectedCount.value < 2) return
  const selectedItems = getSelectedItems()
  const topY = Math.min(...selectedItems.map((item) => item.position.y))
  const bottomY = Math.max(...selectedItems.map((item) => item.position.y + item.size.height))
  const centerY = (topY + bottomY) / 2
  updateNotePositions((item) => ({
    ...item.position,
    y: centerY - item.size.height / 2
  }))
}

const distributeVertically = () => {
  console.log('distributeVertically clicked')
  if (selectedCount.value < 2) return
  const sortedItems = getSelectedItems().sort((a, b) => a.position.y - b.position.y)
  const firstItem = sortedItems[0]
  const lastItem = sortedItems[sortedItems.length - 1]
  const totalHeight = lastItem.position.y - firstItem.position.y

  updateNotePositions((item, index) => {
    let newY
    if (selectedCount.value === 2) {
      // 如果只有两个项目，直接使用它们的当前位置
      newY = index === 0 ? firstItem.position.y : lastItem.position.y
    } else {
      // 如果有多个项目，计算平均分布的位置
      const gap = totalHeight / (sortedItems.length - 1)
      newY = firstItem.position.y + index * gap
    }
    console.log(`Distributing item ${item.id} vertically to y: ${newY}`)
    return { ...item.position, y: newY }
  })
}

const distributeHorizontally = () => {
  console.log('distributeHorizontally clicked')
  if (selectedCount.value < 2) return
  const sortedItems = getSelectedItems().sort((a, b) => a.position.x - b.position.x)
  const firstItem = sortedItems[0]
  const lastItem = sortedItems[sortedItems.length - 1]
  const totalWidth = lastItem.position.x - firstItem.position.x

  updateNotePositions((item, index) => {
    let newX
    if (selectedCount.value === 2) {
      // 如果只有两个项目，直接使用它们的当前位置
      newX = index === 0 ? firstItem.position.x : lastItem.position.x
    } else {
      // 如果有多个项目，计算平均分布的位置
      const gap = totalWidth / (sortedItems.length - 1)
      newX = firstItem.position.x + index * gap
    }
    console.log(`Distributing item ${item.id} horizontally to x: ${newX}`)
    return { ...item.position, x: newX }
  })
}
const verticalStack = () => {
  if (selectedCount.value < 2) return
  const selectedItems = getSelectedItems()
  const leftX = Math.min(...selectedItems.map((item) => item.position.x))
  let currentY = Math.min(...selectedItems.map((item) => item.position.y))

  const newPositions = selectedItems
    .sort((a, b) => a.position.y - b.position.y)
    .map((item) => {
      const newPosition = {
        x: leftX,
        y: currentY
      }
      currentY += item.size.height + 10 // 10是项目之间的间隔，可以根据需要调整
      return { id: item.id, position: newPosition }
    })

  updateNotePositions((item) => {
    const newPosition = newPositions.find((p) => p.id === item.id)?.position
    return newPosition || item.position
  })
}

const horizontalStack = () => {
  if (selectedCount.value < 2) return
  const selectedItems = getSelectedItems()
  const topY = Math.min(...selectedItems.map((item) => item.position.y))
  let currentX = Math.min(...selectedItems.map((item) => item.position.x))

  const newPositions = selectedItems
    .sort((a, b) => a.position.x - b.position.x)
    .map((item) => {
      const newPosition = {
        x: currentX,
        y: topY
      }
      currentX += item.size.width + 10 // 10是项目之间的间隔，可以根据需要调整
      return { id: item.id, position: newPosition }
    })

  updateNotePositions((item) => {
    const newPosition = newPositions.find((p) => p.id === item.id)?.position
    return newPosition || item.position
  })
}

const updateNotePositions = (
  positionUpdater: (
    item: WhiteboardNote | WhiteboardTextCard,
    index: number
  ) => { x: number; y: number }
) => {
  const updatedItems = props.whiteboardNotes.map((item) => {
    if (props.selectedNotes.includes(item.id)) {
      const index = getSelectedItems().findIndex((n) => n.id === item.id)
      const newPosition = positionUpdater(item, index)
      console.log(`Updating item ${item.id} position:`, item.position, '->', newPosition)
      return { ...item, position: newPosition }
    }
    return item
  })
  console.log('Emitting updated items:', updatedItems)
  emit('update:notes', updatedItems)
  emit('updateConnections')
}
</script>

<style scoped lang="scss">
.selection-toolbar {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: var(--color-bg-whiteboard);
  border-radius: 8px;
  padding: 8px;
  border: 1px solid transparent;
  &:hover {
    border: 1px solid var(--color-border);
  }
  // box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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
  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 18px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;

    // &:hover:not(:disabled) {
    //   background-color: rgba(0, 0, 0, 0.05);
    // }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 16px;
      height: 16px;
    }
  }
}
</style>
