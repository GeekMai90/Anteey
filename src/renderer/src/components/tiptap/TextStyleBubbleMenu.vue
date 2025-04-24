<template>
  <bubble-menu
    v-if="editor"
    ref="bubbleMenuRef"
    :editor="editor"
    :tippy-options="{
      duration: 100,
      appendTo: 'parent',
      interactive: true,
      aria: {
        content: 'auto',
        expanded: 'auto'
      }
    }"
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
            fill="var(--color-icon-primary)"
            :strokeWidth="3"
          />
        </div>
      </button>
      <!-- 加粗 -->
      <button
        v-tooltip.top="{ content: '粗体<br>Cmd+B', delay: { show: 1000 }, html: true }"
        :class="{ 'is-active': editor.isActive('bold') }"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <div class="icon">
          <TextBold theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
      </button>
      <!-- 斜体 -->
      <button
        v-tooltip.top="{ content: '斜体<br>Cmd+I', delay: { show: 1000 }, html: true }"
        :class="{ 'is-active': editor.isActive('italic') }"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <div class="icon">
          <TextItalic theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
      </button>
      <!-- 删除线 -->
      <button
        v-tooltip.top="{ content: '删除线<br>Cmd+Shift+S', delay: { show: 1000 }, html: true }"
        :class="{ 'is-active': editor.isActive('strike') }"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        <div class="icon">
          <Strikethrough
            theme="outline"
            size="16"
            fill="var(--color-icon-primary)"
            :strokeWidth="3"
          />
        </div>
      </button>
      <!-- 下划线 -->
      <button
        v-tooltip.top="{ content: '下划线<br>Cmd+U', delay: { show: 1000 }, html: true }"
        :class="{ 'is-active': editor.isActive('underline') }"
        @click="editor.chain().focus().toggleUnderline().run()"
      >
        <div class="icon">
          <TextUnderline
            theme="outline"
            size="16"
            fill="var(--color-icon-primary)"
            :strokeWidth="3"
          />
        </div>
      </button>
      <!-- 高亮 -->
      <button
        v-tooltip.top="{ content: '高亮<br>Cmd+Shift+H', delay: { show: 1000 }, html: true }"
        :class="{ 'is-active': editor.isActive('highlight') }"
        @click="editor.chain().focus().toggleHighlight().run()"
      >
        <div class="icon">
          <HighLight theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
      </button>
      <!-- 颜色按钮 -->
      <button
        ref="colorButton"
        v-tooltip.top="{ content: '文字颜色', delay: { show: 1000 } }"
        :class="{ 'is-active': editor.isActive('textStyle') }"
        @click="toggleColorMenu"
      >
        <div class="icon">
          <Platte theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
      </button>
      <!-- 行内代码 -->
      <button
        v-tooltip.top="{ content: '行内代码<br>Cmd+E', delay: { show: 1000 }, html: true }"
        :class="{ 'is-active': editor.isActive('code') }"
        @click="editor.chain().focus().toggleCode().run()"
      >
        <div class="icon">
          <Code theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
      </button>
      <!-- 链接 -->
      <button
        ref="linkButtonRef"
        v-tooltip.top="{ content: '链接', delay: { show: 1000 }, html: true }"
        :class="{ 'is-active': editor.isActive('link') }"
        @click="showLinkMenu($event)"
      >
        <div class="icon">
          <LinkTwo theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
      </button>
      <!-- 详情 -->
      <button
        v-tooltip.top="{ content: '设置详情', delay: { show: 1000 }, html: true }"
        :class="{ 'is-active': editor.isActive('details') }"
        @click="editor.chain().focus().setDetails().run()"
      >
        <div class="icon">
          <ParagraphTriangle
            theme="outline"
            size="16"
            fill="var(--color-icon-primary)"
            :strokeWidth="3"
          />
        </div>
      </button>
      <button
        v-tooltip.top="{ content: '取消详情', delay: { show: 1000 }, html: true }"
        :class="{
          'is-active': editor.isActive('details') && !editor.isActive('detailsContent')
        }"
        @click="editor.chain().focus().unsetDetails().run()"
      >
        <div class="icon">
          <ParagraphAlphabet
            theme="outline"
            size="16"
            fill="var(--color-icon-primary)"
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
          <More theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
      </button>
    </div>
  </bubble-menu>

  <!-- 使用 PopupMenu 组件替换原来的下拉菜单 -->
  <popup-menu
    :show="showDropdown"
    :button-ref="dropdownButton"
    :menu-items="styleMenuItems"
    @close="showDropdown = false"
    @item-click="handleStyleMenuClick"
  />

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
        <ClearFormat theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
      </div>
    </button>
  </div>

  <!-- 更多菜单 -->
  <div v-if="showMoreMenu" ref="moreMenuRef" class="more-menu" :style="moreFloatingStyles">
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
      :class="{ 'is-active': editor.isActive({ textAlign: 'left' }) }"
      @click="applyLeft"
    >
      <div class="icon">
        <AlignTextLeft
          theme="outline"
          size="16"
          fill="var(--color-icon-primary)"
          :strokeWidth="3"
        />
      </div>
    </button>
    <button
      v-tooltip.top="{ content: '居中<br>Cmd+Shift+E', delay: { show: 1000 }, html: true }"
      :class="{ 'is-active': editor.isActive({ textAlign: 'center' }) }"
      @click="applyCenter"
    >
      <div class="icon">
        <AlignTextCenter
          theme="outline"
          size="16"
          fill="var(--color-icon-primary)"
          :strokeWidth="3"
        />
      </div>
    </button>
    <button
      v-tooltip.top="{ content: '居右<br>Cmd+Shift+R', delay: { show: 1000 }, html: true }"
      :class="{ 'is-active': editor.isActive({ textAlign: 'right' }) }"
      @click="applyRight"
    >
      <div class="icon">
        <AlignTextRight
          theme="outline"
          size="16"
          fill="var(--color-icon-primary)"
          :strokeWidth="3"
        />
      </div>
    </button>
    <button
      v-tooltip.top="{ content: '两端对齐<br>Cmd+Shift+J', delay: { show: 1000 }, html: true }"
      :class="{ 'is-active': editor.isActive({ textAlign: 'justify' }) }"
      @click="applyJustify"
    >
      <div class="icon">
        <AlignTextBoth
          theme="outline"
          size="16"
          fill="var(--color-icon-primary)"
          :strokeWidth="3"
        />
      </div>
    </button>
  </div>

  <!-- 链接设置菜单 -->
  <div v-if="showLinkInput" ref="linkMenuRef" class="link-input-menu" :style="linkFloatingStyles">
    <div class="link-input-fields">
      <div class="link-input-field">
        <div class="icon">
          <FontSize theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
        <input v-model="linkText" type="text" placeholder="链接文本" @keyup.enter="setLink" />
      </div>
      <div v-if="!isNoteReference" class="link-input-field">
        <div class="icon">
          <LinkTwo theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
        <input v-model="linkUrl" type="text" placeholder="输入链接URL" @keyup.enter="setLink" />
      </div>
    </div>
    <div class="link-input-actions">
      <button @click="setLink">确认</button>
      <button @click="cancelLink">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BubbleMenu } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/vue-3'
import {
  TextStyleOne,
  TextBold,
  TextItalic,
  Strikethrough,
  TextUnderline,
  HighLight,
  Platte,
  Code,
  LinkTwo,
  ParagraphTriangle,
  ParagraphAlphabet,
  More,
  H1,
  H2,
  H3,
  ListTwo,
  OrderedList,
  ListSuccess,
  ClearFormat,
  AlignTextLeft,
  AlignTextCenter,
  AlignTextRight,
  AlignTextBoth,
  FontSize
} from '@icon-park/vue-next'
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import { useFloating } from '@floating-ui/vue'
import { offset, flip, shift } from '@floating-ui/dom'
import { useRouter } from 'vue-router/dist/vue-router'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useUIStore } from '@renderer/stores/UIStore'

const props = defineProps<{
  editor: Editor
}>()

const router = useRouter()
const noteStore = useNoteStore()
const uiStore = useUIStore()

const bubbleMenuRef = ref()
const dropdownButton = ref()
const colorButton = ref()
const moreButton = ref()
const moreMenuRef = ref()
const showDropdown = ref(false)
const showColorMenu = ref(false)
const showMoreMenu = ref(false)
const colorMenu = ref(null)
const currentColor = ref('')

// 定义样式菜单项
const styleMenuItems = computed<MenuItem[]>(() => [
  {
    name: 'paragraph',
    label: '段落',
    icon: ParagraphAlphabet,
    action: () => {
      const editor = props.editor
      // 先尝试提升节点层级
      editor
        .chain()
        .focus()
        .lift('listItem') // 提升列表项
        .lift('taskItem') // 提升任务列表项
        .clearNodes() // 清除节点格式
        .setParagraph() // 设置为段落
        .run()
      showDropdown.value = false
    }
  },
  {
    name: 'heading1',
    label: '标题1',
    icon: H1,
    action: () => setNodeType('heading', { level: 1 })
  },
  {
    name: 'heading2',
    label: '标题2',
    icon: H2,
    action: () => setNodeType('heading', { level: 2 })
  },
  {
    name: 'heading3',
    label: '标题3',
    icon: H3,
    action: () => setNodeType('heading', { level: 3 })
  },
  {
    name: 'bulletList',
    label: '无序列表',
    icon: ListTwo,
    action: () => {
      props.editor.chain().focus().toggleBulletList().run()
      showDropdown.value = false
    }
  },
  {
    name: 'orderedList',
    label: '有序列表',
    icon: OrderedList,
    action: () => {
      props.editor.chain().focus().toggleOrderedList().run()
      showDropdown.value = false
    }
  },
  {
    name: 'taskList',
    label: '任务列表',
    icon: ListSuccess,
    action: () => {
      props.editor.chain().focus().toggleTaskList().run()
      showDropdown.value = false
    }
  }
])

// 修改颜色数组用 CSS 变量来适应不同主题
const colors = [
  { name: '粉色', value: 'var(--color-text-pink)' },
  { name: '橙色', value: 'var(--color-text-orange)' },
  { name: '绿色', value: 'var(--color-text-green)' },
  { name: '青色', value: 'var(--color-text-cyan)' },
  { name: '蓝色', value: 'var(--color-text-blue)' },
  { name: '紫色', value: 'var(--color-text-purple)' }
]

// 创建颜色菜单 floating 实例
const { floatingStyles: colorFloatingStyles, update: updateColorMenu } = useFloating(
  colorButton,
  colorMenu,
  {
    placement: 'bottom-start',
    middleware: [offset(8)]
  }
)

// 创建更多菜单 floating 实例
const { floatingStyles: moreFloatingStyles, update: updateMoreFloating } = useFloating(
  moreButton,
  moreMenuRef,
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

// 链接设置菜单
const showLinkInput = ref(false)
const linkText = ref('')
const linkUrl = ref('')
const isNoteReference = ref(false)
const linkMenuRef = ref<HTMLElement | null>(null)
const linkButtonRef = ref<HTMLElement | null>(null)

// 创建链接菜单 floating 实例
const { floatingStyles: linkFloatingStyles, update: updateLinkFloating } = useFloating(
  linkButtonRef,
  linkMenuRef,
  {
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift()]
  }
)

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const toggleColorMenu = () => {
  showColorMenu.value = !showColorMenu.value
  if (showColorMenu.value) {
    nextTick(() => {
      updateColorMenu()
    })
  }
}

const toggleMoreMenu = () => {
  showMoreMenu.value = !showMoreMenu.value
  if (showMoreMenu.value) {
    nextTick(() => {
      updateMoreFloating()
    })
  }
}

const applySubscript = () => {
  props.editor.chain().focus().toggleSubscript().run()
  showMoreMenu.value = false
}

const applySuperscript = () => {
  props.editor.chain().focus().toggleSuperscript().run()
  showMoreMenu.value = false
}

const applyLeft = () => {
  props.editor.chain().focus().setTextAlign('left').run()
  showMoreMenu.value = false
}

const applyCenter = () => {
  props.editor.chain().focus().setTextAlign('center').run()
  showMoreMenu.value = false
}

const applyRight = () => {
  props.editor.chain().focus().setTextAlign('right').run()
  showMoreMenu.value = false
}

const applyJustify = () => {
  props.editor.chain().focus().setTextAlign('justify').run()
  showMoreMenu.value = false
}

const setNodeType = (type: string, attrs = {}) => {
  props.editor.chain().focus().setNode(type, attrs).run()
  showDropdown.value = false
}

const handleStyleMenuClick = (item: MenuItem) => {
  item.action()
}

const setColor = (color: string) => {
  if (!props.editor) return

  if (color === 'var(--color-text-primary)') {
    // 如果是默认颜色，则移除颜色标记
    props.editor.chain().focus().toggleMark('textStyle', { color: null }).blur().run()
  } else {
    // 设置新的颜色
    props.editor.chain().focus().toggleMark('textStyle', { color }).blur().run()
  }

  currentColor.value = color
  showColorMenu.value = false
}

const closeColorMenu = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (showColorMenu.value && !target?.closest('.color-menu') && !target?.closest('button')) {
    showColorMenu.value = false
  }
}

const closeMoreMenu = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (showMoreMenu.value && !target?.closest('.more-menu') && !target?.closest('button')) {
    showMoreMenu.value = false
  }
}

// 显示链接设置菜单
const showLinkMenu = (event: MouseEvent, linkElement: HTMLAnchorElement | null = null) => {
  closeLinkMenu()
  showLinkInput.value = true
  // 保存点击的按钮引用
  const targetEl = event.target as HTMLElement
  linkButtonRef.value = targetEl.closest('button') || targetEl

  if (linkElement) {
    // 编辑现有链接
    const href = linkElement.getAttribute('href')
    isNoteReference.value = href?.startsWith('note://') || false
    linkUrl.value = href || ''
    linkText.value = linkElement.textContent || ''
  } else {
    // 创建新链接
    const { from, to } = props.editor.state.selection
    isNoteReference.value = false
    linkUrl.value = ''
    linkText.value = props.editor.state.doc.textBetween(from, to) || ''
  }

  nextTick(() => {
    updateLinkFloating()

    const inputElements = document.querySelectorAll('.link-input-menu input')
    if (inputElements.length > 0) {
      ;(inputElements[0] as HTMLInputElement).value = linkText.value
      if (!isNoteReference.value && inputElements[1]) {
        ;(inputElements[1] as HTMLInputElement).value = linkUrl.value
      }
      ;(inputElements[0] as HTMLInputElement).focus()
    }
  })
}

const setLink = async () => {
  if (!props.editor) return

  if (!linkUrl.value && !isNoteReference.value) {
    props.editor.chain().focus().extendMarkRange('link').unsetLink().run()
    closeLinkMenu()
    return
  }

  if (isNoteReference.value) {
    const noteId = linkUrl.value.replace('note://', '')
    // 处理笔记引用链接的逻辑
    props.editor
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
    // 处理普通链接
    props.editor
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

  closeLinkMenu()
}

// 取消链接设置
const cancelLink = () => {
  showLinkInput.value = false
  linkUrl.value = ''
  linkText.value = ''
}

// 关闭链接菜单
const closeLinkMenu = () => {
  showLinkInput.value = false
}

// 链接点击处理
const handleLinkClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  const linkElement = target.closest('a')
  if (!linkElement) return false

  const href = linkElement.getAttribute('href')
  if (!href) return false

  // Command/Ctrl: 显示链接设置菜单（对所有类型的链接都生效）
  if (event.metaKey || event.ctrlKey) {
    event.preventDefault()
    showLinkMenu(event, linkElement)
    return true // 阻止 Tiptap 的默认行为
  }

  // 处理笔记链接的特殊行为
  if (href.startsWith('note://')) {
    event.preventDefault()
    const noteId = href.replace('note://', '')

    // Alt: 在主编辑器打开
    if (event.altKey) {
      router.push(`/note/${noteId}`)
      return true
    }

    // 无修饰键: 在右侧边栏查看
    noteStore.openBacklinkPreview(noteId)
    uiStore.openRightSidebarWithTab('backlink')
    return true
  } else {
    // 普通链接的默认行为：在新标签页打开
    if (!event.metaKey && !event.ctrlKey) {
      window.open(href, '_blank')
      return true
    }
  }

  return false
}

const closeLinkMenus = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (showLinkInput.value && !target?.closest('.link-input-menu') && !target?.closest('button')) {
    closeLinkMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', closeColorMenu)
  document.addEventListener('click', closeMoreMenu)
  document.addEventListener('click', closeLinkMenus)
  // 添加监听自定义事件，用于响应编辑器关闭链接菜单的请求
  document.addEventListener('close-link-menus', closeLinkMenu)

  // 修复: 不直接修改props，而是使用本地变量存储原始函数并替换
  if (props.editor && props.editor.view) {
    const editorView = props.editor.view
    const originalHandleClick = editorView.props.handleClick

    // 创建处理函数而不是直接修改props
    const newHandleClick = (view: any, pos: number, event: any) => {
      if (event.target instanceof HTMLAnchorElement) {
        return handleLinkClick(event)
      }
      return originalHandleClick ? originalHandleClick(view, pos, event) : false
    }

    // 使用编辑器的API来更新处理函数，而不是直接修改props
    editorView.setProps({
      ...editorView.props,
      handleClick: newHandleClick
    })
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeColorMenu)
  document.removeEventListener('click', closeMoreMenu)
  document.removeEventListener('click', closeLinkMenus)
  // 移除自定义事件监听
  document.removeEventListener('close-link-menus', closeLinkMenu)
})

// 添加清除颜色方法
const clearColor = () => {
  if (!props.editor) return
  props.editor.chain().focus().unsetMark('textStyle').blur().run()
  currentColor.value = ''
  showColorMenu.value = false
}
</script>

<style lang="scss" scoped>
.bubble-menu {
  display: flex;
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--color-border);
  overflow: hidden;
  padding: 4px;
  gap: 2px;

  button {
    border: none;
    background: none;
    color: var(--color-text-primary);
    padding: 4px;
    border-radius: 6px;
    cursor: pointer;
    height: 28px;
    width: 28px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background-color: var(--color-hover-button);
    }

    &.is-active {
      background-color: var(--color-hover-button);
      color: var(--color-text-primary);
    }

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;

      :deep(svg) {
        width: 16px;
        height: 16px;
      }
    }

    .text-icon {
      font-size: 14px;
      font-weight: 600;
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
  gap: 2px;

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

    &:hover {
      background-color: var(--color-hover-button);
    }

    &.is-active {
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

      :deep(.i-icon) {
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
      color: var(---color-text-primary);
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

      :deep(.i-icon) {
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

      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }

      :deep(svg) {
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
        border: 1px solid var(--color-border);
        color: var(--color-text-primary);
        background-color: transparent;
      }

      &:hover {
        opacity: 0.9;
      }
    }
  }
}
</style>
