import { useVueFlow } from '@vue-flow/core'
import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'

const state = {
  draggedType: ref<string | null>(null),
  isDragOver: ref(false),
  isDragging: ref(false)
}

export default function useDragAndDrop() {
  const { draggedType, isDragOver, isDragging } = state
  const { addNodes, screenToFlowCoordinate } = useVueFlow()

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
    }

    isDragging.value = false
    isDragOver.value = false
    draggedType.value = null
  }

  return {
    draggedType,
    isDragOver,
    isDragging,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop
  }
}
