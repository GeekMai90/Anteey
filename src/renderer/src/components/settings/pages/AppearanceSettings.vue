<template>
  <div class="appearance-settings">
    <div class="settings-content-header">
      <div class="icon">
        <Theme theme="outline" size="20" fill="var(--color-icon-menu-default)" :strokeWidth="3" />
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
                      '/drafts': '草稿纸',
                      '/timeline': '笔记流',
                      '/cardbox': '卡片盒',
                      '/knowledge-tree': '知识树',
                      '/flashcard': '记忆卡',
                      '/mindboard': '思维板'
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
              <div class="select-wrapper">
                <div class="font-select" @click="toggleUIFontDropdown">
                  <span class="selected-font">{{ getFontLabel(uiFont) }}</span>
                  <div class="select-arrow">
                    <Down theme="outline" size="16" :strokeWidth="3" />
                  </div>
                </div>
                <div v-show="showUIFontSelect" class="select-dropdown">
                  <div
                    v-for="font in fontOptions"
                    :key="font.value"
                    class="select-option"
                    :class="{ active: uiFont === font.value }"
                    @click="handleUIFontSelect(font.value)"
                  >
                    {{ font.label }}
                  </div>
                </div>
              </div>
              <div class="font-preview">预览文本 Preview Text</div>
            </div>

            <div class="setting-item">
              <div class="setting-label">编辑器字体</div>
              <div class="select-wrapper">
                <div class="font-select" @click="toggleEditorFontDropdown">
                  <span class="selected-font">{{ getFontLabel(editorFont) }}</span>
                  <div class="select-arrow">
                    <Down theme="outline" size="16" :strokeWidth="3" />
                  </div>
                </div>
                <div v-show="showEditorFontSelect" class="select-dropdown">
                  <div
                    v-for="font in fontOptions"
                    :key="font.value"
                    class="select-option"
                    :class="{ active: editorFont === font.value }"
                    @click="handleEditorFontSelect(font.value)"
                  >
                    {{ font.label }}
                  </div>
                </div>
              </div>
              <div class="font-preview" :style="{ fontFamily: previewEditorFont }">
                预览文本 Preview Text
              </div>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="section-title">功能开关</div>
          <div class="feature-settings">
            <div class="setting-item">
              <div class="setting-label">启用手绘板</div>
              <Switch
                :model-value="!!enableWhiteboard"
                @update:model-value="handleWhiteboardChange"
              />
            </div>
            <div class="setting-item">
              <div class="setting-label">随机回顾启用趣味按钮</div>
              <Switch
                :model-value="enableMarioStyle"
                @update:model-value="handleMarioStyleChange"
              />
            </div>
            <div class="setting-item">
              <div class="setting-label">随机回顾趣味按钮音效</div>
              <Switch
                :model-value="enableMarioSound"
                @update:model-value="handleMarioSoundChange"
              />
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
import { useAppearanceStore } from '@renderer/stores/appearanceStore'
import { useTimeBlockStore } from '@renderer/stores/timeBlockStore'
import { useThemeStore } from '@renderer/stores/themeStore'
import Switch from '@renderer/components/ui/Switch.vue'
import { useReviewStore } from '@renderer/stores/reviewStore'

const appearanceStore = useAppearanceStore()
const timeBlockStore = useTimeBlockStore()
const themeStore = useThemeStore()
const reviewStore = useReviewStore()

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

const previewEditorFont = computed(() => {
  return editorFont.value === 'wenkai' ? '"LXGW WenKai", sans-serif' : 'system-ui'
})

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
const enableMarioSound = ref(reviewStore.enableMarioSound)
const enableMarioStyle = ref(reviewStore.enableMarioStyle)

// 初始化数据
onMounted(() => {
  starredExpanded.value = Boolean(appearanceStore.settings?.starredExpanded ?? true)
  tagsExpanded.value = Boolean(appearanceStore.settings?.tagsExpanded ?? false)
  recentExpanded.value = Boolean(appearanceStore.settings?.recentExpanded ?? true)
  enableWhiteboard.value = Boolean(appearanceStore.settings?.enableWhiteboard ?? true)
  enableMarioSound.value = reviewStore.enableMarioSound
  enableMarioStyle.value = reviewStore.enableMarioStyle
})

// 处理函数
// const handleStarredExpandedChange = async (value: boolean) => {
//   try {
//     await appearanceStore.updateStarredExpanded(value)
//     starredExpanded.value = value
//   } catch (error) {
//     console.error('更新星标展开状态失败:', error)
//   }
// }

// const handleTagsExpandedChange = async (value: boolean) => {
//   try {
//     await appearanceStore.updateTagsExpanded(value)
//     tagsExpanded.value = value
//   } catch (error) {
//     console.error('更新标签展开状态失败:', error)
//   }
// }

// const handleRecentExpandedChange = async (value: boolean) => {
//   try {
//     await appearanceStore.updateRecentExpanded(value)
//     recentExpanded.value = value
//   } catch (error) {
//     console.error('更新最近展开状态失败:', error)
//   }
// }

const handleWhiteboardChange = async (value: boolean) => {
  try {
    await appearanceStore.updateWhiteboardEnabled(value)
    enableWhiteboard.value = value
  } catch (error) {
    console.error('更新白板功能开关失败:', error)
  }
}

// 默认页面状态
const defaultPage = ref('/home')

const showPageSelect = ref(false)

const getPageName = (path: string) => {
  const pageMap: Record<string, string> = {
    '/home': '主页',
    '/timeblock': '时光记',
    '/drafts': '草稿纸',
    '/timeline': '笔记流',
    '/cardbox': '卡片盒',
    '/knowledge-tree': '知识树',
    '/flashcard': '记忆卡',
    '/whiteboard': '思维板'
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

const handleMarioSoundChange = (value: boolean) => {
  reviewStore.updateMarioSoundEnabled(value)
  enableMarioSound.value = value
}

const handleMarioStyleChange = (value: boolean) => {
  reviewStore.updateMarioStyleEnabled(value)
  enableMarioStyle.value = value
}

// 添加新的状态
const showUIFontSelect = ref(false)
const showEditorFontSelect = ref(false)

// 添加新的方法
const toggleUIFontDropdown = (e: Event) => {
  e.stopPropagation()
  showUIFontSelect.value = !showUIFontSelect.value
  showEditorFontSelect.value = false
}

const toggleEditorFontDropdown = (e: Event) => {
  e.stopPropagation()
  showEditorFontSelect.value = !showEditorFontSelect.value
  showUIFontSelect.value = false
}

const handleUIFontSelect = async (value: string) => {
  uiFont.value = value
  showUIFontSelect.value = false
  await handleUIFontChange()
}

const handleEditorFontSelect = async (value: string) => {
  editorFont.value = value
  showEditorFontSelect.value = false
  await handleEditorFontChange()
}

const getFontLabel = (value: string) => {
  return fontOptions.find((font) => font.value === value)?.label || '系统默认'
}

// 添加点击外部关闭下拉菜单
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.select-wrapper')) {
      showUIFontSelect.value = false
      showEditorFontSelect.value = false
    }
  })
})
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

      .select-wrapper {
        position: relative;
        width: 200px;

        .font-select {
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid var(--color-border);
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

          .selected-font {
            font-weight: 400;
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

      .font-preview {
        margin-top: 8px;
        padding: 12px;
        border-radius: 6px;
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
            font-weight: 400;
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
