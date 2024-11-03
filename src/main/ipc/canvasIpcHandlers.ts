import { ipcMain } from 'electron'
import {
  createCanvas,
  getCanvas,
  getAllCanvases,
  updateCanvas,
  deleteCanvas,
  addAssetToCanvas,
  removeAssetFromCanvas,
  updateCanvasStarred
} from '../../db/canvasService'

export function setupCanvasHandlers() {
  // 创建画布
  ipcMain.handle('create-canvas', async (_event, input) => {
    try {
      const canvas = await createCanvas(input)
      console.log('主进程 → 创建画布成功:', canvas.id)
      return { success: true, canvas }
    } catch (error) {
      console.error('主进程 → 创建画布失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 获取单个画布
  ipcMain.handle('get-canvas', async (_event, id: string) => {
    try {
      const canvas = await getCanvas(id)
      if (!canvas) {
        return { success: false, error: 'Canvas not found' }
      }
      return { success: true, canvas }
    } catch (error) {
      console.error('主进程 → 获取画布失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 获取所有画布
  ipcMain.handle('get-all-canvases', async () => {
    try {
      const canvases = await getAllCanvases()
      return { success: true, canvases }
    } catch (error) {
      console.error('主进程 → 获取所有画布失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 更新画布
  ipcMain.handle('update-canvas', async (_event, { id, data }) => {
    try {
      const canvas = await updateCanvas(id, data)
      return { success: true, canvas }
    } catch (error) {
      console.error('主进程 → 更新画布失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 删除画布
  ipcMain.handle('delete-canvas', async (_event, id: string) => {
    try {
      const success = await deleteCanvas(id)
      return { success }
    } catch (error) {
      console.error('主进程 → 删除画布失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 添加资产到画布
  ipcMain.handle('add-canvas-asset', async (_event, { canvasId, asset }) => {
    try {
      const canvas = await addAssetToCanvas(canvasId, asset)
      return { success: true, canvas }
    } catch (error) {
      console.error('主进程 → 添加资产到画布失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 从画布移除资产
  ipcMain.handle('remove-canvas-asset', async (_event, { canvasId, assetId }) => {
    try {
      const canvas = await removeAssetFromCanvas(canvasId, assetId)
      return { success: true, canvas }
    } catch (error) {
      console.error('主进程 → 从画布移除资产失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // 更新画布收藏状态
  ipcMain.handle('update-canvas-starred', async (_event, { id, isStarred, starredOrder }) => {
    try {
      const canvas = await updateCanvasStarred(id, isStarred, starredOrder)
      return { success: true, canvas }
    } catch (error) {
      console.error('主进程 → 更新画布收藏状态失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })
}
