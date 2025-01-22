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
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { initDatabase } from '../db/init'
import { db } from '../db/config'
import { default as installExtension, VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import path from 'path'
import fs from 'fs'
import fsPromises from 'fs/promises'
import { URL } from 'url'
import { initialize, enable } from '@electron/remote/main'
import { setupIpcHandlers } from './ipc'
import log from './logger'
import { config } from 'dotenv'
import { getUserSettings } from '../services/user/userSettingsService'
import { migrateLicenseTable } from '../db/migrations/licenseMigration'
import { backupService } from '../services/backupService'

// 加载环境变量
config({
  path: join(__dirname, '../../../.env')
})

// 添加 IPC 日志转发
ipcMain.on('renderer-log', (_, { level, args }) => {
  ;(log[level as keyof typeof log] as (...args: any[]) => void)('[渲染进程]', ...args)
})

// 设置应用名称
app.name = 'Anteey'

// 设置日志
log.transports.file.level = 'info'

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
      label: 'Anteey',
      submenu: [
        {
          label: '关于Anteey',
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
        {
          label: '重新加载',
          role: 'reload',
          accelerator: process.platform === 'darwin' ? 'Command+R' : 'F5'
        },
        {
          label: '强制重新加载',
          role: 'forceReload',
          accelerator: process.platform === 'darwin' ? 'Command+Shift+R' : 'Ctrl+F5'
        },
        { label: '切换开发者工具', role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: '重置缩放',
          role: 'resetZoom',
          accelerator: 'CmdOrCtrl+0'
        },
        {
          label: '放大',
          role: 'zoomIn',
          accelerator: process.platform === 'darwin' ? 'Command+=' : 'Control+='
        },
        {
          label: '缩小',
          role: 'zoomOut',
          accelerator: process.platform === 'darwin' ? 'Command+-' : 'Control+-'
        },
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
            await shell.openExternal('https://www.anteey.com')
          }
        },
        {
          label: '帮助文档',
          click: async () => {
            await shell.openExternal('https://docs.anteey.com/')
          }
        }
      ]
    }
  ] as MenuItemConstructorOptions[]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    // 设置窗口的默认宽度和高度（单位：像素）
    width: 900,
    height: 670,
    // 先隐藏窗口，等待内容加载完成后再显示
    show: false,
    frame: false, // 完全无边框
    // 隐藏默认菜单栏
    autoHideMenuBar: true,
    // macOS 专用：使用 hiddenInset 样式，保留红绿灯按钮但隐藏标题栏
    // titleBarStyle: 'hiddenInset',
    // // macOS 专用：设置红绿灯按钮的位置，x是距离左边距离，y是距离顶部距离
    // trafficLightPosition: { x: 16, y: 16 },
    // ...(process.platform === 'linux' ? {} : {}),
    // 网页功能和安全相关的配置
    webPreferences: {
      // 指定预加载脚本的路径，用于在渲染进程中安全地调用主进程功能
      preload: join(__dirname, '../preload/index.js'),
      // 禁用沙箱模式，允许使用 Node.js API
      sandbox: false,
      // 启用上下文隔离，提高安全性，使渲染进程和主进程隔离
      contextIsolation: true,
      // 禁用直接在渲染进程中使用 Node.js
      nodeIntegration: false,
      // 允许使用开发者工具（F12）
      devTools: true,
      // 禁用站点隔离试验特性
      additionalArguments: ['--disable-site-isolation-trials'],
      // 禁用网页安全策略，允许跨域请求等（警告：仅建议在开发环境使用）
      webSecurity: false
    }
  })
  // 启用 remote 模块
  // 这个模块允许渲染进程（网页）安全地使用主进程的一些功能
  enable(mainWindow.webContents)

  // 窗口创建后立即最大化
  mainWindow.maximize()
  // 等待内容加载完成后显示
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 根据应用是否打包来决定如何加载页面
  // if (app.isPackaged) {
  //   // 生产环境：直接加载打包后的 HTML 文件
  //   // __dirname 是当前文件所在目录
  //   // '../renderer/index.html' 是相对于当前目录的 HTML 文件路径
  //   mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  // } else {
  //   // 开发环境：从开发服务器加载页面
  //   // 获取开发服务器的 URL（由 Vite 在启动时设置的环境变量）
  //   const devServerUrl = process.env.VITE_DEV_SERVER_URL

  //   if (devServerUrl) {
  //     // 如果有开发服务器 URL，则从开发服务器加载页面
  //     // 这样可以支持热更新等开发功能
  //     mainWindow.loadURL(devServerUrl)
  //   } else {
  //     // 如果没有找到开发服务器 URL，记录错误
  //     console.error('VITE_DEV_SERVER_URL 未定义')
  //     log.error('VITE_DEV_SERVER_URL 未定义')

  //     // 降级处理：加载本地 HTML 文件
  //     // 这种情况通常不应该发生，除非开发环境配置出现问题
  //     mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  //   }
  // }

  // 监听页面加载完成事件
  // mainWindow.webContents.on('did-finish-load', () => {
  //   // 执行一段 JavaScript 代码来处理路由重定向
  //   mainWindow.webContents.executeJavaScript(`
  //      // 检查当前 URL 的 hash 部分
  //      // 如果 hash 为空（''）或者是根路径（'#/'）
  //     if (window.location.hash === '' || window.location.hash === '#/') {
  //      // 将路由重定向到时间线（'/timeline'）
  //       window.location.hash = '#/timeline';
  //     }
  //   `)
  // })

  // 设置内容安全策略 (CSP)
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          'default-src *; ' +
            // 修改 img-src，确保支持所有需要的图片源
            "img-src 'self' data: blob: file: https: http: app-image: * 'unsafe-inline'; " +
            "media-src 'self' file: *; " +
            // 确保脚本源包含所有需要的域名
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://unpkg.com https://cdn.tldraw.com; " +
            "style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.tldraw.com; " +
            // 修改 connect-src，允许更多连接
            "connect-src 'self' data: blob: file: app-image: https://api.tiptap.dev https://unpkg.com https://cdn.tldraw.com; " +
            'font-src * https://cdn.tldraw.com; ' +
            "worker-src 'self' blob: data:;"
        ]
      }
    })
  })

  // 在加载 URL 之前就创建并显示窗口
  // mainWindow.webContents.on('did-finish-load', () => {
  //   mainWindow.webContents.executeJavaScript(`
  //     if (window.location.pathname === '/' || window.location.pathname === '') {
  //       window.history.pushState(null, '', '/home');
  //       if (window.dispatchEvent) {
  //         window.dispatchEvent(new Event('popstate'));
  //       }
  //     }
  //   `)
  // })

  // 仅在开发环境（未打包状态）下自动打开开发者工具
  if (!app.isPackaged) {
    // 打开 Chromium 开发者工具（DevTools）
    mainWindow.webContents.openDevTools()
  }

  // 处理窗口打开请求（例如：点击链接时）
  mainWindow.webContents.setWindowOpenHandler((details) => {
    // 使用系统默认浏览器打开外部链接
    shell.openExternal(details.url)

    // 返回 'deny' 表示阻止 Electron 创建新窗口
    // 这样可以防止应用内创建多个窗口，保持单窗口模式
    return { action: 'deny' }
  })

  // 加载页面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// 添加窗口显示状态追踪
let isWindowVisible = true

// 确保在任何环境下都注册这些快捷键
function registerGlobalShortcuts() {
  const win = BrowserWindow.getFocusedWindow()
  if (!win) return

  // 在窗口的 webContents 上设置快捷键
  win.webContents.on('before-input-event', (event, input) => {
    // 刷新快捷键
    if ((input.control || input.meta) && input.key === 'r' && !input.shift) {
      win.webContents.reload()
      event.preventDefault()
    }
    // 强制刷新快捷键
    if ((input.control || input.meta) && input.shift && input.key === 'r') {
      win.webContents.reloadIgnoringCache()
      event.preventDefault()
    }
    // 开发者工具快捷键
    if ((input.control || input.meta) && input.shift && input.key === 'i') {
      win.webContents.toggleDevTools()
      event.preventDefault()
    }
  })

  // 为所有新创建的窗口注册这些快捷键
  app.on('browser-window-created', (_, window) => {
    window.webContents.on('before-input-event', (event, input) => {
      if (window.isFocused()) {
        if ((input.control || input.meta) && input.key === 'r' && !input.shift) {
          window.webContents.reload()
          event.preventDefault()
        }
        if ((input.control || input.meta) && input.shift && input.key === 'r') {
          window.webContents.reloadIgnoringCache()
          event.preventDefault()
        }
        if ((input.control || input.meta) && input.shift && input.key === 'i') {
          window.webContents.toggleDevTools()
          event.preventDefault()
        }
      }
    })
  })
}

async function handleAutoBackup() {
  try {
    if (await backupService.shouldAutoBackup()) {
      await backupService.performBackup(true)
    }
  } catch (error) {
    console.error('自动备份失败:', error)
  }
}

// 在 app.whenReady() 之前注册协议
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app-image',
    privileges: {
      standard: true,
      supportFetchAPI: true,
      stream: true,
      secure: true,
      corsEnabled: true
    }
  }
])

app.whenReady().then(async () => {
  const antinetPath = app.getPath('userData')
  const userDataPath = path.join(antinetPath, 'UserData')
  const imagesPath = path.join(userDataPath, 'images')

  // 确保 UserData 和 images 目录存在
  try {
    await fsPromises.mkdir(userDataPath, { recursive: true })
    await fsPromises.mkdir(imagesPath, { recursive: true })
  } catch (error) {
    console.error('创建目录失败:', error)
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
    await migrateLicenseTable() // 添加这行
    // 验证表是否创建成功
    await db.schema.hasTable('notes')

    // electronApp.setAppUserModelId('com.electron')
    // 使用应用特定的 ID
    if (process.platform === 'win32') {
      electronApp.setAppUserModelId('com.antinet.app') // 使用反向域名格式
    }

    ipcMain.handle('get-resource-path', (_event, filename) => {
      return path.join(app.getAppPath(), 'resources', filename)
    })

    // 注册自定义协议
    protocol.handle('app-image', (request) => {
      try {
        const url = new URL(request.url)
        const imagePath = decodeURIComponent(url.pathname)
        const fullPath = path.join(
          app.getPath('userData'),
          'UserData',
          'images',
          path.basename(imagePath)
        )

        // 添加更多日志用于调试
        console.log('Request URL:', request.url)
        console.log('Image Path:', imagePath)
        console.log('Full Path:', fullPath)
        console.log('File exists:', fs.existsSync(fullPath))

        // 检查文件是否存在
        if (!fs.existsSync(fullPath)) {
          console.error('Image file not found:', fullPath)
          return new Response('', { status: 404 })
        }

        return net.fetch('file://' + fullPath)
      } catch (error: unknown) {
        console.error('加载图片失败:', error)
        if (error instanceof Error) {
          console.error('Error details:', error.message)
        }
        return new Response('', { status: 404 })
      }
    })

    // 设置 IPC 处理程序
    setupIpcHandlers()

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
      // 为新窗口注册快捷键
      window.webContents.on('before-input-event', (event, input) => {
        // 仅当窗口处于焦点状态时处理快捷键
        if (window.isFocused()) {
          if ((input.control || input.meta) && input.key === 'r' && !input.shift) {
            window.webContents.reload()
            event.preventDefault()
          }
          if ((input.control || input.meta) && input.shift && input.key === 'r') {
            window.webContents.reloadIgnoringCache()
            event.preventDefault()
          }
          if ((input.control || input.meta) && input.shift && input.key === 'i') {
            window.webContents.toggleDevTools()
            event.preventDefault()
          }
        }
      })
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

    // 注册全局快捷键
    registerGlobalShortcuts()

    // 加载用户设置的快捷键
    const settings = await getUserSettings()
    if (settings?.globalHotkey) {
      globalShortcut.register(settings.globalHotkey, () => {
        const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
        if (win) {
          if (isWindowVisible) {
            win.hide()
            isWindowVisible = false
          } else {
            win.show()
            win.focus()
            isWindowVisible = true
          }
        }
      })
    }

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

    // 应用启动时执行自动备份
    await handleAutoBackup()
  } catch (error) {
    console.error('主进程→ 应用初始化失败:', error)
    log.error('主进程→ 应用初始化失败:', error)
  }

  // 在应用退出时注销快捷键
  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })
})

app.setName('Anteey')

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async (event) => {
  event.preventDefault()
  // 应用关闭前执行自动备份
  await handleAutoBackup()
  app.exit()
})

// 添加 IPC 处理器
ipcMain.handle('open-external', async (_event, url: string) => {
  try {
    await shell.openExternal(url)
  } catch (error) {
    console.error('打开外部链接失败:', error)
    throw error
  }
})
