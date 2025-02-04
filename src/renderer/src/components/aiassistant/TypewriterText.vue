<template>
  <div class="typewriter markdown-body">
    <template v-if="instant">
      <!-- 完整内容直接渲染 -->
      <div class="segment" v-html="renderedContent" />
    </template>
    <template v-else>
      <!-- 打字机效果 -->
      <div class="segment" v-html="renderMarkdown(accumulatedText)" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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

const props = defineProps<{
  content: string
  instant?: boolean
  isHistoryMessage?: boolean
}>()

const emit = defineEmits(['complete', 'segmentComplete'])

// 状态
const accumulatedText = ref('')
const isComplete = ref(false)

// 安全地渲染 Markdown
const renderMarkdown = (text: string) => {
  const html = marked.parse(text)
  return DOMPurify.sanitize(html as string)
}

// 缓存完整渲染结果
const renderedContent = computed(() => {
  return renderMarkdown(props.content)
})

// 分段逻辑
const segments = computed(() => {
  const text = props.content
  // 按句子分割，但保持段落结构
  return text
    .split(/([。！？.!?]+["""'']*)/)
    .filter(Boolean)
    .reduce((acc: string[], cur, i, arr) => {
      if (i % 2 === 0) {
        if (i === arr.length - 1 && !cur.match(/[。！？.!?]/)) {
          if (acc.length > 0) {
            acc[acc.length - 1] += cur
          } else {
            acc.push(cur)
          }
        } else {
          acc.push(cur + (arr[i + 1] || ''))
        }
      }
      return acc
    }, [])
    .filter((s) => s.trim())
})

// 打字效果
const typeSegment = (text: string, startFrom: number) => {
  return new Promise<void>((resolve) => {
    let index = startFrom
    const getTypeSpeed = (char: string) => {
      if (char.match(/[，。！？,.!?]/)) {
        return 20
      }
      return 5
    }

    const type = () => {
      if (index < text.length) {
        accumulatedText.value = text.slice(0, index + 1)
        index++
        setTimeout(type, getTypeSpeed(text[index - 1]))
      } else {
        resolve()
      }
    }
    type()
  })
}

// 更新逻辑
const updateText = async () => {
  isComplete.value = false
  accumulatedText.value = ''
  let startIndex = 0

  for (const segment of segments.value) {
    // 计算新的文本长度
    const newText = startIndex === 0 ? segment : accumulatedText.value + segment
    // 从上一次结束的位置开始打字
    await typeSegment(newText, startIndex)
    startIndex = newText.length
    emit('segmentComplete')
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  isComplete.value = true
  emit('complete')
}

// 更新监听逻辑
watch(
  () => props.content,
  () => {
    if (props.instant) {
      isComplete.value = true
      accumulatedText.value = props.content
    } else {
      isComplete.value = false
      accumulatedText.value = ''
      if (props.content) {
        updateText()
      }
    }
  },
  { immediate: true }
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
  color: white;
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
</style>
