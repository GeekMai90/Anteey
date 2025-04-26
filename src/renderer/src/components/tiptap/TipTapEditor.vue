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

    <!-- 使用封装后的拖拽手柄组件 -->
    <editor-drag-handle
      v-if="editorInstance"
      :editor="editorInstance"
      :enabled="props.enableDragHandle"
    />

    <!-- 添加新段落区域，根据属性控制显示 -->
    <div
      v-if="editorInstance && enableAddParagraphArea"
      class="add-paragraph-area"
      @click="handleAddParagraph"
    >
      <span class="add-hint">点击新增段落</span>
    </div>

    <!-- 字数统计组件 -->
    <editor-word-counter
      v-if="editorInstance && showCharacterCountComputed"
      ref="wordCounterRef"
      :editor="editorInstance"
      :enforce-limit="uiStore.editorSettings.enforceLimit"
      :character-limit="uiStore.editorSettings.characterLimit || 500"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { Editor, EditorContent, BubbleMenu, VueNodeViewRenderer } from '@tiptap/vue-3'
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
import TiptapImage from '@renderer/components/tiptap/TiptapImage.vue'
import { SlashCommands } from '@renderer/utils/tiptap/SlashCommands'
import { slashCommandSuggestion } from '@renderer/utils/tiptap/slashCommandSuggestion'
import { CustomLink } from '@renderer/utils/tiptap/CustomLink'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
// import Details from '@tiptap-pro/extension-details'
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
import { CustomDetails } from '@renderer/utils/tiptap/CustomDetails'
import 'katex/dist/katex.min.css'
import { Mathematics } from '@tiptap-pro/extension-mathematics'
import CharacterCount from '@tiptap/extension-character-count'
import { TableOfContents, getHierarchicalIndexes } from '@tiptap-pro/extension-table-of-contents'
import TextStyleBubbleMenu from './TextStyleBubbleMenu.vue'
import EditorDragHandle from './EditorDragHandle.vue'
import EditorWordCounter from './EditorWordCounter.vue'

const noteStore = useNoteStore()
const uiStore = useUIStore()
const wordCounterRef = ref(null)

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
  },
  // 添加控制字数统计显示的属性
  showCharacterCount: {
    type: Boolean,
    default: undefined // 默认使用uiStore中的设置
  },
  // 添加控制底部新增段落区域的属性
  enableAddParagraphArea: {
    type: Boolean,
    default: true
  }
})

// 计算属性：是否显示字数统计
const showCharacterCountComputed = computed(() => {
  // 如果props中明确设置了showCharacterCount，则使用它
  // 否则使用uiStore中的设置
  return props.showCharacterCount !== undefined
    ? props.showCharacterCount
    : uiStore.editorSettings.showCharacterCount
})

const emit = defineEmits(['update:content', 'toc-update'])
const editor = ref(null)
const editorInstance = computed(() => editor.value)

const editorRootRef = ref(null)
const editorContainer = ref(null)

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

onMounted(() => {
  editor.value = new Editor({
    extensions: editorExtensions.value,
    content: props.content,
    editable: props.editable,
    noteId: props.noteId,
    onUpdate: ({ editor }) => {
      emit('update:content', editor.getJSON())
      // 不再需要直接调用updateCount()，由EditorWordCounter组件处理
    },
    editorProps: {
      handleClick: (view, pos, event) => {
        if (event.target instanceof HTMLAnchorElement) {
          return false
        }

        // 定义关闭链接菜单的函数
        const closeLinkMenus = () => {
          // 向所有TextStyleBubbleMenu组件发出关闭链接菜单的事件
          document.dispatchEvent(new CustomEvent('close-link-menus'))
        }
        closeLinkMenus()

        // 检查是否点击在编辑器的底部空白区域
        const editorRect = editorRootRef.value.$el.getBoundingClientRect()
        const contentBottom = editorRect.bottom - 40 // 减去padding-bottom的值

        // 如果点击位置在内容区域的底部
        if (event.clientY > contentBottom && event.clientY <= editorRect.bottom) {
          const { state } = view
          const { doc } = state

          // 获取文档的最后一个节点
          const lastNode = doc.lastChild

          // 检查最后一个节点是否为空段落
          const isEmpty =
            lastNode && lastNode.type.name === 'paragraph' && lastNode.content.size === 0

          console.log('最后节点状态:', {
            节点类型: lastNode ? lastNode.type.name : '无节点',
            内容大小: lastNode ? lastNode.content.size : -1,
            是否为空段落: isEmpty
          })

          // 如果最后一个节点不是空段落，添加一个新的空段落
          if (!isEmpty) {
            console.log('添加新段落')
            editor.value
              .chain()
              .focus()
              .command(({ tr }) => {
                // 在文档末尾插入新段落
                tr.insert(doc.content.size, editor.value.schema.nodes.paragraph.create())
                return true
              })
              .run()

            // 将光标移动到新创建的段落
            setTimeout(() => {
              editor.value.commands.focus('end')
              console.log('焦点已移至末尾')
            }, 0)

            return true // 阻止默认点击行为
          } else {
            console.log('最后已经是空段落，不添加新段落')
          }
        }

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
})

const destroyEditor = () => {
  if (editor.value) {
    editor.value.destroy()
    editor.value = null
  }
}

onBeforeUnmount(() => {
  // 销毁编辑器
  destroyEditor()
})

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
    // 这里不需要了，由EditorWordCounter组件处理
  }
)

// 有效字符限制的计算属性 - 仍然保留，供扩展使用
const effectiveCharacterLimit = computed(() => {
  // 如果启用了限制输入，返回设置的字符限制值
  // 如果禁用了限制输入，返回 null（表示无限制）
  return uiStore.editorSettings.enforceLimit ? uiStore.editorSettings.characterLimit : null
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
    CustomDetails.configure({
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
    CustomTaskItem.configure({
      nested: true
    }),
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
      limit: effectiveCharacterLimit.value
    }),
    TableOfContents.configure({
      getIndex: getHierarchicalIndexes,
      onUpdate: (items) => {
        emit('toc-update', items)
      }
    })
  ]
  // 移除原来的DragHandle配置，改为使用Vue组件
  return extensions
})

// 添加处理添加段落的方法
const handleAddParagraph = () => {
  if (!editor.value) return

  // 获取文档
  const doc = editor.value.state.doc

  // 获取最后一个节点
  const lastNode = doc.lastChild

  // 检查最后一个节点是否为空段落
  const isEmpty = lastNode && lastNode.type.name === 'paragraph' && lastNode.content.size === 0

  // 如果最后一个节点不是空段落，添加一个新的空段落
  if (!isEmpty) {
    editor.value
      .chain()
      .focus()
      .command(({ tr }) => {
        // 在文档末尾插入新段落
        tr.insert(doc.content.size, editor.value.schema.nodes.paragraph.create())
        return true
      })
      .run()

    // 将光标移动到新创建的段落
    setTimeout(() => {
      editor.value.commands.focus('end')
    }, 0)
  } else {
    // 如果已经有空段落，直接聚焦到末尾
    editor.value.commands.focus('end')
  }
}

defineExpose({
  focus,
  editor: editorInstance,
  // 通过ref获取字数统计组件的属性
  get characterCount() {
    return wordCounterRef.value?.characterCount || 0
  },
  get wordCount() {
    return wordCounterRef.value?.wordCount || 0
  },
  get percentage() {
    return wordCounterRef.value?.percentage || 0
  },
  // 暴露添加段落方法，方便外部调用
  handleAddParagraph
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

  .add-paragraph-area {
    position: absolute;
    left: 0;
    right: 0; // 添加right:0确保宽度占满
    bottom: 8px;
    height: 34px;
    width: auto; // 移除固定宽度
    cursor: pointer;
    border-radius: 4px;
    z-index: 5; // 确保在字数统计下方
    display: flex;
    align-items: center;
    justify-content: center;

    .add-hint {
      opacity: 0;
      transition: opacity 0.2s ease;
      color: var(--color-text-tertiary);
      font-size: 13px;
      pointer-events: none;
    }

    &:hover {
      .add-hint {
        opacity: 1;
      }
    }
  }
}
</style>
