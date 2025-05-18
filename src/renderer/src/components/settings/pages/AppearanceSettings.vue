<template>
  <div class="appearance-settings">
    <div class="settings-content-header">
      <div class="icon">
        <Theme theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
      </div>
      <div class="name">外观</div>
    </div>
    <div class="shortcuts-settings-divider"></div>

    <div class="appearance-settings-content">
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
          <div class="section-title">界面设置</div>
          <div class="interface-settings">
            <div class="setting-item">
              <div class="setting-label">启用悬浮侧边栏</div>
              <div class="setting-control">
                <Switch v-model="enableHoverSidebar" @change="handleHoverSidebarChange" />
              </div>
            </div>
          </div>
        </div>
        <div class="settings-section">
          <div class="section-title">默认页面</div>
          <div class="default-page-settings">
            <div class="setting-item">
              <div class="setting-label">启动时打开</div>
              <div class="setting-control">
                <Dropdown
                  :items="pageOptions"
                  trigger="click"
                  width="120px"
                  align="end"
                  showArrow
                  @select="handlePageSelect"
                >
                  {{ getPageName(defaultPage) }}
                </Dropdown>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="section-title">字体设置</div>
          <div class="font-settings">
            <div class="setting-item">
              <div class="setting-label">应用界面字体</div>
              <div class="setting-control">
                <Dropdown
                  :items="fontDropdownItems"
                  trigger="click"
                  width="200px"
                  align="end"
                  showArrow
                  @select="handleUIFontSelect"
                >
                  {{ getFontLabel(uiFont) }}
                </Dropdown>
              </div>
            </div>

            <div class="setting-item">
              <div class="setting-label">编辑器字体</div>
              <div class="setting-control">
                <Dropdown
                  :items="fontDropdownItems"
                  trigger="click"
                  width="200px"
                  align="end"
                  showArrow
                  @select="handleEditorFontSelect"
                >
                  {{ getFontLabel(editorFont) }}
                </Dropdown>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Theme } from '@icon-park/vue-next'
import Dropdown from '@renderer/components/ui/dropdowns/Dropdown.vue'
import Switch from '@renderer/components/ui/Switch.vue'
import { useAppearanceStore } from '@renderer/stores/appearanceStore'
import { useTimeBlockStore } from '@renderer/stores/timeBlockStore'
import { useThemeStore } from '@renderer/stores/themeStore'

const appearanceStore = useAppearanceStore()
const timeBlockStore = useTimeBlockStore()
const themeStore = useThemeStore()

const currentTheme = computed(() => {
  return themeStore.themeSettings?.themeMode || 'system'
})

const themeOptions = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'system' }
]

const handleThemeChange = async (theme: string) => {
  try {
    await themeStore.updateThemeSettings({
      themeMode: theme as 'light' | 'dark' | 'system'
    })
    console.log('主题已更新:', theme)
  } catch (error) {
    console.error('更新主题失败:', error)
  }
}

const fontOptions = [
  { label: '系统默认', value: 'system' },
  { label: '霞鹜文楷', value: 'wenkai' },
  { label: '霞鹜新晰黑', value: 'neoxihei' }
]

const uiFont = ref('system')
const editorFont = ref('system')

const handleUIFontChange = async () => {
  await appearanceStore.updateUIFont(uiFont.value)
}

const handleEditorFontChange = async () => {
  await appearanceStore.updateEditorFont(editorFont.value)
}

// 状态定义
const starredExpanded = ref(false)
const tagsExpanded = ref(false)
const recentExpanded = ref(false)
const enableWhiteboard = ref(false)
const enableHoverSidebar = ref(true)

// 初始化数据
onMounted(() => {
  starredExpanded.value = Boolean(appearanceStore.settings?.starredExpanded ?? true)
  tagsExpanded.value = Boolean(appearanceStore.settings?.tagsExpanded ?? false)
  recentExpanded.value = Boolean(appearanceStore.settings?.recentExpanded ?? true)
  enableWhiteboard.value = Boolean(appearanceStore.settings?.enableWhiteboard ?? true)
  enableHoverSidebar.value = Boolean(appearanceStore.settings?.enableHoverSidebar ?? true)
})

// 默认页面状态
const defaultPage = ref('/home')

const pageOptions = computed(() => [
  { label: '主页', key: '/home' },
  { label: '时光记', key: '/timeblock', disabled: !timeBlockStore.settings.enabled },
  { label: '收件箱', key: '/inbox' },
  { label: '笔记流', key: '/timeline' },
  { label: '卡片盒', key: '/cardbox' },
  { label: '知识树', key: '/knowledge-tree' },
  { label: '记忆卡', key: '/flashcard' },
  { label: '思维板', key: '/mindboard' },
  { label: '写作台', key: '/writing-desk' }
])

const fontDropdownItems = computed(() =>
  fontOptions.map((font) => ({
    label: font.label,
    key: font.value
  }))
)

const handlePageSelect = async (key: string) => {
  defaultPage.value = key
  await appearanceStore.updateDefaultPage(key)
}

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
    enableHoverSidebar.value = Boolean(appearanceStore.settings.enableHoverSidebar)
    defaultPage.value = appearanceStore.settings.defaultPage
    if (defaultPage.value === '/timeblock' && !timeBlockStore.settings.enabled) {
      defaultPage.value = '/home'
      await appearanceStore.updateDefaultPage('/home')
    }
  }
})

// 处理字体选择
const handleUIFontSelect = async (key: string) => {
  uiFont.value = key
  await handleUIFontChange()
}

const handleEditorFontSelect = async (key: string) => {
  editorFont.value = key
  await handleEditorFontChange()
}

// 获取页面名称的方法
const getPageName = (path: string) => {
  const pageMap: Record<string, string> = {
    '/home': '主页',
    '/timeblock': '时光记',
    '/inbox': '收件箱',
    '/timeline': '笔记流',
    '/cardbox': '卡片盒',
    '/knowledge-tree': '知识树',
    '/flashcard': '记忆卡',
    '/mindboard': '思维板',
    '/writing-desk': '写作台'
  }
  return pageMap[path] || '主页'
}

// 保留 getFontLabel 方法，因为现在需要用它来显示选中的字体
const getFontLabel = (value: string) => {
  return fontOptions.find((font) => font.value === value)?.label || '系统默认'
}

// 处理悬浮侧边栏开关变更
const handleHoverSidebarChange = async (value: boolean) => {
  await appearanceStore.updateHoverSidebarEnabled(value)
}
</script>

<style scoped lang="scss">
.appearance-settings {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
}

.settings-content-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  padding-left: 20px;

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
  margin-bottom: 10px;
  width: 100%;
  opacity: 1;
  flex-shrink: 0;
}

.appearance-settings-content {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding-bottom: 58px;

  .appearance-content {
    padding: 0 20px;
  }

  .settings-section {
    margin-bottom: 30px;
    padding: 0 10px;

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

    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;

      &:last-child {
        border-bottom: none;
      }

      .setting-label {
        font-size: 14px;
        color: var(--color-text-secondary);
        white-space: nowrap;
      }

      .setting-control {
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

      .setting-label {
        font-size: 14px;
        color: var(--color-text-primary);
      }
    }
  }

  .interface-settings {
    margin-top: 4px;

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

      .setting-control {
        display: flex;
        align-items: center;

        input[type='checkbox'] {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle {
          position: relative;
          display: inline-block;
          width: 36px;
          height: 20px;
          background-color: var(--color-bg-tertiary);
          border-radius: 10px;
          cursor: pointer;
          transition: background-color 0.3s;

          .toggle-track {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 10px;
          }

          .toggle-indicator {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 16px;
            height: 16px;
            background-color: white;
            border-radius: 50%;
            transition:
              transform 0.3s,
              background-color 0.3s;
          }
        }

        input:checked + .toggle {
          background-color: var(--color-primary);

          .toggle-indicator {
            transform: translateX(16px);
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

  .default-page-settings {
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
        white-space: nowrap;
      }

      .setting-control {
        display: flex;
        align-items: center;
      }
    }
  }
}
</style>
