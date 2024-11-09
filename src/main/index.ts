// src/main/index.ts
import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Menu,
  MenuItemConstructorOptions,
  protocol,
  net,
  globalShortcut
} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from '../db/init'
import { db, dbPath } from '../db/config'
import * as dotenv from 'dotenv'
import { default as installExtension, VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { URL } from 'url'
import { initialize, enable } from '@electron/remote/main'
import { setupIpcHandlers } from './ipc'
import log from './logger'
import { SemanticService } from './services/semanticService'
import { getPaths } from './services/constants'

// 添加 IPC 日志转发
ipcMain.on('renderer-log', (_, { level, args }) => {
  ;(log[level as keyof typeof log] as (...args: any[]) => void)('[渲染进程]', ...args)
})

// 错误处理
process.on('uncaughtException', (error) => {
  log.error('未捕获的异常:', error)
})

process.on('unhandledRejection', (reason) => {
  log.error('未处理的 Promise 拒绝:', reason)
})

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
        {
          label: '关于Antinet',
          role: 'about'
        },
        { type: 'separator' },
        { label: '服务', role: 'services' },
        { type: 'separator' },
        { label: '隐藏', role: 'hide' },
        { label: '隐藏其他', role: 'hideOthers' },
        { label: '显示所有', role: 'unhide' },
        { type: 'separator' },
        { label: '退出', role: 'quit' }
      ]
    },
    {
      label: '文件',
      submenu: [
        {
          label: '新笔记',
          accelerator: 'CmdOrCtrl+N', // 添加这一行
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow()
            if (focusedWindow) {
              focusedWindow.webContents.send('menu-new-note')
            }
          }
        },
        {
          label: '导出笔记',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow()
            if (focusedWindow) {
              focusedWindow.webContents.send('menu-export-notes')
            }
          }
        },
        { type: 'separator' },
        {
          label: '关闭',
          role: 'close'
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '删除', role: 'delete' },
        { label: '全选', role: 'selectAll' },
        {
          label: '表情与符号',
          role: 'emoji',
          visible: process.platform === 'darwin'
        }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '强制重新加载', role: 'forceReload' },
        { label: '切换开发者工具', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '重置缩放', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', role: 'minimize' },
        { label: '最大化', role: 'zoom' },
        { type: 'separator' },
        { label: '置顶', role: 'front' },
        { type: 'separator' },
        { label: '窗口', role: 'window' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '官网',
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
      devTools: !app.isPackaged, // 仅在开发环境启用开发者工具
      additionalArguments: ['--disable-site-isolation-trials'],
      webSecurity: false // 警告：这可能带来安全风险，仅在开发环境使用
      // allowRunningInsecureContent: true // 警告：这可能带来安全风险，仅在开发环境使用
    }
  })
  // 启用 remote 模块

  enable(mainWindow.webContents)
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

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          'default-src *; ' +
            "img-src 'self' file: data: blob: https: http: *; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "connect-src 'self' file: https://api.tiptap.dev;" +
            'font-src *'
        ]
      }
    })
  })

  // 在加载 URL 之前就创建并显示窗口
  mainWindow.webContents.on('did-finish-load', () => {
    log.info('Window did-finish-load event triggered')
    mainWindow.webContents.executeJavaScript(`
      if (window.location.pathname === '/' || window.location.pathname === '') {
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

  log.info('Main window created and loaded')
}

async function initializeCacheDirectory() {
  try {
    // 获取应用的用户数据目录
    const userDataPath = app.getPath('userData')
    log.info('用户数据目录:', userDataPath)

    // 创建一个专门的缓存目录
    const cacheDirPath = path.join(userDataPath, 'cache')
    if (!existsSync(cacheDirPath)) {
      await fs.mkdir(cacheDirPath, { recursive: true, mode: 0o777 })
      log.info('创建缓存目录:', cacheDirPath)
    }

    // 设置缓存文件路径
    const cachePath = path.join(cacheDirPath, 'embeddings.cache.json')

    // 如果文件不存在，创建一个空的缓存文件
    if (!existsSync(cachePath)) {
      await fs.writeFile(cachePath, '{}', {
        encoding: 'utf8',
        mode: 0o666
      })
      log.info('创建缓存文件:', cachePath)
    }

    return cachePath
  } catch (error) {
    log.error('缓存初始化失败:', error)
    // 如果出错，使用临时目录作为后备
    const tempPath = path.join(app.getPath('temp'), 'embeddings.cache.json')
    log.info('使用临时缓存路径:', tempPath)
    return tempPath
  }
}

app.whenReady().then(async () => {
  try {
    log.info('应用启动')

    // 1. 初始化基础目录
    const antinetPath = app.getPath('userData')
    const userDataPath = path.join(antinetPath, 'UserData')
    const imagesPath = path.join(userDataPath, 'images')

    // 创建必要的目录
    await fs.mkdir(userDataPath, { recursive: true })
    await fs.mkdir(imagesPath, { recursive: true })

    // 2. 初始化缓存目录
    const cachePath = await initializeCacheDirectory()
    ;(global as any).getCachePath = () => cachePath

    // 确保 FAISS 目录存在
    const faissPath = path.join(cachePath, 'faiss')
    await fs.mkdir(faissPath, { recursive: true })

    log.info('缓存初始化完成:', {
      userDataPath,
      imagesPath,
      cachePath,
      faissPath
    })

    // 3. 初始化语义服务
    log.info('开始初始化语义服务...')
    const semanticService = SemanticService.getInstance()
    await semanticService.initialize()
    log.info('语义服务初始化完成')

    // 4. 初始化基础服务
    initialize() // remote 模块
    await initDatabase(db)
    electronApp.setAppUserModelId('com.electron')

    // 5. 开发环境配置
    if (!app.isPackaged) {
      await installExtension(VUEJS3_DEVTOOLS)
        .then((name) => log.info('已安装扩展:', name))
        .catch((err) => log.error('安装扩展失败:', err))
    }

    // 6. 设置应用功能
    setupIpcHandlers()
    createCustomMenu()

    // 7. 注册协议和事件处理
    protocol.handle('app-image', (request) => {
      const url = new URL(request.url)
      const decodedPath = decodeURIComponent(url.pathname)
      const filePath = path.join(app.getPath('userData'), decodedPath)
      return net.fetch('file://' + filePath)
    })

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    ipcMain.on('window-click', (event) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        if (win.webContents !== event.sender) {
          win.webContents.send('global-click')
        }
      })
    })

    // 8. 创建窗口
    createWindow()

    // 9. 注册快捷键
    globalShortcut.register('CommandOrControl+R', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow()
      if (focusedWindow) focusedWindow.webContents.reload()
    })

    globalShortcut.register('F5', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow()
      if (focusedWindow) focusedWindow.webContents.reload()
    })

    // 10. 注册窗口激活事件
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

    log.info('应用初始化完成')
  } catch (error) {
    log.error('应用初始化失败:', error)
    console.error('应用初始化失败:', error)
  }
})

app.setName('Antinet')

// 修改退出处理
app.on('before-quit', async (event) => {
  event.preventDefault()
  try {
    const semanticService = SemanticService.getInstance()
    if (semanticService.isInitialized) {
      await semanticService.saveFaissIndex()
      log.info('退出前保存 FAISS 索引成功')
    }
  } catch (error) {
    log.error('退出前保存 FAISS 索引失败:', error)
  } finally {
    app.exit()
  }
})

// 窗口关闭时也保存索引
app.on('window-all-closed', async () => {
  try {
    const semanticService = SemanticService.getInstance()
    if (semanticService.isInitialized) {
      await semanticService.saveFaissIndex()
      log.info('窗口关闭前保存 FAISS 索引成功')
    }
  } catch (error) {
    log.error('窗口关闭前保存 FAISS 索引失败:', error)
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})
