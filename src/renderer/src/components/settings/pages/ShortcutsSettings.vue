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
        <div class="global-shortcut-section">
          <div class="section-title">全局快捷键</div>
          <div class="global-shortcut-item">
            <span class="shortcut-action">显示/隐藏应用窗口</span>
            <div class="shortcut-input-wrapper">
              <div class="shortcut-keys">
                <template v-if="isRecording">
                  <span class="recording-text">按下快捷键...</span>
                </template>
                <template v-else-if="!currentHotkey">
                  <span class="empty-text">未设置</span>
                </template>
                <template v-else>
                  <template v-for="(key, index) in displayKeys" :key="index">
                    <kbd>{{ key }}</kbd>
                    <span v-if="index < displayKeys.length - 1" class="key-separator">+</span>
                  </template>
                </template>
              </div>

              <template v-if="!isRecording">
                <template v-if="currentHotkey">
                  <button class="icon-button" title="删除快捷键" @click="removeHotkey">
                    <div class="icon">
                      <Close theme="outline" size="16" :stroke-width="3" />
                    </div>
                  </button>
                  <button class="icon-button" title="重置为默认" @click="resetHotkey">
                    <div class="icon">
                      <Refresh theme="outline" size="16" :stroke-width="3" />
                    </div>
                  </button>
                </template>
                <template v-else>
                  <button class="icon-button" title="添加快捷键" @click="startRecording">
                    <div class="icon">
                      <Plus theme="outline" size="16" :stroke-width="3" />
                    </div>
                  </button>
                </template>
              </template>
            </div>
          </div>
        </div>
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
import { KeyboardOne, Close, Plus, Refresh } from '@icon-park/vue-next'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { message } from '@renderer/utils/message'

const searchQuery = ref('')
const isRecording = ref(false)
const currentHotkey = ref('')
const DEFAULT_HOTKEY = 'Alt+CommandOrControl+U'
const isMacOS = navigator.platform.toUpperCase().indexOf('MAC') >= 0
const currentModifiers = ref<string[]>([])
const currentKey = ref<string>('')

// 将快捷键字符串转换为显示数组
const displayKeys = computed(() => {
  if (!currentHotkey.value) return []
  return currentHotkey.value.split('+').map((key) => {
    switch (key) {
      case 'CommandOrControl':
        return isMacOS ? '⌘' : 'Ctrl'
      case 'Alt':
        return isMacOS ? '⌥' : 'Alt'
      case 'Shift':
        return isMacOS ? '⇧' : 'Shift'
      default:
        return key
    }
  })
})

// 修改处理键盘事件的逻辑
const handleKeyDown = async (event: KeyboardEvent) => {
  if (!isRecording.value) return

  event.preventDefault()
  event.stopPropagation()

  // 记录按键状态
  console.log('键盘事件:', {
    key: event.key,
    code: event.code,
    metaKey: event.metaKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey
  })

  // 如果只按了修饰键，不处理
  if (['Meta', 'Control', 'Alt', 'Shift'].includes(event.key)) {
    return
  }

  // 获取主键
  let key = event.code.replace('Key', '')

  // 特殊按键映射
  const specialKeys: Record<string, string> = {
    Space: 'Space',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Escape: 'Esc',
    Enter: 'Return',
    Tab: 'Tab',
    Backspace: 'Backspace',
    Delete: 'Delete'
  }

  // 处理特殊按键
  if (event.code in specialKeys) {
    key = specialKeys[event.code]
  }

  // 收集修饰键
  const modifiers: string[] = []
  if (event.metaKey || event.ctrlKey) modifiers.push('CommandOrControl')
  if (event.altKey) modifiers.push('Alt')
  if (event.shiftKey) modifiers.push('Shift')

  if (modifiers.length === 0) {
    message.error('请至少包含一个修饰键(Command/Control/Alt/Shift)')
    return
  }

  // 构建快捷键字符串
  const newHotkey = [...new Set(modifiers), key].join('+')
  console.log('尝试设置快捷键:', newHotkey)

  try {
    const result = await window.electronAPI.updateGlobalHotkey(newHotkey)
    if (result.success) {
      currentHotkey.value = newHotkey
      message.success('快捷键设置成功')
      stopRecording()
    } else {
      message.error(result.error || '设置快捷键失败')
    }
  } catch (error) {
    console.error('设置快捷键失败:', error)
    message.error('设置快捷键失败')
  }
}

// 修改开始录制的逻辑
const startRecording = () => {
  isRecording.value = true
  currentModifiers.value = []
  currentKey.value = ''
  // 使用 keydown 而不是 keypress
  window.addEventListener('keydown', handleKeyDown)
  console.log('开始录制快捷键')
}

// 停止录制快捷键
const stopRecording = () => {
  isRecording.value = false
  window.removeEventListener('keydown', handleKeyDown)
  console.log('停止录制快捷键')
}

// 删除快捷键
const removeHotkey = async () => {
  try {
    await window.electronAPI.updateGlobalHotkey('')
    currentHotkey.value = ''
    message.success('快捷键已删除')
  } catch (error) {
    message.error('删除快捷键失败')
  }
}

// 重置快捷键
const resetHotkey = async () => {
  try {
    const result = await window.electronAPI.updateGlobalHotkey(DEFAULT_HOTKEY)
    if (result.success) {
      currentHotkey.value = DEFAULT_HOTKEY
      message.success('已重置为默认快捷键')
    }
  } catch (error) {
    message.error('重置快捷键失败')
  }
}

onMounted(async () => {
  try {
    const settings = await window.electronAPI.getUserSettings()
    if (settings?.globalHotkey) {
      currentHotkey.value = settings.globalHotkey
    }
  } catch (error) {
    console.error('获取快捷键设置失败:', error)
  }
})

onUnmounted(() => {
  if (isRecording.value) {
    window.removeEventListener('keydown', handleKeyDown)
  }
})

const shortcuts = [
  {
    name: '全局',
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
            height: 18px;
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

.global-shortcut-section {
  margin-bottom: 20px;
  // padding: 16px 0;
  background: var(--color-background-secondary);
  border-radius: 8px;
  width: 100%;

  .section-title {
    font-size: 18px;
    font-weight: 500;
    margin-bottom: 10px;
    color: var(--color-text-primary);
  }
}

.global-shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;

  .shortcut-action {
    font-size: 14px;
    color: var(--color-text-primary);
  }

  .shortcut-input-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;

    .shortcut-keys {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 160px;
      height: 30px;
      padding: 0 12px;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: var(--color-background-primary);
      justify-content: center;

      &.is-recording {
        border-color: var(--color-primary);
        background-color: var(--color-background-secondary);
      }

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

      .recording-text {
        color: var(--color-primary);
        font-size: 13px;
      }

      .empty-text {
        color: var(--color-text-secondary);
        font-size: 13px;
      }
    }
  }
}

.icon-button {
  padding: 4px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 20px;
    height: 20px;
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
      width: 14px;
      height: 14px;
    }
  }

  &:hover {
    border-color: var(--color-primary);
    background: var(--color-background-secondary);
  }
}
</style>
