// src/main/index.ts
import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Menu,
  MenuItemConstructorOptions,
  protocol,
  globalShortcut
} from 'electron'
import { join } from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { initDatabase } from '../db/init'
import { db } from '../db/config'
import { default as installExtension, VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import path from 'path'
import fsPromises from 'fs/promises'
import { URL } from 'url'
import { initialize, enable } from '@electron/remote/main'
import { setupIpcHandlers } from './ipc'
import log from './logger'
import { config } from 'dotenv'
import { getUserSettings } from '@services/user/userSettingsService'
import { backupService } from '@services/backup/backupService'
import { debounce } from 'lodash'
import { s3Service } from '@services/s3/s3Service'
import { webdavService } from '@services/webdav/webdavService'
import { getCurrentConfig } from '@services/cloud/cloudSyncService'
import { setupDinoxSyncHandlers } from './ipc/dinoxIpcHandlers'
import { startApiServer } from './api/server'
import fsSync from 'fs'

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
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow()
            if (focusedWindow) {
              focusedWindow.webContents.send('menu-new-note')
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

async function createWindow(): Promise<BrowserWindow> {
  // 先获取保存的窗口设置
  const settings = await db('user_settings').first()

  const mainWindow = new BrowserWindow({
    // 增大默认窗口大小
    width: settings?.window_width || 1280, // 改大一点
    height: settings?.window_height || 800, // 改大一点
    x: settings?.window_x,
    y: settings?.window_y,
    show: false,
    frame: false,
    autoHideMenuBar: true,
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
      additionalArguments: [
        '--disable-site-isolation-trials',
        '--disable-features=site-per-process',
        '--disable-gpu-process-crash-limit',
        '--disable-renderer-backgrounding'
      ],
      // 禁用网页安全策略，允许跨域请求等（警告：仅建议在开发环境使用）
      webSecurity: false,
      backgroundThrottling: true
    }
  })
  // 启用 remote 模块
  // 这个模块允许渲染进程（网页）安全地使用主进程的一些功能
  enable(mainWindow.webContents)

  // 设置全局引用
  global.mainWindow = mainWindow

  // 当窗口关闭时清除引用
  mainWindow.on('closed', () => {
    global.mainWindow = null
  })

  // 恢复窗口状态
  mainWindow.on('ready-to-show', async () => {
    try {
      // 确保获取最新设置
      const freshSettings = await db('user_settings').first()

      // 恢复缩放比例
      const zoomFactor = freshSettings?.zoom_factor ?? 1.0
      mainWindow.webContents.setZoomFactor(zoomFactor)

      // 如果没有设置或者之前是最大化状态，则最大化窗口
      if (!freshSettings || freshSettings.is_maximized) {
        // 修改判断条件
        mainWindow.maximize()
      }

      mainWindow.show()
    } catch (error) {
      log.error('恢复窗口状态失败:', error)
      mainWindow.maximize()
      mainWindow.show()
    }
  })

  // 保存窗口状态
  async function saveWindowState() {
    try {
      const settings = await db('user_settings').first()
      if (settings) {
        const isMaximized = mainWindow.isMaximized()
        const bounds = mainWindow.getBounds()

        await db('user_settings').where('id', settings.id).update({
          window_width: bounds.width,
          window_height: bounds.height,
          window_x: bounds.x,
          window_y: bounds.y,
          is_maximized: isMaximized,
          updatedAt: new Date()
        })
      }
    } catch (error) {
      console.error('保存窗口状态失败:', error)
    }
  }

  // 创建一个防抖版本的保存函数
  const debouncedSaveWindowState = debounce(saveWindowState, 1000)

  // 使用防抖版本
  mainWindow.on('resize', () => {
    if (!mainWindow.isMaximized()) {
      debouncedSaveWindowState()
    }
  })

  mainWindow.on('move', () => {
    if (!mainWindow.isMaximized()) {
      debouncedSaveWindowState()
    }
  })

  mainWindow.on('maximize', () => {
    debouncedSaveWindowState()
  })

  mainWindow.on('unmaximize', () => {
    debouncedSaveWindowState()
  })

  // 创建一个函数来处理缩放更新
  async function handleZoomUpdate(zoomFactor: number) {
    try {
      const settings = await db('user_settings').first()
      if (settings) {
        await db('user_settings').where('id', settings.id).update({
          zoom_factor: zoomFactor,
          updatedAt: new Date()
        })
      } else {
        log.error('未找到用户设置记录，无法保存缩放比例')
      }
    } catch (error) {
      log.error('保存缩放级别失败:', error)
    }
  }

  // 增加缩放变化事件的监听
  mainWindow.webContents.on('zoom-changed', () => {
    const currentZoom = mainWindow.webContents.getZoomFactor()
    handleZoomUpdate(currentZoom)
  })

  // 在窗口导航前保存当前缩放状态
  mainWindow.webContents.on('will-navigate', async () => {
    const currentZoom = mainWindow.webContents.getZoomFactor()
    await handleZoomUpdate(currentZoom) // 确保同步保存
  })

  // 监听页面刷新事件
  mainWindow.webContents.on('before-input-event', async (_event, input) => {
    // Command/Control + 加号
    if ((input.control || input.meta) && (input.key === '=' || input.key === 'plus')) {
      const currentZoom = mainWindow.webContents.getZoomFactor()
      const newZoom = currentZoom + 0.1
      mainWindow.webContents.setZoomFactor(newZoom)
      await handleZoomUpdate(newZoom)
    }
    // Command/Control + 减号
    if ((input.control || input.meta) && (input.key === '-' || input.key === 'minus')) {
      const currentZoom = mainWindow.webContents.getZoomFactor()
      const newZoom = currentZoom - 0.1
      mainWindow.webContents.setZoomFactor(newZoom)
      await handleZoomUpdate(newZoom)
    }
    // Command/Control + 0
    if ((input.control || input.meta) && input.key === '0') {
      mainWindow.webContents.setZoomFactor(1.0)
      await handleZoomUpdate(1.0)
    }

    // 页面刷新快捷键
    if ((input.control || input.meta) && input.key === 'r') {
      const currentZoom = mainWindow.webContents.getZoomFactor()
      await handleZoomUpdate(currentZoom)
    }
  })

  // 监听菜单项的缩放操作
  ipcMain.on('zoom-in', async () => {
    const currentZoom = mainWindow.webContents.getZoomFactor()
    const newZoom = currentZoom + 0.1
    mainWindow.webContents.setZoomFactor(newZoom)
    await handleZoomUpdate(newZoom)
  })

  ipcMain.on('zoom-out', async () => {
    const currentZoom = mainWindow.webContents.getZoomFactor()
    const newZoom = currentZoom - 0.1
    mainWindow.webContents.setZoomFactor(newZoom)
    await handleZoomUpdate(newZoom)
  })

  ipcMain.on('zoom-reset', async () => {
    mainWindow.webContents.setZoomFactor(1.0)
    await handleZoomUpdate(1.0)
  })

  // 修改 CSP 处理器
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
            "img-src * 'self' data: blob: app-image: file: resource: https: http:; " +
            "media-src * 'self' file: data: blob: resource:; " +
            "script-src * 'self' 'unsafe-inline' 'unsafe-eval' blob: data:; " +
            "style-src * 'self' 'unsafe-inline' blob: data:; " +
            "connect-src * 'self' data: blob: file: app-image: https: http:; " +
            'font-src * data: blob:; ' +
            "worker-src * 'self' blob: data:;"
        ]
      }
    })
  })

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
      corsEnabled: true,
      bypassCSP: true
    }
  }
])

// 添加同步状态标记
let isSyncing = false

// 添加同步函数
async function handleCloudSync(type: 'startup' | 'shutdown'): Promise<void> {
  try {
    // log.info(`准备执行${type === 'startup' ? '启动' : '关闭'}时同步...`)

    // 获取云同步配置
    const cloudConfig = await getCurrentConfig()
    if (!cloudConfig?.enabled || cloudConfig.syncType === 'none') {
      // log.info('云同步未启用或已设置为不同步，跳过同步操作')
      // 确保停止所有同步服务
      webdavService.stopAutoSync()
      s3Service.stopAutoSync()
      return
    }

    // 设置同步状态
    isSyncing = true

    // 发送开始同步通知
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (win) {
      win.webContents.send('sync-start')
    }

    // 根据同步类型执行相应的同步
    if (cloudConfig.syncType === 'webdav') {
      const webdavConfig = await webdavService.getConfig()
      if (webdavConfig?.enabled) {
        // log.info('执行 WebDAV 同步...')
        if (type === 'shutdown') {
          webdavService.stopAutoSync()
        }
        await webdavService.sync('auto')
      }
    } else if (cloudConfig.syncType === 's3') {
      const s3Config = await s3Service.getConfig()
      if (s3Config?.enabled) {
        // log.info('执行 S3 同步...')

        if (type === 'startup') {
          // 启动时初始化服务并开始自动同步
          await s3Service.initAutoSync()
        } else {
          // 关闭时执行快速同步
          s3Service.stopAutoSync() // 停止自动同步定时器
          await s3Service.shutdownSync()
        }
      }
    }

    // log.info(`${type === 'startup' ? '启动' : '关闭'}时同步完成`)

    // 发送完成通知
    if (win) {
      win.webContents.send('sync-complete', {
        message: '同步完成'
      })
    }

    // 重置同步状态
    isSyncing = false
  } catch (error) {
    log.error(`${type === 'startup' ? '启动' : '关闭'}时同步失败:`, error)
    // 发送错误通知
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (win) {
      win.webContents.send('sync-error', {
        message: '同步失败',
        error: error instanceof Error ? error.message : String(error)
      })
    }
    // 重置同步状态
    isSyncing = false
  }
}

// 添加 IPC 处理器获取同步状态
ipcMain.handle('get-current-sync-state', () => {
  return { isSyncing }
})

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
    if (!app.isPackaged) {
      try {
        await installExtension(VUEJS3_DEVTOOLS, {
          loadExtensionOptions: {
            allowFileAccess: true
          }
        })
        // log.info('Vue Devtools 安装成功')
      } catch (error) {
        log.warn('Vue Devtools 安装失败，这不会影响应用的正常使用:', error)
        // 继续执行，不要中断应用启动
      }
    }

    // 初始化数据库
    await initDatabase(db)

    // electronApp.setAppUserModelId('com.electron')
    // 使用应用特定的 ID
    if (process.platform === 'win32') {
      electronApp.setAppUserModelId('com.antinet.app') // 使用反向域名格式
    }

    ipcMain.handle('get-resource-path', (_event, filename) => {
      return path.join(app.getAppPath(), 'resources', filename)
    })

    // 修改协议处理函数
    protocol.handle('app-image', async (request) => {
      try {
        const url = new URL(request.url)
        const imagePath = decodeURIComponent(url.pathname)
        const fullPath = path.join(
          app.getPath('userData'),
          'UserData',
          'images',
          path.basename(imagePath)
        )

        // 检查文件是否存在
        if (!fsSync.existsSync(fullPath)) {
          log.error('图片文件不存在:', fullPath)
          return new Response('', {
            status: 404,
            headers: {
              'Access-Control-Allow-Origin': '*'
            }
          })
        }

        const imageBuffer = await fsPromises.readFile(fullPath)
        const ext = path.extname(fullPath).toLowerCase()
        const mimeType =
          {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
          }[ext] || 'application/octet-stream'

        return new Response(imageBuffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=31536000',
            'Access-Control-Allow-Origin': '*'
          }
        })
      } catch (error) {
        log.error('图片加载失败:', error)
        return new Response('', {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*'
          }
        })
      }
    })

    // 设置 IPC 处理程序
    setupIpcHandlers()
    setupDinoxSyncHandlers()

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

    await createWindow() // 等待窗口创建完成

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
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow().catch((error) => {
          console.error('创建窗口失败:', error)
        })
      }
    })

    // 应用启动时执行自动备份和同步
    await handleAutoBackup()
    await handleCloudSync('startup')

    // 设置定时任务
    // 2025-02-05 暂使取消自动更新向量的功能
    // setupScheduledTasks()

    // try {
    //   const testResult = await testLanceDB()
    //   if (testResult) {
    //     log.info('LanceDB 测试通过')
    //   } else {
    //     log.error('LanceDB 测试失败')
    //   }
    // } catch (error) {
    //   log.error('LanceDB 测试出错:', error)
    // }

    // 启动API服务器
    startApiServer()
  } catch (error) {
    console.error('主进程→ 应用初始化失败:', error)
    log.error('主进程→ 应用初始化失败:', error)
  }

  // 在应用退出时注销快捷键
  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })
  // 添加全局错误处理
  app.on('render-process-gone', (_event, _webContents, details) => {
    console.error('渲染进程崩溃:', details)
  })

  app.on('child-process-gone', (_event, details) => {
    console.error('子进程异常:', details)
  })

  // 监听未捕获的异常
  process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error)
  })

  process.on('unhandledRejection', (reason) => {
    console.error('未处理的 Promise 拒绝:', reason)
  })
})

app.setName('Anteey')

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async (event) => {
  // 阻止默认的退出行为，确保我们的同步和备份完成
  event.preventDefault()

  // log.info('应用准备退出，执行关闭前操作...')

  try {
    // 执行自动备份
    // log.info('开始执行关闭前自动备份...')
    await handleAutoBackup()
    // log.info('关闭前自动备份完成')

    // 执行关闭前同步
    // log.info('开始执行关闭前同步...')
    await handleCloudSync('shutdown')
    // log.info('关闭前同步完成')

    // 所有关闭前操作完成，安全退出
    // log.info('所有关闭前操作已完成，准备退出应用')
    setTimeout(() => {
      app.exit(0)
    }, 500) // 添加短暂延迟，确保日志被写入
  } catch (error) {
    log.error('关闭前操作执行失败:', error)
    // 即使失败也要退出应用
    setTimeout(() => {
      app.exit(1)
    }, 500)
  }
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
