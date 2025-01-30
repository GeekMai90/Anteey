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
        <!-- 下拉菜单按钮 -->
        <button
          ref="dropdownButton"
          v-tooltip.top="{ content: '样式设置', delay: { show: 1000 } }"
          class="dropdown-trigger"
          @click="toggleDropdown"
        >
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
          v-tooltip.top="{ content: '粗体<br>Cmd+B', delay: { show: 1000 }, html: true }"
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
          v-tooltip.top="{ content: '斜体<br>Cmd+I', delay: { show: 1000 }, html: true }"
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
          v-tooltip.top="{ content: '删除线<br>Cmd+Shift+S', delay: { show: 1000 }, html: true }"
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
          v-tooltip.top="{ content: '下划线<br>Cmd+U', delay: { show: 1000 }, html: true }"
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
          v-tooltip.top="{ content: '高亮<br>Cmd+Shift+H', delay: { show: 1000 }, html: true }"
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
        <!-- 颜色按钮 -->
        <button
          ref="colorButton"
          v-tooltip.top="{ content: '文字颜色', delay: { show: 1000 } }"
          :class="{ 'is-active': editorInstance.isActive('textStyle', { color: currentColor }) }"
          @click="toggleColorMenu"
        >
          <div class="icon">
            <Platte
              theme="outline"
              size="16"
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
            />
          </div>
        </button>
        <!-- 行内代码 -->
        <button
          v-tooltip.top="{ content: '行内代码<br>Cmd+E', delay: { show: 1000 }, html: true }"
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
          v-tooltip.top="{ content: '链接', delay: { show: 1000 }, html: true }"
          :class="{ 'is-active': editorInstance.isActive('link') }"
          @click="showLinkMenu($event)"
        >
          <div class="icon">
            <LinkTwo
              theme="outline"
              size="16"
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
            />
          </div>
        </button>
        <!-- 详情 -->
        <button
          v-tooltip.top="{ content: '设置详情', delay: { show: 1000 }, html: true }"
          :class="{ 'is-active': editorInstance.isActive('details') }"
          @click="editorInstance.chain().focus().setDetails().run()"
        >
          <div class="icon">
            <ParagraphTriangle
              theme="outline"
              size="16"
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
            />
          </div>
        </button>
        <button
          v-tooltip.top="{ content: '取消详情', delay: { show: 1000 }, html: true }"
          :class="{
            'is-active':
              editorInstance.isActive('details') && !editorInstance.isActive('detailsContent')
          }"
          @click="editorInstance.chain().focus().unsetDetails().run()"
        >
          <div class="icon">
            <ParagraphAlphabet
              theme="outline"
              size="16"
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
            />
          </div>
        </button>
        <!-- 更多按钮 -->
        <button
          ref="moreButton"
          v-tooltip.top="{ content: '更多', delay: { show: 1000 }, html: true }"
          @click="toggleMoreMenu"
        >
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
    <!-- 表格工具菜单 -->
    <table-bubble-menu v-if="editorInstance" :editor="editorInstance" />
    <!-- 更多菜单 -->
    <div v-if="showMoreMenu" ref="moreMenu" class="more-menu" :style="moreFloatingStyles">
      <button
        v-tooltip.top="{ content: '下标', delay: { show: 1000 }, html: true }"
        @click="applySubscript"
      >
        <div class="text-icon">X₂</div>
      </button>
      <button
        v-tooltip.top="{ content: '上标', delay: { show: 1000 }, html: true }"
        @click="applySuperscript"
      >
        <div class="text-icon">X²</div>
      </button>
      <!-- 居左 -->
      <button
        v-tooltip.top="{ content: '居左<br>Cmd+Shift+L', delay: { show: 1000 }, html: true }"
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
        v-tooltip.top="{ content: '居中<br>Cmd+Shift+E', delay: { show: 1000 }, html: true }"
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
        v-tooltip.top="{ content: '居右<br>Cmd+Shift+R', delay: { show: 1000 }, html: true }"
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
        v-tooltip.top="{ content: '两端对齐<br>Cmd+Shift+J', delay: { show: 1000 }, html: true }"
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
    </div>
    <!-- 上下文菜单 -->
    <div
      v-if="showContextMenu"
      class="context-menu"
      :style="{ top: `${contextMenuY}px`, left: `${contextMenuX}px` }"
    >
      <div class="context-menu-item" @click="clearFormatting">
        <div class="icon">
          <Format
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">清空格式</div>
      </div>
      <div class="context-menu-item" @click="clearStyle">
        <div class="icon">
          <ClearFormat
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">清空样式</div>
      </div>
      <div class="context-menu-item" @click="copyToClipboard">
        <div class="icon">
          <Copy theme="outline" size="16" fill="var(--color-icon-menu-default)" :strokeWidth="3" />
        </div>
        <div class="name">复制到剪贴板</div>
      </div>
      <div class="context-menu-item" @click="insertParagraphBelow">
        <div class="icon">
          <Plus theme="outline" size="16" fill="var(--color-icon-menu-default)" :strokeWidth="3" />
        </div>
        <div class="name">在下方插入段落</div>
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
        <div v-if="!isNoteReference" class="link-input-field">
          <div class="icon">
            <LinkTwo
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
    <div
      v-if="showDropdown"
      ref="dropdownMenu"
      class="style-dropdown-menu"
      :style="dropdownFloatingStyles"
    >
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
    <!-- 颜色菜单 -->
    <div v-if="showColorMenu" ref="colorMenu" class="color-menu" :style="colorFloatingStyles">
      <div class="color-list">
        <button
          v-for="color in colors"
          :key="color.value"
          v-tooltip.top="{ content: color.name, delay: { show: 500 } }"
          class="color-item"
          :style="{ backgroundColor: color.value }"
          @click="setColor(color.value)"
        />
      </div>
      <div class="divider"></div>
      <button
        v-tooltip.top="{ content: '清除颜色', delay: { show: 500 } }"
        class="clear-color-btn"
        @click="clearColor"
      >
        <div class="icon">
          <ClearFormat
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
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
import { Markdown } from 'tiptap-markdown'
import Dropcursor from '@tiptap/extension-dropcursor'
import Placeholder from '@tiptap/extension-placeholder'
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
  LinkTwo,
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
  AlignTextBoth,
  ParagraphTriangle,
  Format,
  Platte,
  Plus
} from '@icon-park/vue-next'
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
import { useRouter } from 'vue-router/dist/vue-router'
import { CustomCodeBlock } from '@renderer/utils/tiptap/CustomCodeBlock'
import { CustomTextStyle } from '@renderer/utils/tiptap/CustomTextStyle'
import { CustomTable, TableRow, TableHeader, TableCell } from '@renderer/utils/tiptap/CustomTable'
import TableBubbleMenu from './TableBubbleMenu.vue'
import { CustomBlockquote } from '@renderer/utils/tiptap/CustomBlockquote'
import { CustomTaskList } from '@renderer/utils/tiptap/CustomTaskList'
import { CustomTaskItem } from '@renderer/utils/tiptap/CustomTaskItem'
import { CustomMention } from '@renderer/utils/tiptap/CustomMention'
import { useFloating } from '@floating-ui/vue'
import { flip, offset, shift } from '@floating-ui/dom'

const noteStore = useNoteStore()
const uiStore = useUIStore()
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

// 更多菜单相关
const bubbleMenuRef = ref(null)
const showMoreMenu = ref(false)
const moreButton = ref(null)
const moreMenu = ref(null)

// 创建 floating 实例
const { floatingStyles: moreFloatingStyles, update: updateMoreFloating } = useFloating(
  moreButton,
  moreMenu,
  {
    placement: 'bottom-end',
    middleware: [
      offset({
        mainAxis: 6,
        crossAxis: 0
      }),
      flip(),
      shift()
    ]
  }
)

// 修改方法名，避免命名冲突
const toggleMoreMenu = () => {
  showMoreMenu.value = !showMoreMenu.value
  if (showMoreMenu.value) {
    nextTick(() => {
      updateMoreFloating()
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
const dropdownMenu = ref(null)

const { floatingStyles: dropdownFloatingStyles, update: updateDropdown } = useFloating(
  dropdownButton,
  dropdownMenu,
  {
    placement: 'bottom-start',
    middleware: [offset(6), flip(), shift()]
  }
)

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) {
    nextTick(() => {
      updateDropdown()
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
  showMoreMenu.value = false
}

// 关闭下拉菜单的数
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
// 接设置菜单样式
const linkMenuStyle = computed(() => ({
  position: 'absolute',
  top: `${linkMenuPosition.value.y}px`,
  left: `${linkMenuPosition.value.x}px`,
  zIndex: 11
}))

// 添加新的响应式变量
const isNoteReference = ref(false)
// 显示链接设置菜单
const showLinkMenu = (event, linkElement = null) => {
  closeLinkMenus()
  showLinkInput.value = true

  if (linkElement) {
    // 编辑现有链接
    const href = linkElement.getAttribute('href')
    isNoteReference.value = href.startsWith('note://')
    linkUrl.value = href
    linkText.value = linkElement.textContent
  } else {
    // 创建新链接
    const { from, to } = editorInstance.value.state.selection
    isNoteReference.value = false
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
    if (inputElements.length > 0) {
      inputElements[0].value = linkText.value
      if (!isNoteReference.value && inputElements[1]) {
        inputElements[1].value = linkUrl.value
      }
      inputElements[0].focus()
    }
  })
}
const setLink = async () => {
  if (!linkUrl.value && !isNoteReference.value) {
    editorInstance.value.chain().focus().extendMarkRange('link').unsetLink().run()
    closeLinkMenus()
    return
  }

  if (isNoteReference.value) {
    const noteId = linkUrl.value.replace('note://', '')
    // 处理笔记引用链接的逻辑保持不变
    editorInstance.value
      .chain()
      .focus()
      .extendMarkRange('link')
      .insertContent({
        type: 'text',
        text: linkText.value,
        marks: [
          {
            type: 'link',
            attrs: {
              href: linkUrl.value,
              class: 'note-reference-link',
              'data-note-id': noteId
            }
          }
        ]
      })
      .run()
  } else {
    // 处普通链接
    editorInstance.value
      .chain()
      .focus()
      .extendMarkRange('link')
      .insertContent({
        type: 'text',
        text: linkText.value,
        marks: [
          {
            type: 'link',
            attrs: { href: linkUrl.value }
          }
        ]
      })
      .run()
  }

  closeLinkMenus()
}
// 消链接设置
const cancelLink = () => {
  showLinkInput.value = false
  linkUrl.value = ''
  linkText.value = ''
}
// 链接编辑菜单
const handleLinkClick = (event) => {
  const linkElement = event.target.closest('a')
  if (!linkElement) return

  const href = linkElement.getAttribute('href')

  // Command/Ctrl: 显示链接设置菜单（对所有类型的链接都生效）
  if (event.metaKey || event.ctrlKey) {
    event.preventDefault()
    showLinkMenu(event, linkElement)
    return true // 阻止 Tiptap 的默认行为
  }

  // 处理笔记链接的特殊行为
  if (href?.startsWith('note://')) {
    event.preventDefault()
    const noteId = href.replace('note://', '')

    // Alt: 在主编辑器打开
    if (event.altKey) {
      router.push(`/note/${noteId}`)
      return
    }

    // 无修饰键: 在右侧边栏查看
    noteStore.openBacklinkPreview(noteId)
    uiStore.openRightSidebarWithTab('backlink')
  } else {
    // 普通链接的默认行为：在新标签页打开
    if (!event.metaKey && !event.ctrlKey) {
      window.open(href, '_blank')
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

// 判断是否应该显示文字样式菜单
const shouldShowTextStyleMenu = ({ editor }) => {
  const { state } = editor
  const { selection } = state
  const { $anchor } = selection

  // 检查是否在表格内且处于表格选择状态
  let depth = $anchor.depth
  while (depth > 0) {
    const node = $anchor.node(depth)
    if (node.type.name === 'table') {
      // 如果是表格选择状态，不显示文本样式菜单
      if (
        (selection.ranges && selection.ranges.length > 1) || // 选中多个单元格
        Object.prototype.hasOwnProperty.call(selection, 'isRowSelection') || // 选中整行
        Object.prototype.hasOwnProperty.call(selection, 'isColSelection') // 选中整列
      ) {
        return false
      }
    }
    depth--
  }

  // 其他情况保持原有逻辑
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

// 清空格式
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

// 添加颜色相关的响应式变量
const showColorMenu = ref(false)
const colorButton = ref(null)
const colorMenu = ref(null)
const currentColor = ref(null)

// 修改颜色数组用 CSS 变量来适应不同主题
const colors = [
  { name: '默认', value: 'var(--color-text-primary)' },
  { name: '粉色', value: 'var(--color-text-pink)' },
  { name: '橙色', value: 'var(--color-text-orange)' },
  { name: '绿色', value: 'var(--color-text-green)' },
  { name: '青色', value: 'var(--color-text-cyan)' },
  { name: '蓝色', value: 'var(--color-text-blue)' },
  { name: '紫色', value: 'var(--color-text-purple)' }
]

// 创建新的 floating 实例
const { floatingStyles: colorFloatingStyles, update: updateColorMenu } = useFloating(
  colorButton,
  colorMenu,
  {
    placement: 'bottom-start',
    middleware: [offset(6), flip(), shift()]
  }
)

// 修改 toggleColorMenu 方法
const toggleColorMenu = () => {
  showColorMenu.value = !showColorMenu.value
  if (showColorMenu.value) {
    nextTick(() => {
      updateColorMenu()
    })
  }
}

const setColor = (color) => {
  if (!editorInstance.value) return

  if (color === 'var(--color-text-primary)') {
    // 如果是默认颜色，则移除颜色标记
    editorInstance.value.chain().focus().toggleMark('textStyle', { color: null }).run()
  } else {
    // 设置新的颜色
    editorInstance.value.chain().focus().toggleMark('textStyle', { color }).run()
  }

  currentColor.value = color
  showColorMenu.value = false
}

const closeColorMenu = (event) => {
  if (
    showColorMenu.value &&
    !event.target.closest('.color-menu') &&
    !event.target.closest('button')
  ) {
    showColorMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeColorMenu)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeColorMenu)
})

// 添加清除颜色方法
const clearColor = () => {
  if (!editorInstance.value) return
  editorInstance.value.chain().focus().unsetMark('textStyle').run()
  currentColor.value = null
  showColorMenu.value = false
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
