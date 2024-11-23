import { ref, computed } from 'vue'
import type { WhiteboardNote, Connection, ConnectionCreateData } from '@renderer/types/Note'
import { useWhiteboardStore } from '@renderer/stores/whiteboardStores'
import { useContextMenuStore } from '@renderer/stores/contextMenuStore'
import { markRaw } from 'vue'
import { Delete } from '@icon-park/vue-next'

export function useWhiteboardConnection(whiteboardId: string) {
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
  const connections = ref<Connection[]>([])

  // 临时连线
  const temporaryConnection = computed(() => ({
    id: 'temp',
    whiteboardId,
    startItemId: startNote.value?.id || '',
    endItemId: '',
    startPoint: connectionStart.value,
    endPoint: connectionEnd.value,
    description: ''
  }))

  // 计算连线两端的点
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

  // 开始连线
  const startConnection = (note: WhiteboardNote) => {
    isCreatingConnection.value = true
    isConnecting.value = true
    hoverNote.value = null
    startNote.value = note
    connectionStart.value = {
      x: note.position.x + note.size.width,
      y: note.position.y + note.size.height / 2
    }
    connectionEnd.value = { ...connectionStart.value }
  }

  // 更新连线位置
  const updateConnectionPositions = (notes: WhiteboardNote[]) => {
    connections.value = connections.value.map((connection) => {
      const startNote = notes.find((note) => note.id === connection.startItemId)
      const endNote = notes.find((note) => note.id === connection.endItemId)
      if (startNote && endNote) {
        const { startPoint, endPoint } = calculateConnectionPoints(startNote, endNote)
        return { ...connection, startPoint, endPoint }
      }
      return connection
    })
  }

  // 创建新连线
  const createConnection = async (endNote: WhiteboardNote) => {
    if (!startNote.value || endNote.id === startNote.value.id) return

    const { startPoint, endPoint } = calculateConnectionPoints(startNote.value, endNote)
    const newConnection: ConnectionCreateData = {
      whiteboardId,
      startItemId: startNote.value.id,
      endItemId: endNote.id,
      startPoint,
      endPoint,
      description: ''
    }

    const createdConnection = await whiteboardStore.createConnection(newConnection)
    connections.value.push(createdConnection)
  }

  // 更新连线描述
  const updateConnectionDescription = async (id: string, description: string) => {
    await whiteboardStore.updateConnectionDescription(id, description)
    const index = connections.value.findIndex((c) => c.id === id)
    if (index !== -1) {
      connections.value[index].description = description
    }
  }

  // 选择/取消选择连线
  const selectConnection = (connectionId: string, event?: Event) => {
    if (event) {
      event.stopPropagation()
    }
    if (selectedConnectionId.value === connectionId) {
      selectedConnectionId.value = null
    } else {
      selectedConnectionId.value = connectionId
    }
  }

  const deselectConnection = () => {
    selectedConnectionId.value = null
  }

  // 显示连线上下文菜单
  const showConnectionContextMenu = (event: MouseEvent, connection: Connection) => {
    selectedConnectionId.value = connection.id
    contextMenuStore.showMenu(event.clientX, event.clientY, [
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
    isConnecting,
    connectionStart,
    connectionEnd,
    startNote,
    hoverNote,
    selectedConnectionId,
    connections,
    temporaryConnection,

    // 方法
    startConnection,
    createConnection,
    updateConnectionPositions,
    updateConnectionDescription,
    selectConnection,
    deselectConnection,
    showConnectionContextMenu,
    deleteConnection,
    calculateConnectionPoints
  }
}
