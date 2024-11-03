import { db } from './config'
import { v4 as uuidv4 } from 'uuid'
import {
  Canvas,
  CanvasAsset,
  CreateCanvasInput,
  UpdateCanvasInput
} from '../renderer/src/types/Note'

// 工具函数：转换数据库记录为 Canvas 对象
function convertToCanvas(record: any): Canvas {
  return {
    ...record,
    snapshot: record.snapshot ? JSON.parse(record.snapshot) : null,
    customAssets: record.customAssets ? JSON.parse(record.customAssets) : {},
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  }
}

// 创建新画布
export async function createCanvas(input: CreateCanvasInput): Promise<Canvas> {
  try {
    const now = new Date()
    const newCanvas = {
      id: uuidv4(),
      name: input.name,
      description: input.description || '',
      createdAt: now,
      updatedAt: now,
      snapshot: null,
      customAssets: {},
      isStarred: false,
      starredOrder: null
    }

    const [canvas] = await db('canvases')
      .insert({
        ...newCanvas,
        snapshot: JSON.stringify(newCanvas.snapshot),
        customAssets: JSON.stringify(newCanvas.customAssets)
      })
      .returning('*')

    console.log('后端→ 创建画布成功:', canvas.id)
    return convertToCanvas(canvas)
  } catch (error) {
    console.error('后端→ 创建画布失败:', error)
    throw error
  }
}

// 获取单个画布
export async function getCanvas(id: string): Promise<Canvas | null> {
  try {
    const canvas = await db('canvases').where('id', id).first()
    return canvas ? convertToCanvas(canvas) : null
  } catch (error) {
    console.error('后端→ 获取画布失败:', error)
    throw error
  }
}

// 获取所有画布
export async function getAllCanvases(): Promise<Canvas[]> {
  try {
    const canvases = await db('canvases').orderBy('updatedAt', 'desc')
    return canvases.map(convertToCanvas)
  } catch (error) {
    console.error('后端→ 获取所有画布失败:', error)
    throw error
  }
}

// 更新画布
export async function updateCanvas(id: string, input: UpdateCanvasInput): Promise<Canvas> {
  try {
    const updateData: any = {
      updatedAt: new Date()
    }

    if (input.name !== undefined) updateData.name = input.name
    if (input.description !== undefined) updateData.description = input.description
    if (input.snapshot !== undefined) updateData.snapshot = JSON.stringify(input.snapshot)
    if (input.customAssets !== undefined)
      updateData.customAssets = JSON.stringify(input.customAssets)

    const [canvas] = await db('canvases').where('id', id).update(updateData).returning('*')

    if (!canvas) {
      throw new Error(`Canvas with id ${id} not found`)
    }

    return convertToCanvas(canvas)
  } catch (error) {
    console.error('后端→ 更新画布失败:', error)
    throw error
  }
}

// 删除画布
export async function deleteCanvas(id: string): Promise<boolean> {
  try {
    const deleted = await db('canvases').where('id', id).delete()
    return deleted > 0
  } catch (error) {
    console.error('后端→ 删除画布失败:', error)
    throw error
  }
}

// 添加资产到画布
// 添加资产到画布
export async function addAssetToCanvas(canvasId: string, asset: CanvasAsset): Promise<Canvas> {
  try {
    const canvas = await getCanvas(canvasId)
    if (!canvas) {
      throw new Error(`Canvas with id ${canvasId} not found`)
    }

    const customAssets = {
      ...canvas.customAssets,
      [asset.id]: asset
    }

    return await updateCanvas(canvasId, {
      customAssets
    })
  } catch (error) {
    console.error('后端→ 添加资产到画布失败:', error)
    throw error
  }
}

// 从画布移除资产
export async function removeAssetFromCanvas(canvasId: string, assetId: string): Promise<Canvas> {
  try {
    const canvas = await getCanvas(canvasId)
    if (!canvas) {
      throw new Error(`Canvas with id ${canvasId} not found`)
    }

    const customAssets = { ...canvas.customAssets }
    delete customAssets[assetId]

    return await updateCanvas(canvasId, {
      customAssets
    })
  } catch (error) {
    console.error('后端→ 从画布移除资产失败:', error)
    throw error
  }
}

// 更新画布的收藏状态
export async function updateCanvasStarred(
  id: string,
  isStarred: boolean,
  starredOrder?: number
): Promise<Canvas> {
  try {
    const updateData: any = {
      isStarred,
      updatedAt: new Date()
    }

    if (starredOrder !== undefined) {
      updateData.starredOrder = starredOrder
    }

    const [canvas] = await db('canvases').where('id', id).update(updateData).returning('*')

    return convertToCanvas(canvas)
  } catch (error) {
    console.error('后端→ 更新画布收藏状态失败:', error)
    throw error
  }
}
