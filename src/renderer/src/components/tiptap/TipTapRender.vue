<template>
  <div ref="editorContainer" class="editor-wrapper">
    <editor-content ref="editorRootRef" :editor="editorInstance" class="tiptap-container" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { Editor, EditorContent, VueNodeViewRenderer } from '@tiptap/vue-3'
import NodeRange from '@tiptap-pro/extension-node-range'
import StarterKit from '@tiptap/starter-kit'
import Hightlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { all, createLowlight } from 'lowlight'
import Typography from '@tiptap/extension-typography'
import Image from '@tiptap/extension-image'
import Emoji from '@tiptap-pro/extension-emoji'
import TiptapImage from '@renderer/components/tiptap/TiptapImage.vue'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { CustomLink } from '@renderer/utils/tiptap/CustomLink'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
import Details from '@tiptap-pro/extension-details'
import DetailsContent from '@tiptap-pro/extension-details-content'
import DetailsSummary from '@tiptap-pro/extension-details-summary'
import { CustomTextStyle } from '@renderer/utils/tiptap/CustomTextStyle' // 添加这行
import { CustomTable, TableRow, TableHeader, TableCell } from '@renderer/utils/tiptap/CustomTable'

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
  }
})

const editor = ref(null)
const editorInstance = computed(() => editor.value)

const editorRootRef = ref(null)

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
    return VueNodeViewRenderer(TiptapImage)
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
    Hightlight,
    CustomTextStyle,
    CustomLink.configure({
      openOnClick: false,
      parseMarkdown: true,
      validate: (url) => /^(https?:\/\/|note:\/\/)/.test(url)
    }),
    Underline,
    Subscript,
    Superscript,
    Emoji,
    CustomTable.configure({
      resizable: true,
      handleWidth: 4,
      cellMinWidth: 100,
      lastColumnResizable: true
    }),
    TableRow,
    TableHeader,
    TableCell,
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
    TextAlign.configure({
      types: ['paragraph', 'heading']
    }),
    TaskItem.configure({
      nested: true
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
    extensions: editorExtensions.value,
    content: props.content,
    editable: false
  })
})

const destroyEditor = () => {
  if (editor.value) {
    editor.value.destroy()
    editor.value = null
  }
}

onBeforeUnmount(destroyEditor)
</script>

<style lang="scss">
.editor-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  user-select: none;
}
</style>
