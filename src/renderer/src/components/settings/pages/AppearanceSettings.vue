<template>
  <div class="appearance-settings">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Theme } from '@icon-park/vue-next'
import { useUIStore } from '@renderer/stores/useUIStore'

const uiStore = useUIStore()
const currentTheme = computed(() => uiStore.themeMode)

const themeOptions = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
  { label: '跟随系统', value: 'system' }
]

const handleThemeChange = (theme: string) => {
  uiStore.setThemeMode(theme as 'light' | 'dark' | 'system')
}
</script>

<style scoped lang="scss">
.appearance-settings {
  width: 100%;
  height: 100%;

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
    margin-bottom: 32px;

    .section-title {
      font-size: 16px;
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
}
</style>
