<template>
  <div class="appearance-settings">
    <div class="appearance-settings-content">
      <div class="settings-content-header">
        <div class="icon">
          <Theme theme="outline" size="20" fill="var(--color-icon-menu-default)" :strokeWidth="3" />
        </div>
        <div class="name">外观</div>
      </div>
      <div class="shortcuts-settings-divider"></div>

      <div class="appearance-content">
        <div class="settings-section">
          <div class="section-title">主题模式</div>
          <div class="theme-options">
            <div
              v-for="theme in themeOptions"
              :key="theme.value"
              class="theme-card"
              :class="{ active: currentTheme === theme.value }"
              @click="handleThemeChange(theme.value)"
            >
              <div class="theme-preview" :class="theme.value">
                <div class="preview-window">
                  <div class="preview-header"></div>
                  <div class="preview-content">
                    <div class="preview-line"></div>
                    <div class="preview-line short"></div>
                  </div>
                </div>
              </div>
              <div class="theme-name">{{ theme.label }}</div>
            </div>
          </div>
        </div>
        <div class="settings-section">
          <div class="section-title">默认页面</div>
          <div class="default-page-settings">
            <div class="setting-item">
              <div class="setting-label">启动时打开</div>
              <div class="select-wrapper">
                <div class="page-select" @click="toggleDropdown">
                  <span class="selected-page">{{ getPageName(defaultPage) }}</span>
                  <div class="select-arrow">
                    <Down theme="outline" size="16" :strokeWidth="3" />
                  </div>
                </div>
                <div v-show="showPageSelect" class="select-dropdown">
                  <div
                    v-for="(name, path) in {
                      '/home': '主页',
                      '/timeblock': '时光记',
                      '/timeline': '笔记流',
                      '/cardbox': '卡片盒',
                      '/knowledge-tree': '知识树',
                      '/whiteboard': '思维板',
                      '/aiassistant': 'AI助手'
                    }"
                    v-show="path !== '/timeblock' || timeBlockStore.settings.enabled"
                    :key="path"
                    class="select-option"
                    :class="{ active: defaultPage === path }"
                    @click="(e) => handleOptionClick(path, e)"
                  >
                    {{ name }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="section-title">字体设置</div>
          <div class="font-settings">
            <div class="setting-item">
              <div class="setting-label">界面字体</div>
              <select v-model="uiFont" class="font-select" @change="handleUIFontChange">
                <option v-for="font in fontOptions" :key="font.value" :value="font.value">
                  {{ font.label }}
                </option>
              </select>
              <div class="font-preview">预览文本 Preview Text</div>
            </div>

            <div class="setting-item">
              <div class="setting-label">编辑器字体</div>
              <select v-model="editorFont" class="font-select" @change="handleEditorFontChange">
                <option v-for="font in fontOptions" :key="font.value" :value="font.value">
                  {{ font.label }}
                </option>
              </select>
              <div class="font-preview" :style="{ fontFamily: previewEditorFont }">
                预览文本 Preview Text
              </div>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="section-title">侧边栏</div>
          <div class="sidebar-settings">
            <div class="setting-item">
              <div class="setting-label">星标默认展开</div>
              <Switch v-model="starredExpanded" @change="handleStarredExpandedChange" />
            </div>
            <div class="setting-item">
              <div class="setting-label">标签默认展开</div>
              <Switch v-model="tagsExpanded" @change="handleTagsExpandedChange" />
            </div>
            <div class="setting-item">
              <div class="setting-label">最近默认展开</div>
              <Switch v-model="recentExpanded" @change="handleRecentExpandedChange" />
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="section-title">功能开关</div>
          <div class="feature-settings">
            <div class="setting-item">
              <div class="setting-label">启用思维板</div>
              <Switch v-model="enableWhiteboard" @change="handleWhiteboardChange" />
            </div>
            <div class="setting-item">
              <div class="setting-label">启用 AI 助手</div>
              <Switch v-model="enableAIAssistant" @change="handleAIAssistantChange" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Theme, Down } from '@icon-park/vue-next'
import { useUIStore } from '@renderer/stores/useUIStore'
import { useAppearanceStore } from '@renderer/stores/appearanceStore'
import { useTimeBlockStore } from '@renderer/stores/timeBlockStore'
import Switch from '@renderer/components/ui/Switch.vue'

const uiStore = useUIStore()
const appearanceStore = useAppearanceStore()
const timeBlockStore = useTimeBlockStore()

const currentTheme = computed(() => uiStore.themeMode)

const themeOptions = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'system' }
]

const handleThemeChange = (theme: string) => {
  uiStore.setThemeMode(theme as 'light' | 'dark' | 'system')
}

const fontOptions = [
  { label: '系统默认', value: 'system' },
  { label: '霞鹜文楷', value: 'wenkai' }
]

const uiFont = ref('system')
const editorFont = ref('system')

const previewEditorFont = computed(() => {
  return editorFont.value === 'wenkai' ? '"LXGW WenKai", sans-serif' : 'system-ui'
})

const handleUIFontChange = async () => {
  await appearanceStore.updateUIFont(uiFont.value)
}

const handleEditorFontChange = async () => {
  await appearanceStore.updateEditorFont(editorFont.value)
}

// 侧边栏展开状态
const starredExpanded = ref(true)
const tagsExpanded = ref(true)
const recentExpanded = ref(true)

// 处理状态变更
const handleStarredExpandedChange = async (value: boolean) => {
  try {
    await appearanceStore.updateStarredExpanded(value)
  } catch (error) {
    console.error('更新星标展开状态失败:', error)
    // 恢复原状态
    starredExpanded.value = !value
  }
}

const handleTagsExpandedChange = async (value: boolean) => {
  try {
    await appearanceStore.updateTagsExpanded(value)
  } catch (error) {
    console.error('更新标签展开状态失败:', error)
    tagsExpanded.value = !value
  }
}

const handleRecentExpandedChange = async (value: boolean) => {
  try {
    await appearanceStore.updateRecentExpanded(value)
  } catch (error) {
    console.error('更新最近展开状态失败:', error)
    recentExpanded.value = !value
  }
}

// 默认页面状态
const defaultPage = ref('/home')

const showPageSelect = ref(false)

const getPageName = (path: string) => {
  const pageMap: Record<string, string> = {
    '/home': '主页',
    '/timeblock': '时光记',
    '/timeline': '笔记流',
    '/cardbox': '卡片盒',
    '/knowledge-tree': '知识树',
    '/whiteboard': '思维板',
    '/aiassistant': 'AI助手'
  }
  return pageMap[path] || '主页'
}

const selectPage = async (path: string) => {
  defaultPage.value = path
  showPageSelect.value = false
  await appearanceStore.updateDefaultPage(path)
}

// 处理点击外部关闭
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.select-wrapper')) {
    showPageSelect.value = false
  }
}

// 处理下拉框的点击
const toggleDropdown = (e: Event) => {
  e.stopPropagation() // 阻止事件冒泡
  showPageSelect.value = !showPageSelect.value
}

// 处理选项的点击
const handleOptionClick = async (path: string, e: Event) => {
  e.stopPropagation() // 阻止事件冒泡
  await selectPage(path)
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 初始化设置
onMounted(async () => {
  await appearanceStore.fetchSettings()
  // 直接从 store 中获取设置
  if (appearanceStore.settings) {
    uiFont.value = appearanceStore.settings.uiFont
    editorFont.value = appearanceStore.settings.editorFont
    starredExpanded.value = appearanceStore.settings.starredExpanded
    tagsExpanded.value = appearanceStore.settings.tagsExpanded
    recentExpanded.value = appearanceStore.settings.recentExpanded
    defaultPage.value = appearanceStore.settings.defaultPage
    if (defaultPage.value === '/timeblock' && !timeBlockStore.settings.enabled) {
      defaultPage.value = '/home'
      await appearanceStore.updateDefaultPage('/home')
    }
  }
})

// 功能开关状态
const enableWhiteboard = ref(appearanceStore.settings?.enableWhiteboard ?? true)
const enableAIAssistant = ref(appearanceStore.settings?.enableAIAssistant ?? true)

// 处理状态变更
const handleWhiteboardChange = async (value: boolean) => {
  try {
    await appearanceStore.updateWhiteboardEnabled(value)
  } catch (error) {
    console.error('更新白板功能开关失败:', error)
    // 恢复原状态
    enableWhiteboard.value = !value
  }
}

const handleAIAssistantChange = async (value: boolean) => {
  try {
    await appearanceStore.updateAIAssistantEnabled(value)
  } catch (error) {
    console.error('更新 AI 助手功能开关失败:', error)
    // 恢复原状态
    enableAIAssistant.value = !value
  }
}
</script>

<style scoped lang="scss">
.appearance-settings {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding-bottom: 48px;

  .appearance-settings-content {
    width: 100%;
  }

  .settings-content-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;

    .icon {
      background: none;
      border: 1px solid var(--color-border);
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      padding: 4px;
      border-radius: 6px;

      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }

      svg {
        width: 20px;
        height: 20px;
      }
    }

    .name {
      font-size: 20px;
      line-height: 1;
      font-weight: 500;
      user-select: none;
    }
  }

  .shortcuts-settings-divider {
    height: 1px;
    background-color: var(--color-border);
    margin: 4px 0;
    width: 100%;
    margin-bottom: 10px;
  }

  .appearance-content {
    padding-right: 10px;
  }

  .settings-section {
    margin-bottom: 30px;

    &:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 16px;
      color: var(--color-text-primary);
    }
  }

  .theme-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;

    .theme-card {
      cursor: pointer;
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.2s;

      &:hover .theme-preview {
        border-color: var(--color-border-hover);
      }

      &.active {
        .theme-preview {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px var(--color-primary-alpha);
        }
      }

      .theme-preview {
        height: 120px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 12px;
        transition: all 0.2s;

        .preview-window {
          height: 100%;
          border-radius: 6px;
          overflow: hidden;
        }

        .preview-header {
          height: 24px;
          border-bottom: 1px solid rgba(125, 125, 125, 0.2);
        }

        .preview-content {
          padding: 12px;

          .preview-line {
            height: 8px;
            border-radius: 4px;
            margin-bottom: 8px;

            &.short {
              width: 60%;
            }
          }
        }

        &.light {
          background: #fff;
          .preview-window {
            background: #f5f5f5;
          }
          .preview-line {
            background: #e0e0e0;
          }
        }

        &.dark {
          background: #1a1a1a;
          .preview-window {
            background: #2a2a2a;
          }
          .preview-line {
            background: #3a3a3a;
          }
        }

        &.system {
          background: linear-gradient(to right, #fff 50%, #1a1a1a 50%);
          .preview-window {
            background: linear-gradient(to right, #f5f5f5 50%, #2a2a2a 50%);
          }
          .preview-line {
            background: linear-gradient(to right, #e0e0e0 50%, #3a3a3a 50%);
          }
        }
      }

      .theme-name {
        margin-top: 8px;
        font-size: 14px;
        text-align: center;
        color: var(--color-text-primary);
      }
    }
  }

  .font-settings {
    display: flex;
    flex-direction: column;
    gap: 24px;

    .setting-item {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .setting-label {
        font-size: 14px;
        color: var(--color-text-secondary);
      }

      .font-select {
        width: 200px;
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid var(--color-border);
        background-color: var(--color-bg-secondary);
        color: var(--color-text-primary);
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          border-color: var(--color-border-hover);
        }

        &:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px var(--color-primary-alpha);
        }
      }

      .font-preview {
        margin-top: 8px;
        padding: 12px;
        border-radius: 6px;
        background-color: var(--color-bg-secondary);
        color: var(--color-text-primary);
        font-size: 16px;
        line-height: 1.5;
        min-height: 48px;
        display: flex;
        align-items: center;
      }
    }
  }

  .sidebar-settings {
    margin-top: 16px;

    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--color-border);

      &:last-child {
        border-bottom: none;
      }

      .setting-label {
        font-size: 14px;
        color: var(--color-text-primary);
      }
    }
  }

  .default-page-settings {
    margin-top: 16px;

    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--color-border);

      .setting-label {
        font-size: 14px;
        color: var(--color-text-primary);
      }

      .select-wrapper {
        position: relative;
        width: 100px;

        .page-select {
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
          color: var(--color-text-primary);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 36px;

          &:hover {
            border-color: var(--color-primary);
            background: var(--color-hover-bg);
          }

          .selected-page {
            font-weight: 500;
          }

          .select-arrow {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 100%;

            :deep(.i-icon) {
              display: flex;
              align-items: center;
              justify-content: center;
            }

            :deep(svg) {
              width: 16px;
              height: 16px;
            }
          }
        }

        .select-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          width: 100%;
          background: var(--color-dropdown-bg);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 4px;
          // max-height: 200px;
          overflow-y: auto;
          z-index: 1000;
          box-shadow: var(--shadow-card);

          .select-option {
            padding: 8px 12px;
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.2s;
            font-size: 14px;
            color: var(--color-text-primary);

            &:hover {
              background: var(--color-hover-bg);
            }

            &.active {
              color: var(--color-primary);
              background: var(--color-primary-bg);
            }
          }

          &::-webkit-scrollbar {
            width: 8px;
          }

          &::-webkit-scrollbar-track {
            background: transparent;
          }

          &::-webkit-scrollbar-thumb {
            background: var(--color-scrollbar);
            border-radius: 4px;
          }
        }
      }
    }
  }

  .feature-settings {
    margin-top: 16px;

    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--color-border);

      &:last-child {
        border-bottom: none;
      }

      .setting-label {
        font-size: 14px;
        color: var(--color-text-primary);
      }
    }
  }
}
</style>
