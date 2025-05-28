# Anteey 命令面板功能开发文档

## 1. 功能概述

命令面板（Command Palette）是 Anteey 应用中的一个快速操作中心，允许用户通过键盘快捷键快速搜索和执行各种命令，提高操作效率。用户可以通过 `Command+K` 或 `Ctrl+K` 快捷键打开命令面板，输入关键词搜索命令，并通过键盘或鼠标选择执行命令。

## 2. 需求分析

### 2.1 功能需求

- **快捷键激活**：通过 `Command+K`/`Ctrl+K` 快速打开命令面板
- **命令搜索**：根据输入的关键词实时搜索匹配的命令
- **命令分类**：将命令按类别（主题、导航、笔记、设置等）进行分组
- **命令执行**：选择命令后立即执行相应操作
- **键盘导航**：支持使用方向键在搜索结果中导航
- **命令快捷键**：显示命令对应的键盘快捷键（如果有）

### 2.2 用户体验需求

- 搜索响应迅速，实时显示结果
- 界面简洁清晰，符合应用整体设计风格
- 支持键盘完全操作，提高效率
- 提供视觉反馈，如选中状态、执行状态等

## 3. 技术架构

### 3.1 数据结构设计

命令相关的核心数据结构定义在 `src/shared/types/command.ts` 中：

```typescript
// 命令执行函数类型
export type CommandAction = () => void | Promise<void>

// 命令类别枚举
export enum CommandCategory {
  THEME = '主题',
  NAVIGATION = '导航',
  NOTE = '笔记',
  SETTINGS = '设置',
  TOOLS = '工具',
  SYSTEM = '系统'
}

// 命令接口
export interface Command {
  id: string // 命令唯一标识
  title: string // 命令标题
  category: CommandCategory // 命令类别
  icon?: string // 命令图标
  keywords: string[] // 搜索关键词
  shortcut?: string // 快捷键
  action: CommandAction // 执行函数
  visible?: boolean // 是否可见（默认为true）
}

// 命令组接口
export interface CommandGroup {
  category: CommandCategory
  commands: Command[]
}

// 命令搜索结果
export interface CommandSearchResult {
  commands: Command[]
  query: string
}
```

### 3.2 实现架构

命令面板功能的实现遵循 Anteey 应用的整体架构，采用以下分层结构：

1. **服务层**：提供命令注册、搜索和执行的核心功能
2. **IPC 通信层**：连接主进程和渲染进程
3. **预加载脚本**：为渲染进程提供 API
4. **状态管理**：使用 Pinia 管理命令面板状态
5. **UI 组件**：实现命令面板的视觉界面

## 4. 实现细节

### 4.1 服务层实现

在 `src/services/command/commandService.ts` 中实现核心服务功能：

- `registerCommand`：注册单个命令
- `registerCommands`：批量注册多个命令
- `getAllCommands`：获取所有可见命令
- `getCommandsByCategory`：按类别分组获取命令
- `searchCommands`：根据关键词搜索命令
- `executeCommand`：执行指定 ID 的命令
- `registerDefaultCommands`：注册默认系统命令

### 4.2 默认命令实现

在 `src/services/command/defaultCommands.ts` 中实现默认命令：

- **主题命令**：切换亮色/暗色主题、跟随系统主题
- **导航命令**：导航到首页、时间线、卡片盒等页面
- **笔记命令**：创建新笔记、搜索笔记
- **设置命令**：打开设置页面
- **系统命令**：重新加载应用等

### 4.3 IPC 通信实现

在 `src/main/ipc/commandIpcHandlers.ts` 中实现 IPC 处理程序：

```typescript
export function registerCommandIpcHandlers(): void {
  // 获取所有命令
  ipcMain.handle('command:getAllCommands', () => {
    return getAllCommands()
  })

  // 按类别获取命令
  ipcMain.handle('command:getCommandsByCategory', () => {
    return getCommandsByCategory()
  })

  // 搜索命令
  ipcMain.handle('command:searchCommands', (_event, query: string) => {
    return searchCommands(query)
  })

  // 执行命令
  ipcMain.handle('command:executeCommand', async (_event, commandId: string) => {
    try {
      await executeCommand(commandId)
      return { success: true }
    } catch (error) {
      console.error('执行命令失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })
}
```

### 4.4 预加载脚本实现

在 `src/preload/api/commandApi.ts` 中实现预加载 API：

```typescript
export const commandApi = {
  // 获取所有命令
  getAllCommands: (): Promise<Command[]> => {
    return ipcRenderer.invoke('command:getAllCommands')
  },

  // 按类别获取命令
  getCommandsByCategory: (): Promise<CommandGroup[]> => {
    return ipcRenderer.invoke('command:getCommandsByCategory')
  },

  // 搜索命令
  searchCommands: (query: string): Promise<CommandSearchResult> => {
    return ipcRenderer.invoke('command:searchCommands', query)
  },

  // 执行命令
  executeCommand: (commandId: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('command:executeCommand', commandId)
  }
}
```

### 4.5 状态管理实现

在 `src/renderer/src/stores/commandStore.ts` 中使用 Pinia 实现状态管理：

```typescript
export const useCommandStore = defineStore('command', () => {
  // 状态
  const isCommandPaletteOpen = ref(false)
  const searchQuery = ref('')
  const searchResults = ref<Command[]>([])
  const isLoading = ref(false)
  const selectedCommandIndex = ref(0)

  // 计算属性
  const hasResults = computed(() => searchResults.value.length > 0)

  // 方法
  // 打开命令面板
  const openCommandPalette = () => {
    isCommandPaletteOpen.value = true
    searchQuery.value = ''
    selectedCommandIndex.value = 0
    // 加载所有命令
    searchCommands('')
  }

  // 关闭命令面板
  const closeCommandPalette = () => {
    isCommandPaletteOpen.value = false
    searchQuery.value = ''
    searchResults.value = []
  }

  // 搜索命令
  const searchCommands = async (query: string) => {
    try {
      isLoading.value = true
      searchQuery.value = query

      const result = await window.electronAPI.command.searchCommands(query)
      searchResults.value = result.commands

      // 重置选择的索引
      if (searchResults.value.length > 0) {
        selectedCommandIndex.value = 0
      }
    } catch (error) {
      console.error('搜索命令失败:', error)
      searchResults.value = []
    } finally {
      isLoading.value = false
    }
  }

  // 执行命令
  const executeCommand = async (commandId: string) => {
    try {
      const result = await window.electronAPI.command.executeCommand(commandId)
      if (!result.success) {
        console.error('执行命令失败:', result.error)
      }
      // 执行后关闭命令面板
      closeCommandPalette()
      return result.success
    } catch (error) {
      console.error('执行命令失败:', error)
      return false
    }
  }

  // 其他方法...

  return {
    // 状态和方法...
  }
})
```

### 4.6 UI 组件实现

在 `src/renderer/src/components/common/CommandPalette.vue` 中实现 UI 组件：

```vue
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="commandStore.isCommandPaletteOpen"
        class="command-palette-overlay"
        @click="commandStore.closeCommandPalette"
      >
        <div class="command-palette-container" @click.stop>
          <!-- 搜索框 -->
          <div class="command-palette-header">
            <div class="command-palette-search">
              <!-- 搜索图标 -->
              <div class="command-palette-search-icon">
                <Search theme="outline" size="18" />
              </div>
              <!-- 搜索输入框 -->
              <input
                ref="searchInput"
                v-model="searchQuery"
                type="text"
                class="command-palette-search-input"
                placeholder="搜索命令..."
                @input="onSearchInput"
                @keydown.down.prevent="commandStore.selectNextCommand"
                @keydown.up.prevent="commandStore.selectPreviousCommand"
                @keydown.enter="commandStore.executeSelectedCommand"
                @keydown.esc="commandStore.closeCommandPalette"
              />
              <!-- 清除按钮 -->
              <div v-if="searchQuery" class="command-palette-clear" @click="clearSearch">
                <Close theme="outline" size="16" />
              </div>
            </div>
          </div>

          <!-- 内容区域 -->
          <div class="command-palette-content">
            <!-- 加载中状态 -->
            <div v-if="commandStore.isLoading" class="command-palette-loading">
              <Loading theme="outline" size="24" fill="var(--text-color-secondary)" />
              <span>搜索中...</span>
            </div>

            <!-- 无结果状态 -->
            <div v-else-if="!commandStore.hasResults" class="command-palette-no-results">
              <div class="command-palette-no-results-icon">
                <Inbox />
              </div>
              <div class="command-palette-no-results-text">
                <template v-if="searchQuery">没有找到匹配的命令</template>
                <template v-else>开始输入以搜索命令</template>
              </div>
            </div>

            <!-- 搜索结果列表 -->
            <div v-else class="command-palette-results">
              <div
                v-for="(command, index) in commandStore.searchResults"
                :key="command.id"
                class="command-palette-result-item"
                :class="{ selected: index === commandStore.selectedCommandIndex }"
                @click="executeCommand(command.id)"
                @mouseenter="commandStore.selectedCommandIndex = index"
              >
                <!-- 命令图标 -->
                <div class="command-palette-result-icon">
                  <component :is="getIconComponent(command.icon)" theme="outline" size="16" />
                </div>
                <!-- 命令内容 -->
                <div class="command-palette-result-content">
                  <div class="command-palette-result-title">{{ command.title }}</div>
                  <div class="command-palette-result-category">{{ command.category }}</div>
                </div>
                <!-- 命令快捷键 -->
                <div v-if="command.shortcut" class="command-palette-result-shortcut">
                  {{ command.shortcut }}
                </div>
              </div>
            </div>
          </div>

          <!-- 底部操作提示 -->
          <div class="command-palette-footer">
            <div class="command-palette-footer-item">
              <span class="command-palette-footer-key">↑↓</span>
              <span class="command-palette-footer-text">导航</span>
            </div>
            <div class="command-palette-footer-item">
              <span class="command-palette-footer-key">Enter</span>
              <span class="command-palette-footer-text">选择</span>
            </div>
            <div class="command-palette-footer-item">
              <span class="command-palette-footer-key">Esc</span>
              <span class="command-palette-footer-text">关闭</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
```

## 5. 集成到应用

### 5.1 注册 IPC 处理程序

在 `src/main/ipc/index.ts` 中注册命令 IPC 处理程序：

```typescript
import { registerCommandIpcHandlers } from './commandIpcHandlers'

export function setupIpcHandlers(): void {
  // 其他处理程序...
  registerCommandIpcHandlers()
}
```

### 5.2 注册预加载 API

在 `src/preload/index.ts` 中注册命令 API：

```typescript
import { commandApi } from './api/commandApi'

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 其他 API...
  command: {
    ...commandApi
  }
})
```

### 5.3 在主应用中引入命令面板组件

在 `src/renderer/src/App.vue` 中引入命令面板组件：

```vue
<template>
  <div class="app-container" :class="{ 'theme-dark': isDarkMode }">
    <!-- 其他组件... -->

    <!-- 添加命令面板 -->
    <CommandPalette />
  </div>
</template>

<script setup lang="ts">
import CommandPalette from '@renderer/components/common/CommandPalette.vue'
// 其他导入...
</script>
```

### 5.4 注册默认命令

在 `src/main/index.ts` 的应用启动流程中注册默认命令：

```typescript
// 启动 API 服务器
startApiServer()

// 注册默认命令
registerDefaultCommands()
```

## 6. 使用示例

1. 用户按下 `Command+K` 或 `Ctrl+K` 快捷键
2. 命令面板弹出，显示所有可用命令
3. 用户输入"主题"，面板实时过滤显示与"主题"相关的命令
4. 用户使用方向键选择"切换到暗色主题"命令
5. 用户按下 Enter 键执行命令，应用主题切换为暗色模式
6. 命令面板自动关闭

## 7. 未来扩展

- **自定义命令**：允许用户创建和注册自定义命令
- **命令历史记录**：记录最近使用的命令，优先显示
- **命令分组**：允许用户将常用命令分组
- **命令参数**：支持带参数的命令执行
- **命令提示**：根据上下文提供智能命令建议

## 8. 总结

命令面板功能为 Anteey 应用提供了一种高效的操作方式，使用户能够快速访问和执行各种功能，提高工作效率。通过合理的架构设计和模块化实现，命令面板功能易于维护和扩展，可以随着应用的发展不断增强功能。
