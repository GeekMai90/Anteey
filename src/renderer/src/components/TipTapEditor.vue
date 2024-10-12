<template>
  <div class="editor-wrapper">
    <editor-content ref="editorRootRef" :editor="editorInstance" class="tiptap-container" />
    <!-- 文字样式菜单 -->
    <bubble-menu
      v-if="editorInstance"
      :editor="editorInstance"
      :tippy-options="{ duration: 100 }"
      :should-show="shouldShowTextStyleMenu"
    >
      <div class="bubble-menu">
        <!-- 加粗 -->
        <button
          :class="{ 'is-active': editorInstance.isActive('bold') }"
          @click="editorInstance.chain().focus().toggleBold().run()"
        >
          <div class="icon">
            <TextBold theme="outline" size="16" fill="var(--color-text-primary)" :strokeWidth="4" />
          </div>
        </button>
        <!-- 斜体 -->
        <button
          :class="{ 'is-active': editorInstance.isActive('italic') }"
          @click="editorInstance.chain().focus().toggleItalic().run()"
        >
          <div class="icon">
            <TextItalic
              theme="outline"
              size="16"
              fill="var(--color-text-primary)"
              :strokeWidth="4"
            />
          </div>
        </button>
        <!-- 删除线 -->
        <button
          :class="{ 'is-active': editorInstance.isActive('strike') }"
          @click="editorInstance.chain().focus().toggleStrike().run()"
        >
          <div class="icon">
            <Strikethrough
              theme="outline"
              size="16"
              fill="var(--color-text-primary)"
              :strokeWidth="4"
            />
          </div>
        </button>
        <!-- 下划线 -->
        <button
          :class="{ 'is-active': editorInstance.isActive('underline') }"
          @click="editorInstance.chain().focus().toggleUnderline().run()"
        >
          <div class="icon">
            <TextUnderline
              theme="outline"
              size="16"
              fill="var(--color-text-primary)"
              :strokeWidth="4"
            />
          </div>
        </button>
        <!-- 高亮 -->
        <button
          :class="{ 'is-active': editorInstance.isActive('highlight') }"
          @click="editorInstance.chain().focus().toggleHighlight().run()"
        >
          <div class="icon">
            <HighLight
              theme="outline"
              size="16"
              fill="var(--color-text-primary)"
              :strokeWidth="4"
            />
          </div>
        </button>
        <!-- 行内代码 -->
        <button
          :class="{ 'is-active': editorInstance.isActive('code') }"
          @click="editorInstance.chain().focus().toggleCode().run()"
        >
          <div class="icon">
            <CodeIcon theme="outline" size="16" fill="var(--color-text-primary)" :strokeWidth="4" />
          </div>
        </button>
      </div>
    </bubble-menu>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { Editor, EditorContent, BubbleMenu, VueNodeViewRenderer } from '@tiptap/vue-3'
import DragHandle from '@tiptap-pro/extension-drag-handle'
import NodeRange from '@tiptap-pro/extension-node-range'
import StarterKit from '@tiptap/starter-kit'
import Hightlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Emoji, { gitHubEmojis } from '@tiptap-pro/extension-emoji'
import suggestion from '../tiptap/suggestion.js'
import { Markdown } from 'tiptap-markdown'
import Dropcursor from '@tiptap/extension-dropcursor'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { all, createLowlight } from 'lowlight'
import Typography from '@tiptap/extension-typography'
import FileHandler from '@tiptap-pro/extension-file-handler'
import Image from '@tiptap/extension-image'
import {
  TextBold,
  TextItalic,
  Strikethrough,
  TextUnderline,
  HighLight,
  Code as CodeIcon
} from '@icon-park/vue-next'
import TiptapImage from './TiptapImage.vue'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
// import HardBreak from '@tiptap/extension-hard-break'

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
    const result = await window.electronAPI.uploadImage(file.path)
    if (result.success && result.path) {
      // 直接使用返回的 path，它现在应该是 file:// 协议的 URL
      return result.path
    } else {
      console.error('上传图片失败:', result.error)
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
    return VueNodeViewRenderer(TiptapImage)
  }
})

// 判断是否应该显示文字样式菜单
const shouldShowTextStyleMenu = ({ editor }) => {
  // 检查是否有文本选择，并且不是图片
  return (
    editor.isEditable &&
    editor.state.selection.content().content.size > 0 &&
    !editor.isActive('image')
  )
}

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
    // Heading.configure({
    //   levels: [1, 2, 3]
    // }),
    Hightlight,
    Link.configure({
      openOnClick: true,
      defaultProtocol: 'https',
      linkOnPaste: true,
      HTMLAttributes: {
        rel: 'noopener noreferrer',
        target: '_blank'
      },
      parseMarkdown: true // 启用 Markdown 链接解析
    }),
    Underline,
    Emoji.configure({
      emojis: gitHubEmojis,
      enableEmoticons: true,
      suggestion
    }),
    Dropcursor.configure({
      color: 'var(--color-primary)',
      width: 2
    }),
    Placeholder.configure({
      placeholder: '请输入你的思考...'
    }),
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: 'plaintext'
    }),
    Typography,
    CustomImage,
    TaskList,
    TaskItem.configure({
      nested: true
    }),
    FileHandler.configure({
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
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
                    width: '100%', // 设置默认宽度
                    align: 'center' // 设置默认对齐方式
                  }
                })
                .focus()
                .run()
            } else {
              console.error('Failed to upload image:', file.name)
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
                    src: imageUrl
                  }
                })
                .focus()
                .run()
            } else {
              console.error('Failed to upload pasted image:', file.name)
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
    })
  ]
  if (props.enableDragHandle) {
    extensions.push(
      DragHandle.configure({
        render() {
          const element = document.createElement('div')
          element.classList.add('custom-drag-handle')
          return element
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
    onUpdate: ({ editor }) => {
      emit('update:content', editor.getJSON())
    }
  })
  // if (props.editable) {
  //   nextTick(() => {
  //     focus()
  //   })
  // }
})

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
  }
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
      editor.value.commands.focus('end')
    }
  })
}

defineExpose({
  focus
})

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
</script>

<style lang="scss">
.editor-wrapper {
  width: 100%;
  height: 100%;
}
/* Bubble menu */
.bubble-menu {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-hover-button);
  border-radius: 8px;
  box-shadow: var(--shadow-card);
  display: flex;
  padding: 4px 8px;

  button {
    background-color: unset;
    border-radius: 8px;
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

// .tiptap-image-wrapper {
//   position: relative;
//   display: inline-block;

//   img {
//     transition: all 0.2s ease;
//     border-radius: 8px; // 给图片添加圆角
//   }

//   &.is-selected img {
//     box-shadow: 0 0 0 2px var(--color-primary);
//   }
//   &:hover .image-more-button {
//     display: block;
//   }

//   // .image-more-button {
//   //   position: absolute;
//   //   top: 5px;
//   //   right: 5px;
//   //   background-color: rgba(0, 0, 0, 0.5);
//   //   color: white;
//   //   border-radius: 50%;
//   //   width: 24px;
//   //   height: 24px;
//   //   display: none;
//   //   align-items: center;
//   //   justify-content: center;
//   //   cursor: pointer;
//   // }
//   // .image-popup-menu {
//   //   position: absolute;
//   //   top: 30px;
//   //   right: 5px;
//   //   background-color: white;
//   //   border: 1px solid #ccc;
//   //   border-radius: 4px;
//   //   box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);

//   //   button {
//   //     display: flex; // 改为 flex 布局
//   //     align-items: center; // 垂直居中
//   //     justify-content: center; // 水平居中
//   //     width: 28px;
//   //     height: 28px;
//   //     border: none;
//   //     background: none;
//   //     cursor: pointer;
//   //     padding: 0; // 移除内边距
//   //     background-color: red;

//   //     &:hover {
//   //       background-color: #f0f0f0;
//   //     }
//   //     .icon {
//   //       background: none;
//   //       border: none;
//   //       cursor: pointer;
//   //       width: 24px;
//   //       height: 24px;
//   //       display: flex;
//   //       align-items: center;
//   //       justify-content: center;
//   //       transition: all 0.2s ease;
//   //       padding: 0;

//   //       .i-icon {
//   //         display: flex;
//   //         align-items: center;
//   //         justify-content: center;
//   //         width: 100%;
//   //         height: 100%;
//   //       }

//   //       svg {
//   //         width: 16px;
//   //         height: 16px;
//   //       }
//   //     }
//   //   }
//   // }
// }

/* 样式保持不变 */
</style>
