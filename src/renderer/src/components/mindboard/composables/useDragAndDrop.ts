/**
 * @file useDragAndDrop.ts
 * @description 思维导图拖拽功能组合式API
 *
 * 主要功能：
 * 1. 处理从右侧多开笔记拖入笔记卡片
 * 2. 处理从底部工具栏拖入不同类型的节点：
 *    - 文本节点：用于添加纯文本内容
 *    - 便签节点：用于添加便签式笔记
 *    - 笔记卡片：用于关联已有笔记
 *    - 图片节点：用于添加图片内容
 * 3. 提供完整的拖拽生命周期管理：
 *    - 开始拖拽（onDragStart）
 *    - 拖拽悬停（onDragOver）
 *    - 拖拽离开（onDragLeave）
 *    - 拖拽释放（onDrop）
 * 4. 支持节点位置的自动计算和转换
 * 5. 提供统一的拖拽状态管理
 *
 * @author Antinet
 * @created 2024-03-19
 */

import { useVueFlow } from '@vue-flow/core'
import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { XYPosition } from '@vue-flow/core'

// 全局状态管理，用于跨组件共享拖拽状态
const state = {
  draggedType: ref<string | null>(null), // 当前拖拽的节点类型
  isDragOver: ref(false), // 是否正在拖拽悬停
  isDragging: ref(false) // 是否正在拖拽中
}

export default function useDragAndDrop() {
  // 从全局状态中解构需要的响应式变量
  const { draggedType, isDragOver, isDragging } = state
  // 从 VueFlow 中获取需要的方法
  const { addNodes, screenToFlowCoordinate } = useVueFlow()

  // 保存拖拽释放的位置，用于后续创建节点
  const dropPosition = ref<XYPosition | null>(null)

  /**
   * 处理拖拽开始事件
   * @param event 拖拽事件对象
   * @param type 拖拽的节点类型
   */
  function onDragStart(event: DragEvent, type: string) {
    if (event.dataTransfer) {
      // 设置拖拽数据和效果
      event.dataTransfer.setData('application/vueflow', type)
      event.dataTransfer.effectAllowed = 'move'
    }
    draggedType.value = type
    isDragging.value = true
  }

  /**
   * 处理拖拽悬停事件
   * @param event 拖拽事件对象
   */
  function onDragOver(event: DragEvent) {
    event.preventDefault()
    if (draggedType.value) {
      isDragOver.value = true
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move'
      }
    }
  }

  /**
   * 处理拖拽离开事件
   */
  function onDragLeave() {
    isDragOver.value = false
  }

  /**
   * 处理拖拽释放事件
   * @param event 拖拽事件对象
   */
  function onDrop(event: DragEvent) {
    event.preventDefault()
    // 将屏幕坐标转换为画布坐标
    const position = screenToFlowCoordinate({
      x: event.clientX,
      y: event.clientY
    })

    // 首先尝试处理从右侧多开笔记拖入的笔记
    try {
      const jsonData = event.dataTransfer?.getData('application/json')
      if (jsonData) {
        const data = JSON.parse(jsonData)
        if (data.id) {
          // 创建笔记卡片节点
          const newNode = {
            id: `card-${uuidv4()}`,
            type: 'card',
            position,
            data: {
              noteId: data.id, // 关联的笔记ID
              toolbarPosition: 'top',
              width: 350,
              height: 300,
              backgroundColor: 'transparent',
              borderColor: 'var(--color-border)'
            }
          }
          addNodes([newNode])
          isDragOver.value = false
          return
        }
      }
    } catch (error) {
      console.error('处理拖入笔记失败:', error)
    }

    // 处理从底部工具栏拖入的其他类型节点
    if (draggedType.value === 'text') {
      // 创建文本节点
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
    } else if (draggedType.value === 'memo') {
      // 创建便签节点
      const newNode = {
        id: `memo-${uuidv4()}`,
        type: 'memo',
        position,
        data: {
          content: '',
          label: '新建便签卡片',
          toolbarPosition: 'top',
          toolbarVisible: false,
          width: 250,
          height: 150,
          backgroundColor: '#FEF3A4'
        }
      }
      addNodes([newNode])
    } else if (draggedType.value === 'card' || draggedType.value === 'image') {
      // 对于需要额外处理的节点类型（如需要选择笔记或上传图片），
      // 先保存放置位置，等待后续处理
      dropPosition.value = position
    }

    // 重置拖拽状态
    isDragging.value = false
    isDragOver.value = false
  }

  /**
   * 创建图片节点
   * @param imageUrl 图片URL
   * @param position 节点位置
   */
  const createImageNode = (imageUrl: string, position: XYPosition) => {
    const newNode = {
      id: `image-${uuidv4()}`,
      type: 'image',
      position,
      data: {
        imageUrl,
        toolbarPosition: 'top',
        width: 350, // 默认宽度
        height: 300, // 默认高度
        backgroundColor: 'transparent',
        borderColor: 'var(--color-border)'
      }
    }
    addNodes([newNode])
  }

  // 返回组合式API需要的状态和方法
  return {
    draggedType, // 当前拖拽的节点类型
    isDragOver, // 是否正在拖拽悬停
    isDragging, // 是否正在拖拽中
    dropPosition, // 拖拽释放的位置
    onDragStart, // 开始拖拽处理函数
    onDragOver, // 拖拽悬停处理函数
    onDragLeave, // 拖拽离开处理函数
    onDrop, // 拖拽释放处理函数
    createImageNode // 创建图片节点的函数
  }
}
