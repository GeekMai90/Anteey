<template>
  <div class="typewriter markdown-body">
    <!-- 始终直接渲染内容，不使用条件判断 -->
    <div class="segment" v-html="sanitizedContent"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, nextTick, watch } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import php from 'highlight.js/lib/languages/php'
import ruby from 'highlight.js/lib/languages/ruby'
import swift from 'highlight.js/lib/languages/swift'
import kotlin from 'highlight.js/lib/languages/kotlin'
import html from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import scss from 'highlight.js/lib/languages/scss'
import sql from 'highlight.js/lib/languages/sql'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'
import bash from 'highlight.js/lib/languages/bash'
import shell from 'highlight.js/lib/languages/shell'
import plaintext from 'highlight.js/lib/languages/plaintext'
import 'highlight.js/styles/github-dark.css'
import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'
import 'katex/dist/katex.min.css'
import mk from 'markdown-it-katex'
import { message } from '@renderer/utils/message'
import { Link, Copy, Download } from '@icon-park/vue-next'
import { createApp, h } from 'vue'
// import { useAssistantStore } from '@renderer/stores/assistantStore'

// 注册语言
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('c++', cpp)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('cs', csharp)
hljs.registerLanguage('php', php)
hljs.registerLanguage('ruby', ruby)
hljs.registerLanguage('rb', ruby)
hljs.registerLanguage('swift', swift)
hljs.registerLanguage('kotlin', kotlin)
hljs.registerLanguage('kt', kotlin)
hljs.registerLanguage('html', html)
hljs.registerLanguage('xml', html)
hljs.registerLanguage('vue', html)
hljs.registerLanguage('css', css)
hljs.registerLanguage('scss', scss)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('json', json)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('md', markdown)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', shell)
hljs.registerLanguage('sh', shell)
hljs.registerLanguage('plaintext', plaintext)
hljs.registerLanguage('text', plaintext)

marked.setOptions({
  highlight(code: string, language: string) {
    try {
      // 确保语言标识符是小写的
      const lang = language.toLowerCase()
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value
      }
      return hljs.highlightAuto(code).value
    } catch (e) {
      console.warn('代码高亮失败:', e)
      return code
    }
  },
  breaks: true,
  gfm: true,
  langPrefix: 'hljs language-'
} as any)

// const assistantStore = useAssistantStore()

const props = defineProps<{
  content: string
  messageId: string
  timestamp: number
  instant?: boolean
}>()

const emit = defineEmits(['complete', 'segmentComplete'])

// 配置 MarkdownIt
const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  highlight: function (str: string, lang: string) {
    try {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(str, { language: lang }).value
      }
      return hljs.highlightAuto(str).value
    } catch (e) {
      console.warn('代码高亮失败:', e)
      return str
    }
  }
}).use(mk) // 添加 KaTeX 插件

// 配置 DOMPurify 允许 KaTeX 相关标签和属性
DOMPurify.setConfig({
  ADD_TAGS: [
    'math',
    'maction',
    'menclose',
    'merror',
    'mfenced',
    'mfrac',
    'mglyph',
    'mi',
    'mlabeledtr',
    'mmultiscripts',
    'mn',
    'mo',
    'mover',
    'mpadded',
    'mphantom',
    'mroot',
    'mrow',
    'ms',
    'mspace',
    'msqrt',
    'mstyle',
    'msub',
    'msup',
    'msubsup',
    'mtable',
    'mtd',
    'mtext',
    'mtr',
    'munder',
    'munderover',
    'semantics',
    'annotation',
    'annotation-xml',
    'img'
  ],
  ADD_ATTR: ['href', 'xlink:href', 'data-*', 'src', 'alt', 'width', 'height']
})

// 安全的 HTML 内容
const sanitizedContent = computed(() => {
  // console.log('处理消息内容:', {
  //   messageId: props.messageId,
  //   contentLength: props.content.length,
  //   timestamp: props.timestamp
  // })
  const html = md.render(props.content)
  const sanitized = DOMPurify.sanitize(html)
  // console.log('内容处理完成:', {
  //   messageId: props.messageId,
  //   htmlLength: html.length,
  //   sanitizedLength: sanitized.length
  // })
  return sanitized
})

// 添加复制功能
const handleCopy = async (event: MouseEvent) => {
  const button = event.target as HTMLButtonElement
  const pre = button.closest('pre')
  if (!pre) return

  const code = pre.querySelector('code')
  if (!code) return

  try {
    await navigator.clipboard.writeText(code.textContent || '')
    button.textContent = '已复制!'
    button.classList.add('copied')

    setTimeout(() => {
      button.textContent = '复制'
      button.classList.remove('copied')
    }, 2000)
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// 添加复制按钮到代码块
const addCopyButtons = () => {
  nextTick(() => {
    const pres = document.querySelectorAll('.markdown-body pre')
    pres.forEach((pre) => {
      // 检查是否已经有复制按钮
      if (pre.querySelector('.copy-button')) return

      const button = document.createElement('button')
      button.className = 'copy-button'
      button.textContent = '复制'
      button.addEventListener('click', handleCopy)
      pre.appendChild(button)
    })
  })
}

// 添加图片操作函数
const handleCopyMarkdown = async (imgElement: HTMLImageElement) => {
  const markdown = `![${imgElement.alt}](${imgElement.src})`
  try {
    await navigator.clipboard.writeText(markdown)
    // 这里可以添加一个提示
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// 修改图片复制函数
const handleCopyImage = async (imgElement: HTMLImageElement) => {
  try {
    const imagePath = imgElement.src
    const result = await window.electronAPI.image.copyImage(imagePath)
    if (result.success) {
      message.success(result.message)
    } else {
      throw new Error(result.message)
    }
  } catch (err) {
    console.error('复制图片失败:', err)
    message.error('复制图片失败')
  }
}

// 修改图片下载函数
const handleDownloadImage = async (imgElement: HTMLImageElement) => {
  try {
    const imageUrl = imgElement.src
    const fileName = imgElement.alt || 'image.png'
    const result = await window.electronAPI.image.downloadImage(imageUrl, fileName)
    if (result) {
      message.success('图片下载成功')
    } else {
      throw new Error('下载失败')
    }
  } catch (err) {
    console.error('下载失败:', err)
    message.error('图片下载失败')
  }
}

// 修改添加图片按钮的函数
const addImageButtons = () => {
  nextTick(() => {
    const images = document.querySelectorAll('.markdown-body img')
    images.forEach((img) => {
      // 检查是否已经添加了按钮容器
      if (img.parentElement?.querySelector('.image-buttons')) return

      const buttonsContainer = document.createElement('div')
      buttonsContainer.className = 'image-buttons'

      // 创建按钮包装器
      const wrapper = document.createElement('div')
      wrapper.className = 'image-wrapper'
      img.parentNode?.insertBefore(wrapper, img)
      wrapper.appendChild(img)
      wrapper.appendChild(buttonsContainer)

      // 添加按钮
      const buttons = [
        {
          icon: Link,
          tooltip: '复制 Markdown',
          handler: () => handleCopyMarkdown(img as HTMLImageElement)
        },
        {
          icon: Copy,
          tooltip: '复制图片',
          handler: () => handleCopyImage(img as HTMLImageElement)
        },
        {
          icon: Download,
          tooltip: '下载图片',
          handler: () => handleDownloadImage(img as HTMLImageElement)
        }
      ]

      buttons.forEach((btn) => {
        const button = document.createElement('button')
        button.className = 'image-button'
        button.title = btn.tooltip
        button.addEventListener('click', btn.handler)

        // 创建一个新的 div 用于挂载图标
        const iconContainer = document.createElement('div')
        button.appendChild(iconContainer)

        // 创建并挂载图标组件
        const app = createApp({
          render() {
            return h(btn.icon, {
              theme: 'outline',
              size: '16',
              fill: 'currentColor',
              strokeWidth: 3
            })
          }
        })

        app.mount(iconContainer)
        buttonsContainer.appendChild(button)
      })
    })
  })
}

// 修改复制公式功能
const handleCopyFormula = async (event: MouseEvent) => {
  const button = event.target as HTMLButtonElement
  const formula = button.closest('.katex-display')
  if (!formula) return

  try {
    // 获取原始 TeX 公式
    const texAnnotation = formula.querySelector('annotation[encoding="application/x-tex"]')
    const texSource = texAnnotation?.textContent
    if (!texSource) throw new Error('未找到公式源码')

    // 转换成行内公式格式，确保没有换行
    const markdownFormula = `$${texSource.trim()}$`
    await navigator.clipboard.writeText(markdownFormula)

    button.textContent = '已复制!'
    button.classList.add('copied')

    setTimeout(() => {
      button.textContent = '复制'
      button.classList.remove('copied')
    }, 2000)

    message.success('公式已复制')
  } catch (err) {
    console.error('复制失败:', err)
    message.error('复制失败')
  }
}

// 添加复制按钮到公式块
const addFormulaButtons = () => {
  nextTick(() => {
    const formulas = document.querySelectorAll('.markdown-body .katex-display')
    formulas.forEach((formula) => {
      // 检查是否已经有复制按钮
      if (formula.querySelector('.copy-button')) return

      const button = document.createElement('button')
      button.className = 'copy-button'
      button.textContent = '复制'
      button.addEventListener('click', handleCopyFormula)
      formula.appendChild(button)
    })
  })
}

// 修改 watch 函数,添加公式复制按钮
watch(
  () => props.content,
  () => {
    addImageButtons()
    addCopyButtons()
    addFormulaButtons()
  }
)

// 修改 onMounted,添加公式复制按钮
onMounted(() => {
  setTimeout(() => {
    emit('segmentComplete')
    emit('complete')
  }, 100)
  addImageButtons()
  addCopyButtons()
  addFormulaButtons()
})
</script>

<style lang="scss">
.markdown-body {
  color: inherit;
  background: none;
  max-width: 100%;
  pre {
    position: relative;
    background: var(--color-code-block-bg-segment);
    padding: 1em;
    border-radius: 6px;
    overflow-x: auto;
    max-width: 100%;

    .copy-button {
      position: absolute;
      top: 0.5em;
      right: 0.5em;
      padding: 0.3em 0.6em;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      color: var(--color-text-secondary);
      font-size: 0.85em;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s;

      &:hover {
        background: var(--color-bg-hover);
      }

      &.copied {
        color: var(--color-success);
      }
    }

    &:hover .copy-button {
      opacity: 1;
    }

    code.hljs {
      background: none;
      padding: 0;
      color: var(--color-text-primary);
      // 确保代码块内的文本不会被包裹
      white-space: pre;
      word-break: normal;
      overflow-x: auto;
    }
  }

  // 添加数学公式相关样式
  .katex-display {
    position: relative;
    margin: 1em 0;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0.5em 0;

    .copy-button {
      position: absolute;
      top: 0.5em;
      right: 0.5em;
      padding: 0.3em 0.6em;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      color: var(--color-text-secondary);
      font-size: 0.85em;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s;

      &:hover {
        background: var(--color-bg-hover);
      }

      &.copied {
        color: var(--color-success);
      }
    }

    &:hover .copy-button {
      opacity: 1;
    }

    .katex {
      font-size: 1.1em;
      line-height: 1.5; // 增加行高

      .katex-html {
        // 确保有足够的空间显示上下标
        padding: 0.2em 0;
      }

      // 调整上下标的位置
      .msupsub {
        margin-right: 0.05em;
      }
    }
  }

  // 添加标题样式
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin-top: 0.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
    line-height: 1.25;
    color: var(--color-text-primary);
  }

  h1 {
    font-size: 1.5em;
    padding-bottom: 0.3em;
  }

  h2 {
    font-size: 1.25em;
    padding-bottom: 0.3em;
  }

  h3 {
    font-size: 1.1em;
  }

  h4 {
    font-size: 1em;
  }

  h5 {
    font-size: 0.875em;
  }

  h6 {
    font-size: 0.85em;
    color: var(--color-text-secondary);
  }

  // 第一个标题没有顶部边距
  *:first-child {
    margin-top: 0;
  }

  // 添加表格样式
  table {
    display: block;
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    border-spacing: 0;
    border-collapse: collapse;
    margin: 1em 0;

    th {
      font-weight: 600;
      background-color: var(--color-bg-secondary);
    }

    td,
    th {
      padding: 0.6em 1em;
      border: 1px solid var(--color-border);
      text-align: left;
    }

    tr {
      background-color: var(--color-bg-primary);
      border-top: 1px solid var(--color-border);

      &:nth-child(2n) {
        background-color: var(--color-bg-secondary);
      }
    }
  }

  // 处理表格内的代码
  table code {
    background-color: var(--color-code-block-bg-segment);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-size: 0.9em;
  }

  // 修改图片容器样式
  .image-wrapper {
    position: relative;
    display: inline-block;
    max-width: 100%;

    &:hover .image-buttons {
      opacity: 1;
    }
  }

  // 图片按钮容器
  .image-buttons {
    position: absolute;
    top: 0.5em;
    right: 0.5em;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
    background: var(--color-bg-float);
    padding: 4px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  // 修改图片按钮样式
  .image-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    line-height: 1;

    &:active {
      transform: scale(0.95);
    }

    // 修改图标容器样式
    > div {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    // 图标样式
    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    :deep(svg) {
      width: 16px;
      height: 16px;
      display: block;
    }
  }

  // 修改图片样式
  img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    margin: 0.5em 0;
    display: block;
  }
}

.markdown-body p {
  margin: 0;
  line-height: 1.8;
  margin-bottom: 0.5em;
}

.markdown-body code {
  background: var(--color-code-block-bg-segment);
  color: var(--color-inline-code-text);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: var(--font-mono);
}

.markdown-body pre {
  background: var(--color-code-block-bg-segment);
  padding: 1em;
  border-radius: 6px;
  overflow-x: auto;
  max-width: 100%;
  white-space: pre-wrap;
  word-break: break-word;
}

.markdown-body pre code {
  background: none;
  padding: 0;
  display: block;
  width: 100%;
  color: var(--color-text-primary);
}

.markdown-body strong {
  font-weight: 600;
}

.markdown-body em {
  font-style: italic;
}

.markdown-body ul,
.markdown-body ol {
  padding-left: 1.5em;
  line-height: 1.6;
}

.markdown-body blockquote {
  margin: 0.5em 0;
  padding-left: 1em;
  border-left: 3px solid var(--color-primary);
  color: var(--color-text-secondary);
}

.typewriter {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-width: 100%;
  overflow-wrap: break-word;
}

.segment {
  max-width: 100%;
  /* 确保没有动画 */
  animation: none !important;
  transition: none !important;

  &:empty::before {
    content: '';
    display: none;
  }

  &:first-child {
    margin-top: 0;
  }

  p:first-child {
    margin-top: 0;
  }
}

/* 移除或禁用所有动画相关样式 */
.ti-cursor {
  display: none !important;
}

[data-typeit-id]::before,
[data-typeit-id]::after {
  content: none !important;
  display: none !important;
}

.ti-container {
  display: inline;

  &::before,
  &::after {
    content: none !important;
    display: none !important;
  }
}
</style>
