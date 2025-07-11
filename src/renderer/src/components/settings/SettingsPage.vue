<template>
  <div class="settings-page">
    <div class="settings-sidebar">
      <div class="settings-sidebar-header">
        <div class="icon">
          <SettingTwo theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
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
                  fill="var(--color-icon-primary)"
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
      <LicenseSettings v-if="currentMenuItem === 'license'" />
      <TimeBlockSettings v-if="currentMenuItem === 'timeblock'" />
      <CloudSyncSettings v-if="currentMenuItem === 'cloud'" />
      <FlashcardSettings v-if="currentMenuItem === 'flashcard'" />
      <ModelSettings v-if="currentMenuItem === 'model'" />
      <AIAssistantSettings v-if="currentMenuItem === 'ai'" />
      <EditorSettings v-if="currentMenuItem === 'editor'" />
      <LetterSettings v-if="currentMenuItem === 'letter'" />
      <ThreeSyncSettings v-if="currentMenuItem === 'threeSync'" />
      <WritingDeskSettings v-if="currentMenuItem === 'writingDesk'" />
      <ImageBedSettings v-if="currentMenuItem === 'imageBed'" />
      <McpSettings v-if="currentMenuItem === 'mcp'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  DatabaseDownload,
  KeyboardOne,
  SettingTwo,
  Theme,
  Share,
  CrownThree,
  Time,
  CloudStorage,
  StorageCardOne,
  RobotOne,
  Edit,
  Inbox,
  PlasticSurgery,
  NotebookAndPen,
  Mail,
  PictureOne,
  Api
} from '@icon-park/vue-next'
import BackupSettings from './pages/BackupSettings.vue'
import ShortcutsSettings from './pages/ShortcutsSettings.vue'
import ShareSettings from './pages/ShareSettings.vue'
import AppearanceSettings from './pages/AppearanceSettings.vue'
import LicenseSettings from './pages/LicenseSettings.vue'
import TimeBlockSettings from './pages/TimeBlockSettings.vue'
import FlashcardSettings from './pages/FlashcardSettings.vue'
import ModelSettings from './pages/ModelSettings.vue'
import EditorSettings from './pages/EditorSettings.vue'
import CloudSyncSettings from './pages/CloudSyncSettings.vue'
import ThreeSyncSettings from './pages/ThreeSyncSettings.vue'
import AIAssistantSettings from './pages/AIAssistantSettings.vue'
import WritingDeskSettings from './pages/WritingDeskSettings.vue'
import LetterSettings from './pages/LetterSettings.vue'
import ImageBedSettings from './pages/ImageBedSettings.vue'
import McpSettings from './pages/McpSettings.vue'
const menuItems = [
  { key: 'appearance', label: '外观', icon: Theme },
  { key: 'timeblock', label: '时光记', icon: Time },
  { key: 'flashcard', label: '记忆卡', icon: StorageCardOne },
  { key: 'shortcuts', label: '快捷键', icon: KeyboardOne },
  { key: 'share', label: '分享', icon: Share },
  { key: 'backup', label: '备份', icon: DatabaseDownload },
  { key: 'cloud', label: '云同步', icon: CloudStorage },
  { key: 'imageBed', label: '图床设置', icon: PictureOne },
  { key: 'model', label: '大模型配置', icon: RobotOne },
  { key: 'ai', label: 'AI 助手设置', icon: PlasticSurgery },
  { key: 'writingDesk', label: '写作台', icon: NotebookAndPen },
  { key: 'editor', label: '编辑器', icon: Edit },
  { key: 'letter', label: '每日来信', icon: Mail },
  { key: 'threeSync', label: '三方同步', icon: Inbox },
  { key: 'mcp', label: 'MCP 服务', icon: Api },
  { key: 'license', label: '软件激活', icon: CrownThree }
]

const currentMenuItem = ref('appearance')

const selectMenuItem = (key: string) => {
  currentMenuItem.value = key
}
</script>

<style scoped lang="scss">
.settings-page {
  display: flex;
  background-color: var(--color-bg-primary);
  width: 70vw;
  height: 90vh;
  max-width: 1000px;
  max-height: 820px;
  z-index: 9999;
}

.settings-sidebar {
  width: 200px;
  background-color: var(--color-bg-secondary);
  padding: 16px 10px;
  overflow-y: auto;
  flex-shrink: 0;
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
  background-color: var(--color-hover-sidebar);
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
    background-color: var(--color-hover-sidebar);
  }

  &.active {
    background-color: var(--color-hover-sidebar);
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
  padding: 16px 0px;
  background-color: var(--color-background-primary);
  overflow-y: auto;
}
</style>
