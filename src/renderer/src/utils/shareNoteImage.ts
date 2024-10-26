import { createApp } from 'vue'
import html2canvas from 'html2canvas'
import { format } from 'date-fns'
import ShareNoteCard from '../components/ShareNotedCard.vue'
import type { Note } from '../types/Note'

interface ShareNoteImageOptions {
  note: Note
  background: string
}

// 创建临时容器并渲染组件
const createTempContainer = (options: ShareNoteImageOptions) => {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.width = '375px'
  container.style.overflow = 'visible'
  container.style.backgroundColor = '#ffffff'

  // 创建并注入临时样式表
  const styleSheet = document.createElement('style')
  styleSheet.textContent = `
    .temp-share-container * {
      color: #252525 !important;
    }
    .temp-share-container .ProseMirror {
      color: #252525 !important;
      background-color: #ffffff !important;
    }
  `
  container.className = 'temp-share-container'
  container.appendChild(styleSheet)
  document.body.appendChild(container)

  const app = createApp(ShareNoteCard, {
    note: options.note,
    background: options.background
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
    const contentHeight = element.scrollHeight

    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      backgroundColor: null,
      width: 375,
      height: contentHeight,
      windowWidth: 375
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
      width: 375,
      height: contentHeight,
      windowWidth: 375
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
