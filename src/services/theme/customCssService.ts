import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import fsSync from 'fs'
import log from '../../main/logger'

// 自定义CSS文件路径
const CUSTOM_DIR_NAME = 'Custom'
const CUSTOM_CSS_FILENAME = 'custom.css'

/**
 * 获取自定义CSS文件的路径
 */
export async function getCustomCssPath(): Promise<string> {
  const userDataPath = app.getPath('userData')
  const appUserDataPath = path.join(userDataPath, 'UserData')
  const customDirPath = path.join(appUserDataPath, CUSTOM_DIR_NAME)
  const customCssPath = path.join(customDirPath, CUSTOM_CSS_FILENAME)

  // 确保UserData目录存在
  try {
    await fs.mkdir(appUserDataPath, { recursive: true })
  } catch (error) {
    log.error('确保UserData目录存在失败:', error)
  }

  // 确保Custom目录存在
  try {
    await fs.mkdir(customDirPath, { recursive: true })
  } catch (error) {
    log.error('创建自定义CSS目录失败:', error)
  }

  // 如果CSS文件不存在，创建一个空文件
  if (!fsSync.existsSync(customCssPath)) {
    try {
      await fs.writeFile(customCssPath, '/* 在此处添加您的自定义CSS样式 */\n', 'utf-8')
      log.info('创建默认自定义CSS文件成功')
    } catch (error) {
      log.error('创建自定义CSS文件失败:', error)
    }
  }

  return customCssPath
}

/**
 * 读取自定义CSS内容
 */
export async function getCustomCssContent(): Promise<string> {
  try {
    const cssPath = await getCustomCssPath()
    const content = await fs.readFile(cssPath, 'utf-8')
    return content
  } catch (error) {
    log.error('读取自定义CSS内容失败:', error)
    return ''
  }
}
