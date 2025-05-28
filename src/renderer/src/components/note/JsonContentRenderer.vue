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
          <!-- Emoji -->
          <span v-else-if="child.type === 'emoji'" class="emoji">{{
            emojiNameToUnicode(child.attrs?.name || child.text || '')
          }}</span>
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
      <div v-else-if="node.type === 'image'" class="image-container">
        <img
          :key="`img-${getImageKey(node.attrs?.src)}`"
          :src="getImageDisplayUrl(node.attrs?.src)"
          :alt="node.attrs?.alt"
          :title="node.attrs?.title"
          loading="lazy"
          @error="handleImageError(node.attrs?.src)"
          @load="handleImageLoad(node.attrs?.src)"
        />
      </div>

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

      <!-- Emoji 节点 -->
      <span v-else-if="node.type === 'emoji'" class="emoji">{{
        emojiNameToUnicode(node.attrs?.name || node.text || '')
      }}</span>

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

      <!-- 标注块/详情折叠块 -->
      <div
        v-else-if="node.type === 'details'"
        class="details"
        :class="{
          callout: node.attrs?.isCallout,
          [`callout-${node.attrs?.calloutType || 'info'}`]: node.attrs?.isCallout
        }"
      >
        <div>
          <!-- 标题/摘要 -->
          <div v-if="node.content && node.content.length > 0" class="details-summary">
            <template v-for="(summaryNode, summaryIndex) in node.content" :key="summaryIndex">
              <template v-if="summaryNode.type === 'detailsSummary' && summaryNode.content">
                <strong class="summary-content">
                  <template
                    v-for="(summaryContent, contentIndex) in summaryNode.content"
                    :key="contentIndex"
                  >
                    <span v-if="summaryContent.type === 'text'" class="callout-text">
                      {{ summaryContent.text }}
                    </span>
                  </template>
                </strong>
              </template>
            </template>
          </div>

          <!-- 内容 -->
          <div v-if="node.content && node.content.length > 0" class="details-content">
            <template v-for="(contentNode, contentIndex) in node.content" :key="contentIndex">
              <template v-if="contentNode.type === 'detailsContent' && contentNode.content">
                <div class="content-wrapper">
                  <template
                    v-for="(detailContent, detailIndex) in contentNode.content"
                    :key="detailIndex"
                  >
                    <!-- 递归渲染内容节点 -->
                    <JsonContentRenderer :content="{ type: 'doc', content: [detailContent] }" />
                  </template>
                </div>
              </template>
            </template>
          </div>
        </div>
      </div>

      <!-- 嵌入视频预览 -->
      <div v-else-if="node.type === 'iframe'" class="iframe-preview">
        <div class="iframe-preview-container">
          <!-- 视频缩略图 -->
          <div class="iframe-thumbnail">
            <img
              v-if="getVideoThumbnail(node.attrs?.src)"
              :src="getVideoThumbnail(node.attrs?.src)"
              :alt="getVideoTitle(node.attrs?.src)"
              class="thumbnail-image"
            />
            <div v-else class="thumbnail-placeholder">
              <div class="placeholder-icon">🎬</div>
            </div>
          </div>
          <!-- 视频信息 -->
          <div class="iframe-info">
            <div class="video-title">{{ getVideoTitle(node.attrs?.src) }}</div>
            <div class="video-source">{{ getVideoSource(node.attrs?.src) }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
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
    isCallout?: boolean
    calloutType?: string
    open?: boolean
    emoji?: string
    name?: string
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

// 将emoji名称转换为实际emoji字符的辅助函数
const emojiNameToUnicode = (name: string): string => {
  // 如果输入为空，返回空字符串
  if (!name) return ''

  // 创建完整的emoji名称到Unicode映射
  // 这里实现一个更全面的方案：直接通过名称生成emoji
  try {
    // 1. 首先尝试通过在线服务转换 - 使用完整的Emoji名称映射
    const formattedName = name.trim().toLowerCase()

    // 2. 处理最常用的emoji (这部分手动映射可以保证基础emoji正常显示)
    const commonEmojis: Record<string, string> = {
      smiling_face_with_3_hearts: '🥰',
      grinning: '😀',
      smiley: '😃',
      smile: '😄',
      grin: '😁',
      laughing: '😆',
      face_with_tears_of_joy: '😂',
      rolling_on_the_floor_laughing: '🤣',
      wink: '😉',
      blush: '😊',
      heart_eyes: '😍',
      kissing_heart: '😘',
      thumbs_up: '👍',
      thumbs_down: '👎',
      ok_hand: '👌',
      clap: '👏',
      fire: '🔥',
      red_heart: '❤️',
      broken_heart: '💔',
      star: '⭐',
      check_mark: '✅',
      x: '❌',
      warning: '⚠️',
      question: '❓',
      exclamation: '❗',
      rocket: '🚀',
      tada: '🎉',
      sparkles: '✨',
      rainbow: '🌈',
      sunny: '☀️',
      moon: '🌙',
      cloud: '☁️',
      umbrella: '☔',
      snowflake: '❄️',
      zap: '⚡',
      ocean: '🌊',
      cat: '🐱',
      dog: '🐶',
      mouse: '🐭',
      hamster: '🐹',
      rabbit: '🐰',
      bear: '🐻',
      panda: '🐼',
      koala: '🐨',
      tiger: '🐯',
      lion: '🦁',
      cow: '🐮',
      pig: '🐷',
      frog: '🐸',
      monkey: '🐵',
      chicken: '🐔',
      penguin: '🐧',
      bird: '🐦',
      baby_chick: '🐤',
      wolf: '🐺',
      apple: '🍎',
      green_apple: '🍏',
      pear: '🍐',
      tangerine: '🍊',
      lemon: '🍋',
      banana: '🍌',
      watermelon: '🍉',
      grapes: '🍇',
      strawberry: '🍓',
      melon: '🍈',
      cherries: '🍒',
      peach: '🍑',
      pineapple: '🍍',
      eyes: '👀',
      ear: '👂',
      nose: '👃',
      mouth: '👄',
      tongue: '👅',
      rose: '🌹',
      hibiscus: '🌺',
      sunflower: '🌻',
      blossom: '🌼',
      tulip: '🌷',
      house: '🏠',
      office: '🏢',
      hospital: '🏥',
      bank: '🏦',
      hotel: '🏨',
      school: '🏫',
      love_letter: '💌',
      email: '📧',
      envelope: '✉️',
      package: '📦',
      mailbox: '📫',
      book: '📖',
      books: '📚',
      notebook: '📓',
      ledger: '📒',
      scroll: '📜',
      memo: '📝',
      telephone: '☎️',
      phone: '📱',
      desktop_computer: '🖥️',
      keyboard: '⌨️',
      mouse_three_button: '🖱️',
      printer: '🖨️',
      camera: '📷',
      video_camera: '📹',
      movie_camera: '🎥',
      television: '📺',
      radio: '📻',
      thinking_face: '🤔',
      zipper_mouth_face: '🤐',
      face_with_raised_eyebrow: '🤨',
      neutral_face: '😐',
      face_without_mouth: '😶',
      face_with_rolling_eyes: '🙄',
      smirking_face: '😏',
      persevering_face: '😣',
      disappointed_face: '😞',
      face_with_steam_from_nose: '😤',
      pensive_face: '😔',
      confused_face: '😕',
      upside_down_face: '🙃',
      money_mouth_face: '🤑',
      astonished_face: '😲',
      white_frowning_face: '☹️',
      slightly_frowning_face: '🙁',
      confounded_face: '😖',
      disappointed_relieved_face: '😥',
      fearful_face: '😨',
      face_screaming_in_fear: '😱',
      flushed_face: '😳',
      zany_face: '🤪',
      exploding_head: '🤯',
      sleeping_face: '😴',
      drooling_face: '🤤',
      face_with_tongue: '😛',
      squinting_face_with_tongue: '😝',
      face_savoring_food: '😋',
      face_with_hand_over_mouth: '🤭',
      shushing_face: '🤫',
      yawning_face: '🥱',
      smiling_face_with_sunglasses: '😎',
      nerd_face: '🤓',
      face_with_monocle: '🧐'
    }

    // 3. 格式化名称并查找匹配
    if (commonEmojis[formattedName]) {
      return commonEmojis[formattedName]
    }

    // 4. 尝试将下划线格式的名称直接转换为emoji
    // 例如：'thumbs_up' => '👍'，多数emoji使用这样的格式命名
    // 如果没有找到匹配，将名称原样返回（这样至少用户可以看到名称）
    return name
  } catch (error) {
    console.warn('Error converting emoji name to unicode:', error)
    return name
  }
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

// 获取视频缩略图
const getVideoThumbnail = (src?: string): string | undefined => {
  if (!src) return undefined

  try {
    const url = new URL(src)

    // YouTube
    if (url.hostname.includes('youtube.com')) {
      const videoId = url.pathname.split('/').pop()
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }

    // Bilibili - 目前不支持获取缩略图
    if (url.hostname.includes('bilibili.com')) {
      return undefined
    }

    return undefined
  } catch (e) {
    console.warn('Error getting video thumbnail:', e)
    return undefined
  }
}

// 获取视频标题
const getVideoTitle = (src?: string): string => {
  if (!src) return '嵌入视频'

  try {
    const url = new URL(src)

    if (url.hostname.includes('youtube.com')) {
      return 'YouTube 视频'
    }

    if (url.hostname.includes('bilibili.com')) {
      return 'Bilibili 视频'
    }

    if (url.hostname.includes('v.qq.com')) {
      return '腾讯视频'
    }

    return '嵌入视频'
  } catch (e) {
    return '嵌入视频'
  }
}

// 获取视频来源
const getVideoSource = (src?: string): string => {
  if (!src) return ''

  try {
    const url = new URL(src)
    return url.hostname
  } catch (e) {
    return ''
  }
}

// 图片状态管理
const imageDisplayUrls = ref<Map<string, string>>(new Map())
const imageFallbackStatus = ref<Map<string, boolean>>(new Map())
const imageRetryKeys = ref<Map<string, number>>(new Map())

// 获取图片显示URL
const getImageDisplayUrl = (src?: string): string => {
  if (!src) return ''

  // 如果已经有缓存的显示URL，使用缓存的
  const cachedUrl = imageDisplayUrls.value.get(src)
  if (cachedUrl) {
    return cachedUrl
  }

  // 初始化时使用原始URL
  imageDisplayUrls.value.set(src, src)
  return src
}

// 处理图片加载错误
const handleImageError = (src?: string): void => {
  if (!src) return

  const isRemoteUrl = !src.startsWith('app-image:///')

  console.log('图片加载失败:', {
    src,
    isRemoteUrl,
    isInFallbackMode: imageFallbackStatus.value.get(src)
  })

  // 如果是远程图片加载失败，尝试降级到本地图片
  if (isRemoteUrl && !imageFallbackStatus.value.get(src)) {
    attemptFallbackToLocal(src)
  }
}

// 尝试降级到本地图片
const attemptFallbackToLocal = async (remoteUrl: string): Promise<void> => {
  try {
    console.log('尝试降级到本地图片:', remoteUrl)

    // 提取文件名并构建本地路径
    const fileName = extractFileNameFromUrl(remoteUrl)
    if (fileName) {
      const localPath = `app-image:///images/${fileName}`

      // 检查本地图片是否存在
      const localExists = await checkLocalImageExists(localPath)
      if (localExists) {
        console.log('本地图片存在，切换到降级模式')

        // 更新显示URL和状态
        imageDisplayUrls.value.set(remoteUrl, localPath)
        imageFallbackStatus.value.set(remoteUrl, true)

        // 触发重新渲染
        const currentRetryKey = imageRetryKeys.value.get(remoteUrl) || 0
        imageRetryKeys.value.set(remoteUrl, currentRetryKey + 1)

        console.log('成功降级到本地图片:', localPath)
        return
      } else {
        console.warn('本地图片不存在:', localPath)
      }
    }

    console.warn('无法降级到本地图片')
  } catch (error) {
    console.error('降级处理失败:', error)
  }
}

// 从URL提取文件名
const extractFileNameFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const fileName = pathname.split('/').pop()
    return fileName && fileName.includes('.') ? fileName : null
  } catch (error) {
    console.error('解析URL失败:', error)
    return null
  }
}

// 检查本地图片是否存在
const checkLocalImageExists = async (localPath: string): Promise<boolean> => {
  try {
    const exists = await window.electronAPI.image.checkImageExists(localPath)
    return exists
  } catch (error) {
    console.error('检查本地图片存在性失败:', error)
    return false
  }
}

// 处理图片加载成功
const handleImageLoad = (src?: string): void => {
  if (!src) return

  console.log('图片加载成功:', src)

  // 如果不是降级模式，重置状态
  if (!imageFallbackStatus.value.get(src)) {
    imageDisplayUrls.value.set(src, src)
  }
}

// 获取图片键值（用于强制重新渲染）
const getImageKey = (src?: string): string => {
  if (!src) return '0'

  const retryKey = imageRetryKeys.value.get(src) || 0
  return `${src}-${retryKey}`
}
</script>

<style lang="scss">
/* KaTeX 样式 - 仅在渲染组件中生效 */
.json-content {
  span {
    display: inline;
  }

  /* Emoji 样式 */
  .emoji {
    font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
    user-select: text !important;
    -webkit-user-select: text !important;
    cursor: text;
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

/* 视频预览样式 */
.iframe-preview {
  margin: 1rem 0;
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-bg-secondary);

  .iframe-preview-container {
    display: flex;
    align-items: center;
    padding: 12px;
    gap: 16px;
  }

  .iframe-thumbnail {
    width: 160px;
    height: 90px;
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;
    background: var(--color-bg-tertiary);

    .thumbnail-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .thumbnail-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;

      .placeholder-icon {
        font-size: 24px;
      }
    }
  }

  .iframe-info {
    flex: 1;
    min-width: 0;

    .video-title {
      font-weight: 500;
      color: var(--color-text-primary);
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .video-source {
      font-size: 0.9em;
      color: var(--color-text-secondary);
    }
  }
}

/* 图片容器样式 */
.image-container {
  position: relative;
  display: inline-block;
  margin: 1rem 0;

  img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }
}
</style>

<style lang="scss" scoped>
@use '@renderer/styles/_json-content-renderer' as *;
</style>
