// src/main/index.ts
import { app, shell, BrowserWindow, ipcMain, Menu, MenuItemConstructorOptions } from 'electron'
import { join } from 'path'
import path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from '../db/init'
import {
  createNote,
  getNoteById,
  updateNote,
  getAllNotes,
  softDeleteNote,
  restoreNote,
  getDeletedNotes,
  permanentDeleteNote,
  updateNoteContent,
  updateNoteCardBox,
  getStarredNotes,
  addStarToNote,
  updateStarredNotesOrder,
  removeStarFromNote
} from '../db/notes'
import { createCardBox, getAllCardBoxes, updateCardBox, deleteCardBox } from '../db/cardBoxes'
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
  updateWhiteboardName
} from '../db/whiteboards'
import {
  createConnection,
  updateConnection,
  getConnectionsByWhiteboardId,
  deleteConnection,
  updateConnectionDescription
} from '../db/connections'
import {
  ConnectionCreateData,
  ConnectionUpdateData,
  CreateWhiteboardInput,
  CreateWhiteboardNoteInput
} from '../renderer/src/types/Note'
import { db, dbPath } from '../db/config'
import log from 'electron-log'
// import { runMigrations } from '../db/migrations/migrations'
import * as dotenv from 'dotenv'
import { default as installExtension, VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
// import { CardBox } from '@renderer/types/Note'
// 设置应用名称
app.name = 'Antinet'
// 加载 .env 文件
dotenv.config({ path: path.join(__dirname, '../../.env') })

// 设置日志
log.transports.file.level = 'info'
log.info('应用启动')

// 错误处理
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

function createCustomMenu() {
  const template = [
    {
      label: 'Antinet',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Note',
          click: () => {
            /* 实现新建笔记的逻辑 */
          }
        },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://your-website.com')
          }
        }
      ]
    }
  ] as MenuItemConstructorOptions[]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function setupIpcHandlers() {
  // 更新笔记内容
  ipcMain.handle('update-note-content', async (_, id: string, content: any) => {
    try {
      const updatedNote = await updateNoteContent(id, content)
      return updatedNote
    } catch (error) {
      console.error('主进程 → 更新笔记内容时出错:', error)
      return { success: false, error: error }
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

  // 更新连线描述
  ipcMain.handle('update-connection-description', async (_, id: string, description: string) => {
    try {
      console.log('主进程 → 更新连线描述:', id, description)
      const updatedConnection = await updateConnectionDescription(id, description)
      return { success: true, connection: updatedConnection }
    } catch (error) {
      console.error('主进程 → 更新连线描述时出错:', error)
      return { success: false, error: error }
    }
  })
  // 创建连线
  ipcMain.handle('create-connection', async (_, connection: ConnectionCreateData) => {
    try {
      const newConnection = await createConnection(connection)
      return newConnection
    } catch (error) {
      console.error('主进程 → 创建连线时出错:', error)
      return { success: false, error: error }
    }
  })
  // 更新连线
  ipcMain.handle('update-connection', async (_, connection: ConnectionUpdateData) => {
    try {
      const updatedConnection = await updateConnection(connection)
      return updatedConnection
    } catch (error) {
      console.error('主进程 → 更新连线时出错:', error)
      return { success: false, error: error }
    }
  })
  // 获取白板中的所有连线
  ipcMain.handle('get-connections-by-whiteboard-id', async (_, { whiteboardId }) => {
    try {
      const connections = await getConnectionsByWhiteboardId(whiteboardId)
      return connections
    } catch (error) {
      console.error('主进程 → 获取白板中的连线时出错:', error)
      return { success: false, error: error }
    }
  })
  //删除连线
  ipcMain.handle('delete-connection', async (_, id: string) => {
    console.log('主进程 → 正在删除连线:', id)
    try {
      await deleteConnection(id)
      console.log('主进程 → 删除连线成功:', id)
      return { success: true }
    } catch (error) {
      console.error('主进程 → 删除连线时出错:', error)
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

  // 创建笔记
  ipcMain.handle('create-note', async () => {
    try {
      console.log('主进程→ 创建笔记')
      // 检查 notes 表是否存在
      const hasNotesTable = await db.schema.hasTable('notes')
      if (!hasNotesTable) {
        throw new Error('notes 表不存在，数据库可能未正确初始化')
      }

      const newNote = await createNote()
      return newNote
    } catch (error) {
      console.error('主进程→ 创建笔记失败:', error)
      throw error
    }
  })

  // 获取单个笔记
  ipcMain.handle('get-note', async (_, id: string) => {
    try {
      const note = await getNoteById(id)
      return note
    } catch (error) {
      console.error('主进程→ 获取笔记失败:', error)
      throw error
    }
  })
  // 获取所有笔记
  ipcMain.handle('get-all-notes', async (_event, includeDeleted: boolean) => {
    try {
      const notes = await getAllNotes(includeDeleted)
      return notes
    } catch (error) {
      console.error('Error in get-all-notes handler:', error)
      throw error
    }
  })

  // 更新笔记
  ipcMain.handle('update-note', async (_event, { id, updateData }) => {
    console.log('主进程 → 收到更新笔记请求:', { id, updateData })

    try {
      // 数据验证
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid note ID')
      }

      if (!updateData || typeof updateData !== 'object') {
        throw new Error('Invalid update data')
      }

      // 调用服务方法更新笔记
      const updatedNote = await updateNote(id, updateData)

      console.log('主进程 → 笔记更新成功:', updatedNote)
      return { success: true, note: updatedNote }
    } catch (error) {
      console.error('主进程 → 更新笔记时出错:', error)
      return { success: false, error: error }
    }
  })

  // 软删除笔记
  ipcMain.handle('soft-delete-note', async (_event, id: string) => {
    try {
      const updatedNote = await softDeleteNote(id)
      console.log('主进程 → 软删除笔记更新后的笔记:', JSON.stringify(updatedNote))
      return { success: true, note: updatedNote }
    } catch (error) {
      console.error('主进程 → 软删除笔记时出错:', error)
      return { success: false, error: error }
    }
  })

  // 恢复已删除的笔记
  ipcMain.handle('restore-note', async (_event, id: string) => {
    try {
      await restoreNote(id)
      return { success: true }
      console.log('主进程 → 恢复已删除的笔记成功')
    } catch (error) {
      console.error('主进程 → 恢复已删除的笔记时出错:', error)
      return { success: false, error: error }
    }
  })

  // 获取所有已删除的笔记
  ipcMain.handle('get-deleted-notes', async () => {
    try {
      const deletedNotes = await getDeletedNotes()
      return deletedNotes
    } catch (error) {
      console.error('主进程 → 获取已删除的笔记时出错:', error)
      return { success: false, error: error }
    }
  })

  // 永久删除笔记
  ipcMain.handle('permanent-delete-note', async (_event, id: string) => {
    try {
      await permanentDeleteNote(id)
      return { success: true }
      console.log('主进程 → 永久删除笔记成功', id)
    } catch (error) {
      console.error('主进程 → 永久删除笔记时出错:', error)
      return { success: false, error: error }
    }
  })

  // 创建卡片盒
  ipcMain.handle('create-card-box', async (_event, name: string) => {
    try {
      const newCardBox = await createCardBox(name)
      return newCardBox
    } catch (error) {
      console.error('主进程 → 创建卡片盒时出错:', error)
      return { success: false, error: error }
    }
  })

  // 获取所有卡片盒
  ipcMain.handle('get-all-card-boxes', async () => {
    try {
      const cardBoxes = await getAllCardBoxes()
      console.log('主进程 → 获取所有卡片盒:', cardBoxes)
      return cardBoxes
    } catch (error) {
      console.error('主进程 → 获取所有卡片盒时出错:', error)
      return { success: false, error: error }
    }
  })

  // 更新卡片盒
  ipcMain.handle('update-card-box', async (_event, { id, name }) => {
    try {
      const updatedCardBox = await updateCardBox(id, name)
      return updatedCardBox
    } catch (error) {
      console.error('主进程 → 更新卡片盒时出错:', error)
      return { success: false, error: error }
    }
  })

  // 删除卡片盒
  ipcMain.handle('delete-card-box', async (_event, id: string) => {
    try {
      await deleteCardBox(id)
      return { success: true }
      console.log('主进程 → 删除卡片盒成功', id)
    } catch (error) {
      console.error('主进程 → 删除卡片盒时出错:', error)
      return { success: false, error: error }
    }
  })

  // 更新笔记的卡片盒
  ipcMain.handle('update-note-card-box', async (_event, noteId: string, cardBoxId: string) => {
    try {
      const updatedNote = await updateNoteCardBox(noteId, cardBoxId)
      return updatedNote
    } catch (error) {
      console.error('主进程 → 更新笔记的卡片盒时出错:', error)
      return { success: false, error: error }
    }
  })

  // 添加星标收藏
  ipcMain.handle('add-star-to-note', async (_event, id: string) => {
    try {
      const updatedNote = await addStarToNote(id)
      console.log('主进程 → 添加星标收藏成功:', updatedNote)
      return updatedNote
    } catch (error) {
      console.error('主进程 → 添加星标收藏时出错:', error)
      return { success: false, error: error }
    }
  })

  // 移除星标收藏
  ipcMain.handle('remove-star-from-note', async (_event, id: string) => {
    try {
      const result = await removeStarFromNote(id)
      console.log('主进程 → 移除星标收藏成功:', result)
      return result
    } catch (error) {
      console.error('主进程 → 移除星标收藏时出错:', error)
      return { success: false, error: error }
    }
  })

  // 获取收藏的笔记
  ipcMain.handle('get-starred-notes', async () => {
    try {
      const starredNotes = await getStarredNotes()
      return starredNotes
    } catch (error) {
      console.error('主进程 → 获取收藏的笔记时出错:', error)
      return { success: false, error: error }
    }
  })

  // 更新收藏笔记的顺序
  ipcMain.handle(
    'update-starred-notes-order',
    async (_event, orders: { id: string; starredOrder: number }[]) => {
      try {
        console.log('主进程 → 更新收藏笔记顺序，原来的:', orders)
        const updatedNotes = await updateStarredNotesOrder(orders)
        console.log('主进程 → 更新收藏笔记顺序，更新后的:', updatedNotes)
        return updatedNotes
      } catch (error) {
        console.error('主进程 → 更新收藏笔记顺序时出错:', error)
        return { success: false, error: error }
      }
    }
  )
}

function createWindow(): void {
  log.info('Creating main window')
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset', // 使用 hiddenInset 来保留控制按钮但隐藏标题栏
    trafficLightPosition: { x: 12, y: 12 }, // 可选：调整控制按钮的位置
    ...(process.platform === 'linux' ? {} : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true // 确保开发工具可用
    }
  })
  mainWindow.maximize()

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  } else {
    // 开发环境下的加载逻辑
    const devServerUrl = process.env.VITE_DEV_SERVER_URL
    if (devServerUrl) {
      mainWindow.loadURL(devServerUrl)
    } else {
      console.error('VITE_DEV_SERVER_URL 未定义')
      log.error('VITE_DEV_SERVER_URL 未定义')
      // 可以加载一个默认页面或执行其他逻辑
      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
    }
  }

  // 添加这个事件监听器
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      if (window.location.hash === '' || window.location.hash === '#/') {
        window.location.hash = '#/home';
      }
    `)
  })

  // 处理 HTML5 History 模式的路由
  // mainWindow.webContents.on('will-navigate', (event, url) => {
  //   if (!url.startsWith('http://localhost') && !url.startsWith('https://localhost')) {
  //     event.preventDefault()
  //     mainWindow.loadURL(`http://localhost:${process.env.PORT}${url}`)
  //   }
  // })

  // 在加载 URL 之前就创建并显示窗口
  mainWindow.webContents.on('did-finish-load', () => {
    log.info('Window did-finish-load event triggered')
    mainWindow.webContents.executeJavaScript(`
      console.log('Current pathname:', window.location.pathname);
      if (window.location.pathname === '/' || window.location.pathname === '') {
        console.log('Redirecting to /home');
        window.history.pushState(null, '', '/home');
        if (window.dispatchEvent) {
          window.dispatchEvent(new Event('popstate'));
        }
      }
    `)
  })

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    log.info('Main window shown')
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 在加载 URL 之前就创建并显示窗口
  mainWindow.show()

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // // 添加这部分代码
  // mainWindow.webContents.on('did-finish-load', () => {
  //   mainWindow.webContents.executeJavaScript('window.location.hash = "/home"')
  // })

  log.info('Main window created and loaded')
}

app.whenReady().then(async () => {
  try {
    console.log(`Electron 版本: ${process.versions.electron}`)
    console.log(`Node.js 版本: ${process.versions.node}`)
    console.log(`Chrome 版本: ${process.versions.chrome}`)
    log.info(`Electron 版本: ${process.versions.electron}`)
    log.info(`Node.js 版本: ${process.versions.node}`)
    log.info(`Chrome 版本: ${process.versions.chrome}`)

    // 安装 Vue 3 Devtools
    installExtension(VUEJS3_DEVTOOLS)
      .then((name) => console.log(`Added Extension:  ${name}`))
      .catch((err) => console.log('An error occurred: ', err))

    // 初始化数据库
    await initDatabase(db)
    console.log('主进程→ 数据库初始化成功')
    console.log('数据库路径:', db.client.connectionSettings.filename)
    log.info('主进程→ 数据库初始化成功')
    log.info('数据库路径:', dbPath)

    // 验证表是否创建成功
    const hasNotesTable = await db.schema.hasTable('notes')
    console.log('notes 表是否存在:', hasNotesTable)
    log.info('notes 表是否存在:', hasNotesTable)

    electronApp.setAppUserModelId('com.electron')

    ipcMain.handle('get-resource-path', (_event, filename) => {
      return path.join(app.getAppPath(), 'resources', filename)
    })

    // 设置 IPC 处理程序
    setupIpcHandlers()

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    ipcMain.on('window-click', (event) => {
      // 将点击事件广播到所有窗口
      BrowserWindow.getAllWindows().forEach((win) => {
        if (win.webContents !== event.sender) {
          win.webContents.send('global-click')
        }
      })
    })

    // 创建自定义菜单
    createCustomMenu()

    createWindow()

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
    log.info('应用初始化完成')
  } catch (error) {
    console.error('主进程→ 应用初始化失败:', error)
    log.error('主进程→ 应用初始化失败:', error)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
