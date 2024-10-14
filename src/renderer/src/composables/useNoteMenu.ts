import { onUnmounted, watchEffect } from 'vue'
import {
  Info,
  Star,
  Copy,
  History,
  DeleteOne,
  RightBar,
  Refresh,
  CopyLink,
  Export as ExportIcon
} from '@icon-park/vue-next'
import { useWhiteboardStore } from '../stores/whiteboardStores'
import { useUIStore } from '../stores/useUIStore'
import TurndownService from 'turndown'
import { format } from 'date-fns'
import JSZip from 'jszip'
import { ref, onMounted, computed } from 'vue'
import { Editor, BubbleMenu, VueNodeViewRenderer } from '@tiptap/vue-3'
import NodeRange from '@tiptap-pro/extension-node-range'
import StarterKit from '@tiptap/starter-kit'
import Hightlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import Emoji, { gitHubEmojis } from '@tiptap-pro/extension-emoji'
import { Markdown } from 'tiptap-markdown'
import Dropcursor from '@tiptap/extension-dropcursor'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { all, createLowlight } from 'lowlight'
import Typography from '@tiptap/extension-typography'
import Image from '@tiptap/extension-image'
import TiptapImage from '../components/TiptapImage.vue'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { emojiSuggestion } from '../tiptap/suggestion'
import { SlashCommands } from '../tiptap/SlashCommands'
import { slashCommandSuggestion } from '../tiptap/slashCommandSuggestion'
import UniqueID from '@tiptap-pro/extension-unique-id'
import { CustomLink } from '../tiptap/CustomLink'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
import Details from '@tiptap-pro/extension-details'
import DetailsContent from '@tiptap-pro/extension-details-content'
import DetailsSummary from '@tiptap-pro/extension-details-summary'
import Export from '@tiptap-pro/extension-export'
import { useNoteStore } from '../stores/noteStores'

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
  // const { allNotes } = storeToRefs(useNoteStore())

  const allNotes = noteStore.allNotes

  const isPopupMenuVisible = ref(false)

  const isStarred = ref(false)

  const editor = ref<Editor | null>(null)

  onMounted(() => {
    editor.value = new Editor({
      extensions: [
        StarterKit
        // 添加其他必要的扩展，确保与主编辑器配置一致
      ],
      editable: false
    })
  })

  onUnmounted(() => {
    if (editor.value) {
      editor.value.destroy()
    }
  })
  // 扩展 Image 扩展
  const CustomImage = Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        width: {
          default: '100%',
          renderHTML: (attributes) => ({
            style: `width: ${attributes.width}`
          })
        },
        align: {
          default: 'center',
          renderHTML: (attributes) => ({
            style: `display: block; margin: ${attributes.align === 'center' ? '0 auto' : attributes.align === 'left' ? '0 auto 0 0' : '0 0 0 auto'}`
          })
        }
      }
    },
    addNodeView() {
      return VueNodeViewRenderer(TiptapImage as any)
    }
  })
  const lowlight = createLowlight(all)
  const editorExtensions = computed(() => {
    const extensions = [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        },
        dropcursor: false,
        codeBlock: false
      }),
      BubbleMenu,
      Markdown.configure({
        transformPastedText: true, // 启用 Markdown 粘贴文本转换
        transformCopiedText: true // 复制的文本转换为Markdown
      }),
      Hightlight,
      CustomLink.configure({
        openOnClick: false,
        validate: (url) => /^(https?:\/\/|note:\/\/)/.test(url)
      }),
      Underline,
      Subscript,
      Superscript,
      Emoji.configure({
        emojis: gitHubEmojis,
        enableEmoticons: true,
        suggestion: emojiSuggestion
      }),
      // 斜杠命令菜单
      SlashCommands.configure({
        suggestion: slashCommandSuggestion
      }),
      Dropcursor.configure({
        color: 'var(--color-primary)',
        width: 2
      }),
      Placeholder.configure({
        placeholder: '记录思考，或输入 / 命令'
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'plaintext'
      }),
      Typography,
      CustomImage,
      TaskList,
      Details.configure({
        persist: true,
        HTMLAttributes: {
          class: 'details'
        }
      }),
      DetailsSummary,
      DetailsContent,
      Export,
      TextAlign.configure({
        types: ['paragraph', 'heading']
      }),
      TaskItem.configure({
        nested: true
      }),
      UniqueID.configure({
        types: ['heading', 'paragraph']
      }),
      NodeRange.configure({
        key: null,
        depth: undefined
      })
    ]
    return extensions
  })

  onMounted(() => {
    editor.value = new Editor({
      extensions: editorExtensions.value as any,
      content: '',
      editable: false
    })
  })

  const handleBulkExport = async () => {
    console.log('Starting bulk export...')
    const allNotes = noteStore.allNotes

    if (allNotes.length === 0) {
      console.error('No notes to export')
      return
    }

    if (!editor.value) {
      console.error('Editor instance not available')
      return
    }

    console.log(`Found ${allNotes.length} notes to export`)

    const turndownService = new TurndownService({ headingStyle: 'atx' })
    const zip = new JSZip()

    for (const note of allNotes) {
      if (note.content) {
        try {
          console.log(`Processing note: ${note.id}`)
          editor.value.commands.setContent(note.content)
          const html = editor.value.getHTML()
          const markdown = turndownService.turndown(html)

          const createdAt = new Date(note.createdAt)
          const timeString = format(createdAt, 'yyyyMMddHHmm')
          let noteAddress = noteStore.getNoteAddress(note.id)
          noteAddress = sanitizeFileName(noteAddress)
          const fileName = `${noteAddress}_${timeString}.md`

          zip.file(fileName, markdown)
          console.log(`Note processed successfully: ${fileName}`)
        } catch (error) {
          console.error(`Error processing note (ID: ${note.id}):`, error)
          zip.file(
            `error_${note.id}.txt`,
            `Error processing this note: ${(error as Error).message}`
          )
        }
      }
    }

    try {
      console.log('Generating zip file...')
      const content = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(content)
      link.download = `all_notes_export_${format(new Date(), 'yyyyMMddHHmm')}.zip`
      link.click()
      URL.revokeObjectURL(link.href)
      console.log(`${allNotes.length} notes exported to zip file`)
    } catch (error) {
      console.error('Error generating zip file:', error)
    }
  }

  // 原有代码

  watchEffect(() => {
    const note = allNotes.find((note) => note.id === params.noteId)
    isStarred.value = note?.isStarred || false
  })

  const closePopupMenu = () => {
    isPopupMenuVisible.value = false
  }

  const handleShare = () => {
    console.log('分享笔记', params.noteId)
  }

  // 复制笔记引用链接
  const handleCopyNoteLink = () => {
    const noteAddress = noteStore.getNoteAddress(params.noteId)
    const noteLink = `[${noteAddress}](note://${params.noteId})`
    navigator.clipboard.writeText(noteLink)
    console.log('已复制笔记链接:', noteLink)
  }

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

  const handleAddToRightSidebar = async () => {
    await noteStore.addNoteToRightSidebar(params.noteId)
    await uiStore.openRightSidebar()
    noteStore.closeNoteEditor()
  }

  const handleCopy = () => {
    console.log('复制笔记', params.noteId)
  }

  const handleShowHistory = () => {
    console.log('显示历史记录', params.noteId)
  }

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
        const success = await noteStore.moveToTrash(params.noteId)
        if (success) {
          console.log('笔记已移至回收站')
          noteStore.closeNoteEditor()
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
        closePopupMenu()
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

  // 导出笔记
  const handleExportNote = () => {
    if (noteStore.editor && params.noteId) {
      const html = noteStore.editor.getHTML()
      const turndownService = new TurndownService({
        headingStyle: 'atx' // 使用 # 符号作为标题
      })

      // ... Turndown 规则设置 ...

      const markdown = turndownService.turndown(html)

      // 获取笔记的 address 和创建时间
      let noteAddress = noteStore.getNoteAddress(params.noteId)
      const note = noteStore.getNoteById(params.noteId)

      if (!note) {
        console.error('笔记不存在')
        return
      }

      const createdAt = new Date(note.createdAt)
      const timeString = format(createdAt, 'yyyyMMddHHmm')
      // 清理文件名
      const sanitizeFileName = (name: string): string => {
        return name
          .replace(/^[-_]+/, '') // 移除开头的横杠或下划线
          .replace(/[/\\?%*:|"<>]/g, '_') // 替换不允许的字符为下划线
          .replace(/[. ]+$/, '') // 移除结尾的点和空格
      }
      noteAddress = sanitizeFileName(noteAddress)

      // 创建文件名，包含时间戳和 address
      const fileName = `${noteAddress}_${timeString}.md`

      // 创建 Blob 对象
      const blob = new Blob([markdown], { type: 'text/markdown' })

      // 创建下载链接
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = fileName

      // 触发下载
      link.click()

      // 清理 URL 对象
      URL.revokeObjectURL(link.href)

      console.log(`笔记已导出为 Markdown: ${fileName}`)
    } else {
      console.error('编辑器实例不存在或笔记ID未提供')
    }
    closePopupMenu()
  }

  // 批量导出笔记
  // const handleBulkExport = async () => {
  //   const allNotes = noteStore.allNotes

  //   if (allNotes.length === 0) {
  //     console.error('没有可导出的笔记')
  //     return
  //   }

  //   const turndownService = new TurndownService({
  //     headingStyle: 'atx'
  //   })

  //   // 创建一个临时的 Vue 应用来包含 TipTapEditor
  //   const tempApp = createApp({
  //     components: { TipTapEditor },
  //     setup() {
  //       const editorRef = ref(null)
  //       return { editorRef }
  //     },
  //     template: '<TipTapEditor ref="editorRef" :content="{}" :editable="false" />'
  //   })

  //   const tempRoot = document.createElement('div')
  //   document.body.appendChild(tempRoot)
  //   const vm = tempApp.mount(tempRoot)

  //   // 等待编辑器实例创建完成
  //   await new Promise((resolve) => setTimeout(resolve, 0))

  //   const zip = new JSZip()

  //   for (const note of allNotes) {
  //     if (note.content) {
  //       try {
  //         // 设置笔记内容到编辑器
  //         ;(vm.$refs.editorRef as any).editor.commands.setContent(note.content)

  //         // 获取 HTML 内容
  //         const html = (vm.$refs.editorRef as any).editor.getHTML()

  //         const markdown = turndownService.turndown(html)

  //         const createdAt = new Date(note.createdAt)
  //         const timeString = format(createdAt, 'yyyyMMddHHmm')

  //         let noteAddress = noteStore.getNoteAddress(note.id)
  //         noteAddress = sanitizeFileName(noteAddress)

  //         const fileName = `${noteAddress}_${timeString}.md`

  //         zip.file(fileName, markdown)

  //         console.log(`成功处理笔记: ${fileName}`)
  //       } catch (error: unknown) {
  //         console.error(`处理笔记时出错 (ID: ${note.id}):`, error)
  //         zip.file(`error_${note.id}.txt`, `处理此笔记时出错: ${(error as Error).message}`)
  //       }
  //     }
  //   }

  //   // 清理临时 Vue 应用
  //   ;(vm.$refs.editorRef as any).editor.destroy()
  //   tempApp.unmount()
  //   document.body.removeChild(tempRoot)

  //   try {
  //     const content = await zip.generateAsync({ type: 'blob' })

  //     const link = document.createElement('a')
  //     link.href = URL.createObjectURL(content)
  //     link.download = `all_notes_export_${format(new Date(), 'yyyyMMddHHmm')}.zip`

  //     link.click()

  //     URL.revokeObjectURL(link.href)

  //     console.log(`${allNotes.length} 个笔记已导出为 zip 文件`)
  //   } catch (error: unknown) {
  //     console.error('生成 zip 文件时出错:', error)
  //   }
  // }

  function sanitizeFileName(name: string): string {
    name = name.replace(/^[-_]+/, '') // 移除开头的横杠或下划线
    name = name.replace(/[/\\?%*:|"<>]/g, '_') // 替换不允许的字符为下划线
    name = name.replace(/[. ]+$/, '') // 移除结尾的点和空格
    return name
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
      label: '删除白板',
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
    }
  }))

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
    console.log('Computed menuItems:', items)
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
    cancelDeleteWhiteboard
  }
}
