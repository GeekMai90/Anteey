<template>
  <div ref="editorContainer" class="editor-wrapper">
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
    <!-- 上下文菜单 -->
    <div
      v-if="showContextMenu"
      class="context-menu"
      :style="{ top: `${contextMenuY}px`, left: `${contextMenuX}px` }"
    >
      <div class="context-menu-item" @click="clearFormatting">
        <div class="icon">
          <ClearFormat
            theme="outline"
            size="16"
            fill="var(--color-text-primary)"
            :strokeWidth="4"
          />
        </div>
        <div class="name">清空格式</div>
      </div>
      <div class="context-menu-item" @click="copyToClipboard">
        <div class="icon">
          <Copy theme="outline" size="16" fill="var(--color-text-primary)" :strokeWidth="4" />
        </div>
        <div class="name">复制到剪贴板</div>
      </div>
      <div class="context-menu-item delete" @click="deleteParagraph">
        <div class="icon">
          <Delete theme="outline" size="16" fill="var(--color-text-danger)" :strokeWidth="4" />
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
// import CustomDragHandle from '../tiptap/CustomDragHandle.js'
import NodeRange from '@tiptap-pro/extension-node-range'
import StarterKit from '@tiptap/starter-kit'
import Hightlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Emoji, { gitHubEmojis } from '@tiptap-pro/extension-emoji'
// import suggestion from '../tiptap/suggestion.js'
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
  Code as CodeIcon,
  ClearFormat,
  Copy,
  Delete
} from '@icon-park/vue-next'
import TiptapImage from './TiptapImage.vue'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { emojiSuggestion } from '../tiptap/suggestion'
import { SlashCommands } from '../tiptap/SlashCommands'
import { slashCommandSuggestion } from '../tiptap/slashCommandSuggestion'
import UniqueID from '@tiptap-pro/extension-unique-id'

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
// const handleDragHandleClick = (event) => {
//   event.preventDefault()
//   event.stopPropagation()

//   if (editor.value && currentHoveredNode.value) {
//     const node = currentHoveredNode.value

//     if (node.type.name === 'paragraph' || node.type.name.startsWith('heading')) {
//       showContextMenu.value = true
//       contextMenuX.value = event.clientX
//       contextMenuY.value = event.clientY
//       currentParagraph.value = node

//       console.log('拖拽块被点击了!', node)
//       console.log('节点类型:', node.type.name)
//       console.log('节点内容:', node.textContent)
//     } else {
//       console.log('点击的不是段落或标题')
//     }
//   } else {
//     console.log('未找到有效的节点')
//   }
// }
const closeContextMenu = (event) => {
  // 检查点击是否在上下文菜单外部
  if (showContextMenu.value && !event.target.closest('.context-menu')) {
    showContextMenu.value = false
  }
}
onMounted(() => {
  // 添加全局点击事件监听器
  document.addEventListener('click', closeContextMenu)
})

onBeforeUnmount(() => {
  // 移除全局点击事件监听器
  document.removeEventListener('click', closeContextMenu)
})
const handleDragHandleClick = (event) => {
  event.preventDefault()
  event.stopPropagation()

  if (editor.value && currentHoveredNode.value) {
    const node = currentHoveredNode.value

    if (node) {
      const { x, y } = getContextMenuPosition(event)
      showContextMenu.value = true
      contextMenuX.value = x - 5
      contextMenuY.value = y + 10
      currentParagraph.value = node

      console.log('拖拽块被点击了!', node)
      console.log('节点类型:', node.type.name)
      console.log('节点内容:', node.textContent)
    } else {
      console.log('点击的不是段落或标题')
    }
  } else {
    console.log('未找到有效的节点')
  }
}
const clearFormatting = () => {
  if (currentParagraph.value && editor.value) {
    editor.value.chain().focus().clearNodes().unsetAllMarks().run()
  }
  showContextMenu.value = false
}

const copyToClipboard = () => {
  if (currentParagraph.value) {
    navigator.clipboard.writeText(currentParagraph.value.textContent)
  }
  showContextMenu.value = false
}

const deleteParagraph = () => {
  if (editor.value && currentParagraph.value) {
    const nodeType = currentParagraph.value.type.name
    console.log('当前段落类型:', nodeType)

    editor.value.chain().focus().deleteNode(nodeType).run()

    console.log('尝试删除节点类型:', nodeType)

    // 触发内容更新
    emit('update:content', editor.value.getJSON())
  } else {
    console.log('无法删除段落：编辑器或当前段落未定义')
  }
  showContextMenu.value = false
  currentParagraph.value = null
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
    TaskItem.configure({
      nested: true
    }),
    UniqueID.configure({
      types: ['heading', 'paragraph']
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
          element.addEventListener('click', handleDragHandleClick)
          return element
        },
        onNodeChange: ({ node }) => {
          if (node) {
            currentHoveredNode.value = node
            console.log('当前悬停的节点:', node.type.name)
            // 可以在这里存储当前节点信息，以便在点击时使用
          }
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
  max-width: 100vw; // 确保不超过视口宽度
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
</style>
