<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="commandStore.isCommandPaletteOpen"
        class="command-palette-overlay"
        @click="commandStore.closeCommandPalette"
      >
        <div class="command-palette-container" @click.stop>
          <div class="command-palette-header">
            <div class="command-palette-search">
              <SearchInput
                ref="searchInput"
                v-model="searchQuery"
                placeholder="搜索命令..."
                :width="9999"
                :height="40"
                class="command-palette-search-input"
                @input="onSearchInput"
                @keydown.down.prevent="commandStore.selectNextCommand"
                @keydown.up.prevent="commandStore.selectPreviousCommand"
                @keydown.enter="commandStore.executeSelectedCommand"
                @keydown.esc="commandStore.closeCommandPalette"
              />
            </div>
          </div>

          <div ref="contentRef" class="command-palette-content">
            <div v-if="commandStore.isLoading" class="command-palette-loading">
              <Loading theme="outline" size="24" fill="var(--color-text-secondary)" />
              <span>搜索中...</span>
            </div>

            <EmptyState
              v-else-if="!commandStore.hasResults"
              :text="searchQuery ? '没有找到匹配的命令' : '开始输入以搜索命令'"
              alt="无搜索结果"
              class="command-palette-empty"
            />

            <div v-else class="command-palette-results">
              <div
                v-for="(command, index) in commandStore.searchResults"
                :ref="
                  (el) => {
                    if (index === commandStore.selectedCommandIndex)
                      selectedItemRef = el as HTMLElement
                  }
                "
                :key="command.id"
                class="command-palette-result-item"
                :class="{ selected: index === commandStore.selectedCommandIndex }"
                @click="executeCommand(command.id)"
                @mouseenter="commandStore.selectedCommandIndex = index"
              >
                <div class="command-palette-result-icon">
                  <component :is="getIconComponent(command.icon)" theme="outline" size="16" />
                </div>
                <div class="command-palette-result-content">
                  <div class="command-palette-result-title">{{ command.title }}</div>
                  <div class="command-palette-result-category">{{ command.category }}</div>
                </div>
                <div v-if="command.shortcut" class="command-palette-result-shortcut">
                  <template
                    v-for="(key, keyIndex) in formatShortcut(command.shortcut)"
                    :key="keyIndex"
                  >
                    <kbd>{{ key }}</kbd>
                    <span
                      v-if="keyIndex < formatShortcut(command.shortcut).length - 1"
                      class="key-separator"
                      >+</span
                    >
                  </template>
                </div>
              </div>
            </div>
          </div>

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

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Search, Loading } from '@icon-park/vue-next'
import { useCommandStore } from '@renderer/stores/commandStore'
// 导入项目中已有的组件
import SearchInput from '@renderer/components/ui/SearchInput.vue'
import EmptyState from '@renderer/components/ui/EmptyState.vue'

// 引入图标组件
import * as IconPark from '@icon-park/vue-next'

// 初始化命令存储
const commandStore = useCommandStore()

// 搜索输入框引用
const searchInput = ref<{ focus: () => void } | null>(null)

// 内容区域引用
const contentRef = ref<HTMLElement | null>(null)

// 当前选中项引用
const selectedItemRef = ref<HTMLElement | null>(null)

// 本地搜索查询
const searchQuery = ref('')

// 判断是否为 macOS
const isMacOS = navigator.platform.toUpperCase().indexOf('MAC') >= 0

// 格式化快捷键显示
const formatShortcut = (shortcut: string): string[] => {
  if (!shortcut) return []

  return shortcut.split('+').map((key) => {
    switch (key.trim()) {
      case 'Ctrl':
        return isMacOS ? '⌘' : 'Ctrl'
      case 'Alt':
        return isMacOS ? '⌥' : 'Alt'
      case 'Shift':
        return isMacOS ? '⇧' : 'Shift'
      case ',':
        return ','
      default:
        return key.trim()
    }
  })
}

// 监听搜索查询变化
watch(searchQuery, (newQuery) => {
  commandStore.searchCommands(newQuery)
})

// 监听命令面板打开状态
watch(
  () => commandStore.isCommandPaletteOpen,
  (isOpen) => {
    if (isOpen) {
      // 打开时清空搜索框并聚焦
      searchQuery.value = ''
      // 在下一个 tick 聚焦搜索输入框
      nextTick(() => {
        searchInput.value?.focus()
      })
    }
  }
)

// 监听选中项索引变化
watch(
  () => commandStore.selectedCommandIndex,
  () => {
    // 在下一个 tick 滚动到选中项
    nextTick(() => {
      if (selectedItemRef.value && contentRef.value) {
        scrollItemIntoView(selectedItemRef.value, contentRef.value)
      }
    })
  }
)

// 滚动项目到视图中
const scrollItemIntoView = (item: HTMLElement, container: HTMLElement) => {
  const itemRect = item.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  // 计算项目顶部和底部相对于容器的位置
  const itemTop = itemRect.top - containerRect.top
  const itemBottom = itemRect.bottom - containerRect.top

  // 如果项目在可视区域外，滚动容器
  if (itemTop < 0) {
    // 项目在可视区域上方
    container.scrollTop += itemTop
  } else if (itemBottom > containerRect.height) {
    // 项目在可视区域下方
    container.scrollTop += itemBottom - containerRect.height
  }
}

// 搜索输入处理
const onSearchInput = () => {
  // 搜索逻辑已经在 watch 中处理
}

// 执行命令
const executeCommand = async (commandId: string) => {
  await commandStore.executeCommand(commandId)
  // 执行命令后清空搜索框
  searchQuery.value = ''
}

// 获取图标组件
const getIconComponent = (iconName: string | undefined) => {
  if (!iconName) return Search

  // 尝试从 IconPark 中获取图标
  const icon = (IconPark as any)[iconName]
  return icon || Search
}

// 注册全局快捷键
const handleKeyDown = (event: KeyboardEvent) => {
  // Command+K 或 Ctrl+K 打开命令面板
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault()
    commandStore.openCommandPalette()
  }
}

// 挂载和卸载事件监听器
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.command-palette-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-bg-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-index-hightest);
  backdrop-filter: blur(4px);
}

.command-palette-container {
  width: 600px;
  max-width: 90vw;
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 500px;
}

.command-palette-header {
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.command-palette-search {
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
}

.command-palette-search-input {
  width: 100%;
}

.command-palette-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  height: 350px;
  min-height: 350px;
}

.command-palette-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
  gap: 12px;
}

.command-palette-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0;
}

.command-palette-results {
  padding: 0 8px;
  min-height: 100%;
}

.command-palette-result-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.command-palette-result-item:hover,
.command-palette-result-item.selected {
  background-color: var(--color-hover-bg);
}

.command-palette-result-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background-color: transparent;
  border: 1px solid var(--color-border);
  margin-right: 12px;
  color: var(--color-primary);
}

/* 添加图标垂直居中样式 */
.command-palette-result-icon :deep(.i-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.command-palette-result-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.command-palette-result-content {
  flex: 1;
  overflow: hidden;
}

.command-palette-result-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.command-palette-result-category {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.command-palette-result-shortcut {
  display: flex;
  align-items: center;
  margin-left: 8px;
  gap: 4px;

  kbd {
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: transparent;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 2px 4px;
    font-size: 12px;
    font-family: 'SF Mono', SFMono-Regular, ui-monospace, Monaco, Menlo, Consolas, monospace;
    color: var(--color-text-secondary);
  }

  .key-separator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    margin: 0 2px;
    color: var(--color-text-secondary);
  }

  &::after {
    content: none;
  }
}

.command-palette-footer {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
  gap: 16px;
}

.command-palette-footer-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.command-palette-footer-key {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-primary);
  background-color: var(--color-bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
}

.command-palette-footer-text {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
