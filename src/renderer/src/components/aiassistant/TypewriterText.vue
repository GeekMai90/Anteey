<template>
  <div class="typewriter markdown-body">
    <template v-if="shouldShowInstantly">
      <!-- 完整内容直接渲染 -->
      <div class="segment" v-html="sanitizedContent" />
    </template>
    <template v-else>
      <!-- 打字机效果容器 -->
      <div :id="containerId" class="segment"></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
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
import TypeIt from 'typeit'
import MarkdownIt from 'markdown-it'
import { useAssistantStore } from '@renderer/stores/assistantStore'

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
      if (language && hljs.getLanguage(language)) {
        return hljs.highlight(code, { language }).value
      }
      return hljs.highlightAuto(code).value
    } catch (e) {
      return code // 如果高亮失败，返回原始代码
    }
  },
  breaks: true,
  gfm: true
} as any)

const assistantStore = useAssistantStore()

const props = defineProps<{
  content: string
  messageId: string
  timestamp: number
  instant?: boolean
}>()

const emit = defineEmits(['complete', 'segmentComplete'])

// 生成唯一的容器ID
const containerId = computed(() => `typewriter-${props.messageId}`)

// 判断是否应该立即显示
const shouldShowInstantly = computed(() => {
  // 如果明确设置了 instant 属性，优先使用它
  if (props.instant !== undefined) {
    return props.instant
  }
  return false // 默认显示打字机效果
})

// 配置 MarkdownIt
const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true
})

// 安全的 HTML 内容
const sanitizedContent = computed(() => {
  const html = md.render(props.content)
  return DOMPurify.sanitize(html)
})

// TypeIt 实例引用
const typeItInstance = ref<any>(null)

// 安全地销毁实例
const safeDestroyInstance = () => {
  try {
    if (typeItInstance.value) {
      typeItInstance.value.destroy()
      typeItInstance.value = null
    }
  } catch (error) {
    console.warn('销毁 TypeIt 实例时出错:', error)
  }
}

// 初始化 TypeIt
const initTypeIt = () => {
  try {
    // 先安全销毁现有实例
    safeDestroyInstance()

    // 确保目标元素存在
    const container = document.getElementById(containerId.value)
    if (!container) {
      console.warn('找不到目标容器:', containerId.value)
      return
    }

    typeItInstance.value = new TypeIt(`#${containerId.value}`, {
      strings: sanitizedContent.value,
      speed: 50,
      waitUntilVisible: true,
      html: true,
      cursor: false,
      startDelay: 0,
      beforeString: () => false,
      afterComplete: () => {
        emit('complete')
        assistantStore.markMessageAsDisplayed(props.messageId)
      },
      afterStep: () => {
        emit('segmentComplete')
      }
    }).go()
  } catch (error) {
    console.error('初始化 TypeIt 失败:', error)
    // 如果初始化失败，直接显示内容
    const container = document.getElementById(containerId.value)
    if (container) {
      container.innerHTML = sanitizedContent.value
      emit('complete')
      assistantStore.markMessageAsDisplayed(props.messageId)
    }
  }
}

// 组件挂载时初始化
onMounted(() => {
  try {
    if (!shouldShowInstantly.value) {
      initTypeIt()
    } else {
      // 如果是历史消息，直接标记为已显示
      assistantStore.markMessageAsDisplayed(props.messageId)
      emit('complete')
    }
  } catch (error) {
    console.warn('组件挂载时出错:', error)
  }
})

// 组件卸载时清理
onUnmounted(() => {
  safeDestroyInstance()
})

// 添加 watch 来处理内容变化
watch(
  () => props.content,
  () => {
    if (!shouldShowInstantly.value) {
      nextTick(() => {
        initTypeIt()
      })
    }
  }
)
</script>

<style lang="scss">
.markdown-body {
  color: inherit;
  background: none;
  max-width: 100%;
}

.markdown-body p {
  margin: 0;
  line-height: 1.8;
  margin-bottom: 0.5em;
}

.markdown-body code {
  background: var(--color-code-bg);
  color: var(--color-text-primary);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: var(--font-mono);
}

.markdown-body pre {
  background: var(--color-code-block-bg);
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
  border-left: 3px solid var(--color-border);
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
  animation: fadeIn 0.2s ease-out forwards;
  max-width: 100%;

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

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 隐藏 TypeIt 默认光标和空行
.ti-cursor {
  display: none !important;
}

// 完全移除 TypeIt 的 before 伪元素
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
