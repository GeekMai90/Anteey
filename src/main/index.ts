// src/main/index.ts
import { app, shell, BrowserWindow, ipcMain, Menu, MenuItemConstructorOptions } from 'electron'
import { join } from 'path'
import path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from '../db/init'
import { Note } from '../renderer/src/types/Note'
import { createNote, getNoteById, updateNote, getAllNotes } from '../db/notes'
import { db } from '../db/config'
// 设置应用名称
app.name = 'Antinet'

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
  ipcMain.handle('get-all-notes', async (event, includeDeleted: boolean) => {
    try {
      const notes = await getAllNotes(includeDeleted)
      return notes
    } catch (error) {
      console.error('Error in get-all-notes handler:', error)
      throw error
    }
  })

  // 更新笔记
  // ipcMain.handle('update-note', async (_, id: string, updatedNote: Partial<Note>) => {
  //   try {
  //     console.log('主进程→ 开始更新笔记:', id)
  //     const result = await updateNote(id, updatedNote)
  //     console.log('主进程→ 笔记更新成功:', id)
  //     return result
  //   } catch (error) {
  //     console.error('主进程→ 更新笔记失败:', error)
  //     if (error instanceof Error) {
  //       throw new Error(`Failed to update note: ${error.message}`)
  //     } else {
  //       throw new Error('Failed to update note: Unknown error')
  //     }
  //   }
  // })
  // ipcMain.handle('update-note', async (event, id: string, changes: Partial<Note>) => {
  //   try {
  //     const now = new Date()
  //     const noteToUpdate: any = {
  //       ...changes,
  //       updatedAt: now
  //     }

  //     // 序列化 content 字段
  //     if (changes.content) {
  //       noteToUpdate.content = JSON.stringify(changes.content)
  //     }

  //     await db('notes').where('id', id).update(noteToUpdate)

  //     // 获取更新后的笔记
  //     const updatedNoteFromDB = await db('notes').where('id', id).first()

  //     // 反序列化 content 字段
  //     return {
  //       ...updatedNoteFromDB,
  //       content: JSON.parse(updatedNoteFromDB.content)
  //     }
  //   } catch (error) {
  //     console.error('Failed to update note:', error)
  //     throw error
  //   }
  // })
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
}

function createWindow(): void {
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
      nodeIntegration: false
    }
  })
  mainWindow.maximize()

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  try {
    // 初始化数据库
    await initDatabase(db)
    console.log('主进程→ 数据库初始化成功')
    console.log('数据库路径:', db.client.connectionSettings.filename)

    // 验证表是否创建成功
    const hasNotesTable = await db.schema.hasTable('notes')
    console.log('notes 表是否存在:', hasNotesTable)

    electronApp.setAppUserModelId('com.electron')

    // 设置 IPC 处理程序
    setupIpcHandlers()

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    ipcMain.handle('get-resource-path', (_event, filename) => {
      return path.join(app.getAppPath(), 'resources', filename)
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
  } catch (error) {
    console.error('主进程→ 应用初始化失败:', error)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
