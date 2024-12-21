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
import Emoji from '@tiptap-pro/extension-emoji'
import Image from '@tiptap/extension-image'
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
    CustomLink.configure({
      openOnClick: false,
      parseMarkdown: true,
      validate: (url) => /^(https?:\/\/|note:\/\/)/.test(url)
    }),
    Underline,
    Subscript,
    Superscript,
    Emoji,
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

<style lang="scss" scoped>
.editor-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  user-select: none;
  background-color: #ffffff;
  color: #333333;

  :deep(.ProseMirror) {
    color: #333333;
    background-color: #ffffff;

    // 标题样式
    h1,
    h2,
    h3 {
      color: #333333;
    }

    // 链接样式
    a {
      color: #0066ff;
      &:hover {
        color: #0052cc;
      }
    }

    // 代码块样式
    pre {
      background-color: #f8f8f8;
      color: #333333;
      border: 1px solid #e5e5e5;
    }

    // 行内代码样式
    code {
      background-color: #f8f8f8;
      color: #333333;
    }

    // 引用块样式
    blockquote {
      border-left: 4px solid #e5e5e5;
      background-color: #f9f9f9;
      color: #666666;
    }

    // 任务列表样式
    .task-list-item {
      input[type='checkbox'] {
        background-color: #ffffff;
        border: 1px solid #d9d9d9;

        &:checked {
          background-color: #0066ff;
          border-color: #0066ff;
        }
      }
    }

    // 高亮样式
    mark {
      background-color: #fff3b4;
      color: #333333;
    }

    // 详情块样式
    .details {
      background-color: #f5f5f5;
      border: 1px solid #e5e5e5;

      summary {
        color: #333333;
      }
    }
  }
}
</style>
