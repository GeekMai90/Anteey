import { db } from './config'
import { v4 as uuidv4 } from 'uuid'
import type { ExcalidrawDocument, ExcalidrawElement } from '../renderer/src/types/Note'
import type { AppState } from '@excalidraw/excalidraw/types/types'

// 辅助函数：将数据库记录转换为 ExcalidrawDocument 对象
function convertToExcalidrawDocument(record: any): ExcalidrawDocument {
  const elements = JSON.parse(record.elements) as ExcalidrawElement[]
  const appState = JSON.parse(record.appState) as Partial<AppState>

  return {
    id: record.id,
    noteId: record.noteId,
    elements,
    appState,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  }
}

// 创建 Excalidraw 文档
export async function createExcalidrawDocument(
  noteId: string,
  data: Partial<ExcalidrawDocument>
): Promise<ExcalidrawDocument> {
  try {
    console.log('后端→ 开始创建 Excalidraw 文档')

    const newDocument = {
      id: uuidv4(),
      noteId,
      elements: JSON.stringify(data.elements || []),
      appState: JSON.stringify(
        data.appState || {
          gridSize: null,
          viewBackgroundColor: '#ffffff'
        }
      ),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const [created] = await db('excalidraw_documents').insert(newDocument).returning('*')

    console.log('后端→ Excalidraw 文档创建成功:', created.id)
    return convertToExcalidrawDocument(created)
  } catch (error) {
    console.error('后端→ 创建 Excalidraw 文档失败:', error)
    throw error
  }
}

// 获取 Excalidraw 文档
export async function getExcalidrawDocument(id: string): Promise<ExcalidrawDocument | null> {
  try {
    console.log('后端→ 开始获取 Excalidraw 文档:', id)

    const record = await db('excalidraw_documents').where('id', id).first()

    if (!record) {
      console.log('后端→ Excalidraw 文档不存在:', id)
      return null
    }

    return convertToExcalidrawDocument(record)
  } catch (error) {
    console.error('后端→ 获取 Excalidraw 文档失败:', error)
    throw error
  }
}

// 更新 Excalidraw 文档
export async function updateExcalidrawDocument(
  id: string,
  data: Partial<ExcalidrawDocument>
): Promise<ExcalidrawDocument> {
  try {
    console.log('后端→ 开始更新 Excalidraw 文档:', id)

    const updateData: any = {
      updatedAt: new Date()
    }

    if (data.elements) {
      updateData.elements = JSON.stringify(data.elements)
    }
    if (data.appState) {
      updateData.appState = JSON.stringify(data.appState)
    }

    const [updated] = await db('excalidraw_documents')
      .where('id', id)
      .update(updateData)
      .returning('*')

    if (!updated) {
      throw new Error(`Excalidraw document with ID "${id}" not found`)
    }

    console.log('后端→ Excalidraw 文档更新成功:', id)
    return convertToExcalidrawDocument(updated)
  } catch (error) {
    console.error('后端→ 更新 Excalidraw 文档失败:', error)
    throw error
  }
}

// 删除 Excalidraw 文档
export async function deleteExcalidrawDocument(id: string): Promise<void> {
  try {
    console.log('后端→ 开始删除 Excalidraw 文档:', id)

    const deleted = await db('excalidraw_documents').where('id', id).delete()

    if (!deleted) {
      throw new Error(`Excalidraw document with ID "${id}" not found`)
    }

    console.log('后端→ Excalidraw 文档删除成功:', id)
  } catch (error) {
    console.error('后端→ 删除 Excalidraw 文档失败:', error)
    throw error
  }
}

// 获取笔记的所有 Excalidraw 文档
export async function getNoteExcalidrawDocuments(noteId: string): Promise<ExcalidrawDocument[]> {
  try {
    console.log('后端→ 开始获取笔记的 Excalidraw 文档:', noteId)

    const records = await db('excalidraw_documents')
      .where('noteId', noteId)
      .orderBy('updatedAt', 'desc')

    return records.map(convertToExcalidrawDocument)
  } catch (error) {
    console.error('后端→ 获取笔记的 Excalidraw 文档失败:', error)
    throw error
  }
}
