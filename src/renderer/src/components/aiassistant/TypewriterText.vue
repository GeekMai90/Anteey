<template>
  <div class="typewriter markdown-body">
    <template v-for="(segment, index) in segments" :key="index">
      <div class="segment">
        <div
          v-if="segment.length <= 15 || index < currentSegment"
          v-html="renderMarkdown(segment)"
        />
        <div v-else-if="index === currentSegment" v-html="renderMarkdown(displayText)" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
}>()

// 安全地渲染 Markdown
const renderMarkdown = (text: string) => {
  const html = marked.parse(text)
  return DOMPurify.sanitize(html as string)
}

// 将内容按句子分段，保留 Markdown 格式
// 将内容按句子分段，保留 Markdown 格式和列表完整性
// const segments = computed(() => {
//   const lines = props.content.split('\n')
//   const result: string[] = []
//   let currentSegment = ''

//   for (let i = 0; i < lines.length; i++) {
//     const line = lines[i]

//     // 如果是列表项，与下一行合并
//     if (/^\d+\.\s/.test(line)) {
//       currentSegment = line
//       // 查找并合并列表项的内容
//       while (i + 1 < lines.length && lines[i + 1] && !lines[i + 1].match(/^\d+\.\s/)) {
//         currentSegment += '\n' + lines[i + 1]
//         i++
//       }
//       result.push(currentSegment)
//     }
//     // 普通段落按句号分割
//     else {
//       const sentences = line.split(/([。！？.!?\n]+)(?![^[]*\]|\*\*|`)/g).filter(Boolean)

//       for (let j = 0; j < sentences.length; j += 2) {
//         const sentence = sentences[j] + (sentences[j + 1] || '')
//         if (sentence.trim()) {
//           result.push(sentence)
//         }
//       }
//     }
//   }

//   return result
// })
// 将内容按句子分段，保留 Markdown 格式
const segments = computed(() => {
  const lines = props.content.split('\n')
  const result: string[] = []
  let currentSegment = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 如果是列表项，与下一行合并
    if (/^[0-9-*]\.\s/.test(line)) {
      currentSegment = line
      // 查找并合并列表项的内容
      while (i + 1 < lines.length && lines[i + 1] && !lines[i + 1].match(/^[0-9-*]\.\s/)) {
        currentSegment += '\n' + lines[i + 1]
        i++
      }
      result.push(currentSegment)
    }
    // 普通段落按中文或英文的句号、问号、感叹号分割
    else {
      const sentences = line
        .split(/([。！？.!?]+["""'']*)/)
        .filter(Boolean)
        .reduce((acc: string[], cur, i, arr) => {
          if (i % 2 === 0) {
            // 如果是最后一个片段，且不是完整句子，就与前一个合并
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

      result.push(...sentences.filter((s) => s.trim()))
    }
  }

  return result
})
const currentSegment = ref(0)
const displayText = ref('')

const typeSegment = (text: string) => {
  return new Promise<void>((resolve) => {
    let index = 0
    const speed = 10

    const type = () => {
      if (index < text.length) {
        displayText.value = text.slice(0, index + 1)
        index++
        setTimeout(type, speed)
      } else {
        resolve()
      }
    }
    type()
  })
}

onMounted(async () => {
  for (let i = 0; i < segments.value.length; i++) {
    currentSegment.value = i
    const segment = segments.value[i]

    if (segment.length > 15) {
      displayText.value = ''
      await typeSegment(segment)
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
})
</script>

<style lang="scss">
.markdown-body {
  color: inherit;
  background: none;
}

.markdown-body p {
  margin: 0;
  line-height: 1.8;
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
