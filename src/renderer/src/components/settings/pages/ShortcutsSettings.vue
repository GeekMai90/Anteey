<template>
  <div class="shortcuts-settings">
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
          <div class="name">快捷键</div>
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
</template>

<script setup lang="ts">
import { KeyboardOne } from '@icon-park/vue-next'
import { ref, computed } from 'vue'

const searchQuery = ref('')

const shortcuts = [
  {
    name: '常规',
    shortcuts: [
      { action: '打开设置', keys: ['⌘', ','] },
      { action: '切换主题', keys: ['⌘', '⇧', 'T'] },
      { action: '打开主页', keys: ['⌘', '⇧', 'H'] },
      { action: '打开时间线', keys: ['⌘', 'J'] },
      { action: '打开卡片盒', keys: ['⌘', '⇧', 'B'] },
      { action: '打开主要卡片盒', keys: ['⌘', '⇧', 'M'] },
      { action: '打开索引卡片盒', keys: ['⌘', '⇧', 'I'] },
      { action: '打开文献卡片盒', keys: ['⌘', '⇧', 'L'] },
      { action: '打开思维板', keys: ['⌘', '⇧', 'W'] },
      { action: '添加新卡片笔记', keys: ['⌘', 'N'] },
      { action: '搜索', keys: ['⌘', 'S'] },
      { action: '折叠/展开左侧边栏', keys: ['⌘', '/'] },
      { action: '折叠/展开右侧边栏', keys: ['⌘', '⇧', '/'] },
      { action: '后退', keys: ['⌘', '['] },
      { action: '前进', keys: ['⌘', ']'] },
      { action: '刷新', keys: ['⌘', 'R'] }
    ]
  },
  {
    name: '思维板',
    shortcuts: [
      { action: '搜索新增白板笔记', keys: ['⌘', '⇧', 'N'] },
      { action: '新增空白白板笔记', keys: ['双击空白处'] }
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
    background: var(--color-background-primary);
    color: var(--color-text-primary);

    &:focus {
      border-color: var(--color-primary);
      outline: none;
    }
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
        padding: 8px 0;
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
            height: 20px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
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
