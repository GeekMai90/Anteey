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
      <div v-if="currentMenuItem === 'backup'" class="backup-settings">
        <div class="settings-content-header">
          <div class="icon">
            <DatabaseDownload
              theme="outline"
              size="20"
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
            />
          </div>
          <div class="name">{{ currentMenuItemLabel }}</div>
        </div>
        <div class="backup-settings-divider"></div>
        <div class="backup-settings-content">
          <div class="backup-item">
            <div class="title">导出数据</div>
            <div class="description">
              将所有卡片笔记以 Markdown 格式导出，保留原有结构和内容的完整性。
            </div>
            <div class="backup-item-button" @click="handleBulkExport">立即导出</div>
          </div>
        </div>
      </div>
    </div>
    <!-- 其他设置项的内容可以在这里添加 -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Api, DatabaseDownload, KeyboardOne, SettingTwo, Theme } from '@icon-park/vue-next'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'

const noteId = ref('')
const { handleBulkExport } = useNoteMenu({
  noteId: noteId.value,
  menuItems: ['star']
})

const menuItems = [
  { key: 'backup', label: '备份', icon: DatabaseDownload },
  // { key: 'account', label: '我的账号', icon: SettingTwo },
  { key: 'appearance', label: '外观', icon: Theme },
  { key: 'api', label: '专属API', icon: Api },
  { key: 'shortcuts', label: '快捷键', icon: KeyboardOne }
  // { key: 'subscription', label: '订阅', icon: Trophy }
]

const currentMenuItem = ref('backup')

const selectMenuItem = (key: string) => {
  currentMenuItem.value = key
}

const currentMenuItemLabel = computed(() => {
  return menuItems.find((item) => item.key === currentMenuItem.value)?.label || ''
})
</script>

<style scoped lang="scss">
.settings-page {
  display: flex;
  background-color: var(--color-background-primary);
  width: 60vw;
  height: 80vh;
  max-width: 1000px;
  max-height: 600px;
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

.backup-settings {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  .settings-content-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
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
      line-height: 16px;
      display: flex;
      align-items: center;
      line-height: 1;
      font-weight: 500;
      user-select: none;
    }
  }
  .backup-settings-divider {
    height: 1px;
    background-color: var(--color-border);
    margin: 4px 0;
    width: 100%;
  }
  .backup-settings-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    .backup-item {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-start;
      .title {
        font-size: 18px;
        line-height: 1;
        color: var(--color-text-primary);
        font-weight: 500;
        user-select: none;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        margin: 15px 0;
        user-select: none;
      }
      .description {
        font-size: 14px;
        line-height: 1;
        color: var(--color-text-secondary);
        display: flex;
        align-items: center;
        justify-content: flex-start;
        margin-bottom: 15px;
        user-select: none;
      }
      .backup-item-button {
        width: 80px;
        height: 35px;
        background-color: var(--color-primary);
        color: var(--color-text-inversion);
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        user-select: none;
      }
    }
  }
}
</style>
