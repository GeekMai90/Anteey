import 'reflect-metadata'
import { app, shell, BrowserWindow, ipcMain, Menu, MenuItemConstructorOptions } from 'electron'
import { join } from 'path'
import path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { AppDataSource } from '../database'
import { NotesService } from '../services/NotesService'
import { CardBoxService } from '../services/CardboxService'
import { CardBox } from '../entities/CardBox'

let notesService: NotesService
let cardBoxService: CardBoxService

// 设置应用名称
app.name = 'Antinet'

AppDataSource.initialize()
  .then(() => {
    console.log('数据源已初始化!')
    notesService = new NotesService(AppDataSource)
    cardBoxService = new CardBoxService(AppDataSource)
  })
  .catch((err) => {
    console.error('数据源初始化过程中出错', err)
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

  // mainWindow.webContents.on('did-finish-load', () => {
  //   mainWindow.webContents.on('click', (event) => {
  //     mainWindow.webContents.send('global-click', event)
  //   })
  // })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('get-resource-path', (_event, filename) => {
    return path.join(app.getAppPath(), 'resources', filename)
  })

  // Notes 相关的 IPC 处理程序
  ipcMain.handle('get-notes', async (_, includeDeleted: boolean) => {
    try {
      return await notesService.findAll(includeDeleted)
    } catch (error) {
      console.error('Error in get-notes:', error)
      throw error
    }
  })

  ipcMain.handle('get-note', async (_, id: string) => {
    try {
      return await notesService.findOne(id)
    } catch (error) {
      console.error('Error in get-note:', error)
      throw error
    }
  })

  ipcMain.handle('create-note', async () => {
    try {
      return await notesService.createNewNote()
    } catch (error) {
      console.error('创建笔记时出错:', error)
      throw error
    }
  })

  // ipcMain.handle('update-note', async (event, id, noteData) => {
  //   console.log('Main process: update-note called with:', id, JSON.stringify(noteData))
  //   try {
  //     // 确保 noteData 是一个普通对象
  //     const sanitizedNoteData = JSON.parse(JSON.stringify(noteData))
  //     const updatedNote = await notesService.update(id, sanitizedNoteData)
  //     console.log('Note updated:', JSON.stringify(updatedNote))
  //     return updatedNote
  //   } catch (error) {
  //     console.error('Error updating note in main process:', error)
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
      const updatedNote = await notesService.update(id, updateData)

      console.log('主进程 → 笔记更新成功:', updatedNote)
      return { success: true, note: updatedNote }
    } catch (error) {
      console.error('主进程 → 更新笔记时出错:', error)
      return { success: false, error: error }
    }
  })

  ipcMain.handle('remove-note', async (_, id: string) => {
    try {
      await notesService.remove(id)
      return { success: true }
    } catch (error) {
      console.error('Error in remove-note:', error)
      throw error
    }
  })

  ipcMain.handle('add-link', async (_, sourceNoteId: string, targetNoteId: string) => {
    try {
      await notesService.addLink(sourceNoteId, targetNoteId)
      return { success: true }
    } catch (error) {
      console.error('Error in add-link:', error)
      throw error
    }
  })

  ipcMain.handle('remove-link', async (_, sourceNoteId: string, targetNoteId: string) => {
    try {
      await notesService.removeLink(sourceNoteId, targetNoteId)
      return { success: true }
    } catch (error) {
      console.error('Error in remove-link:', error)
      throw error
    }
  })

  ipcMain.handle('get-linked-notes', async (_, noteId: string) => {
    try {
      return await notesService.getLinkedNotes(noteId)
    } catch (error) {
      console.error('Error in get-linked-notes:', error)
      throw error
    }
  })

  ipcMain.handle('get-backlinks', async (_, noteId: string) => {
    try {
      return await notesService.getBacklinks(noteId)
    } catch (error) {
      console.error('Error in get-backlinks:', error)
      throw error
    }
  })

  ipcMain.handle('update-note-card-box', async (_event, noteId, newCardBoxId) => {
    try {
      const updatedNote = await notesService.updateNoteCardBox(noteId, newCardBoxId)
      return { success: true, note: updatedNote }
    } catch (error) {
      console.error('Error updating note card box:', error)
      return { success: false, error: error }
    }
  })
  ipcMain.handle('get-notes-in-card-box', async (_event, cardBoxId: string) => {
    try {
      const notes = await notesService.getNotesInCardBox(cardBoxId)
      return notes
    } catch (error) {
      console.error('Error getting notes in card box:', error)
      throw error
    }
  })

  ipcMain.handle('toggle-deleted-status', async (_, id: string) => {
    try {
      return await notesService.toggleDeletedStatus(id)
    } catch (error) {
      console.error('Error in toggle-deleted-status:', error)
      throw error
    }
  })

  ipcMain.handle('toggle-starred-status', async (_, id: string) => {
    try {
      return await notesService.toggleStarredStatus(id)
    } catch (error) {
      console.error('Error in toggle-starred-status:', error)
      throw error
    }
  })

  ipcMain.handle('get-starred-notes', async () => {
    try {
      return await notesService.findStarred()
    } catch (error) {
      console.error('Error in get-starred-notes:', error)
      throw error
    }
  })

  // ipcMain.handle('move-to-trash', async (_, id: string) => {
  //   try {
  //     return await notesService.moveToTrash(id)
  //   } catch (error) {
  //     console.error('Error in move-to-trash:', error)
  //     throw error
  //   }
  // })
  ipcMain.handle('move-to-trash', async (_, id: string) => {
    try {
      const result = await notesService.moveToTrash(id)
      return { success: true, note: result.note }
    } catch (error) {
      console.error('Main process→ move-to-trash 出错:', error)
      return { success: false, error: error }
    }
  })

  ipcMain.handle('restore-from-trash', async (_, id: string) => {
    try {
      return await notesService.restoreFromTrash(id)
    } catch (error) {
      console.error('Error in restore-from-trash:', error)
      throw error
    }
  })

  ipcMain.handle('permanently-delete', async (_, id: string) => {
    try {
      await notesService.permanentlyDelete(id)
      return { success: true }
    } catch (error) {
      console.error('Error in permanently-delete:', error)
      throw error
    }
  })

  ipcMain.handle('get-deleted-notes', async () => {
    try {
      return await notesService.findDeleted()
    } catch (error) {
      console.error('Error in get-deleted-notes:', error)
      throw error
    }
  })

  // CardBox 相关的 IPC 处理程序

  ipcMain.handle('cardbox:findAll', async () => {
    try {
      return await cardBoxService.findAll()
    } catch (error) {
      console.error('获取所有卡片盒时出错:', error)
      throw error
    }
  })

  ipcMain.handle('cardbox:findOne', async (_, id: string) => {
    try {
      return await cardBoxService.findOne(id)
    } catch (error) {
      console.error('获取单个卡片盒时出错:', error)
      throw error
    }
  })

  ipcMain.handle('cardbox:create', async (_, cardBoxData: Partial<CardBox>) => {
    try {
      return await cardBoxService.create(cardBoxData)
    } catch (error) {
      console.error('创建卡片盒时出错:', error)
      throw error
    }
  })

  ipcMain.handle('cardbox:update', async (_, id: string, cardBoxData: Partial<CardBox>) => {
    try {
      return await cardBoxService.update(id, cardBoxData)
    } catch (error) {
      console.error('更新卡片盒时出错:', error)
      throw error
    }
  })

  ipcMain.handle('cardbox:remove', async (_, id: string) => {
    try {
      await cardBoxService.remove(id)
      return { success: true }
    } catch (error) {
      console.error('删除卡片盒时出错:', error)
      throw error
    }
  })

  // ipcMain.handle('cardbox:addNote', async (_, cardBoxId: string, noteId: string) => {
  //   try {
  //     return await cardBoxService.addNoteToCardBox(cardBoxId, noteId)
  //   } catch (error) {
  //     console.error('向卡片盒添加笔记时出错:', error)
  //     throw error
  //   }
  // })

  // ipcMain.handle('cardbox:removeNote', async (_, cardBoxId: string, noteId: string) => {
  //   try {
  //     return await cardBoxService.removeNoteFromCardBox(cardBoxId, noteId)
  //   } catch (error) {
  //     console.error('从卡片盒移除笔记时出错:', error)
  //     throw error
  //   }
  // })

  // ipcMain.handle('cardbox:getNotes', async (_, cardBoxId: string) => {
  //   try {
  //     return await cardBoxService.getNotesInCardBox(cardBoxId)
  //   } catch (error) {
  //     console.error('获取卡片盒中的笔记时出错:', error)
  //     throw error
  //   }
  // })

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
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
