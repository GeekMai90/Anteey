import { ipcRenderer } from 'electron'
import {
  Canvas,
  CanvasAsset,
  CreateCanvasInput,
  UpdateCanvasInput
} from '../../renderer/src/types/Note'

export const canvasApi = {
  // 创建画布
  createCanvas: async (input: CreateCanvasInput): Promise<Canvas> => {
    try {
      const result = await ipcRenderer.invoke('create-canvas', input)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.canvas
    } catch (error) {
      console.error('预加载脚本 → 创建画布失败:', error)
      throw error
    }
  },

  // 获取单个画布
  getCanvas: async (id: string): Promise<Canvas> => {
    try {
      const result = await ipcRenderer.invoke('get-canvas', id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.canvas
    } catch (error) {
      console.error('预加载脚本 → 获取画布失败:', error)
      throw error
    }
  },

  // 获取所有画布
  getAllCanvases: async (): Promise<Canvas[]> => {
    try {
      const result = await ipcRenderer.invoke('get-all-canvases')
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.canvases
    } catch (error) {
      console.error('预加载脚本 → 获取所有画布失败:', error)
      throw error
    }
  },

  // 更新画布
  updateCanvas: async (id: string, data: UpdateCanvasInput): Promise<Canvas> => {
    try {
      const result = await ipcRenderer.invoke('update-canvas', { id, data })
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.canvas
    } catch (error) {
      console.error('预加载脚本 → 更新画布失败:', error)
      throw error
    }
  },

  // 删除画布
  deleteCanvas: async (id: string): Promise<boolean> => {
    try {
      const result = await ipcRenderer.invoke('delete-canvas', id)
      if (!result.success) {
        throw new Error(result.error)
      }
      return true
    } catch (error) {
      console.error('预加载脚本 → 删除画布失败:', error)
      throw error
    }
  },

  // 添加资产到画布
  addAssetToCanvas: async (canvasId: string, asset: CanvasAsset): Promise<Canvas> => {
    try {
      const result = await ipcRenderer.invoke('add-canvas-asset', { canvasId, asset })
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.canvas
    } catch (error) {
      console.error('预加载脚本 → 添加资产到画布失败:', error)
      throw error
    }
  },

  // 从画布移除资产
  removeAssetFromCanvas: async (canvasId: string, assetId: string): Promise<Canvas> => {
    try {
      const result = await ipcRenderer.invoke('remove-canvas-asset', { canvasId, assetId })
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.canvas
    } catch (error) {
      console.error('预加载脚本 → 从画布移除资产失败:', error)
      throw error
    }
  },

  // 更新画布收藏状态
  updateCanvasStarred: async (
    id: string,
    isStarred: boolean,
    starredOrder?: number
  ): Promise<Canvas> => {
    try {
      const result = await ipcRenderer.invoke('update-canvas-starred', {
        id,
        isStarred,
        starredOrder
      })
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.canvas
    } catch (error) {
      console.error('预加载脚本 → 更新画布收藏状态失败:', error)
      throw error
    }
  }
}
