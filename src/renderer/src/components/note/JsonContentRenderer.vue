<template>
  <div class="json-content">
    <template v-for="(node, index) in safeContent.content" :key="index">
      <!-- 段落 -->
      <p v-if="node.type === 'paragraph'" :style="getNodeStyle(node)">
        <template v-for="(child, childIndex) in node.content" :key="childIndex">
          <!-- 普通文本（包括带标记的文本） -->
          <template v-if="child.type === 'text'">
            <!-- 链接文本 -->
            <a
              v-if="hasMarkType(child.marks, 'link')"
              :href="getLinkHref(child.marks)"
              :class="['link', ...getTextClasses(child.marks)]"
              :target="getLinkTarget(child.marks)"
              :rel="getLinkRel(child.marks)"
              :data-note-id="getLinkNoteId(child.marks)"
            >
              {{ child.text }}
            </a>
            <!-- 其他带标记的文本 -->
            <span
              v-else
              :class="getTextClasses(child.marks)"
              v-html="renderMathFormula(child.text)"
            ></span>
          </template>
          <!-- 加粗文本 -->
          <strong v-else-if="hasMarkType(child.marks, 'bold')">{{ child.text }}</strong>
          <!-- 斜体文本 -->
          <em v-else-if="hasMarkType(child.marks, 'italic')">{{ child.text }}</em>
          <!-- 粗斜体 -->
          <strong v-else-if="hasMarkTypes(child.marks, ['bold', 'italic'])">
            <em>{{ child.text }}</em>
          </strong>
          <!-- 删除线文本 -->
          <del v-else-if="hasMarkType(child.marks, 'strike')">{{ child.text }}</del>
          <!-- 高亮文本 -->
          <mark v-else-if="hasMarkType(child.marks, 'highlight')" class="highlight">{{
            child.text
          }}</mark>
          <!-- 代码块 -->
          <code v-else-if="hasMarkType(child.marks, 'code')" class="inline-code">{{
            child.text
          }}</code>
        </template>
      </p>

      <!-- 标题 -->
      <component
        :is="`h${node.attrs?.level || 1}`"
        v-else-if="node.type === 'heading'"
        :style="getNodeStyle(node)"
      >
        <template v-for="(child, _childIndex) in node.content" :key="_childIndex">
          <span v-html="renderMathFormula(child.text)"></span>
        </template>
      </component>

      <!-- 无序列表 -->
      <ul v-else-if="node.type === 'bulletList'">
        <template v-for="(item, _itemIndex) in node.content" :key="_itemIndex">
          <li>
            <template v-for="(listContent, _listIndex) in item.content" :key="_listIndex">
              <!-- 递归渲染列表项内容 -->
              <template v-if="listContent.type === 'paragraph'">
                <p :style="getNodeStyle(listContent)">
                  <template v-for="(text, _textIndex) in listContent.content" :key="_textIndex">
                    <span
                      :class="getTextClasses(text.marks)"
                      v-html="renderMathFormula(text.text)"
                    ></span>
                  </template>
                </p>
              </template>
              <!-- 处理嵌套列表 - 递归渲染 -->
              <template
                v-else-if="listContent.type === 'bulletList' || listContent.type === 'orderedList'"
              >
                <JsonContentRenderer :content="{ type: 'doc', content: [listContent] }" />
              </template>
            </template>
          </li>
        </template>
      </ul>

      <!-- 有序列表 -->
      <ol v-else-if="node.type === 'orderedList'">
        <template v-for="(item, _itemIndex) in node.content" :key="_itemIndex">
          <li>
            <template v-for="(listContent, _listIndex) in item.content" :key="_listIndex">
              <!-- 递归渲染列表项内容 -->
              <template v-if="listContent.type === 'paragraph'">
                <p :style="getNodeStyle(listContent)">
                  <template v-for="(text, _textIndex) in listContent.content" :key="_textIndex">
                    <span
                      :class="getTextClasses(text.marks)"
                      v-html="renderMathFormula(text.text)"
                    ></span>
                  </template>
                </p>
              </template>
              <!-- 处理嵌套列表 - 递归渲染 -->
              <template
                v-else-if="listContent.type === 'bulletList' || listContent.type === 'orderedList'"
              >
                <JsonContentRenderer :content="{ type: 'doc', content: [listContent] }" />
              </template>
            </template>
          </li>
        </template>
      </ol>

      <!-- 图片 -->
      <img
        v-else-if="node.type === 'image'"
        :src="node.attrs?.src"
        :alt="node.attrs?.alt"
        :title="node.attrs?.title"
        loading="lazy"
      />

      <!-- 引用块 -->
      <blockquote v-else-if="node.type === 'blockquote'" class="blockquote">
        <template v-for="(quoteContent, _quoteIndex) in node.content" :key="_quoteIndex">
          <!-- 递归渲染引用块内容 -->
          <template v-if="quoteContent.type === 'paragraph'">
            <p :style="getNodeStyle(quoteContent)">
              <template v-for="(text, _textIndex) in quoteContent.content" :key="_textIndex">
                <span
                  :class="getTextClasses(text.marks)"
                  v-html="renderMathFormula(text.text)"
                ></span>
              </template>
            </p>
          </template>
          <!-- 处理嵌套引用 - 递归渲染 -->
          <template v-else-if="quoteContent.type === 'blockquote'">
            <JsonContentRenderer :content="{ type: 'doc', content: [quoteContent] }" />
          </template>
        </template>
      </blockquote>

      <!-- 表格 -->
      <table v-else-if="node.type === 'table'" class="table">
        <tbody>
          <tr v-for="(row, _rowIndex) in node.content" :key="_rowIndex">
            <template v-for="(cell, _cellIndex) in row.content" :key="_cellIndex">
              <!-- 表头单元格 -->
              <th
                v-if="cell.type === 'tableHeader'"
                :style="{
                  ...getNodeStyle(cell),
                  width: cell.attrs?.colwidth ? `${cell.attrs.colwidth}px` : 'auto'
                }"
                :colspan="cell.attrs?.colspan"
                :rowspan="cell.attrs?.rowspan"
              >
                <template
                  v-for="(cellContent, cellContentIndex) in cell.content"
                  :key="cellContentIndex"
                >
                  <template v-if="cellContent.type === 'paragraph'">
                    <template v-for="(text, _textIndex) in cellContent.content" :key="_textIndex">
                      <span
                        :class="getTextClasses(text.marks)"
                        v-html="renderMathFormula(text.text)"
                      ></span>
                    </template>
                  </template>
                </template>
              </th>
              <!-- 普通单元格 -->
              <td
                v-else
                :style="{
                  ...getNodeStyle(cell),
                  width: cell.attrs?.colwidth ? `${cell.attrs.colwidth}px` : 'auto'
                }"
                :colspan="cell.attrs?.colspan"
                :rowspan="cell.attrs?.rowspan"
              >
                <template
                  v-for="(cellContent, cellContentIndex) in cell.content"
                  :key="cellContentIndex"
                >
                  <template v-if="cellContent.type === 'paragraph'">
                    <template v-for="(text, _textIndex) in cellContent.content" :key="_textIndex">
                      <span
                        :class="getTextClasses(text.marks)"
                        v-html="renderMathFormula(text.text)"
                      ></span>
                    </template>
                  </template>
                </template>
              </td>
            </template>
          </tr>
        </tbody>
      </table>

      <!-- 任务列表 -->
      <div v-else-if="node.type === 'taskList'" class="task-list">
        <div
          v-for="(item, itemIndex) in node.content"
          :key="itemIndex"
          class="task-item"
          :class="{ 'is-checked': item.attrs?.checked }"
        >
          <div class="task-item-content">
            <input
              type="checkbox"
              :checked="item.attrs?.checked"
              @change="handleTaskChange(item, itemIndex)"
            />
            <template
              v-for="(taskContent, taskContentIndex) in item.content"
              :key="taskContentIndex"
            >
              <template v-if="taskContent.type === 'paragraph'">
                <template v-for="(text, _textIndex) in taskContent.content" :key="_textIndex">
                  <span
                    :class="getTextClasses(text.marks)"
                    v-html="renderMathFormula(text.text)"
                  ></span>
                </template>
              </template>
            </template>
          </div>
        </div>
      </div>

      <!-- 水平分割线 -->
      <hr v-else-if="node.type === 'horizontalRule'" class="divider" />

      <!-- 代码块 -->
      <div v-else-if="node.type === 'codeBlock'" class="code-block">
        <div v-if="node.attrs?.language" class="code-header">
          <span class="language-tag">{{ node.attrs.language }}</span>
        </div>
        <pre><code
          :class="`language-${node.attrs?.language}`"
          v-html="highlightCode(node.content?.[0]?.text || '', node.attrs?.language)"
        ></code></pre>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, withDefaults } from 'vue'
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
import 'katex/dist/katex.min.css'
// @ts-ignore - katex 模块使用 CommonJS 格式，在当前 TypeScript 设置下会报类型错误
import katex from 'katex'
import '@renderer/styles/_json-content-renderer.scss'

// 初始化 highlight.js
const initializeHighlight = () => {
  hljs.registerLanguage('javascript', javascript)
  hljs.registerLanguage('js', javascript)
  hljs.registerLanguage('typescript', typescript)
  hljs.registerLanguage('ts', typescript)
  hljs.registerLanguage('python', python)
  hljs.registerLanguage('py', python)
  hljs.registerLanguage('java', java)
  hljs.registerLanguage('go', go)
  hljs.registerLanguage('rust', rust)
  hljs.registerLanguage('rs', rust)
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
}

// 立即初始化
initializeHighlight()

interface Mark {
  type: string
  attrs?: Record<string, any>
}

interface JsonContent {
  type: string
  content?: JsonContent[]
  text?: string
  marks?: Mark[]
  attrs?: {
    level?: number
    textAlign?: string
    src?: string
    alt?: string
    title?: string
    colspan?: number
    rowspan?: number
    colwidth?: number
    checked?: boolean
    language?: string
  }
}

interface Props {
  content: {
    type?: string
    content: JsonContent[]
  }
}

const props = withDefaults(defineProps<Props>(), {
  content: () => ({
    type: 'doc',
    content: []
  })
})

// 添加一个计算属性来处理内容
const safeContent = computed(() => {
  if (!props.content) return { type: 'doc', content: [] }

  return {
    type: props.content.type || 'doc',
    content: Array.isArray(props.content.content) ? props.content.content : []
  }
})

// 检查是否包含特定类型的 mark
const hasMarkType = (marks: Mark[] | undefined, type: string): boolean => {
  return marks?.some((mark) => mark.type === type) || false
}

// 检查是否包含多个 mark 类型
const hasMarkTypes = (marks: Mark[] | undefined, types: string[]): boolean => {
  return types.every((type) => hasMarkType(marks, type))
}

// 获取节点样式
const getNodeStyle = (node: JsonContent): Record<string, string> => {
  const style: Record<string, string> = {}

  if (node.attrs?.textAlign) {
    style.textAlign = node.attrs.textAlign
  }

  return style
}

// 获取文本类名
const getTextClasses = (marks?: Mark[]): string[] => {
  const classes: string[] = []

  if (marks) {
    marks.forEach((mark) => {
      if (mark.type === 'bold') classes.push('font-bold')
      if (mark.type === 'italic') classes.push('italic')
      if (mark.type === 'strike') classes.push('line-through')
      if (mark.type === 'highlight') classes.push('highlight')
      if (mark.type === 'code') classes.push('inline-code')
    })
  }

  return classes
}

// 获取链接地址
const getLinkHref = (marks?: Mark[]): string => {
  const linkMark = marks?.find((mark) => mark.type === 'link')
  return linkMark?.attrs?.href || '#'
}

// 获取链接打开方式
const getLinkTarget = (marks?: Mark[]): string | undefined => {
  const linkMark = marks?.find((mark) => mark.type === 'link')
  return linkMark?.attrs?.target || undefined
}

// 获取链接关系属性
const getLinkRel = (marks?: Mark[]): string => {
  const linkMark = marks?.find((mark) => mark.type === 'link')
  return linkMark?.attrs?.rel || 'noopener noreferrer nofollow'
}

// 获取内部笔记链接ID
const getLinkNoteId = (marks?: Mark[]): string | undefined => {
  const linkMark = marks?.find((mark) => mark.type === 'link')
  return linkMark?.attrs?.['data-note-id']
}

// 处理任务状态变更
const handleTaskChange = (item: JsonContent, index: number) => {
  // 这里可以添加任务状态变更的处理逻辑
  console.log('Task changed:', item, index)
}

// 高亮代码
const highlightCode = (code: string, language?: string) => {
  if (!language) return code

  // 确保语言名称小写
  const normalizedLanguage = language.toLowerCase()

  try {
    // 检查语言是否已注册
    if (!hljs.getLanguage(normalizedLanguage)) {
      console.warn(`Language ${normalizedLanguage} is not registered`)
      return code
    }

    return hljs.highlight(code, { language: normalizedLanguage }).value
  } catch (error) {
    console.warn(`Failed to highlight code for language: ${normalizedLanguage}`, error)
    return code
  }
}

// 修改 renderMathFormula 函数
const renderMathFormula = (text: string | undefined): string => {
  if (!text) return ''

  try {
    // 使用非贪婪匹配来处理数学公式
    const regex = /\$(.*?)\$/g
    return text.replace(regex, (match, formula) => {
      try {
        return katex.renderToString(formula, {
          throwOnError: false,
          strict: false,
          trust: true,
          displayMode: false,
          output: 'html',
          macros: {
            '\\LaTeX': '\\mathrm{\\LaTeX}'
          }
        })
      } catch (err) {
        console.warn('Failed to render math formula:', err)
        return match
      }
    })
  } catch (error) {
    console.warn('Error in renderMathFormula:', error)
    return text
  }
}
</script>

<style lang="scss">
/* KaTeX 样式 - 仅在渲染组件中生效 */
.json-content {
  span {
    display: inline;
  }

  .katex {
    font-size: 1.1em;
    line-height: inherit;
    display: inline-block;
  }

  .katex-html {
    line-height: inherit;
    text-align: left;
  }

  // 修复运算符的对齐
  .mbin,
  .mrel {
    margin: 0 0.15em;
  }

  // 标题中的数学公式样式
  h1,
  h2,
  h3 {
    overflow-wrap: break-word;

    span {
      display: inline;
    }

    .katex {
      display: inline-block;
      vertical-align: -0.1em;
    }

    .katex-html {
      display: inline-block;
    }

    .base {
      display: inline-block;
    }

    .mord {
      display: inline-block;
    }
  }
}
</style>

<style lang="scss" scoped>
@use '@renderer/styles/_json-content-renderer.scss' as *;
</style>
