<template>
  <node-view-wrapper class="code-block">
    <div class="code-block-header">
      <div class="language-selector">
        <button v-tooltip="'选择编程语言'" class="language-button" @click="toggleLanguageSelect">
          {{ languageDisplayNames[node.attrs.language] || node.attrs.language || 'Plain Text' }}
        </button>
      </div>
      <button
        v-tooltip="{ content: copied ? '已复制!' : '复制代码', delay: { show: 500 } }"
        class="copy-button"
        @click="copyCode"
      >
        <div class="icon">
          <Copy v-if="!copied" theme="outline" fill="var(--color-text-white)" :strokeWidth="2" />
          <CheckOne v-else theme="outline" :strokeWidth="2" fill="var(--color-primary)" />
        </div>
      </button>
    </div>
    <pre
      ref="preElement"
      :class="{ 'has-focus': isFocused }"
      spellcheck="false"
    ><code><node-view-content /></code></pre>
  </node-view-wrapper>

  <Teleport to="body">
    <div v-if="showLanguageSelect" class="language-popup-overlay" @click="handleOverlayClick">
      <div class="language-popup" :style="popupStyle" @click.stop>
        <div class="search-container">
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            placeholder="搜索语言..."
            @input="filterLanguages"
            @keydown.down.prevent="handleKeyDown"
            @keydown.up.prevent="handleKeyUp"
            @keydown.enter.prevent="selectHighlightedLanguage"
            @keydown.esc="closeLanguageSelect"
            @blur="handleInputBlur"
          />
        </div>
        <div
          ref="languageListRef"
          class="language-list"
          tabindex="-1"
          @keydown.down.prevent="handleKeyDown"
          @keydown.up.prevent="handleKeyUp"
          @keydown.enter.prevent="selectHighlightedLanguage"
        >
          <button
            v-for="(lang, index) in filteredLanguages"
            :key="lang"
            :ref="
              (el) => {
                if (el) languageButtons[index] = el as HTMLButtonElement
              }
            "
            class="language-option"
            :class="{ 'is-highlighted': highlightedIndex === index }"
            @click="selectLanguage(lang)"
            @mouseover="highlightedIndex = index"
          >
            {{ languageDisplayNames[lang] || lang }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3'
import { ref, computed, nextTick, watch } from 'vue'
import { Copy, CheckOne } from '@icon-park/vue-next'
import type { CSSProperties } from 'vue'
import { message } from '@renderer/utils/message'

// Props 定义
const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  editor: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  },
  getPos: {
    type: Function,
    required: true
  },
  updateAttributes: {
    type: Function,
    required: true
  }
})

// 状态管理
const showLanguageSelect = ref(false)
const searchQuery = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const buttonPosition = ref({ x: 0, y: 0 })
const copied = ref(false)
const preElement = ref<HTMLPreElement | null>(null)
const highlightedIndex = ref(-1)
const languageButtons = ref<HTMLButtonElement[]>([])
const languageListRef = ref<HTMLDivElement | null>(null)

// 添加一个语言显示名称的映射
const languageDisplayNames: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  php: 'PHP',
  cpp: 'C++',
  csharp: 'C#',
  golang: 'Go',
  ruby: 'Ruby',
  rust: 'Rust',
  sql: 'SQL',
  xml: 'XML',
  yaml: 'YAML',
  json: 'JSON',
  markdown: 'Markdown',
  plaintext: 'Plain Text',
  // 别名
  js: 'JavaScript',
  ts: 'TypeScript',
  jsx: 'JSX',
  tsx: 'TSX',
  vue: 'Vue'
  // ... 其他语言映射
}

// 支持的语言列表
// 支持的语言列表 - 基于 lowlight 支持的语言
const languages = [
  'bash',
  'c',
  'cpp',
  'csharp',
  'css',
  'diff',
  'go',
  'graphql',
  'haskell',
  'html',
  'java',
  'javascript',
  'json',
  'kotlin',
  'less',
  'lua',
  'makefile',
  'markdown',
  'matlab',
  'objectivec',
  'perl',
  'php',
  'python',
  'r',
  'ruby',
  'rust',
  'scala',
  'scss',
  'shell',
  'sql',
  'swift',
  'typescript',
  'vbnet',
  'xml',
  'yaml',
  // 添加一些常用别名
  'js',
  'ts',
  'jsx',
  'tsx',
  'vue',
  'dockerfile',
  'docker',
  'nginx',
  'properties',
  'toml',
  'ini',
  'env',
  // 默认选项
  'plaintext'
].sort() // 按字母顺序排序

const filteredLanguages = ref(languages)

// 计算属性
const isFocused = computed(() => {
  const { from, to } = props.editor.state.selection
  const pos = props.getPos()
  const nodeSize = props.node.nodeSize
  return from >= pos && to <= pos + nodeSize
})

const popupStyle = computed<CSSProperties>(() => ({
  position: 'fixed',
  top: `${buttonPosition.value.y + 30}px`,
  left: `${buttonPosition.value.x}px`
}))

// 方法
const filterLanguages = () => {
  const query = searchQuery.value.toLowerCase()
  filteredLanguages.value = languages.filter((lang) => lang.toLowerCase().includes(query))
}

const selectLanguage = (language: string) => {
  props.updateAttributes({ language })
  showLanguageSelect.value = false
  searchQuery.value = ''
  filteredLanguages.value = languages
}

const toggleLanguageSelect = (event: MouseEvent) => {
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  buttonPosition.value = {
    x: rect.left,
    y: rect.top
  }
  showLanguageSelect.value = true
  highlightedIndex.value = -1
  nextTick(() => {
    searchInput.value?.focus()
  })
}

const handleOverlayClick = () => {
  showLanguageSelect.value = false
  searchQuery.value = ''
  filteredLanguages.value = languages
}

const copyCode = async () => {
  const code = props.node.textContent
  await navigator.clipboard.writeText(code)
  copied.value = true
  message.success('已将代码复制到剪贴板')
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

// 监听器
watch(showLanguageSelect, (newValue) => {
  if (newValue && searchInput.value) {
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
})

// 处理键盘导航
const handleKeyDown = () => {
  if (highlightedIndex.value === -1) {
    highlightedIndex.value = 0
  } else {
    highlightedIndex.value = Math.min(
      highlightedIndex.value + 1,
      filteredLanguages.value.length - 1
    )
  }

  if (highlightedIndex.value >= 0) {
    languageButtons.value[highlightedIndex.value]?.scrollIntoView({
      block: 'nearest'
    })
    languageListRef.value?.focus()
  }
}

const handleKeyUp = () => {
  if (highlightedIndex.value === -1) {
    highlightedIndex.value = filteredLanguages.value.length - 1
  } else {
    highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
  }

  if (highlightedIndex.value >= 0) {
    languageButtons.value[highlightedIndex.value]?.scrollIntoView({
      block: 'nearest'
    })
    languageListRef.value?.focus()
  }
}

const selectHighlightedLanguage = () => {
  if (highlightedIndex.value >= 0) {
    selectLanguage(filteredLanguages.value[highlightedIndex.value])
  }
}

const closeLanguageSelect = () => {
  showLanguageSelect.value = false
  searchQuery.value = ''
  filteredLanguages.value = languages
  highlightedIndex.value = -1
}

const handleInputBlur = (event: FocusEvent) => {
  if (!languageListRef.value?.contains(event.relatedTarget as Node)) {
    searchInput.value?.focus()
  }
}
</script>

<style lang="scss">
// 全局样式，用于 Teleport 的内容
.language-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
}

.language-popup {
  position: fixed;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 200px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1001;

  .search-container {
    position: sticky;
    top: 0;
    background: var(--color-bg-primary);
    padding: 8px;
    border-bottom: 1px solid var(--color-border);

    input {
      width: 100%;
      padding: 4px 8px;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      font-size: 12px;

      &:focus {
        outline: none;
        border-color: var(--color-primary);
      }
    }
  }

  .language-list {
    padding: 4px;
    outline: none;

    .language-option {
      display: block;
      width: 100%;
      padding: 4px 8px;
      text-align: left;
      font-size: 12px;
      border: none;
      background: none;
      color: var(--color-text-primary);
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;

      &:hover {
        background: var(--color-hover-button);
      }

      &:active {
        background: var(--color-active-button);
      }

      &.is-highlighted {
        background: var(--color-hover-button);
        color: var(--color-text-primary);
      }
    }
  }
}

// 添加全局选择器来处理代码块内的文本选择
.ProseMirror {
  .code-block {
    pre {
      *::selection {
        background-color: var(--color-selection) !important;
        color: #fff !important;
      }

      *::-moz-selection {
        background-color: var(--color-selection) !important;
        color: #fff !important;
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.code-block {
  position: relative;
  margin: 1em 0;

  .code-block-header {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 2;
    opacity: 0; // 默认隐藏
    transition: opacity 0.2s ease; // 添加过渡效果
    pointer-events: none; // 默认不响应鼠标事件

    .language-selector {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .language-button {
      font-size: 12px;
      color: var(--color-text-white);
      // background-color: var(--color-bg-secondary);
      background: none;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid var(--color-code-block-border);
      cursor: pointer;
      text-transform: lowercase;

      &:hover {
        // background: var(--color-hover-button);
        border: 1px solid var(--color-primary);
      }
    }

    .copy-button {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: 1px solid var(--color-code-block-border);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      height: 24px;
      line-height: 1;

      &:hover {
        border: 1px solid var(--color-primary);
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
          width: 14px;
          height: 14px;
        }
      }
    }
  }
  &:hover .code-block-header {
    opacity: 1; // hover 时显示
    pointer-events: auto; // hover 时恢复鼠标事件
  }

  pre {
    margin: 0;
    background: var(--color-code-block-bg); // GitHub Dark style
    border-radius: 8px;
    padding: 1em;
    overflow-x: auto;
    color: var(--color-code-text); // 确保基础文本颜色设置在这里
    // spellcheck: false;
    -webkit-spellcheck: false;

    &.has-focus {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    code {
      font-family: var(--font-mono);
      font-size: 0.9em;
      line-height: 1.5;
      tab-size: 4;
      background: none !important;
      padding: 0 !important;
    }
  }
}

// 代码高亮主题覆盖
:root {
  --hljs-color: var(--color-text-primary);
  --hljs-background: transparent;
}

.hljs {
  color: var(--hljs-color) !important;
  background: var(--hljs-background) !important;
}
</style>
