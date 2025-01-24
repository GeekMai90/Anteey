import { createApp } from 'vue'
import html2canvas from 'html2canvas'
import { format } from 'date-fns'
import type { Note } from '@shared/types'
import type { Component, ConcreteComponent } from 'vue'

interface ShareNoteImageOptions {
  note: Note
  component: Component | ConcreteComponent // 修改类型定义，支持具体组件类型
  config: {
    width: number
    height: number
    fontSize: number
  }
}

// 创建临时容器并渲染组件
const createTempContainer = (options: ShareNoteImageOptions) => {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.width = `${options.config.width}px`
  container.style.overflow = 'visible'

  document.body.appendChild(container)

  const app = createApp(options.component, {
    note: options.note,
    config: options.config // 直接使用配置，不再覆盖高度
  })
  app.mount(container)

  return { container, app }
}

// 导出图片
export const exportNoteImage = async (options: ShareNoteImageOptions) => {
  const { container, app } = createTempContainer(options)

  try {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const element = container.firstElementChild as HTMLElement
    const contentHeight = element.scrollHeight // 获取实际内容高度

    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      backgroundColor: null,
      width: options.config.width,
      height: contentHeight, // 使用实际内容高度
      windowWidth: options.config.width
    })

    const imgUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `note-${format(new Date(), 'yyyyMMddHHmm')}.png`
    link.href = imgUrl
    link.click()
  } finally {
    app.unmount()
    document.body.removeChild(container)
  }
}

// 复制到剪贴板
export const copyNoteToClipboard = async (options: ShareNoteImageOptions) => {
  const { container, app } = createTempContainer(options)

  try {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const element = container.firstElementChild as HTMLElement
    const contentHeight = element.scrollHeight

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
      width: options.config.width,
      height: contentHeight || options.config.height,
      windowWidth: options.config.width
    })

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!)
      }, 'image/png')
    })

    const data = new ClipboardItem({
      'image/png': blob
    })

    await navigator.clipboard.write([data])
    return true
  } finally {
    app.unmount()
    document.body.removeChild(container)
  }
}
