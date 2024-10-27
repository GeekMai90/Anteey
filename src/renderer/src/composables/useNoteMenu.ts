import { watchEffect } from 'vue'
import { useEventBus } from '@vueuse/core'
import {
  Info,
  Star,
  Copy,
  History,
  DeleteOne,
  RightBar,
  Refresh,
  CopyLink,
  Export as ExportIcon,
  SettingTwo,
  Share,
  AdjacentItem
} from '@icon-park/vue-next'
import { useWhiteboardStore } from '../stores/whiteboardStores'
import { useUIStore } from '../stores/useUIStore'
import TurndownService from 'turndown'
import { format } from 'date-fns'
import JSZip from 'jszip'
import { ref, computed } from 'vue'
import { useNoteStore } from '../stores/noteStores'
import { useRoute, useRouter } from 'vue-router'
import { Note } from '@renderer/types/Note'
import { message } from '@renderer/utils/message'

interface NoteMenuParams {
  noteId: string
  whiteboardNoteId?: string
  whiteboardId?: string
  menuItems?: string[] // 新增：用于指定要显示的菜单项
  onRestoreDefaultHeight?: () => void // 新增：用于处理恢复默认高度的回调函数
}

export function useNoteMenu(params: NoteMenuParams) {
  const noteStore = useNoteStore()
  const uiStore = useUIStore()
  const whiteboardStore = useWhiteboardStore()
  const showConfirmModal = ref(false)
  const route = useRoute()
  const router = useRouter()
  const isPopupMenuVisible = ref(false)
  const isStarred = ref(false)

  // 关闭弹出菜单
  const closePopupMenu = () => {
    isPopupMenuVisible.value = false
  }
  // 分享笔记
  const handleShare = async () => {
    await noteStore.handleShare(params.noteId)
    closePopupMenu()
  }

  // 复制笔记引用链接
  const handleCopyNoteLink = () => {
    const noteAddress = noteStore.getNoteAddress(params.noteId)
    const noteLink = `[${noteAddress}](note://${params.noteId})`
    navigator.clipboard.writeText(noteLink)
    console.log('已复制笔记链接:', noteLink)
  }

  // 添加或移除星标收藏
  const handleStar = () => {
    if (!isStarred.value) {
      console.log('添加星标收藏')
      noteStore.addStarToNote(params.noteId)
    } else {
      console.log('移除星标收藏')
      noteStore.removeStarFromNote(params.noteId)
    }
    // 立即更新 isStarred 的值
    isStarred.value = !isStarred.value
  }
  watchEffect(() => {
    const note = noteStore.starredNotes.find((note) => note.id === params.noteId)
    isStarred.value = note?.isStarred || false
  })

  // 添加或移除右侧显示
  const handleAddToRightSidebar = async () => {
    await noteStore.addNoteToRightSidebar(params.noteId)
    await uiStore.openRightSidebar()
    noteStore.closeNoteEditor()
  }

  // 复制笔记
  const handleCopy = () => {
    console.log('复制笔记', params.noteId)
  }

  // 显示历史记录
  const handleShowHistory = () => {
    console.log('显示历史记录', params.noteId)
  }

  // 删除笔记
  const isConfirmingDelete = ref(false)
  const isDeleting = ref(false)
  let deleteTimeout: number | null = null

  const handleDelete = async () => {
    if (isDeleting.value) return false

    if (!isConfirmingDelete.value) {
      isConfirmingDelete.value = true
      deleteTimeout = window.setTimeout(() => {
        isConfirmingDelete.value = false
      }, 3000) // 3秒后重置确认状态
      return false
    } else {
      if (deleteTimeout !== null) {
        clearTimeout(deleteTimeout)
        deleteTimeout = null
      }

      isDeleting.value = true
      try {
        const result = await noteStore.moveToTrash(params.noteId)
        if (result) {
          console.log('笔记已移至回收站')
          noteStore.closeNoteEditor()

          const eventBus = useEventBus('note-deleted')
          // 触发笔记删除事件
          eventBus.emit()

          // 通过路由判断，如果在NoteExpandEditor页面，则跳转到Timeline页面
          if (route.name === 'NoteExpandEditor') {
            router.push('/timeline')
          }
          return true
        } else {
          console.error('移动笔记到回收站失败')
          return false
        }
      } catch (error) {
        console.error('删除笔记时出错:', error)
        return false
      } finally {
        isDeleting.value = false
        isConfirmingDelete.value = false
        closePopupMenu() // 确保在所有情况下都会关闭弹出菜单
      }
    }
  }

  const resetDeleteState = () => {
    isConfirmingDelete.value = false
    isDeleting.value = false
    if (deleteTimeout !== null) {
      clearTimeout(deleteTimeout)
      deleteTimeout = null
    }
  }

  const handleTrashFromWhiteboard = () => {
    console.log('移出白板', params.whiteboardNoteId)
    if (params.whiteboardNoteId) {
      whiteboardStore.deleteWhiteboardNote(params.whiteboardNoteId)
    }
    closePopupMenu()
  }

  const handleRestoreDefaultHeight = () => {
    if (params.onRestoreDefaultHeight) {
      params.onRestoreDefaultHeight()
    }
    closePopupMenu()
  }

  // 删除白板
  const handleDeleteWhiteboard = () => {
    showConfirmModal.value = true
  }

  const confirmDeleteWhiteboard = async () => {
    if (params.whiteboardId) {
      await whiteboardStore.deleteWhiteboard(params.whiteboardId)
    }
    showConfirmModal.value = false
  }

  const cancelDeleteWhiteboard = () => {
    showConfirmModal.value = false
  }

  // 导出单个笔记
  const handleExportNote = async () => {
    if (noteStore.editor && params.noteId) {
      const note = await noteStore.fetchNoteById(params.noteId)

      if (!note) {
        console.error('笔记不存在')
        return
      }

      console.log(`准备导出笔记: ${note.id}`)

      const turndownService = new TurndownService({ headingStyle: 'atx' })
      const zip = new JSZip()

      try {
        noteStore.editor.commands.setContent(note.content)
        const html = noteStore.editor.getHTML()
        let markdown = turndownService.turndown(html)

        const imageUrls = getImageUrlsFromHtml(html)

        const imagePromises = imageUrls.map(async (imageUrl) => {
          try {
            const imageData = await downloadImage(imageUrl)
            const imageName = imageUrl.split('/').pop() || 'image.png'
            zip.file(`images/${imageName}`, imageData)
            return { oldUrl: imageUrl, newUrl: `images/${imageName}` }
          } catch (error) {
            console.error(`下载图片失败: ${imageUrl}`, error)
            return null
          }
        })

        const imageResults = await Promise.all(imagePromises)

        imageResults.forEach((result) => {
          if (result) {
            markdown = markdown.replace(result.oldUrl, result.newUrl)
          }
        })

        // 处理本地图片链接
        markdown = markdown.replace(
          /!\[([^\]]*)\]\(file:\/\/\/Users\/geekmai\/Library\/Application Support\/antinet\/UserData\/images\/([^)]+)\)/g,
          '![$1](./images/$2)'
        )

        // 处理笔记链接（对于单条笔记，我们保留原始链接）
        markdown = markdown.replace(
          /\[([^\]]+)\]\(note:\/\/([^)]+)\)/g,
          (_match, linkText, noteId) => {
            return `[${linkText}](note://${noteId})`
          }
        )

        const createdAt = new Date(note.createdAt)
        const timeString = format(createdAt, 'yyyyMMddHHmm')
        let noteAddress = noteStore.getNoteAddress(note.id)
        noteAddress = sanitizeFileName(noteAddress)
        const fileName = `${noteAddress}_${timeString}.md`

        zip.file(fileName, markdown)
        console.log(`笔记处理成功: ${fileName}`)

        console.log('正在生成 zip 文件...')
        const content = await zip.generateAsync({ type: 'blob' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(content)
        link.download = `Antinet_note_export_${noteAddress}_${timeString}.zip`
        link.click()
        URL.revokeObjectURL(link.href)
        console.log(`笔记已导出到 zip 文件: ${link.download}`)
      } catch (error) {
        console.error(`处理笔记时出错 (ID: ${note.id}):`, error)
      }
    } else {
      console.error('编辑器实例不存在或笔记ID未提供')
    }
    closePopupMenu()
  }

  // 批量导出笔记
  const handleBulkExport = async () => {
    console.log('准备开始批量导出...')

    const allNotes = await noteStore.fetchAllNotes()

    if (allNotes.length === 0) {
      console.error('没有可导出的笔记')
      return
    }

    if (!noteStore.editor) {
      console.error('编辑器实例不可用')
      return
    }

    console.log(`找到 ${allNotes.length} 条笔记待导出`)

    const turndownService = new TurndownService({ headingStyle: 'atx' })
    const zip = new JSZip()

    // 创建笔记 ID 到文件名的映射
    const noteIdToFilename = new Map<string, string>()

    // 第一次遍历：创建文件名映射
    for (const note of allNotes) {
      const createdAt = new Date(note.createdAt)
      const timeString = format(createdAt, 'yyyyMMddHHmm')
      let noteAddress = noteStore.getNoteAddress(note.id)
      noteAddress = sanitizeFileName(noteAddress)
      const fileName = `${noteAddress}_${timeString}.md`
      noteIdToFilename.set(note.id, fileName)
    }

    // 第二次遍历：处理笔记内容和链接
    for (const note of allNotes) {
      if (!note.content) {
        console.warn(`笔记 ${note.id} 没有内容，跳过`)
        continue
      }

      try {
        console.log(`正在处理笔记: ${note.id}`)

        noteStore.editor.commands.setContent(note.content)
        const html = noteStore.editor.getHTML()
        let markdown = turndownService.turndown(html)

        const imageUrls = getImageUrlsFromHtml(html)

        const imagePromises = imageUrls.map(async (imageUrl) => {
          try {
            const imageData = await downloadImage(imageUrl)
            const imageName = imageUrl.split('/').pop() || 'image.png'
            zip.file(`images/${imageName}`, imageData)
            return { oldUrl: imageUrl, newUrl: `images/${imageName}` }
          } catch (error) {
            console.error(`下载图片失败: ${imageUrl}`, error)
            return null
          }
        })

        const imageResults = await Promise.all(imagePromises)

        imageResults.forEach((result) => {
          if (result) {
            markdown = markdown.replace(result.oldUrl, result.newUrl)
          }
        })

        // 处理本地图片链接
        markdown = markdown.replace(
          /!\[([^\]]*)\]\(file:\/\/\/Users\/geekmai\/Library\/Application Support\/antinet\/UserData\/images\/([^)]+)\)/g,
          '![$1](./images/$2)'
        )

        // 处理笔记链接
        markdown = markdown.replace(
          /\[([^\]]+)\]\(note:\/\/([^)]+)\)/g,
          (match, linkText, noteId) => {
            const fileName = noteIdToFilename.get(noteId)
            return fileName ? `[${linkText}](./${fileName})` : match
          }
        )

        const fileName = noteIdToFilename.get(note.id)!
        zip.file(fileName, markdown)
        console.log(`笔记处理成功: ${fileName}`)
      } catch (error) {
        console.error(`处理笔记时出错 (ID: ${note.id}):`, error)
        zip.file(`error_${note.id}.txt`, `处理此笔记时出错: ${(error as Error).message}`)
      }
    }

    try {
      console.log('正在生成 zip 文件...')
      const content = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(content)
      link.download = `Antinet_all_notes_export_${format(new Date(), 'yyyyMMddHHmm')}.zip`
      link.click()
      URL.revokeObjectURL(link.href)
      console.log(`${allNotes.length} 条笔记已导出到 zip 文件`)
    } catch (error) {
      console.error('生成 zip 文件时出错:', error)
    }
  }
  // 批量导出笔记的辅助函数
  const getImageUrlsFromHtml = (html: string): string[] => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const images = doc.getElementsByTagName('img')
    return Array.from(images).map((img) => img.src)
  }
  const downloadImage = async (url: string): Promise<ArrayBuffer> => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.arrayBuffer()
  }

  // 设置
  const handleSettings = () => {
    uiStore.openSettingsPage()
    closePopupMenu()
  }

  function sanitizeFileName(name: string): string {
    name = name.replace(/^[-_]+/, '') // 移除开头的横杠或下划线
    name = name.replace(/[/\\?%*:|"<>]/g, '_') // 替换不允许的字符为下划线
    name = name.replace(/[. ]+$/, '') // 移除结尾的点和空格
    return name
  }

  // 从笔记内容中提取第一行文本
  function extractFirstLineText(content: any): string {
    // 检查 content 是否存在且有内容
    if (
      content &&
      content.content &&
      content.content[0] &&
      content.content[0].content &&
      content.content[0].content[0] &&
      content.content[0].content[0].text
    ) {
      return content.content[0].content[0].text
    }
    return '无标题'
  }

  // 生成笔记引用
  function generateNoteReference(note: Note): string {
    // 获取笔记地址和第一行文本
    const address = note.address || ''
    const firstLineText = extractFirstLineText(note.content)

    // 组合标题：地址 + 第一行文本
    const title = `${address} ${firstLineText}`.trim()

    // 返回引用格式
    return `[[${note.id}:${title}]]`
  }

  // 复制引用
  const handleCopyQuote = async () => {
    // 1. 先通过 noteId 获取完整的笔记数据
    const note = await noteStore.fetchNoteById(params.noteId)
    if (!note) {
      console.error('笔记不存在')
      return
    }
    // 2. 生成并复制引用
    const reference = generateNoteReference(note)
    await navigator.clipboard.writeText(reference)
    // 3. 提示用户
    message.success('引用已复制')
  }

  const allMenuItems: any = computed(() => ({
    info: { name: 'info', label: '卡片信息', icon: Info, action: handleShare },
    star: {
      name: 'star',
      label: '星标收藏',
      icon: Star,
      action: handleStar,
      fill: isStarred.value ? 'var(--color-primary)' : 'var(--color-icon-menu-default)'
    },
    sidebar: {
      name: 'sidebar',
      label: '右侧显示',
      icon: RightBar,
      action: handleAddToRightSidebar
    },
    copy: { name: 'copy', label: '复制', icon: Copy, action: handleCopy },
    history: { name: 'history', label: '历史记录', icon: History, action: handleShowHistory },
    delete: {
      name: 'delete',
      label: isConfirmingDelete.value ? '确认删除' : '删除',
      icon: DeleteOne,
      action: handleDelete,
      isDangerous: isConfirmingDelete.value,
      fill: isConfirmingDelete.value ? '#ff4d4f' : 'var(--color-icon-menu-default)'
    },
    trashFromWhiteboard: {
      name: 'trashFromWhiteboard',
      label: '移出白板',
      icon: DeleteOne,
      action: handleTrashFromWhiteboard,
      isDangerous: true
    },
    restoreDefaultHeight: {
      name: 'restoreDefaultHeight',
      label: '恢复默认高度',
      icon: Refresh,
      action: handleRestoreDefaultHeight
    },
    deleteWhiteboard: {
      name: 'deleteWhiteboard',
      label: '删除思维板',
      icon: DeleteOne,
      action: handleDeleteWhiteboard,
      isDangerous: true
    },
    copyNoteLink: {
      name: 'copyNoteLink',
      label: '拷贝链接',
      icon: CopyLink,
      action: handleCopyNoteLink
    },
    exportNote: {
      name: 'exportNote',
      label: '导出笔记',
      icon: ExportIcon,
      action: handleExportNote
    },
    bulkExport: {
      name: 'bulkExport',
      label: '批量导出',
      icon: ExportIcon,
      action: handleBulkExport
    },
    settings: {
      name: 'settings',
      label: '设置',
      icon: SettingTwo,
      action: handleSettings
    },
    share: {
      name: 'share',
      label: '分享',
      icon: Share,
      action: handleShare
    },
    copyQuote: {
      name: 'copyQuote',
      label: '复制引用',
      icon: AdjacentItem,
      action: handleCopyQuote
    }
  }))

  // 根据参数生成菜单项
  const menuItems = computed(() => {
    let items
    if (params.menuItems && params.menuItems.length > 0) {
      items = params.menuItems.map((itemName) => allMenuItems.value[itemName]).filter(Boolean)
    } else {
      items = Object.values(allMenuItems.value).filter((item: any) => {
        if (item.name === 'trashFromWhiteboard' || item.name === 'restoreDefaultHeight') {
          return !!params.whiteboardNoteId
        }
        return true
      })
      // 确保 delete 项随 isConfirmingDelete 状态更新
      items = items.map((item: any) => {
        if (item.name === 'delete') {
          return {
            ...item,
            label: isConfirmingDelete.value ? '确认删除' : '删除',
            isDangerous: isConfirmingDelete.value,
            fill: isConfirmingDelete.value ? '#ff4d4f' : 'var(--color-icon-menu-default)'
          }
        }
        return item
      })
    }
    return items.length > 0 ? items : Object.values(allMenuItems.value)
  })

  return {
    menuItems,
    resetDeleteState,
    isConfirmingDelete, // 暴露这个状态，以便在需要时可以在外部访问
    handleDelete,
    showConfirmModal,
    handleDeleteWhiteboard,
    confirmDeleteWhiteboard,
    cancelDeleteWhiteboard,
    handleBulkExport
  }
}
