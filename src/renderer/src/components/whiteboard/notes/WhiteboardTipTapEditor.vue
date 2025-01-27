<template>
  <div ref="editorContainer" class="editor-wrapper">
    <editor-content ref="editorRootRef" :editor="editorInstance" class="tiptap-container" />
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

import { CustomCodeBlock } from '@renderer/utils/tiptap/CustomCodeBlock'
import { CustomTextStyle } from '@renderer/utils/tiptap/CustomTextStyle'
import { CustomTable, TableRow, TableHeader, TableCell } from '@renderer/utils/tiptap/CustomTable'
import { CustomBlockquote } from '@renderer/utils/tiptap/CustomBlockquote'
import { CustomTaskList } from '@renderer/utils/tiptap/CustomTaskList'
import { CustomTaskItem } from '@renderer/utils/tiptap/CustomTaskItem'
import { CustomMention } from '@renderer/utils/tiptap/CustomMention'

const noteStore = useNoteStore()

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

const emit = defineEmits(['update:content'])
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
    // 先转换为 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    // 使用新的 API，传入 noteId
    // const result = await window.electronAPI.image.uploadImage(file.path, props.noteId)
    const result = await window.electronAPI.image.uploadImageData(arrayBuffer, props.noteId)
    if (result.path) {
      return result.path
    } else {
      console.error('上传图片失败')
      return null
    }
  } catch (error) {
    console.error('处理文件上传时出错:', error)
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
          style: `display: block; margin: ${attributes.align === 'center' ? '0 auto' : attributes.align === 'left' ? '0 auto 0 0' : '0 0 0 auto'}`
        })
      }
    }
  },
  addNodeView() {
    return VueNodeViewRenderer(TiptapImage, {
      props: {
        noteId: props.noteId,
        onDelete: async (imageId) => {
          try {
            await window.electronAPI.image.removeImageFromNote(props.noteId, imageId)
            return true
          } catch (error) {
            console.error('删除图片失败:', error)
            return false
          }
        }
      }
    })
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

// 添加一个新的 ref 来存储节点位置
const currentNodePos = ref(-1)

// 在 editorExtensions computed 属性中修改 DragHandle 配置
const editorExtensions = computed(() => {
  const extensions = [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3]
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
    // Placeholder.configure({
    //   placeholder: '记录考，或输入 / 命令'
    // }),
    Placeholder.configure({
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
    },
    editorProps: {
      handleClick: (view, pos, event) => {
        if (event.target instanceof HTMLAnchorElement) {
          handleLinkClick(event)
          return true // 阻止 Tiptap 的默认行为
        }
        closeLinkMenus()
        return false // 允许 Tiptap 处理其他点击
      },
      // 添加 handleKeyDown 处理函数
      handleKeyDown: (view, event) => {
        if (event.key === 'Escape') {
          editor.value.commands.blur()
          return true // 阻止事件进一步传播
        }
        return false // 允许其他键盘事件正常处理
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
defineExpose({
  focus,
  editor: editorInstance
})
</script>

<style lang="scss">
.editor-wrapper {
  width: 100%;
  height: 100%;
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

.editor-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
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
    color: var(--default-text-color);
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
    color: var(--color-text-danger);
  }

  &:hover {
    background-color: var(--color-hover-button);
  }
}

.link-input-menu {
  position: absolute;
  z-index: 10;
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: var(--shadow-primary);
  width: 360px;

  .link-input-fields {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .link-input-field {
    display: flex;
    align-items: center;
    // background-color: var(--color-bg-secondary);
    border-radius: 6px;
    overflow: hidden;

    .icon {
      background: none;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;

      margin-right: 4px;
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

    input {
      flex-grow: 1;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: none;
      padding: 3px 12px;
      height: 30px;
      font-size: 14px;
      line-height: 1;
      color: var(--color-text-primary);

      &::placeholder {
        color: var(--color-text-tertiary);
      }

      &:focus {
        outline: none;
      }
    }
  }

  .link-input-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;

    button {
      padding: 6px 12px;
      background-color: var(--color-primary);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;

      &:last-child {
        // background-color: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        color: var(--color-text-primary);
      }

      &:hover {
        opacity: 0.9;
      }
    }
  }
}
.dropdown-trigger {
  position: relative;
}
.style-dropdown-menu {
  padding: 6px 12px 6px 0px;
  position: absolute;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  list-style-type: none;
  z-index: 9999;
  width: fit-content;
  min-width: 160px;
  max-width: 200px;
  max-height: 350px;
  overflow-y: auto;
  overflow-x: hidden;
  white-space: nowrap;

  button {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    border: none;
    background: none;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 6px;
    padding: 4px 8px;
    margin: 2px 6px;

    &:hover {
      background-color: var(--color-hover-button);
    }

    &:active {
      background-color: rgba(0, 0, 0, 0.1);
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
      margin-right: 6px;
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
      // flex-grow: 1;
      text-align: left;
      color: var(--default-text-color);
      font-size: 13px;
      font-weight: 400;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1;
    }
  }
}

.more-menu {
  padding: 4px 8px;
  position: absolute;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  display: flex;
  flex-direction: row;
  z-index: 9999;

  button {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    border: none;
    background: none;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 6px;
    padding: 4px;
    // margin: 2px 2px;

    &:hover {
      background-color: var(--color-hover-button);
    }
    .text-icon {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      // margin-right: 6px;
      color: var(--color-text-primary);
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
      // margin-right: 6px;
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
      text-align: left;
      color: var(--default-text-color);
      font-size: 13px;
      font-weight: 400;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1;
    }
  }
}

.color-menu {
  padding: 6px;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 36px;

  .color-list {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .color-item {
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;

    &:hover {
      transform: scale(1.1);
    }
  }

  .divider {
    width: 1px;
    height: 24px;
    background-color: var(--color-border);
    margin: 0 2px;
    align-self: center;
  }

  .clear-color-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: none;
    border-radius: 4px;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;

    &:hover {
      background-color: var(--color-hover-button);
    }

    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;

      .i-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }

      svg {
        width: 16px;
        height: 16px;
      }
    }
  }
}
</style>
