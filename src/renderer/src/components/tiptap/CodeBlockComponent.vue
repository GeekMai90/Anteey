<template>
  <node-view-wrapper class="code-block">
    <div class="code-block-header">
      <div class="language-selector">
        <button v-tooltip="'选择编程语言'" class="language-button" @click="toggleLanguageSelect">
          {{ node.attrs.language || 'plaintext' }}
        </button>
      </div>
      <button
        v-tooltip="{ content: copied ? '已复制!' : '复制代码', delay: { show: 500 } }"
        class="copy-button"
        @click="copyCode"
      >
        <div class="icon">
          <Copy v-if="!copied" theme="outline" fill="var(--color-icon-default)" :strokeWidth="3" />
          <CheckOne v-else theme="outline" :strokeWidth="3" fill="var(--color-primary)" />
        </div>
      </button>
    </div>
    <pre
      ref="preElement"
      :class="{ 'has-focus': isFocused }"
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
          />
        </div>
        <div class="language-list">
          <button
            v-for="lang in filteredLanguages"
            :key="lang"
            class="language-option"
            @click="selectLanguage(lang)"
          >
            {{ lang }}
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
const preElement = ref(null)

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
</script>

<style lang="scss">
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

    .language-button {
      font-size: 12px;
      color: var(--color-text-tertiary);
      // background-color: var(--color-bg-secondary);
      padding: 2px 6px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      text-transform: lowercase;

      &:hover {
        background: var(--color-hover-button);
      }
    }

    .copy-button {
      display: flex;
      align-items: center;
      justify-content: center;
      // background: var(--color-bg-secondary);
      border: none;
      border-radius: 4px;
      padding: 4px;
      cursor: pointer;
      transition: all 0.2s;
      height: 22px;
      line-height: 1;

      &:hover {
        background: var(--color-hover-button);
      }

      .icon {
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 0;
        height: 14px;
        svg {
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
    // background: var(--color-bg-secondary);
    border-radius: 8px;
    padding: 1em;
    overflow-x: auto;

    &.has-focus {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    code {
      font-family: var(--font-mono);
      font-size: 0.9em;
      line-height: 1.5;
      tab-size: 2;
      background: none !important;
      padding: 0 !important;
    }
  }
}

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

      &:hover {
        background: var(--color-hover);
      }
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
