import { ref, computed, type Ref } from 'vue'
import type { WhiteboardNote } from '@renderer/types/Whiteboard'
import type { WhiteboardTextCard } from '@renderer/types/Whiteboard'

export function useSelection(
  whiteboardNotes: Ref<WhiteboardNote[]>,
  whiteboardTextCards: Ref<WhiteboardTextCard[]>,
  scale: Ref<number>,
  translateX: Ref<number>,
  translateY: Ref<number>,
  containerRef: Ref<HTMLElement | null>
) {
  const isSelecting = ref(false)
  const selectionStart = ref({ x: 0, y: 0 })
  const selectionEnd = ref({ x: 0, y: 0 })
  const selectedItems = ref<string[]>([])
  const rafId = ref<number | null>(null)

  const updateSelectedItems = () => {
    const selectionLeft = Math.min(selectionStart.value.x, selectionEnd.value.x)
    const selectionRight = Math.max(selectionStart.value.x, selectionEnd.value.x)
    const selectionTop = Math.min(selectionStart.value.y, selectionEnd.value.y)
    const selectionBottom = Math.max(selectionStart.value.y, selectionEnd.value.y)

    const selectedNoteIds = whiteboardNotes.value
      .filter(
        (note) =>
          note.position.x < selectionRight &&
          note.position.x + note.size.width > selectionLeft &&
          note.position.y < selectionBottom &&
          note.position.y + note.size.height > selectionTop
      )
      .map((note) => note.id)

    const selectedTextCardIds = whiteboardTextCards.value
      .filter(
        (card) =>
          card.position.x < selectionRight &&
          card.position.x + card.size.width > selectionLeft &&
          card.position.y < selectionBottom &&
          card.position.y + card.size.height > selectionTop
      )
      .map((card) => card.id)

    selectedItems.value = [...selectedNoteIds, ...selectedTextCardIds]
  }

  const selectionBoxStyle = computed(() => {
    const left = Math.min(selectionStart.value.x, selectionEnd.value.x)
    const top = Math.min(selectionStart.value.y, selectionEnd.value.y)
    const width = Math.abs(selectionEnd.value.x - selectionStart.value.x)
    const height = Math.abs(selectionEnd.value.y - selectionStart.value.y)
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`
    }
  })

  const startSelection = (event: MouseEvent) => {
    if (event.button !== 0) return
    isSelecting.value = true
    const rect = containerRef.value?.getBoundingClientRect()
    if (rect) {
      const startX = (event.clientX - rect.left - translateX.value) / scale.value
      const startY = (event.clientY - rect.top - translateY.value) / scale.value
      selectionStart.value = { x: startX, y: startY }
      selectionEnd.value = { x: startX, y: startY }
    }
  }

  const updateSelection = (event: MouseEvent) => {
    if (rafId.value) {
      cancelAnimationFrame(rafId.value)
    }
    rafId.value = requestAnimationFrame(() => {
      const rect = containerRef.value?.getBoundingClientRect()
      if (rect) {
        const currentX = (event.clientX - rect.left - translateX.value) / scale.value
        const currentY = (event.clientY - rect.top - translateY.value) / scale.value
        selectionEnd.value = { x: currentX, y: currentY }
        updateSelectedItems()
      }
    })
  }

  const endSelection = () => {
    isSelecting.value = false
    if (rafId.value) {
      cancelAnimationFrame(rafId.value)
      rafId.value = null
    }
    updateSelectedItems()
  }

  const handleContainerClickOutside = (event: MouseEvent) => {
    if (event.target === containerRef.value) {
      selectedItems.value = []
    }
  }

  return {
    isSelecting,
    selectedItems,
    selectionBoxStyle,
    startSelection,
    updateSelection,
    endSelection,
    handleContainerClickOutside
  }
}
