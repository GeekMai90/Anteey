<template>
  <div ref="editorContainer" class="editor-wrapper">
    <editor-content ref="editorRootRef" :editor="editorInstance" class="tiptap-container" />
    <!-- 文字样式菜单 -->
    <bubble-menu
      v-if="editorInstance"
      ref="bubbleMenuRef"
      :editor="editorInstance"
      :tippy-options="{ duration: 100 }"
      :should-show="shouldShowTextStyleMenu"
    >
      <div class="bubble-menu">
        <!-- 新增的下拉菜单按钮 -->
        <button ref="dropdownButton" class="dropdown-trigger" @click="toggleDropdown">
          <div class="icon">
            <TextStyleOne
              theme="outline"
              size="16"
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
            />
          </div>
        </button>
        <!-- 加粗 -->
        <button
          :class="{ 'is-active': editorInstance.isActive('bold') }"
          @click="editorInstance.chain().focus().toggleBold().run()"
        >
          <div class="icon">
            <TextBold
              theme="outline"
              size="16"
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
            />
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
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
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
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
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
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
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
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
            />
          </div>
        </button>
        <!-- 行内代码 -->
        <button
          :class="{ 'is-active': editorInstance.isActive('code') }"
          @click="editorInstance.chain().focus().toggleCode().run()"
        >
          <div class="icon">
            <CodeIcon
              theme="outline"
              size="16"
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
            />
          </div>
        </button>
        <!-- 链接 -->
        <button
          :class="{ 'is-active': editorInstance.isActive('link') }"
          @click="showLinkMenu($event)"
        >
          <div class="icon">
            <LinkIcon
              theme="outline"
              size="16"
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
            />
          </div>
        </button>
        <!-- 更多按钮 -->
        <button @click="toggleMoreMenu" ref="moreButton">
          <div class="icon">
            <More
              theme="outline"
              size="16"
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
            />
          </div>
        </button>
      </div>
    </bubble-menu>
    <!-- 更多菜单 -->
    <div v-if="showMoreMenu" class="more-menu" :style="moreMenuStyle">
      <button title="下标" @click="applySubscript">
        <div class="text-icon">X₂</div>
      </button>
      <button title="上标" @click="applySuperscript">
        <div class="text-icon">X²</div>
      </button>
      <!-- 居左 -->
      <button
        :class="{ 'is-active': editorInstance.isActive({ textAlign: 'left' }) }"
        @click="applyLeft"
      >
        <div class="icon">
          <AlignTextLeft
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
      </button>
      <button
        :class="{ 'is-active': editorInstance.isActive({ textAlign: 'center' }) }"
        @click="applyCenter"
      >
        <div class="icon">
          <AlignTextCenter
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
      </button>
      <button
        :class="{ 'is-active': editorInstance.isActive({ textAlign: 'right' }) }"
        @click="applyRight"
      >
        <div class="icon">
          <AlignTextRight
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
      </button>
      <button
        :class="{ 'is-active': editorInstance.isActive({ textAlign: 'justify' }) }"
        @click="applyJustify"
      >
        <div class="icon">
          <AlignTextBoth
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
      </button>

      <!-- 可以根据需要添加更多选项 -->
    </div>
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
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">清空格式</div>
      </div>
      <div class="context-menu-item" @click="copyToClipboard">
        <div class="icon">
          <Copy theme="outline" size="16" fill="var(--color-icon-menu-default)" :strokeWidth="3" />
        </div>
        <div class="name">复制到剪贴板</div>
      </div>
      <div class="context-menu-item delete" @click="deleteParagraph">
        <div class="icon">
          <Delete theme="outline" size="16" fill="var(--color-text-danger)" :strokeWidth="3" />
        </div>
        <div class="name">删除段落</div>
      </div>
    </div>
    <!-- 链接设置菜单 -->
    <div v-if="showLinkInput" class="link-input-menu" :style="linkMenuStyle">
      <div class="link-input-fields">
        <div class="link-input-field">
          <div class="icon">
            <FontSize
              theme="outline"
              size="16"
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
            />
          </div>
          <input v-model="linkText" type="text" placeholder="链接文本" @keyup.enter="setLink" />
        </div>
        <div class="link-input-field">
          <div class="icon">
            <LinkIcon
              theme="outline"
              size="16"
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
            />
          </div>
          <input v-model="linkUrl" type="text" placeholder="输入链接URL" @keyup.enter="setLink" />
        </div>
      </div>
      <div class="link-input-actions">
        <button @click="setLink">确认</button>
        <button @click="cancelLink">取消</button>
      </div>
    </div>
    <!-- 下拉菜单 -->
    <div v-if="showDropdown" class="style-dropdown-menu" :style="dropdownMenuStyle">
      <button @click="setNodeType('paragraph')">
        <div class="icon">
          <ParagraphAlphabet
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">段落</div>
      </button>
      <button @click="setNodeType('heading', { level: 1 })">
        <div class="icon">
          <H1 theme="outline" size="16" fill="var(--color-icon-menu-default)" :strokeWidth="3" />
        </div>
        <div class="name">标题1</div>
      </button>
      <button @click="setNodeType('heading', { level: 2 })">
        <div class="icon">
          <H2 theme="outline" size="16" fill="var(--color-icon-menu-default)" :strokeWidth="3" />
        </div>
        <div class="name">标题2</div>
      </button>
      <button @click="setNodeType('heading', { level: 3 })">
        <div class="icon">
          <H3 theme="outline" size="16" fill="var(--color-icon-menu-default)" :strokeWidth="3" />
        </div>
        <div class="name">标题3</div>
      </button>
      <button @click="setNodeType('bulletList')">
        <div class="icon">
          <ListTwo
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">无序列表</div>
      </button>
      <button @click="setNodeType('orderedList')">
        <div class="icon">
          <OrderedList
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">有序列表</div>
      </button>
      <button @click="setNodeType('taskList')">
        <div class="icon">
          <ListSuccess
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">任务列表</div>
      </button>
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
import Emoji, { gitHubEmojis } from '@tiptap-pro/extension-emoji'
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
  Delete,
  Link as LinkIcon,
  FontSize,
  H1,
  H2,
  H3,
  ParagraphAlphabet,
  ListTwo,
  OrderedList,
  ListSuccess,
  TextStyleOne,
  More,
  AlignTextLeft,
  AlignTextCenter,
  AlignTextRight,
  AlignTextBoth
} from '@icon-park/vue-next'
import TiptapImage from './TiptapImage.vue'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { emojiSuggestion } from '../tiptap/suggestion'
import { SlashCommands } from '../tiptap/SlashCommands'
import { slashCommandSuggestion } from '../tiptap/slashCommandSuggestion'
import UniqueID from '@tiptap-pro/extension-unique-id'
import { CustomLink } from '../tiptap/CustomLink'
import { useRouter } from 'vue-router'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'

const router = useRouter()

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

// 更多菜单
const bubbleMenuRef = ref(null)
const showMoreMenu = ref(false)
const moreButton = ref(null)
const moreMenuStyle = ref({})
const toggleMoreMenu = () => {
  showMoreMenu.value = !showMoreMenu.value
  if (showMoreMenu.value) {
    nextTick(() => {
      const bubbleMenuRect = bubbleMenuRef.value.$el.getBoundingClientRect()
      const moreButtonRect = moreButton.value.getBoundingClientRect()
      const editorRect = editorContainer.value.getBoundingClientRect()

      moreMenuStyle.value = {
        position: 'absolute',
        top: `${moreButtonRect.bottom - editorRect.top + 10}px`,
        right: `${editorRect.right - bubbleMenuRect.right}px`,
        zIndex: 1000
      }
    })
  }
}

const applySubscript = () => {
  editorInstance.value.chain().focus().toggleSubscript().run()
  showMoreMenu.value = false
}

const applySuperscript = () => {
  editorInstance.value.chain().focus().toggleSuperscript().run()
  showMoreMenu.value = false
}

const applyLeft = () => {
  editorInstance.value.chain().focus().setTextAlign('left').run()
  showMoreMenu.value = false
}

const applyCenter = () => {
  editorInstance.value.chain().focus().setTextAlign('center').run()
  showMoreMenu.value = false
}

const applyRight = () => {
  editorInstance.value.chain().focus().setTextAlign('right').run()
  showMoreMenu.value = false
}

const applyJustify = () => {
  editorInstance.value.chain().focus().setTextAlign('justify').run()
  showMoreMenu.value = false
}
// 关闭更多菜单的函数
const closeMoreMenu = (event) => {
  if (
    showMoreMenu.value &&
    !event.target.closest('.more-menu') &&
    !event.target.closest('button')
  ) {
    showMoreMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeMoreMenu)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeMoreMenu)
})

const showDropdown = ref(false)
const dropdownButton = ref(null)
const dropdownMenuStyle = ref({})

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) {
    nextTick(() => {
      const buttonRect = dropdownButton.value.getBoundingClientRect()
      // const bubbleMenuRect = dropdownButton.value.closest('.bubble-menu').getBoundingClientRect()

      dropdownMenuStyle.value = {
        position: 'fixed',
        top: `${buttonRect.bottom + 15}px`,
        left: `${buttonRect.left - 10}px`,
        // minWidth: `${bubbleMenuRect.width}px`,
        zIndex: 1000
      }
    })
  }
}

const setNodeType = (type, attrs = {}) => {
  switch (type) {
    case 'paragraph':
      editorInstance.value.chain().focus().clearNodes().setParagraph().run()
      break
    case 'bulletList':
      editorInstance.value.chain().focus().toggleBulletList().run()
      break
    case 'taskList':
      editorInstance.value.chain().focus().toggleTaskList().run()
      break
    case 'orderedList':
      editorInstance.value.chain().focus().toggleOrderedList().run()
      break
    case 'heading':
      editorInstance.value.chain().focus().toggleHeading(attrs).run()
      break
    default:
      editorInstance.value.chain().focus().setNode(type, attrs).run()
  }
  showDropdown.value = false
}

// 关闭下拉菜单的函数
const closeDropdown = (event) => {
  if (
    showDropdown.value &&
    !event.target.closest('.dropdown-menu') &&
    !event.target.closest('button')
  ) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeDropdown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdown)
})

// 链接设置菜单
const showLinkInput = ref(false)
const linkText = ref('')
const linkUrl = ref('')
const linkMenuPosition = ref({ x: 0, y: 0 })
// 链接设置菜单样式
const linkMenuStyle = computed(() => ({
  position: 'absolute',
  top: `${linkMenuPosition.value.y}px`,
  left: `${linkMenuPosition.value.x}px`,
  zIndex: 11
}))

// 显示链接设置菜单
const showLinkMenu = (event, linkElement = null) => {
  closeLinkMenus()
  showLinkInput.value = true

  if (linkElement) {
    // 编辑现有链接
    const href = linkElement.getAttribute('href')
    linkUrl.value = href
    linkText.value = linkElement.textContent
  } else {
    // 创建新链接
    const { from, to } = editorInstance.value.state.selection
    linkUrl.value = ''
    linkText.value = editorInstance.value.state.doc.textBetween(from, to) || ''
  }

  // 设置菜单位置
  if (event) {
    const rect = (linkElement || event.target.closest('button')).getBoundingClientRect()
    const containerRect = editorContainer.value.getBoundingClientRect()
    linkMenuPosition.value = {
      x: rect.left - containerRect.left,
      y: rect.bottom - containerRect.top + 5
    }
  }

  nextTick(() => {
    const inputElements = document.querySelectorAll('.link-input-menu input')
    if (inputElements.length >= 2) {
      inputElements[0].value = linkText.value
      inputElements[1].value = linkUrl.value
      inputElements[0].focus()
    }
  })
}
const setLink = () => {
  if (linkUrl.value) {
    editorInstance.value
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: linkUrl.value })
      .run()

    // 如果链接文本与 URL 不同,则插入新的文本
    if (linkText.value !== linkUrl.value) {
      editorInstance.value.chain().focus().insertContent(linkText.value).run()
    }
  } else {
    editorInstance.value.chain().focus().extendMarkRange('link').unsetLink().run()
  }
  closeLinkMenus()
}
// 取消链接设置
const cancelLink = () => {
  showLinkInput.value = false
  linkUrl.value = ''
  linkText.value = ''
}
// 链接编辑菜单

const handleLinkClick = (event) => {
  const linkElement = event.target.closest('a')
  if (linkElement) {
    const href = linkElement.getAttribute('href')
    const isModifierKeyPressed = event.metaKey || event.ctrlKey

    if (isModifierKeyPressed) {
      // 如果按下了修饰键，显示链接设置菜单
      event.preventDefault()
      showLinkMenu(event, linkElement)
    } else {
      // 如果没有按下修饰键
      if (href.startsWith('note://')) {
        event.preventDefault()
        const noteId = href.replace('note://', '')
        router.push({ name: 'NoteExpandEditor', params: { id: noteId } })
      } else {
        window.open(href, '_blank')
      }
    }
  }
}

const closeLinkMenus = () => {
  showLinkInput.value = false
}
const handleOutsideClick = (event) => {
  if (editorContainer.value && !editorContainer.value.contains(event.target)) {
    closeLinkMenus()
  }
}
// 监听点击事件
onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})
// 移除点击事件
onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})

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

const closeContextMenu = (event) => {
  // 检查点击是否在上下文菜单外部
  if (showContextMenu.value && !event.target.closest('.context-menu')) {
    showContextMenu.value = false
  }
}
onMounted(() => {
  // 添加全��点击事件监听器
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

  if (editor.value && currentHoveredNode.value) {
    const node = currentHoveredNode.value

    if (node) {
      const { x, y } = getContextMenuPosition(event)
      showContextMenu.value = true
      contextMenuX.value = x - 5
      contextMenuY.value = y + 10
      currentParagraph.value = node

      const nodeId = node.attrs.id

      // 使用 nodeId 找到节点位置
      let targetPos = -1
      let targetEnd = -1
      editor.value.state.doc.descendants((child, pos) => {
        if (child.attrs.id === nodeId) {
          targetPos = pos
          targetEnd = pos + child.nodeSize
          return false // 停止遍历
        }
      })

      if (targetPos > -1 && targetEnd > -1) {
        // 选中节点的文本内容
        editor.value
          .chain()
          .focus()
          .setTextSelection({ from: targetPos + 1, to: targetEnd - 1 })
          .run()

        console.log('拖拽块被点击了!', node)
        console.log('节点类型:', node.type.name)
        console.log('节点ID:', nodeId)
        console.log('节点开始位置:', targetPos)
        console.log('节点结束位置:', targetEnd)
      } else {
        console.log('无法找到节点位置')
      }
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
    Hightlight,
    CustomLink.configure({
      openOnClick: false,
      parseMarkdown: true,
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
    TextAlign.configure({
      types: ['paragraph', 'heading']
    }),
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
    },
    editorProps: {
      handleClick: (view, pos, event) => {
        if (event.target instanceof HTMLAnchorElement) {
          handleLinkClick(event)
          return true // 阻止 Tiptap 的默认行为
        }
        closeLinkMenus()
        return false // 允许 Tiptap 处理其他点击
      }
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
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: var(--shadow-card);
  display: flex;
  padding: 4px 8px;

  button {
    background-color: unset;
    border-radius: 8px;
    padding: 4px;

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
    background-color: var(--color-bg-secondary);
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
        background-color: var(--color-bg-secondary);
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
  // width: max-content;
  min-width: auto;
  width: fit-content;
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
</style>
