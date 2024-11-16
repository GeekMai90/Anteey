<template>
  <div class="settings-page">
    <div class="settings-sidebar">
      <div class="settings-sidebar-header">
        <div class="icon">
          <SettingTwo
            theme="outline"
            size="20"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">基础设置</div>
      </div>
      <div class="settings-sidebar-divider"></div>
      <div class="settings-sidebar-content">
        <ul>
          <li
            v-for="item in menuItems"
            :key="item.key"
            :class="{ active: currentMenuItem === item.key }"
            @click="selectMenuItem(item.key)"
          >
            <div class="nav-item">
              <div class="icon">
                <component
                  :is="item.icon"
                  theme="outline"
                  :size="20"
                  fill="var(--color-icon-menu-default)"
                  :strokeWidth="3"
                ></component>
              </div>
              <div class="name">{{ item.label }}</div>
            </div>
          </li>
        </ul>
      </div>
    </div>
    <div class="settings-content">
      <BackupSettings v-if="currentMenuItem === 'backup'" />
      <ShortcutsSettings v-if="currentMenuItem === 'shortcuts'" />
      <ShareSettings v-if="currentMenuItem === 'share'" />
      <AppearanceSettings v-if="currentMenuItem === 'appearance'" />
      <DictionarySettings v-if="currentMenuItem === 'dictionary'" />
      <LLMSettings v-if="currentMenuItem === 'llm'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  Api,
  DatabaseDownload,
  KeyboardOne,
  SettingTwo,
  Theme,
  Share,
  BookOne
} from '@icon-park/vue-next'
import BackupSettings from './pages/BackupSettings.vue'
import ShortcutsSettings from './pages/ShortcutsSettings.vue'
import ShareSettings from './pages/ShareSettings.vue'
import AppearanceSettings from './pages/AppearanceSettings.vue'
import DictionarySettings from './pages/DictionarySettings.vue'
import LLMSettings from './pages/LLMSettings.vue'

const menuItems = [
  { key: 'backup', label: '备份', icon: DatabaseDownload },
  { key: 'shortcuts', label: '快捷键', icon: KeyboardOne },
  { key: 'share', label: '分享设置', icon: Share },
  { key: 'appearance', label: '外观', icon: Theme },
  { key: 'dictionary', label: '词库管理', icon: BookOne },
  { key: 'api', label: '专属API', icon: Api },
  { key: 'llm', label: 'LLM配置', icon: Api }
]

const currentMenuItem = ref('backup')

const selectMenuItem = (key: string) => {
  currentMenuItem.value = key
}
</script>

<style scoped lang="scss">
.settings-page {
  display: flex;
  background-color: var(--color-bg-primary);
  width: 60vw;
  height: 80vh;
  max-width: 1000px;
  max-height: 820px;
  z-index: 9999;
}

.settings-sidebar {
  width: 200px;
  background-color: var(--sidebar-bg);
  padding: 16px 10px;
  overflow-y: auto;
}

.settings-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  margin-bottom: 10px;

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
      width: 20px;
      height: 20px;
    }
  }

  .name {
    font-size: 16px;
    line-height: 16px;
    display: flex;
    align-items: center;
  }
}

.settings-sidebar-divider {
  height: 1px;
  background-color: var(--color-border);
  margin: 10px 0;
}

.settings-sidebar ul {
  list-style-type: none;
  padding: 0;
}

.settings-sidebar li.active {
  background-color: var(--sidebar-hover-bg);
  border-radius: 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  cursor: pointer;
  border-radius: 6px;
  margin-bottom: 2px;

  &:hover {
    background-color: var(--sidebar-hover-bg);
  }

  &.active {
    background-color: var(--sidebar-hover-bg);
  }

  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 22px;
    height: 22px;
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
      width: 18px;
      height: 18px;
    }
  }

  .name {
    font-size: 14px;
    line-height: 14px;
    display: flex;
    align-items: center;
  }
}

.settings-content {
  flex-grow: 1;
  padding: 16px;
  background-color: var(--color-background-primary);
  overflow-y: auto;
}
</style>
