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
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import DOMPurify from 'dompurify'

marked.setOptions({
  highlight(code: string, language: string) {
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(code, { language }).value
    }
    return hljs.highlightAuto(code).value
  },
  breaks: true,
  gfm: true
} as any)

const props = defineProps<{
  content: string
  instant?: boolean
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
        return 50
      }
      return 10
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
    await new Promise((resolve) => setTimeout(resolve, 150))
  }

  isComplete.value = true
  emit('complete')
}

// 监听内容变化
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
}

.markdown-body p {
  margin: 0;
  line-height: 1.8;
  margin-bottom: 0.5em;
}

.markdown-body code {
  background: var(--color-code-bg);
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
}

.markdown-body pre code {
  background: none;
  padding: 0;
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
}

.segment {
  animation: fadeIn 0.2s ease-out forwards;
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
