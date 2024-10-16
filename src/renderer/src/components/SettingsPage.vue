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
      <div v-if="currentMenuItem === 'shortcuts'" class="shortcuts-settings">
        <div class="shortcuts-settings-wrapper">
          <div class="shortcuts-settings-header">
            <div class="shortcuts-content-header">
              <div class="icon">
                <KeyboardOne
                  theme="outline"
                  size="20"
                  fill="var(--color-icon-menu-default)"
                  :strokeWidth="3"
                />
              </div>
              <div class="name">{{ currentMenuItemLabel }}</div>
            </div>
            <div class="shortcuts-settings-search-bar">
              <input v-model="searchQuery" type="text" placeholder="搜索" />
            </div>
          </div>
          <div class="shortcuts-settings-divider"></div>
          <div class="shortcuts-settings-content">
            <div class="shortcuts-list">
              <div
                v-for="category in filteredShortcuts"
                :key="category.name"
                class="shortcuts-category"
              >
                <div class="title">{{ category.name }}</div>
                <div
                  v-for="shortcut in category.shortcuts"
                  :key="shortcut.action"
                  class="shortcut-item"
                >
                  <span class="shortcut-action">{{ shortcut.action }}</span>
                  <span class="shortcut-keys">
                    <template v-for="(key, index) in shortcut.keys" :key="index">
                      <kbd>{{ key }}</kbd>
                      <span v-if="index < shortcut.keys.length - 1" class="key-separator"> + </span>
                    </template>
                  </span>
                </div>
              </div>
            </div>
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
  { key: 'shortcuts', label: '快捷键', icon: KeyboardOne },
  // { key: 'account', label: '我的账号', icon: SettingTwo },
  { key: 'appearance', label: '外观', icon: Theme },
  { key: 'api', label: '专属API', icon: Api }

  // { key: 'subscription', label: '订阅', icon: Trophy }
]

const currentMenuItem = ref('backup')

const selectMenuItem = (key: string) => {
  currentMenuItem.value = key
}

const currentMenuItemLabel = computed(() => {
  return menuItems.find((item) => item.key === currentMenuItem.value)?.label || ''
})

const searchQuery = ref('')

const shortcuts = [
  {
    name: '常规',
    shortcuts: [
      { action: '打开设置', keys: ['⌘', ','] },
      { action: '打开主页', keys: ['⌘', '⇧', 'H'] },
      { action: '打开时间线', keys: ['⌘', 'J'] },
      { action: '打开卡片盒', keys: ['⌘', '⇧', 'B'] },
      { action: '打开主要卡片盒', keys: ['⌘', '⇧', 'M'] },
      { action: '打开索引卡片盒', keys: ['⌘', '⇧', 'I'] },
      { action: '打开文献卡片盒', keys: ['⌘', '⇧', 'L'] },
      { action: '打开思维板', keys: ['⌘', '⇧', 'W'] },
      { action: '添加新卡片笔记', keys: ['⌘', 'N'] },
      { action: '搜索', keys: ['⌘', 'S'] }
    ]
  },
  {
    name: '思维板',
    shortcuts: [
      { action: '搜索新增白板笔记', keys: ['⌘', '⇧', 'N'] },
      { action: '新增空白白板笔记', keys: ['双击空白处'] }
      // ... 可以添加更多文本编辑相关的快捷键
    ]
  }
]

const filteredShortcuts = computed(() => {
  if (!searchQuery.value) return shortcuts
  return shortcuts
    .map((category) => ({
      name: category.name,
      shortcuts: category.shortcuts.filter((shortcut) =>
        shortcut.action.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
    }))
    .filter((category) => category.shortcuts.length > 0)
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

.shortcuts-settings {
  width: 100%;
  height: 100%;
}
.shortcuts-settings-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
}
.shortcuts-settings-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.shortcuts-content-header {
  display: flex;
  align-items: center;
  gap: 6px;

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
.shortcuts-settings-search-bar {
  flex-grow: 1;
  margin-left: 20px;
  display: flex;
  align-items: center;
  justify-content: flex-end;

  input {
    width: 300px;
    padding: 8px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-size: 14px;
  }
}

.shortcuts-settings-divider {
  height: 1px;
  background-color: var(--color-border);
  margin: 4px 0;
  width: 100%;
  margin-bottom: 10px;
}

.shortcuts-settings-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  overflow-y: auto;
  .shortcuts-list {
    width: 100%;

    .shortcuts-category {
      margin-bottom: 20px;
      padding-right: 10px;

      .title {
        font-size: 18px;
        font-weight: 500;
        margin-bottom: 10px;
        color: var(--color-text-primary);
      }

      .shortcut-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0px 8px 0;
        border-bottom: 1px solid var(--color-border);

        .shortcut-action {
          font-size: 14px;
          color: var(--color-text-primary);
        }

        .shortcut-keys {
          display: flex;
          align-items: center;
          gap: 4px;
          kbd {
            // width: 20px;
            height: 20px;
            display: inline-flex; // 改为 inline-flex
            align-items: center; // 垂直居中
            justify-content: center; // 水平居中
            background-color: var(--color-background-secondary);
            border: 1px solid var(--color-border);
            border-radius: 4px;
            padding: 2px 4px;
            font-size: 12px;
            margin: 0 2px;
          }
          .key-separator {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            margin: 0 2px;
            color: var(--color-text-primary);
          }
        }
      }
    }
  }
}
</style>
