<template>
  <div ref="editorContainer" class="editor-wrapper">
    <editor-content
      ref="editorRootRef"
      :editor="editorInstance"
      class="tiptap-container"
      :spellcheck="uiStore.editorSettings.enableSpellcheck"
    />
    <!-- 文字样式菜单 -->
    <text-style-bubble-menu v-if="editorInstance" :editor="editorInstance" />
    <!-- 表格工具菜单 -->
    <table-bubble-menu v-if="editorInstance" :editor="editorInstance" />
    <!-- 拖拽块上下文菜单 -->
    <div
      v-if="showContextMenu"
      class="context-menu"
      :style="{ top: `${contextMenuY}px`, left: `${contextMenuX}px` }"
    >
      <div class="context-menu-item" @click="clearFormatting">
        <div class="icon">
          <Format theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
        <div class="name">清空格式</div>
      </div>
      <div class="context-menu-item" @click="clearStyle">
        <div class="icon">
          <ClearFormat
            theme="outline"
            size="16"
            fill="var(--color-icon-primary)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">清空样式</div>
      </div>
      <div class="context-menu-item" @click="copyToClipboard">
        <div class="icon">
          <Copy theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
        <div class="name">复制到剪贴板</div>
      </div>
      <div class="context-menu-item" @click="insertParagraphBelow">
        <div class="icon">
          <Plus theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
        <div class="name">在下方插入段落</div>
      </div>
      <div class="context-menu-item delete" @click="deleteParagraph">
        <div class="icon">
          <Delete theme="outline" size="16" fill="var(--color-danger)" :strokeWidth="3" />
        </div>
        <div class="name">删除段落</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { Editor, EditorContent, BubbleMenu, VueNodeViewRenderer } from '@tiptap/vue-3'
import DragHandle from '@tiptap-pro/extension-drag-handle'
import NodeRange from '@tiptap-pro/extension-node-range'
import StarterKit from '@tiptap/starter-kit'
import Hightlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import { Markdown } from 'tiptap-markdown'
import Dropcursor from '@tiptap/extension-dropcursor'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import FileHandler from '@tiptap-pro/extension-file-handler'
import Image from '@tiptap/extension-image'
import { ClearFormat, Copy, Delete, Format, Plus } from '@icon-park/vue-next'
import TiptapImage from '@renderer/components/tiptap/TiptapImage.vue'
import { SlashCommands } from '@renderer/utils/tiptap/SlashCommands'
import { slashCommandSuggestion } from '@renderer/utils/tiptap/slashCommandSuggestion'
import { CustomLink } from '@renderer/utils/tiptap/CustomLink'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
import Details from '@tiptap-pro/extension-details'
import Emoji from '@tiptap-pro/extension-emoji'
import DetailsContent from '@tiptap-pro/extension-details-content'
import DetailsSummary from '@tiptap-pro/extension-details-summary'
import Export from '@tiptap-pro/extension-export'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useUIStore } from '@renderer/stores/UIStore'
import { CustomCodeBlock } from '@renderer/utils/tiptap/CustomCodeBlock'
import { CustomTextStyle } from '@renderer/utils/tiptap/CustomTextStyle'
import { CustomTable, TableRow, TableHeader, TableCell } from '@renderer/utils/tiptap/CustomTable'
import TableBubbleMenu from './TableBubbleMenu.vue'
import { CustomBlockquote } from '@renderer/utils/tiptap/CustomBlockquote'
import { CustomTaskList } from '@renderer/utils/tiptap/CustomTaskList'
import { CustomTaskItem } from '@renderer/utils/tiptap/CustomTaskItem'
import { CustomMention } from '@renderer/utils/tiptap/CustomMention'
import 'katex/dist/katex.min.css'
import { Mathematics } from '@tiptap-pro/extension-mathematics'
import CharacterCount from '@tiptap/extension-character-count'
import { TableOfContents, getHierarchicalIndexes } from '@tiptap-pro/extension-table-of-contents'
import TextStyleBubbleMenu from './TextStyleBubbleMenu.vue'

const noteStore = useNoteStore()
const uiStore = useUIStore()

const props = defineProps({
  content: {
    type: [String, Object],
    default: ''
  },
  editable: {
    type: Boolean,
    default: true
  },
  enableDragHandle: {
    type: Boolean,
    default: true
  },
  // 添加 noteId 属性
  noteId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:content', 'toc-update'])
const editor = ref(null)
const editorInstance = computed(() => editor.value)

const editorRootRef = ref(null)

// 图片上传
const handleFileUpload = async (file) => {
  if (!file) {
    console.error('没有文件被上传')
    return null
  }

  try {
    // 转换为 ArrayBuffer 并上传
    const arrayBuffer = await file.arrayBuffer()
    const imagePath = await window.electronAPI.image.uploadImageData(arrayBuffer)
    return imagePath
  } catch (error) {
    console.error('处理文件上传时出错:', error)
    message.error('上传图片失败')
    return null
  }
}

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
          style: `display: block; margin: ${
            attributes.align === 'center'
              ? '0 auto'
              : attributes.align === 'left'
                ? '0 auto 0 0'
                : '0 0 0 auto'
          }`
        })
      }
    }
  },
  addNodeView() {
    return VueNodeViewRenderer(TiptapImage)
  }
})

//拖拽块菜单
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const currentParagraph = ref(null)

const currentHoveredNode = ref(null)
const editorContainer = ref(null)

const getContextMenuPosition = (event) => {
  if (editorContainer.value) {
    const containerRect = editorContainer.value.getBoundingClientRect()
    return {
      x: event.clientX - containerRect.left,
      y: event.clientY - containerRect.top
    }
  }
  return { x: 0, y: 0 }
}

const closeContextMenu = (event) => {
  // 检查点击是否在上下文菜单部
  if (showContextMenu.value && !event.target.closest('.context-menu')) {
    showContextMenu.value = false
  }
}
onMounted(() => {
  // 添加全点击事件监听器
  document.addEventListener('click', closeContextMenu)
})

onBeforeUnmount(() => {
  // 移除全局点击事件监听器
  document.removeEventListener('click', closeContextMenu)
})

// 拖拽块点击功能
const handleDragHandleClick = (event) => {
  event.preventDefault()
  event.stopPropagation()

  if (!editor.value || !currentHoveredNode.value || currentNodePos.value === -1) {
    console.log('编辑器实例或节点未找到')
    return
  }

  // 直接使用存储的位置
  editor.value.commands.setNodeSelection(currentNodePos.value)

  // 设置上下文菜单位置
  const { x, y } = getContextMenuPosition(event)
  showContextMenu.value = true
  contextMenuX.value = x - 5
  contextMenuY.value = y + 10
  currentParagraph.value = currentHoveredNode.value
}

// 添加清空格式
const clearFormatting = () => {
  if (currentParagraph.value && editor.value) {
    editor.value.chain().focus().clearNodes().unsetAllMarks().setParagraph().run()
  }
  showContextMenu.value = false
}
// 清空样式
const clearStyle = () => {
  if (currentParagraph.value && editor.value) {
    editor.value.chain().focus().unsetAllMarks().run()
  }
  showContextMenu.value = false
}
// 复制到剪贴板
const copyToClipboard = () => {
  if (currentParagraph.value) {
    navigator.clipboard.writeText(currentParagraph.value.textContent)
  }
  showContextMenu.value = false
}
// 删除段落
const deleteParagraph = () => {
  if (!editor.value || !currentParagraph.value) {
    console.log('无法删除：编辑器或当前段落未定义')
    return
  }

  try {
    const { state } = editor.value
    const { selection } = state
    const { from } = selection
    const $pos = state.doc.resolve(from)
    const currentNode = $pos.node()
    const nodeType = currentNode?.type.name

    // 理表格节点
    if (
      nodeType === 'table' ||
      nodeType === 'tableRow' ||
      nodeType === 'tableCell' ||
      nodeType === 'tableHeader'
    ) {
      let depth = $pos.depth
      while (depth > 0) {
        const node = $pos.node(depth)
        if (node.type.name === 'table') {
          const start = $pos.before(depth)
          const end = start + node.nodeSize

          editor.value.chain().focus().deleteRange({ from: start, to: end }).run()
          break
        }
        depth--
      }
    } else {
      // 其他节点的处理
      editor.value
        .chain()
        .focus()
        // 1. 清除所有标记和样式
        .unsetAllMarks()
        .clearNodes()
        // 2. 根据节点类型执行删除
        .command(({ commands }) => {
          switch (nodeType) {
            case 'bulletList':
              return commands.deleteNode('bulletList')
            case 'orderedList':
              return commands.deleteNode('orderedList')
            case 'taskList':
              return commands.deleteNode('taskList')
            case 'blockquote':
              return commands.deleteNode('blockquote')
            case 'heading':
              return commands.deleteNode('heading')
            default:
              return commands.deleteNode('paragraph')
          }
        })
        // 3. 如果需要，插入空段落
        .command(({ state, commands }) => {
          if (state.doc.content.size === 0) {
            return commands.insertContent({ type: 'paragraph' })
          }
          return true
        })
        .run()
    }

    // 触发内容更新
    emit('update:content', editor.value.getJSON())
  } catch (error) {
    console.error('删除节点时出错:', error)
  }

  showContextMenu.value = false
  currentParagraph.value = null
}

// 添加插入段落的方法
const insertParagraphBelow = () => {
  if (!editor.value || !currentParagraph.value) {
    console.log('无法插入：编辑器或当前段落未定义')
    return
  }

  try {
    const { state } = editor.value
    const { selection } = state
    const { from } = selection
    const $pos = state.doc.resolve(from)

    // 处理表格的特殊情况
    let depth = $pos.depth
    let tablePos = -1

    // 查找表格节点
    while (depth > 0) {
      const node = $pos.node(depth)
      if (node.type.name === 'table') {
        tablePos = $pos.before(depth)
        break
      }
      depth--
    }

    if (tablePos !== -1) {
      // 如果是表格，保持原有的处理逻辑
      const tableNode = $pos.node(depth)
      const tableEnd = tablePos + tableNode.nodeSize

      editor.value
        .chain()
        .focus()
        .insertContentAt(tableEnd, {
          type: 'paragraph',
          content: []
        })
        .focus(tableEnd + 1)
        .run()
    } else {
      // 非表格节点使用 createParagraphNear 命令
      editor.value.chain().focus().createParagraphNear().run()
    }

    showContextMenu.value = false
    currentParagraph.value = null
  } catch (error) {
    console.error('插入段落时出错:', error)
  }
}

// 添加一个新的 ref 来存储节点位置
const currentNodePos = ref(-1)

// 添加字数统计的响应式变量
const characterCount = ref(0)
const wordCount = ref(0)

// 更新字数统计的函数
const updateCount = () => {
  if (editor.value) {
    // 获取文本内容
    const text = editor.value.getText()

    // 更新字符数 - 一个汉字算一个字符，排除空格
    const filteredText = text.replace(/\s+/g, '') // 移除所有空白字符
    characterCount.value = [...filteredText].length

    // 更新词数 - 优化中文分词逻辑
    // 匹配中文字符、英文单词、数字
    const matches = text.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+|[0-9]+/g)
    wordCount.value = matches ? matches.length : 0
  }
}

// 添加字符限制 - 从 UIStore 获取
const characterLimit = computed(() => uiStore.editorSettings.characterLimit || 500)

// 添加有效字符限制的计算属性
const effectiveCharacterLimit = computed(() => {
  // 如果启用了限制输入，返回设置的字符限制值
  // 如果禁用了限制输入，返回 null（表示无限制）
  return uiStore.editorSettings.enforceLimit ? characterLimit.value : null
})

// 添加百分比计算
const percentage = computed(() => {
  if (characterLimit.value === 0) return 0 // 如果限制为0（无限制），则百分比为0
  return Math.round((100 / characterLimit.value) * characterCount.value)
})

// 在 editorExtensions computed 属性中修改 DragHandle 配置
const editorExtensions = computed(() => {
  const extensions = [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4]
      },
      dropcursor: false,
      codeBlock: false,
      keymap: {
        Escape: ({ editor }) => {
          editor.commands.blur()
          return true
        }
      },
      table: false,
      blockquote: false
    }),
    BubbleMenu,
    Emoji,
    CustomBlockquote,
    CustomTable.configure({
      resizable: true,
      handleWidth: 4,
      cellMinWidth: 100,
      lastColumnResizable: true,
      HTMLAttributes: {
        class: 'custom-table'
      }
    }),
    TableRow.configure({
      HTMLAttributes: {
        class: 'table-row'
      }
    }),
    TableHeader.configure({
      HTMLAttributes: {
        class: 'table-header'
      }
    }),
    TableCell.configure({
      HTMLAttributes: {
        class: 'table-cell'
      }
    }),
    Markdown.configure({
      transformPastedText: true, // 启用 Markdown 粘贴文本转换
      transformCopiedText: true, // 复制的文本转为Markdown
      html: true, // 启用 HTML 支持
      tightLists: true,
      tightListClass: 'tight',
      bulletListMarker: '-',
      linkify: true,
      breaks: true,
      transformPastedHTML: true,
      // 添加表格的特殊处理
      extensions: [
        {
          name: 'table',
          type: 'node',
          toMarkdown: {
            match: (node) => node.type.name === 'table',
            runner: (state, node) => {
              state.renderContent(node)
            }
          },
          parseMarkdown: {
            match: (node) => node.type === 'table',
            runner: (state, node) => {
              state.addNode('table', {}, node.children)
            }
          }
        }
      ]
    }),
    Hightlight,
    CustomLink.configure({
      openOnClick: false,
      parseMarkdown: true,
      noteId: props.noteId,
      validate: (url) => /^(https?:\/\/|note:\/\/)/.test(url)
    }),
    Underline,
    Subscript,
    Superscript,
    // 斜杠命令菜单
    SlashCommands.configure({
      suggestion: slashCommandSuggestion
    }),
    Dropcursor.configure({
      color: 'var(--color-primary)',
      width: 2
    }),
    Placeholder.configure({
      showOnlyWhenEditable: false, // 在非编辑状态下也显示占位符
      placeholder: ({ node }) => {
        if (node.type.name === 'heading') {
          return '输入标题'
        }

        return '记录思考，输入 / 命令'
      }
    }),
    CustomCodeBlock,
    Typography,
    CustomImage,
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
    CustomTaskList.configure({
      HTMLAttributes: {
        class: 'task-list'
      }
    }),
    // TaskItem.configure({
    //   nested: true
    // }),
    CustomTaskItem.configure({
      nested: true
    }),
    // UniqueID.configure({
    //   types: ['heading', 'paragraph']
    // }),
    FileHandler.configure({
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
      onDrop: async (currentEditor, files, pos) => {
        for (const file of files) {
          try {
            const imageUrl = await handleFileUpload(file)
            if (imageUrl) {
              currentEditor
                .chain()
                .insertContentAt(pos, {
                  type: 'image',
                  attrs: {
                    src: imageUrl,
                    width: '100%',
                    align: 'center'
                  }
                })
                .focus()
                .run()
            }
          } catch (error) {
            console.error('Error handling dropped file:', file.name, error)
          }
        }
      },
      onPaste: async (currentEditor, files) => {
        for (const file of files) {
          try {
            const imageUrl = await handleFileUpload(file)
            if (imageUrl) {
              currentEditor
                .chain()
                .insertContentAt(currentEditor.state.selection.anchor, {
                  type: 'image',
                  attrs: {
                    src: imageUrl,
                    width: '100%',
                    align: 'center'
                  }
                })
                .focus()
                .run()
            }
          } catch (error) {
            console.error('Error handling pasted file:', file.name, error)
          }
        }
      }
    }),
    NodeRange.configure({
      key: null,
      depth: undefined
    }),
    CustomTextStyle,
    // 添加 Mention 扩展
    CustomMention.configure({
      suggestion: {
        char: '@',
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run()
          const linkText = props.title || props.address
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'text',
              text: linkText,
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: `note://${props.id}`,
                    class: 'note-reference-link',
                    'data-note-id': props.id
                  }
                }
              ]
            })
            .run()
        }
      },
      noteId: props.noteId
    }),
    // 数学公式扩展
    Mathematics.configure({
      katexOptions: {
        throwOnError: false,
        strict: false
      }
    }),
    // 添加字数统计扩展
    CharacterCount.configure({
      // 使用有效字符限制计算属性
      limit: effectiveCharacterLimit.value,
      // 自定义计数函数，排除空格
      textCounter: (text) => {
        // 移除所有空白字符
        const filteredText = text.replace(/\s+/g, '')
        // 使用扩展运算符将字符串分割为字符数组，然后计算长度
        return [...filteredText].length
      },
      // 自定义中文分词
      wordCounter: (text) => {
        // 匹配中文字符、英文单词和数字
        const matches = text.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+|[0-9]+/g)
        return matches ? matches.length : 0
      }
    }),
    TableOfContents.configure({
      getIndex: getHierarchicalIndexes,
      onUpdate: (items) => {
        emit('toc-update', items)
      }
    })
  ]
  if (props.enableDragHandle) {
    extensions.push(
      DragHandle.configure({
        render() {
          const element = document.createElement('div')
          element.classList.add('custom-drag-handle')
          element.addEventListener('click', handleDragHandleClick)
          return element
        },
        onNodeChange: ({ node, pos }) => {
          // 使用 pos 参数
          if (!node || pos === -1) {
            currentHoveredNode.value = null
            currentNodePos.value = -1
            return
          }
          currentHoveredNode.value = node
          currentNodePos.value = pos
        }
      })
    )
  }
  return extensions
})

onMounted(() => {
  editor.value = new Editor({
    extensions: editorExtensions.value,
    content: props.content,
    editable: props.editable,
    noteId: props.noteId,
    onUpdate: ({ editor }) => {
      emit('update:content', editor.getJSON())
      // 添加字数统计更新
      updateCount()
    },
    editorProps: {
      handleClick: (view, pos, event) => {
        if (event.target instanceof HTMLAnchorElement) {
          // 由于TextStyleBubbleMenu中已经有处理链接点击的逻辑
          // 所以我们不在这里重复实现，直接返回true让事件继续传播
          return false // 允许继续冒泡给TextStyleBubbleMenu处理
        }
        // 定义关闭链接菜单的函数
        const closeLinkMenus = () => {
          // 向所有TextStyleBubbleMenu组件发出关闭链接菜单的事件
          document.dispatchEvent(new CustomEvent('close-link-menus'))
        }
        closeLinkMenus()
        return false // 允许 Tiptap 处理其他点击
      },
      // 添加 handleKeyDown 处理函数
      handleKeyDown: (view, event) => {
        if (event.key === 'Escape') {
          const { state } = view
          const { selection } = state
          const { $from } = selection

          // 获取当前光标所在的最近的块级节点
          let depth = $from.depth
          while (depth > 0) {
            const node = $from.node(depth)
            if (node.type.isBlock) {
              // 使用 selectParentNode 命令来选中块
              editor.value.commands.selectParentNode()
              return true
            }
            depth--
          }

          // 如果没有找到块级节点，则失去焦点
          editor.value.commands.blur()
          return true
        }
        return false
      },
      noteId: props.noteId
    }
  })
  noteStore.setEditor(editor.value)
  // 初始化字数统计
  updateCount()
})

const destroyEditor = () => {
  if (editor.value) {
    editor.value.destroy()
    editor.value = null
  }
}

onBeforeUnmount(destroyEditor)

watch(
  () => props.editable,
  (newEditable) => {
    if (editor.value) {
      editor.value.setEditable(newEditable)
    }
  },
  { immediate: true }
)

const focus = () => {
  nextTick(() => {
    if (editor.value && props.editable) {
      editor.value.commands.focus('start')
    }
  })
}

watch(
  () => props.content,
  (newContent) => {
    if (editor.value && newContent !== undefined) {
      const editorContent = editor.value.getJSON()
      if (JSON.stringify(editorContent) !== JSON.stringify(newContent)) {
        editor.value.commands.setContent(newContent, false)
      }
    }
  },
  { deep: true }
)

// 替换为监听 uiStore.editorSettings 的变化
watch(
  [() => uiStore.editorSettings.enforceLimit, () => uiStore.editorSettings.characterLimit],
  () => {
    if (editor.value) {
      // 直接更新编辑器的 CharacterCount 扩展配置
      editor.value.extensionManager.extensions.forEach((extension) => {
        if (extension.name === 'characterCount') {
          // 更新 limit 配置
          extension.options.limit = effectiveCharacterLimit.value

          // 如果需要，可以在这里触发编辑器的更新
          editor.value.view.dispatch(editor.value.state.tr)
        }
      })

      // 更新字数统计
      updateCount()
    }
  }
)

defineExpose({
  focus,
  editor: editorInstance,
  // 暴露字数统计相关的属性和方法
  characterCount,
  wordCount,
  characterLimit,
  percentage,
  updateCount
})
</script>

<style lang="scss">
.editor-wrapper {
  width: 100%;
  height: 100%;
  position: relative;

  .tiptap-container {
    padding-bottom: 40px; // 为字数统计留出空间
  }
}

/* Bubble menu */
.bubble-menu {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: var(--shadow-card);
  display: flex;
  padding: 4px 8px;
  flex-wrap: wrap;
  gap: 2px;
  max-width: 500px;
  width: max-content;
  z-index: 1000;

  button {
    background-color: unset;
    border-radius: 8px;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 30px;

    .icon {
      background: none;
      border: none;
      cursor: pointer;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      padding: 0;

      .i-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }

      svg {
        width: 14px;
        height: 14px;
      }
    }

    &:hover {
      background-color: var(--color-hover-button);
    }

    &.is-active {
      background-color: var(--color-hover-button);

      &:hover {
        background-color: var(--color-hover-button);
      }
    }
  }
}

.context-menu {
  position: absolute;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 9999;
  min-width: 180px;
  width: max-content;
  max-width: 300px;
  overflow-y: auto;
  padding: 6px 12px;
  white-space: nowrap;
  max-width: 100vw; // 确保不超过视口宽
  overflow-x: hidden; // 防止水平溢出
  align-items: center;
}

.context-menu-item {
  position: relative;
  display: flex;
  align-items: center;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
  padding: 4px 4px;
  margin: 2px;

  &:hover {
    background-color: var(--color-hover-button);
  }

  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;
    flex-shrink: 0;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .i-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 16px;
      height: 16px;
    }
  }

  .name {
    flex-grow: 1;
    text-align: left;
    line-height: 1;
    color: var(---color-text-primary);
    font-size: 13px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    overflow: hidden;
    text-overflow: ellipsis;
    align-items: center;
    justify-content: center;
  }
  &.delete {
    color: var(--color-danger);
  }

  &:hover {
    background-color: var(--color-hover-button);
  }
}
</style>
