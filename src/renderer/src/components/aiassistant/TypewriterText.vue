<template>
  <div class="typewriter markdown-body">
    <!-- 始终直接渲染内容，不使用条件判断 -->
    <div class="segment" v-html="sanitizedContent"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
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

// 配置 MarkdownIt
const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true
})

// 安全的 HTML 内容
const sanitizedContent = computed(() => {
  console.log('处理消息内容:', {
    messageId: props.messageId,
    contentLength: props.content.length,
    timestamp: props.timestamp
  })
  const html = md.render(props.content)
  const sanitized = DOMPurify.sanitize(html)
  console.log('内容处理完成:', {
    messageId: props.messageId,
    htmlLength: html.length,
    sanitizedLength: sanitized.length
  })
  return sanitized
})

// 组件挂载时初始化
onMounted(() => {
  console.log('TypewriterText 组件挂载:', {
    messageId: props.messageId,
    hasContent: !!props.content
  })

  // 直接标记消息为已显示
  assistantStore.markMessageAsDisplayed(props.messageId)

  // 执行滚动到消息开头的逻辑
  setTimeout(() => {
    console.log('触发完成事件:', props.messageId)
    emit('segmentComplete')
    emit('complete')
  }, 100)
})
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
