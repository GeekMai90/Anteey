import { ref, computed, type Ref } from 'vue'
import type { WhiteboardNote, Connection, ConnectionCreateData } from '@shared/types'
import { useWhiteboardStore } from '../../stores/whiteboardStore'
import { useContextMenuStore } from '../../stores/contextMenuStore'
import { Delete } from '@icon-park/vue-next'
import { markRaw } from 'vue'

export function useConnection(
  whiteboardNotes: Ref<WhiteboardNote[]>,
  connections: Ref<Connection[]>,
  whiteboardId: Ref<string | null>,
  scale: Ref<number>,
  translateX: Ref<number>,
  translateY: Ref<number>,
  containerRef: Ref<HTMLElement | null>
) {
  const whiteboardStore = useWhiteboardStore()
  const contextMenuStore = useContextMenuStore()

  // 连线状态
  const isCreatingConnection = ref(false)
  const connectionStart = ref({ x: 0, y: 0 })
  const connectionEnd = ref({ x: 0, y: 0 })
  const startNote = ref<WhiteboardNote | null>(null)
  const isConnecting = ref(false)
  const hoverNote = ref<WhiteboardNote | null>(null)
  const selectedConnectionId = ref<string | null>(null)

  // 临时连线计算属性
  const temporaryConnection = computed(() => ({
    id: 'temp',
    whiteboardId: whiteboardId.value as string,
    startItemId: startNote.value?.id || '',
    endItemId: '',
    startPoint: connectionStart.value,
    endPoint: connectionEnd.value,
    description: ''
  }))

  // 计算连线点位置
  const calculateConnectionPoints = (startNote: WhiteboardNote, endNote: WhiteboardNote) => {
    const getEdgeCenterPoint = (note: WhiteboardNote, angle: number) => {
      const center = {
        x: note.position.x + note.size.width / 2,
        y: note.position.y + note.size.height / 2
      }
      const w = note.size.width / 2
      const h = note.size.height / 2

      if (Math.abs(Math.tan(angle)) < h / w) {
        return {
          x: center.x + w * Math.sign(Math.cos(angle)),
          y: center.y
        }
      } else {
        return {
          x: center.x,
          y: center.y + h * Math.sign(Math.sin(angle))
        }
      }
    }

    const dx = endNote.position.x - startNote.position.x
    const dy = endNote.position.y - startNote.position.y
    const angle = Math.atan2(dy, dx)

    const startPoint = getEdgeCenterPoint(startNote, angle)
    const endPoint = getEdgeCenterPoint(endNote, angle + Math.PI)

    return { startPoint, endPoint }
  }

  // 更新单个连线位置
  const updateConnectionPositions = (
    movedNoteId: string,
    newPosition: { x: number; y: number }
  ) => {
    const movedNoteIndex = whiteboardNotes.value.findIndex((note) => note.id === movedNoteId)
    if (movedNoteIndex !== -1) {
      whiteboardNotes.value[movedNoteIndex] = {
        ...whiteboardNotes.value[movedNoteIndex],
        position: newPosition
      }
    }

    connections.value = connections.value.map((connection) => {
      if (connection.startItemId === movedNoteId || connection.endItemId === movedNoteId) {
        const startNote = whiteboardNotes.value.find((note) => note.id === connection.startItemId)
        const endNote = whiteboardNotes.value.find((note) => note.id === connection.endItemId)

        if (startNote && endNote) {
          const { startPoint, endPoint } = calculateConnectionPoints(startNote, endNote)
          return { ...connection, startPoint, endPoint }
        }
      }
      return connection
    })
  }

  // 更新所有连线位置
  const updateAllConnectionPositions = () => {
    connections.value = connections.value.map((connection) => {
      const startNote = whiteboardNotes.value.find((note) => note.id === connection.startItemId)
      const endNote = whiteboardNotes.value.find((note) => note.id === connection.endItemId)
      if (startNote && endNote) {
        const { startPoint, endPoint } = calculateConnectionPoints(startNote, endNote)
        return { ...connection, startPoint, endPoint }
      }
      return connection
    })
  }

  // 开始创建连线
  const startConnection = (
    note: WhiteboardNote,
    startAnchorPosition: 'top' | 'right' | 'bottom' | 'left'
  ) => {
    console.log('Start connection', note)
    isCreatingConnection.value = true
    isConnecting.value = true
    hoverNote.value = null
    startNote.value = note

    // 根据锚点位置计算起始点
    const startPoint = {
      x: note.position.x,
      y: note.position.y
    }

    switch (startAnchorPosition) {
      case 'top':
        startPoint.x += note.size.width / 2
        break
      case 'right':
        startPoint.x += note.size.width
        startPoint.y += note.size.height / 2
        break
      case 'bottom':
        startPoint.x += note.size.width / 2
        startPoint.y += note.size.height
        break
      case 'left':
        startPoint.y += note.size.height / 2
        break
    }

    connectionStart.value = startPoint
    connectionEnd.value = { ...startPoint }
  }

  // 查找鼠标下的笔记
  const findNoteUnderMouse = (event: MouseEvent): WhiteboardNote | null => {
    if (!containerRef.value) return null

    const rect = containerRef.value.getBoundingClientRect()
    const mouseX = (event.clientX - rect.left - translateX.value) / scale.value
    const mouseY = (event.clientY - rect.top - translateY.value) / scale.value

    return (
      whiteboardNotes.value.find(
        (note) =>
          mouseX >= note.position.x &&
          mouseX <= note.position.x + note.size.width &&
          mouseY >= note.position.y &&
          mouseY <= note.position.y + note.size.height
      ) || null
    )
  }

  // 处理连线创建过程中的鼠标移动
  const handleConnectionMouseMove = (event: MouseEvent) => {
    if (!isCreatingConnection.value || !containerRef.value) return

    const rect = containerRef.value.getBoundingClientRect()
    const mouseX = (event.clientX - rect.left - translateX.value) / scale.value
    const mouseY = (event.clientY - rect.top - translateY.value) / scale.value

    hoverNote.value = findNoteUnderMouse(event)

    if (hoverNote.value && hoverNote.value.id !== startNote.value?.id) {
      const { endPoint } = calculateConnectionPoints(startNote.value!, hoverNote.value)
      connectionEnd.value = endPoint
    } else {
      connectionEnd.value = { x: mouseX, y: mouseY }
    }
  }

  // 完成连线创建
  const finishConnection = async (event: MouseEvent) => {
    if (!isCreatingConnection.value || !startNote.value) return

    const endNote = findNoteUnderMouse(event)
    if (endNote && endNote.id !== startNote.value.id) {
      const { startPoint, endPoint } = calculateConnectionPoints(startNote.value, endNote)
      const newConnection: ConnectionCreateData = {
        whiteboardId: whiteboardId.value as string,
        startItemId: startNote.value.id,
        endItemId: endNote.id,
        startPoint,
        endPoint,
        description: ''
      }
      const createdConnection = await whiteboardStore.createConnection(newConnection)
      connections.value.push(createdConnection)
    }

    // 重置状态
    isCreatingConnection.value = false
    isConnecting.value = false
    startNote.value = null
    hoverNote.value = null
  }

  // 更新连线描述
  const updateConnectionDescription = async (id: string, description: string) => {
    await whiteboardStore.updateConnectionDescription(id, description)
    const index = connections.value.findIndex((c) => c.id === id)
    if (index !== -1) {
      connections.value[index].description = description
    }
  }

  // 选择连线
  const selectConnection = (connectionId: string, event?: Event) => {
    if (event) {
      event.stopPropagation()
    }
    console.log('Connection selected:', connectionId)
    selectedConnectionId.value = selectedConnectionId.value === connectionId ? null : connectionId
  }

  // 取消选择连线
  const deselectConnection = () => {
    if (selectedConnectionId.value) {
      selectedConnectionId.value = null
    }
  }

  // 显示连线上下文菜单
  const showConnectionContextMenu = (event: MouseEvent, connection: Connection) => {
    selectedConnectionId.value = connection.id
    contextMenuStore.showMenuAtPosition(event.clientX, event.clientY, [
      {
        label: '删除连线',
        icon: markRaw(Delete),
        action: () => deleteConnection(connection.id)
      }
    ])
  }

  // 删除连线
  const deleteConnection = async (connectionId: string) => {
    try {
      await whiteboardStore.deleteConnection(connectionId)
      connections.value = connections.value.filter((c) => c.id !== connectionId)
      selectedConnectionId.value = null
      contextMenuStore.closeMenu()
    } catch (error) {
      console.error('Failed to delete connection:', error)
    }
  }

  return {
    // 状态
    isCreatingConnection,
    connectionStart,
    connectionEnd,
    startNote,
    isConnecting,
    hoverNote,
    selectedConnectionId,
    temporaryConnection,

    // 方法
    calculateConnectionPoints,
    updateConnectionPositions,
    updateAllConnectionPositions,
    startConnection,
    handleConnectionMouseMove,
    finishConnection,
    updateConnectionDescription,
    selectConnection,
    deselectConnection,
    showConnectionContextMenu,
    deleteConnection
  }
}
