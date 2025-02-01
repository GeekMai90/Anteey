import { useVueFlow } from '@vue-flow/core'
import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { XYPosition } from '@vue-flow/core'

const state = {
  draggedType: ref<string | null>(null),
  isDragOver: ref(false),
  isDragging: ref(false)
}

export default function useDragAndDrop() {
  const { draggedType, isDragOver, isDragging } = state
  const { addNodes, screenToFlowCoordinate } = useVueFlow()

  // 保存拖拽释放的位置
  const dropPosition = ref<XYPosition | null>(null)

  function onDragStart(event: DragEvent, type: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/vueflow', type)
      event.dataTransfer.effectAllowed = 'move'
    }
    draggedType.value = type
    isDragging.value = true
  }

  function onDragOver(event: DragEvent) {
    event.preventDefault()
    if (draggedType.value) {
      isDragOver.value = true
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move'
      }
    }
  }

  function onDragLeave() {
    isDragOver.value = false
  }

  function onDrop(event: DragEvent) {
    const position = screenToFlowCoordinate({
      x: event.clientX,
      y: event.clientY
    })

    if (draggedType.value === 'text') {
      // 文本节点直接创建
      const newNode = {
        id: `text-${uuidv4()}`,
        type: 'text',
        position,
        data: {
          content: '',
          label: '新建文字卡片',
          toolbarPosition: 'top',
          toolbarVisible: false,
          width: 250,
          height: 50,
          backgroundColor: 'transparent',
          borderColor: 'var(--color-border)'
        }
      }
      addNodes([newNode])
    } else if (draggedType.value === 'card') {
      // 卡片节点先保存位置
      dropPosition.value = position
    }

    isDragging.value = false
    isDragOver.value = false
    draggedType.value = null
  }

  return {
    draggedType,
    isDragOver,
    isDragging,
    dropPosition,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop
  }
}
