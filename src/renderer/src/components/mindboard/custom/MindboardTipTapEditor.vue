<template>
  <div ref="editorContainer" class="editor-wrapper">
    <editor-content ref="editorRootRef" :editor="editorInstance" class="tiptap-container" />
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
import { CustomLink } from '@renderer/components/tiptap/extensions/CustomLink'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
import Details from '@tiptap-pro/extension-details'
import Emoji from '@tiptap-pro/extension-emoji'
import DetailsContent from '@tiptap-pro/extension-details-content'
import DetailsSummary from '@tiptap-pro/extension-details-summary'
import Export from '@tiptap-pro/extension-export'
import { useNoteStore } from '@renderer/stores/noteStore'
import { CustomCodeBlock } from '@renderer/components/tiptap/extensions/CustomCodeBlock'
import { CustomTextStyle } from '@renderer/components/tiptap/extensions/CustomTextStyle'
import {
  CustomTable,
  TableRow,
  TableHeader,
  TableCell
} from '@renderer/components/tiptap/extensions/CustomTable'
import { CustomBlockquote } from '@renderer/components/tiptap/extensions/CustomBlockquote'
import { CustomTaskList } from '@renderer/components/tiptap/extensions/CustomTaskList'
import { CustomTaskItem } from '@renderer/components/tiptap/extensions/CustomTaskItem'

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

const editorContainer = ref(null)

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
    Dropcursor.configure({
      color: 'var(--color-primary)',
      width: 2
    }),
    Placeholder.configure({
      showOnlyWhenEditable: false,
      placeholder: ({ node }) => {
        if (node.type.name === 'heading') {
          return '输入标题'
        }

        return '记录思考'
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
    CustomTextStyle
  ]
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

.dropdown-trigger {
  position: relative;
}
</style>
