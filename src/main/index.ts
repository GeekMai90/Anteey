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
import log from 'electron-log'
import * as dotenv from 'dotenv'
import { default as installExtension, VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { URL } from 'url'
import { initialize, enable } from '@electron/remote/main'
import { setupIpcHandlers } from './ipc'

// 在所有导入之后，但在其他代码之前初始化日志
log.initialize()

// 设置日志级别
log.transports.file.level = 'debug'
log.transports.console.level = 'debug'

// 替换控制台日志方法
console.log = (...args) => log.log(...args)
console.error = (...args) => log.error(...args)
console.warn = (...args) => log.warn(...args)
console.info = (...args) => log.info(...args)

// ... 其他导入和代码 ...

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
      webSecurity: false, // 警告：这可能带来安全风险，仅在开发环境使用
      // allowRunningInsecureContent: true // 警告：这可能带来安全风险，仅在开发环境使用
      // 添加这个配置
      nodeIntegrationInWorker: true,
      // 添加文件系统访问权限
      allowRunningInsecureContent: false
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

  // mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  //   callback({
  //     responseHeaders: {
  //       ...details.responseHeaders,
  //       'Content-Security-Policy': [
  //         "default-src 'self'; " +
  //           "img-src 'self' file: data: blob: https: http: *; " +
  //           "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; " +
  //           "style-src 'self' 'unsafe-inline' https://unpkg.com; " +
  //           "connect-src 'self' file: https://api.tiptap.dev https://unpkg.com; " +
  //           "worker-src 'self' blob:; " +
  //           "font-src 'self' data: https://unpkg.com; " +
  //           "frame-src 'self' https://unpkg.com"
  //       ]
  //     }
  //   })
  // })
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src * 'unsafe-inline' 'unsafe-eval' data: blob: file:; " +
            "script-src * 'unsafe-inline' 'unsafe-eval' data: blob: file:; " +
            "style-src * 'unsafe-inline' data: blob: file:; " +
            'img-src * data: blob: file:; ' +
            'font-src * data: blob: file:; ' +
            'connect-src * data: blob: file:; ' +
            'media-src * data: blob: file:; ' +
            'worker-src * data: blob: file:; ' +
            'frame-src * data: blob: file:; ' +
            'child-src * data: blob: file:;'
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
// 在应用启动时初始化
let globalCachePath: string

app.whenReady().then(async () => {
  const antinetPath = app.getPath('userData')
  const userDataPath = path.join(antinetPath, 'UserData')
  const imagesPath = path.join(userDataPath, 'images')
  const cachePath = path.join(userDataPath, 'cache')

  // 确保 UserData 和 images 目录存在
  try {
    await fs.mkdir(cachePath, { recursive: true })
    await fs.mkdir(userDataPath, { recursive: true })
    await fs.mkdir(imagesPath, { recursive: true })
  } catch (error) {
    console.error('创建目录失败:', error)
  }
  console.log('用户数据目录:', userDataPath)
  console.log('图片目录:', imagesPath)
  console.log('缓存目录:', cachePath)

  try {
    globalCachePath = await initializeCacheDirectory()
    // 导出获取缓存路径的方法
    ;(global as any).getCachePath = () => globalCachePath
    log.info('缓存路径初始化成功:', globalCachePath)
  } catch (error) {
    log.error('缓存路径初始化失败:', error)
  }

  // 初始化 remote 模块
  initialize()
  try {
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

    // 注册自定义协议
    protocol.handle('app-image', (request) => {
      const url = new URL(request.url)
      const decodedPath = decodeURIComponent(url.pathname)
      const filePath = path.join(app.getPath('userData'), decodedPath)
      return net.fetch('file://' + filePath)
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

    // 添加全局快捷键
    globalShortcut.register('CommandOrControl+R', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow()
      if (focusedWindow) {
        focusedWindow.webContents.reload()
      }
    })

    globalShortcut.register('F5', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow()
      if (focusedWindow) {
        focusedWindow.webContents.reload()
      }
    })

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
    log.info('应用初始化完成')
  } catch (error) {
    console.error('主进程→ 应用初始化失败:', error)
    log.error('主进程→ 应用初始化失败:', error)
  }
})

app.setName('Antinet')

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
