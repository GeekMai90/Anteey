import { ipcMain } from 'electron'
import { CreateWhiteboardInput, CreateWhiteboardNoteInput } from '../../renderer/src/types/Note'
import {
  createWhiteboard,
  getTopLevelWhiteboards,
  updateWhiteboardPosition,
  createWhiteboardNote,
  createRootWhiteboard,
  getRootWhiteboard,
  saveViewStateToRootWhiteboard,
  getRootWhiteboardViewState,
  saveViewStateToWhiteboard,
  getWhiteboardViewState,
  getCardCount,
  getWhiteboardNotes,
  getWhiteboardGroups,
  getWhiteboardSubboards,
  updateWhiteboardNotePosition,
  updateWhiteboardNoteSize,
  deleteWhiteboardNote,
  updateWhiteboardNoteAutoHeight,
  updateWhiteboardName,
  deleteWhiteboard,
  getWhiteboardCount,
  createWhiteboardTextCard,
  getWhiteboardTextCards,
  updateWhiteboardTextCard,
  deleteWhiteboardTextCard,
  updateTextCardsZIndex
} from '../../services/notes/whiteboards'

export function setupWhiteboardHandlers() {
  // 获取白板数量
  ipcMain.handle('get-whiteboard-count', async () => {
    try {
      const result = await getWhiteboardCount()
      return result
    } catch (error) {
      console.error('主进程 → 获取白板数量失败:', error)
      throw error
    }
  })
  // 删除白板
  ipcMain.handle('delete-whiteboard', async (_, id: string) => {
    try {
      const result = await deleteWhiteboard(id)
      return result
    } catch (error) {
      console.error('主进程 → 删除白板时出错:', error)
      return { success: false, error: error as string }
    }
  })
  // 更新白板名称
  ipcMain.handle('update-whiteboard-name', async (_, id: string, name: string) => {
    try {
      const updatedWhiteboard = await updateWhiteboardName(id, name)
      return updatedWhiteboard
    } catch (error) {
      console.error('主进程 → 更新白板名称时出错:', error)
      return { success: false, error: error }
    }
  })
  // 更新白板笔记的自动高度
  ipcMain.handle(
    'update-whiteboard-note-auto-height',
    async (_, id: string, isAutoHeight: boolean) => {
      try {
        const updatedWhiteboardNote = await updateWhiteboardNoteAutoHeight(id, isAutoHeight)
        return updatedWhiteboardNote
      } catch (error) {
        console.error('主进程 → 更新白板笔记自动高度时出错:', error)
        return { success: false, error: error }
      }
    }
  )
  // 删除白板笔记
  ipcMain.handle('delete-whiteboard-note', async (_, id: string) => {
    try {
      console.log('主进程 → 删除白板笔记:', id)
      await deleteWhiteboardNote(id)
      console.log('主进程 → 删除白板笔记成功:', id)
      return { success: true }
    } catch (error) {
      console.error('主进程 → 删除白板笔记时出错:', error)
      return { success: false, error: error }
    }
  })
  // 更新白板笔记的大小
  ipcMain.handle('update-whiteboard-note-size', async (_, { id, width, height }) => {
    try {
      const updatedWhiteboardNote = await updateWhiteboardNoteSize(id, width, height)
      return updatedWhiteboardNote
    } catch (error) {
      console.error('主进程 → 更新白板笔记大小时出错:', error)
      return { success: false, error: error }
    }
  })
  // 更新白板笔记的位置
  ipcMain.handle('update-whiteboard-note-position', async (_, { id, x, y }) => {
    try {
      const updatedWhiteboardNote = await updateWhiteboardNotePosition(id, x, y)
      return updatedWhiteboardNote
    } catch (error) {
      console.error('主进程 → 更新白板笔记位置时出错:', error)
      return { success: false, error: error }
    }
  })
  // 获取白板中的所有白板
  ipcMain.handle('get-whiteboard-subboards', async (_, { whiteboardId }) => {
    try {
      const whiteboardSubboards = await getWhiteboardSubboards(whiteboardId)
      return whiteboardSubboards
    } catch (error) {
      console.error('主进程 → 获取白板中的白板时出错:', error)
      return { success: false, error: error }
    }
  })
  // 获取白板中的所有分组
  ipcMain.handle('get-whiteboard-groups', async (_, { whiteboardId }) => {
    try {
      const whiteboardGroups = await getWhiteboardGroups(whiteboardId)
      return whiteboardGroups
    } catch (error) {
      console.error('主进程 → 获取白板中的分组时出错:', error)
      return { success: false, error: error }
    }
  })
  // 获取白板中的所有白板笔记
  ipcMain.handle('get-whiteboard-notes', async (_, { whiteboardId }) => {
    try {
      const whiteboardNotes = await getWhiteboardNotes(whiteboardId)
      return whiteboardNotes
    } catch (error) {
      console.error('主进程 → 获取白板中的笔记时出错:', error)
      return { success: false, error: error }
    }
  })
  // 获取白板中的卡片数量
  ipcMain.handle('get-card-count', async (_, { whiteboardId }) => {
    try {
      const cardCount = await getCardCount(whiteboardId)
      return cardCount
    } catch (error) {
      console.error('主进程 → 获取白板中的卡片数量时出错:', error)
      return { success: false, error: error }
    }
  })

  //获取白板视图状态
  ipcMain.handle('get-whiteboard-view-state', async (_, { whiteboardId }) => {
    try {
      console.log('主进程 → 获取白板视图状态:', whiteboardId)
      const viewState = await getWhiteboardViewState(whiteboardId)
      console.log('主进程 → 获取白板视图状态成功:', viewState)
      return viewState
    } catch (error) {
      console.error('主进程 → 获取白板视图状态时出错:', error)
      return { success: false, error: error }
    }
  })
  //保存视图状态到白板
  ipcMain.handle(
    'save-view-state-to-whiteboard',
    async (_, { whiteboardId, scale, translateX, translateY }) => {
      try {
        console.log('主进程 → 保存视图状态到白板:', { whiteboardId, scale, translateX, translateY })
        const result = await saveViewStateToWhiteboard(whiteboardId, scale, translateX, translateY)
        console.log('主进程 → 保存视图状态到白板成功:', result)
        return result
      } catch (error) {
        console.error('主进程 → 保存视图状态到白板时出错:', error)
        return { success: false, error: error }
      }
    }
  )
  // 获取根白板的视图状态
  ipcMain.handle('get-root-whiteboard-view-state', async () => {
    try {
      console.log('主进程 → 获取根白板的视图状态')
      const viewState = await getRootWhiteboardViewState()
      console.log('主进程 → 获取根白板的视图状态成功:', viewState)
      return viewState
    } catch (error) {
      console.error('主进程 → 获取根白板的视图状态时出错:', error)
      return { success: false, error: error }
    }
  })

  // 保存视图状态到根白板
  ipcMain.handle(
    'save-view-state-to-root-whiteboard',
    async (_, { scale, translateX, translateY }) => {
      try {
        console.log('主进程 → 保存视图状态到根白板:', { scale, translateX, translateY })
        const result = await saveViewStateToRootWhiteboard(scale, translateX, translateY)
        console.log('主进程 → 保存视图状态到根白板成功:', result)
        return result
      } catch (error) {
        console.error('主进程 → 保存视图状态到根白板时出错:', error)
        return { success: false, error: error }
      }
    }
  )
  // 获取根白板
  ipcMain.handle('get-root-whiteboard', async () => {
    try {
      console.log('主进程 → 获取根白板')
      const rootWhiteboard = await getRootWhiteboard()
      console.log('主进程 → 获取根白板成功:', rootWhiteboard)
      return rootWhiteboard
    } catch (error) {
      console.error('主进程 → 获取根白板时出错:', error)
      return { success: false, error: error }
    }
  })
  // 创建根白板
  ipcMain.handle('create-root-whiteboard', async () => {
    try {
      console.log('主进程 → 创建根白板')
      const newRootWhiteboard = await createRootWhiteboard()
      console.log('主进程 → 创建根白板成功:', newRootWhiteboard)
      return newRootWhiteboard
    } catch (error) {
      console.error('主进程 → 创建根白板时出错:', error)
      return { success: false, error: error }
    }
  })
  // 创建白板笔记
  ipcMain.handle('create-whiteboard-note', async (_, input: CreateWhiteboardNoteInput) => {
    try {
      console.log('主进程 → 创建白板笔记:', input)
      const newWhiteboardNote = await createWhiteboardNote(input)
      console.log('主进程 → 创建白板笔记成功:', newWhiteboardNote)
      return newWhiteboardNote
    } catch (error) {
      console.error('主进程 → 创建白板笔记时出错:', error)
      return { success: false, error: error }
    }
  })
  // 更新白板位置
  ipcMain.handle('update-whiteboard-position', async (_, { id, x, y }) => {
    try {
      console.log('主进程 → 更新白板位置:', { id, x, y })
      const updatedWhiteboard = await updateWhiteboardPosition(id, x, y)
      console.log('主进程 → 更新白板位置成功:', updatedWhiteboard)
      return updatedWhiteboard
    } catch (error) {
      console.error('主进程 → 更新白板位置时出错:', error)
      return { success: false, error: error }
    }
  })
  // 获取所有顶层白板
  ipcMain.handle('get-top-level-whiteboards', async () => {
    try {
      console.log('主进程 → 获取顶层白板')
      const whiteboards = await getTopLevelWhiteboards()
      console.log('主进程 → 获取顶层白板成功:', whiteboards)
      return whiteboards
    } catch (error) {
      console.error('主进程 → 获取顶层白板时出错:', error)
      return { success: false, error: error }
    }
  })
  // 创建白板
  ipcMain.handle('create-whiteboard', async (_, input: CreateWhiteboardInput) => {
    try {
      console.log('主进程 → 创建白板:', input)
      const newWhiteboard = await createWhiteboard(input)
      console.log('主进程 → 创建白板成功:', newWhiteboard)
      return newWhiteboard
    } catch (error) {
      console.error('主进程 → 创建白板时出错:', error)
      return { success: false, error: error }
    }
  })
  // 创建文本卡片
  ipcMain.handle('create-whiteboard-text-card', async (_, input) => {
    try {
      console.log('主进程 → 创建文本卡片:', input)
      const newTextCard = await createWhiteboardTextCard(input)
      console.log('主进程 → 创建文本卡片成功:', newTextCard)
      return newTextCard
    } catch (error) {
      console.error('主进程 → 创建文本卡片时出错:', error)
      return { success: false, error: error }
    }
  })

  // 获取白板的所有文本卡片
  ipcMain.handle('get-whiteboard-text-cards', async (_, whiteboardId) => {
    try {
      console.log('主进程 → 获取白板文本卡片:', whiteboardId)
      const textCards = await getWhiteboardTextCards(whiteboardId)
      console.log('主进程 → 获取白板文本卡片成功:', textCards)
      return textCards
    } catch (error) {
      console.error('主进程 → 获取白板文本卡片时出错:', error)
      return { success: false, error: error }
    }
  })

  // 更新文本卡片
  ipcMain.handle('update-whiteboard-text-card', async (_, id, updates) => {
    try {
      console.log('主进程 → 更新文本卡片:', id, updates)
      const updatedCard = await updateWhiteboardTextCard(id, updates)
      console.log('主进程 → 更新文本卡片成功:', updatedCard)
      return updatedCard
    } catch (error) {
      console.error('主进程 → 更新文本卡片时出错:', error)
      return { success: false, error: error }
    }
  })

  // 删除文本卡片
  ipcMain.handle('delete-whiteboard-text-card', async (_, id) => {
    try {
      console.log('主进程 → 删除文本卡片:', id)
      const result = await deleteWhiteboardTextCard(id)
      console.log('主进程 → 删除文本卡片成功:', result)
      return { success: true }
    } catch (error) {
      console.error('主进程 → 删除文本卡片时出错:', error)
      return { success: false, error: error }
    }
  })

  // 批量更新文本卡片的 zIndex
  ipcMain.handle('update-text-cards-zindex', async (_, updates) => {
    try {
      console.log('主进程 → 批量更新文本卡片 zIndex:', updates)
      const result = await updateTextCardsZIndex(updates)
      console.log('主进程 → 批量更新文本卡片 zIndex 成功:', result)
      return { success: true }
    } catch (error) {
      console.error('主进程 → 批量更新文本卡片 zIndex 时出错:', error)
      return { success: false, error: error }
    }
  })
}
