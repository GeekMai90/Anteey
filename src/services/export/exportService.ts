import { db } from '../../db/config'
import { format } from 'date-fns'
import JSZip from 'jszip'
import fs from 'fs'
import path from 'path'
import { app, dialog } from 'electron'

interface MarkdownResult {
  markdown: string
  images: string[]
}

// 定义标记类型
interface Mark {
  type: string
  attrs?: {
    href?: string
    color?: string
    [key: string]: any
  }
}

// 定义节点类型
interface Node {
  type: string
  text?: string
  marks?: Mark[]
  content?: Node[]
  parent?: Node
  attrs?: {
    level?: number
    textAlign?: string
    checked?: boolean
    language?: string
    src?: string
    alt?: string
    align?: string
    width?: string
    [key: string]: any
  }
}

// 工具函数：将笔记内容直接转换为 Markdown
function convertContentToMarkdown(content: any): MarkdownResult {
  const images: string[] = []
  let listLevel = 0 // 跟踪列表嵌套级别

  function processNode(node: Node, level: number = 0): string {
    if (!node) return ''

    if (typeof node === 'string') {
      return node
    }

    // 处理不同类型的节点
    switch (node.type) {
      case 'doc': {
        return node.content ? node.content.map((n) => processNode(n, level)).join('\n\n') : ''
      }

      case 'paragraph': {
        const text = node.content ? node.content.map((n) => processNode(n, level)).join('') : ''
        const align = node.attrs?.textAlign
        if (align && align !== 'left') {
          // 处理文本对齐
          return `<div style="text-align: ${align}">${text}</div>\n`
        }
        return text + '\n'
      }

      case 'text': {
        let text = node.text || ''
        if (node.marks) {
          // 按特定顺序应用样式,确保嵌套正确
          const markOrder = [
            'highlight', // 最外层
            'underline',
            'bold',
            'italic',
            'strike',
            'code', // 最内层
            'link' // 链接单独处理
          ]

          // 先找出所有要应用的样式
          const marks = new Map(node.marks.map((mark: Mark) => [mark.type, mark]))

          // 按顺序应用样式
          markOrder.forEach((markType) => {
            const mark = marks.get(markType)
            if (mark) {
              switch (markType) {
                case 'bold': {
                  text = `**${text}**`
                  break
                }
                case 'italic': {
                  text = `*${text}*`
                  break
                }
                case 'strike': {
                  text = `~~${text}~~`
                  break
                }
                case 'code': {
                  text = `\`${text}\``
                  break
                }
                case 'link': {
                  text = mark.attrs?.href ? `[${text}](${mark.attrs.href})` : text
                  break
                }
                case 'underline': {
                  text = `<u>${text}</u>`
                  break
                }
                case 'highlight': {
                  text = `<mark>${text}</mark>`
                  break
                }
              }
            }
          })
        }
        return text
      }

      case 'heading': {
        const level = node.attrs?.level || 1
        const text = node.content ? node.content.map((n: any) => processNode(n)).join('') : ''
        const align = node.attrs?.textAlign
        if (align && align !== 'left') {
          return `<div style="text-align: ${align}">${'#'.repeat(level)} ${text}</div>\n`
        }
        return `${'#'.repeat(level)} ${text}\n`
      }

      case 'bulletList': {
        listLevel++
        const items = node.content
          ? node.content.map((item: any) => processNode(item, listLevel)).join('\n')
          : ''
        listLevel--
        return items + (listLevel === 0 ? '\n' : '')
      }

      case 'orderedList': {
        listLevel++
        const indent = '    '.repeat(listLevel - 1) // 使用4个空格作为缩进
        const items = node.content
          ? node.content
              .map((item: any, index: number) => {
                const processed = processNode(item, listLevel)
                return `${indent}${index + 1}. ${processed.replace(/^[\s-]*/, '').trim()}`
              })
              .join('\n')
          : ''
        listLevel--
        return items + (listLevel === 0 ? '\n' : '')
      }

      case 'listItem': {
        const indent = '    '.repeat(level - 1) // 使用4个空格作为缩进
        const content = node.content
          ? node.content
              .map((n: any) => {
                // 如果是嵌套列表，直接返回处理结果
                if (n.type === 'orderedList' || n.type === 'bulletList') {
                  return processNode(n, level)
                }
                return processNode(n, level)
              })
              .join('\n')
              .trim()
          : ''

        // 如果父节点是有序列表，只返回内容
        if (node.parent?.type === 'orderedList') {
          return content
        }

        // 如果是无序列表项，添加 - 标记
        return `${indent}- ${content}`
      }

      case 'taskList': {
        return node.content ? node.content.map((n: any) => processNode(n, level)).join('\n') : ''
      }

      case 'taskItem': {
        const checked = node.attrs?.checked ? 'x' : ' '
        const content = node.content ? node.content.map((n: any) => processNode(n)).join('') : ''
        return `- [${checked}] ${content.trim()}`
      }

      case 'image': {
        if (node.attrs?.src) {
          images.push(node.attrs.src)
          const alt = node.attrs.alt || ''
          const align = node.attrs.align || 'center'
          const width = node.attrs.width || '100%'
          if (align !== 'center' || width !== '100%') {
            return `<div style="text-align: ${align}"><img src="${node.attrs.src}" alt="${alt}" width="${width}"/></div>\n`
          }
          return `![${alt}](${node.attrs.src})\n`
        }
        return ''
      }

      case 'table': {
        if (!node.content || node.content.length === 0) return ''

        const rows = node.content.map((row: Node) => processNode(row, level))
        const headerRow = rows[0]
        const separator = `|${headerRow
          .split('|')
          .slice(1, -1)
          .map(() => '---')
          .join('|')}|`

        return `${headerRow}\n${separator}\n${rows.slice(1).join('\n')}\n`
      }

      case 'tableRow': {
        if (!node.content) return '|  |'
        return `|${node.content.map((cell: Node) => processNode(cell, level)).join('|')}|`
      }

      case 'tableCell':
      case 'tableHeader': {
        const content = node.content
          ? node.content
              .map((n: Node) => processNode(n, level))
              .join('')
              .trim()
          : ''
        return ` ${content} `
      }

      case 'blockquote': {
        const content = node.content ? node.content.map((n: any) => processNode(n)).join('\n') : ''
        return (
          content
            .split('\n')
            .map((line: string) => `> ${line}`)
            .join('\n') + '\n'
        )
      }

      case 'codeBlock': {
        const code = node.content ? node.content.map((n: any) => processNode(n)).join('\n') : ''
        const language = node.attrs?.language || ''
        return `\`\`\`${language}\n${code}\n\`\`\`\n`
      }

      case 'hardBreak': {
        return '\n'
      }

      default: {
        return node.content ? node.content.map((n: any) => processNode(n, level)).join('') : ''
      }
    }
  }

  const noteContent = typeof content === 'string' ? JSON.parse(content) : content
  const markdown = processNode(noteContent)

  return { markdown, images }
}

// 工具函数：处理文件名
function sanitizeFileName(name: string): string {
  return name
    .replace(/^[-_]+/, '')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/[. ]+$/, '')
}

// 工具函数：下载图片
async function downloadImage(url: string): Promise<Buffer> {
  try {
    // 处理 file:// 协议
    if (url.startsWith('file://')) {
      const filePath = url.replace('file://', '')
      return await fs.promises.readFile(filePath)
    }

    // 处理 app-image:// 协议
    if (url.startsWith('app-image://')) {
      // 移除协议前缀和开头的斜杠
      const imagePath = url.replace('app-image://', '').replace(/^\/+/, '')
      // 获取用户数据目录下的图片路径
      const imagesPath = path.join(
        app.getPath('userData'),
        'UserData',
        'images',
        path.basename(imagePath)
      )
      console.log('尝试读取图片:', imagesPath)
      return await fs.promises.readFile(imagesPath)
    }

    // 处理 http(s):// 协议
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    }

    throw new Error(`不支持的图片 URL 协议: ${url}`)
  } catch (error) {
    console.error('下载图片失败:', error)
    throw error
  }
}

// 导出单个笔记
export async function exportNote(noteId: string): Promise<{ filePath: string; fileName: string }> {
  try {
    // 1. 获取笔记数据
    const note = await db('notes').where('id', noteId).first()
    if (!note) {
      throw new Error(`笔记不存在: ${noteId}`)
    }

    // 2. 直接转换为 Markdown
    const { markdown, images } = convertContentToMarkdown(note.content)

    // 3. 创建 ZIP 实例
    const zip = new JSZip()

    // 4. 处理图片
    let processedMarkdown = markdown
    for (const imageUrl of images) {
      try {
        const imageData = await downloadImage(imageUrl)
        const imageName = path.basename(imageUrl)
        zip.file(`images/${imageName}`, imageData)

        // 更新 markdown 中的图片链接
        processedMarkdown = processedMarkdown.replace(
          new RegExp(
            `!\\[([^\\]]*)\\]\\(${imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`,
            'g'
          ),
          `![$1](./images/${imageName})`
        )
      } catch (error) {
        console.error(`处理图片失败: ${imageUrl}`, error)
      }
    }

    // 5. 添加 markdown 文件到 zip
    const createdAt = new Date(note.createdAt)
    const timeString = format(createdAt, 'yyyyMMddHHmm')
    const noteAddress = note.address || note.id
    const fileName = `${sanitizeFileName(noteAddress)}_${timeString}.md`
    zip.file(fileName, processedMarkdown)

    // 6. 生成 zip 文件
    const content = await zip.generateAsync({ type: 'nodebuffer' })

    // 7. 让用户选择保存位置
    const zipFileName = `Antinet_note_${timeString}.zip`
    const result = await dialog.showSaveDialog({
      defaultPath: path.join(app.getPath('downloads'), zipFileName),
      filters: [{ name: 'ZIP 文件', extensions: ['zip'] }]
    })

    if (result.canceled || !result.filePath) {
      throw new Error('用户取消了保存')
    }

    // 8. 保存文件并设置修改时间
    await fs.promises.writeFile(result.filePath, content)
    const now = new Date()
    await fs.promises.utimes(result.filePath, now, now)

    return {
      filePath: result.filePath,
      fileName: path.basename(result.filePath)
    }
  } catch (error) {
    console.error('导出笔记失败:', error)
    throw error
  }
}

// 批量导出笔记
export async function exportAllNotes(): Promise<{ filePath: string; fileName: string }> {
  try {
    // 1. 获取所有笔记的 ID 和基本信息
    const batchSize = 10 // 每批处理的笔记数量
    const allNotes = await db('notes')
      .where('isDeleted', false)
      .select('id', 'address', 'createdAt')

    if (allNotes.length === 0) {
      throw new Error('没有可导出的笔记')
    }

    // 2. 创建 ZIP 实例
    const zip = new JSZip()

    // 3. 创建笔记 ID 到文件名的映射
    const noteIdToFilename = new Map<string, string>()
    allNotes.forEach((note) => {
      const createdAt = new Date(note.createdAt)
      const timeString = format(createdAt, 'yyyyMMddHHmm')
      const noteAddress = note.address || note.id
      const fileName = `${sanitizeFileName(noteAddress)}_${timeString}.md`
      noteIdToFilename.set(note.id, fileName)
    })

    // 4. 分批处理笔记
    const totalBatches = Math.ceil(allNotes.length / batchSize)
    console.log(`开始分批导出 ${allNotes.length} 个笔记，共 ${totalBatches} 批`)

    for (let i = 0; i < allNotes.length; i += batchSize) {
      const batchNotes = allNotes.slice(i, i + batchSize)
      const currentBatch = Math.floor(i / batchSize) + 1
      console.log(`处理第 ${currentBatch}/${totalBatches} 批笔记`)

      // 获取这一批笔记的完整内容
      const notesWithContent = await db('notes')
        .whereIn(
          'id',
          batchNotes.map((n) => n.id)
        )
        .select('id', 'content')

      // 处理每个笔记
      for (const note of notesWithContent) {
        try {
          // 转换内容
          const { markdown, images } = convertContentToMarkdown(note.content)
          let processedMarkdown = markdown

          // 处理图片
          for (const imageUrl of images) {
            try {
              const imageData = await downloadImage(imageUrl)
              const imageName = path.basename(imageUrl)
              zip.file(`images/${imageName}`, imageData)

              // 更新 markdown 中的图片链接
              processedMarkdown = processedMarkdown.replace(
                new RegExp(
                  `!\\[([^\\]]*)\\]\\(${imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`,
                  'g'
                ),
                `![$1](./images/${imageName})`
              )
            } catch (error) {
              console.error(`处理图片失败: ${imageUrl}`, error)
            }
          }

          // 处理笔记链接
          processedMarkdown = processedMarkdown.replace(
            /\[([^\]]+)\]\(note:\/\/([^)]+)\)/g,
            (match, linkText, noteId) => {
              const fileName = noteIdToFilename.get(noteId)
              return fileName ? `[${linkText}](./${fileName})` : match
            }
          )

          // 添加到 zip
          const fileName = noteIdToFilename.get(note.id)!
          zip.file(fileName, processedMarkdown)
        } catch (error) {
          console.error(`处理笔记失败 (ID: ${note.id}):`, error)
          zip.file(`error_${note.id}.txt`, `处理此笔记时出错: ${(error as Error).message}`)
        }
      }

      // 每批处理完后暂停一小段时间，避免数据库过载
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log('所有笔记处理完成，准备生成 ZIP 文件')

    // 5. 生成 zip 文件
    const content = await zip.generateAsync({ type: 'nodebuffer' })

    // 6. 让用户选择保存位置
    const timeString = format(new Date(), 'yyyyMMddHHmm')
    const zipFileName = `Antinet_all_notes_${timeString}.zip`
    const result = await dialog.showSaveDialog({
      defaultPath: path.join(app.getPath('downloads'), zipFileName),
      filters: [{ name: 'ZIP 文件', extensions: ['zip'] }]
    })

    if (result.canceled || !result.filePath) {
      throw new Error('用户取消了保存')
    }

    // 7. 保存文件并设置修改时间
    await fs.promises.writeFile(result.filePath, content)
    const now = new Date()
    await fs.promises.utimes(result.filePath, now, now)

    return {
      filePath: result.filePath,
      fileName: path.basename(result.filePath)
    }
  } catch (error) {
    console.error('批量导出笔记失败:', error)
    throw error
  }
}
