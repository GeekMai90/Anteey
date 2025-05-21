<template>
  <div
    class="floating-tabs-menu"
    :style="menuStyle"
    data-role="tabs-menu"
    @mouseleave="handleMouseLeave"
    @mouseenter="handleMouseEnter"
  >
    <div class="tabs-container">
      <!-- 固定标签组 -->
      <div v-if="pinnedTabs.length > 0" class="tabs-group">
        <div class="group-header">
          <div class="title">固定</div>
        </div>
        <draggable
          v-model="pinnedTabsModel"
          class="tabs-items"
          item-key="id"
          :animation="200"
          ghost-class="ghost-class"
          @end="handlePinnedDragEnd"
        >
          <template #item="{ element }">
            <div
              class="tab-item"
              :class="{ active: element.id === activeTabId }"
              @click="handleTabClick(element)"
              @contextmenu="showContextMenu($event, element)"
            >
              <div class="icon">
                <component
                  :is="getTabIcon(element.type)"
                  theme="outline"
                  size="16"
                  fill="var(--color-sidebar-text)"
                  :strokeWidth="2"
                />
              </div>
              <div class="content">
                <!-- 编码地址 -->
                <div v-if="element.address" class="address">{{ element.address }}</div>
                <!-- 标题 -->
                <div class="title">{{ element.title }}</div>
              </div>
              <div class="actions">
                <div
                  v-tooltip.right="{ content: '关闭', delay: { show: 1000 } }"
                  class="close-button"
                  @click.stop="closeTab(element.id)"
                >
                  <Close
                    theme="outline"
                    size="14"
                    fill="var(--color-sidebar-text)"
                    :strokeWidth="2"
                  />
                </div>
              </div>
            </div>
          </template>
        </draggable>
      </div>

      <!-- 常规标签组 -->
      <div class="tabs-group">
        <div v-if="pinnedTabs.length > 0" class="group-header">
          <div class="title">页签</div>
        </div>
        <draggable
          v-model="unpinnedTabsModel"
          class="tabs-items"
          item-key="id"
          :animation="200"
          ghost-class="ghost-class"
          @end="handleUnpinnedDragEnd"
        >
          <template #item="{ element }">
            <div
              class="tab-item"
              :class="{ active: element.id === activeTabId }"
              @click="handleTabClick(element)"
              @contextmenu="showContextMenu($event, element)"
            >
              <div class="icon">
                <component
                  :is="getTabIcon(element.type)"
                  theme="outline"
                  size="16"
                  fill="var(--color-sidebar-text)"
                  :strokeWidth="2"
                />
              </div>
              <div class="content">
                <!-- 编码地址 -->
                <div v-if="element.address" class="address">{{ element.address }}</div>
                <!-- 标题 -->
                <div class="title">{{ element.title }}</div>
              </div>
              <div class="actions">
                <div
                  v-tooltip.right="{ content: '关闭', delay: { show: 1000 } }"
                  class="close-button"
                  @click.stop="closeTab(element.id)"
                >
                  <Close
                    theme="outline"
                    size="14"
                    fill="var(--color-sidebar-text)"
                    :strokeWidth="2"
                  />
                </div>
              </div>
            </div>
          </template>
        </draggable>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, onUnmounted } from 'vue'
import { useTabsStore } from '@renderer/stores/tabsStore'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useContextMenuStore } from '@renderer/stores/contextMenuStore'
import { useRouter } from 'vue-router'
import { TabItem, TabItemType } from '@shared/types/tabs'
import { Close, CloseOne, Notes, Workbench, FileText, Pushpin, Other } from '@icon-park/vue-next'
import { markRaw } from 'vue'
import draggable from 'vuedraggable'

const tabsStore = useTabsStore()
const noteStore = useNoteStore()
const router = useRouter()
const contextMenuStore = useContextMenuStore()

// 添加计算属性来动态计算菜单位置
const props = defineProps<{
  visible: boolean
  buttonPosition?: { top: number; left: number }
}>()

// 优化菜单位置的计算属性
const menuStyle = computed(() => {
  if (!props.buttonPosition) {
    return {
      top: '120px',
      left: '38px'
    }
  }

  return {
    top: `${props.buttonPosition.top - 10}px`,
    left: `${props.buttonPosition.left - 6}px`,
    transform: 'translateY(0)' // 确保不会有额外的垂直偏移
  }
})

// 定义事件
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'mouseleave', event: MouseEvent): void
  (e: 'mouseenter'): void
}>()

// 从 store 获取数据
const allTabs = computed(() => tabsStore.allTabs)
const pinnedTabs = computed(() => tabsStore.pinnedTabs)
const unpinnedTabs = computed(() => tabsStore.unpinnedTabs)
const activeTabId = computed(() => tabsStore.activeTabId)

// 追踪上下文菜单是否打开
const isContextMenuOpen = ref(false)

// 创建可拖拽的标签模型 - 直接使用计算属性进行双向绑定
const pinnedTabsModel = ref<TabItem[]>([])
const unpinnedTabsModel = ref<TabItem[]>([])

// 当组件可见时加载标签数据
watch(
  () => props.visible,
  async (isVisible) => {
    if (isVisible) {
      // 菜单显示时强制刷新标签数据
      await tabsStore.initialize(true)
      pinnedTabsModel.value = [...pinnedTabs.value]
      unpinnedTabsModel.value = [...unpinnedTabs.value]
      console.log('FloatingTabsList 显示: 强制刷新标签数据')
    }
  },
  { immediate: true }
)

// 监听 store 中标签数据变化
watch(
  () => [pinnedTabs.value, unpinnedTabs.value],
  () => {
    // 只在组件可见时更新本地模型
    if (props.visible) {
      pinnedTabsModel.value = [...pinnedTabs.value]
      unpinnedTabsModel.value = [...unpinnedTabs.value]
    }
  },
  { deep: true }
)

// 监听ContextMenuStore的show状态
watch(
  () => contextMenuStore.show,
  (newValue) => {
    // 当上下文菜单关闭时，重置标志位
    if (!newValue && isContextMenuOpen.value) {
      isContextMenuOpen.value = false
    }
  }
)

// 处理固定标签拖拽结束 - 完全匹配TabsList实现
const handlePinnedDragEnd = async () => {
  if (pinnedTabsModel.value.length === 0) return

  // 生成新的顺序数据
  const reorderData = pinnedTabsModel.value.map((tab, index) => ({
    id: tab.id,
    order: index
  }))

  // 获取原始顺序用于比较
  const originalOrders = pinnedTabs.value.map((tab) => ({
    id: tab.id,
    order: tab.order
  }))

  // 检查顺序是否真的改变了
  const orderChanged = reorderData.some((newOrder) => {
    const originalOrder = originalOrders.find((o) => o.id === newOrder.id)
    return newOrder.order !== originalOrder?.order
  })

  // 如果顺序改变，更新到数据库
  if (orderChanged) {
    try {
      // 保存到数据库
      await tabsStore.reorderTabs({ tabs: reorderData })

      // 在使用标签数据前，强制从数据库重新加载所有标签
      await tabsStore.initialize(true)

      // 重新同步本地模型
      pinnedTabsModel.value = [...pinnedTabs.value]
      unpinnedTabsModel.value = [...unpinnedTabs.value]

      console.log('FloatingTabsList: 固定标签排序已保存并重新加载')
    } catch (error) {
      console.error('FloatingTabsList: 固定标签排序更新失败:', error)
    }
  }
}

// 处理普通标签拖拽结束 - 完全匹配TabsList实现
const handleUnpinnedDragEnd = async () => {
  if (unpinnedTabsModel.value.length === 0) return

  // 生成新的顺序数据
  const reorderData = unpinnedTabsModel.value.map((tab, index) => ({
    id: tab.id,
    order: pinnedTabsModel.value.length + index
  }))

  // 获取原始顺序用于比较
  const originalOrders = unpinnedTabs.value.map((tab) => ({
    id: tab.id,
    order: tab.order
  }))

  // 检查顺序是否真的改变了
  const orderChanged = reorderData.some((newOrder) => {
    const originalOrder = originalOrders.find((o) => o.id === newOrder.id)
    return newOrder.order !== originalOrder?.order
  })

  // 如果顺序改变，更新到数据库
  if (orderChanged) {
    try {
      // 保存到数据库
      await tabsStore.reorderTabs({ tabs: reorderData })

      // 在使用标签数据前，强制从数据库重新加载所有标签
      await tabsStore.initialize(true)

      // 重新同步本地模型
      pinnedTabsModel.value = [...pinnedTabs.value]
      unpinnedTabsModel.value = [...unpinnedTabs.value]

      console.log('FloatingTabsList: 普通标签排序已保存并重新加载')
    } catch (error) {
      console.error('FloatingTabsList: 普通标签排序更新失败:', error)
    }
  }
}

// 处理标签页点击
const handleTabClick = async (tab: TabItem) => {
  // 设置活动标签页
  tabsStore.setActiveTab(tab.id)

  // 根据标签页类型执行不同操作
  if (tab.type === 'Note') {
    // 如果是笔记类型，使用路由导航到笔记编辑器
    router.push({ name: 'NoteExpandEditor', params: { id: tab.contentId } })

    // 如果有小窗编辑器打开，关闭它
    if (noteStore.isEditorOpen) {
      noteStore.closeNoteEditor()
    }
  } else if (tab.type === 'MindBoard') {
    // 如果是思维导图类型，导航到思维导图详情页
    router.push({ name: 'MindboardDetail', params: { id: tab.contentId } })
  } else if (tab.type === 'Article') {
    // 如果是文章类型，导航到文稿详情页
    router.push({ name: 'ManuscriptDetail', params: { id: tab.contentId } })
  }

  // 点击后关闭菜单
  emit('update:visible', false)
}

// 关闭标签页
const closeTab = (id: string) => {
  tabsStore.closeTab(id)
}

// 根据标签页类型返回对应图标
const getTabIcon = (type: TabItemType) => {
  switch (type) {
    case 'Note':
      return Notes
    case 'MindBoard':
      return Workbench
    case 'Article':
      return FileText
    default:
      return Other
  }
}

// 右键菜单相关 - 使用全局上下文菜单
// 显示右键菜单
const showContextMenu = (event: MouseEvent, tab: TabItem) => {
  event.preventDefault()

  // 标记右键菜单已打开
  isContextMenuOpen.value = true

  // 基础菜单项 - 对所有标签都显示
  const menuItems = [
    {
      label: tab.isPinned ? '取消固定' : '固定标签页',
      icon: markRaw(Pushpin),
      action: () => {
        tabsStore.pinTab(tab.id, !tab.isPinned)
        // action调用后contextMenuStore会自动关闭菜单，我们的watch会处理标志位
      }
    },
    {
      label: '关闭标签页',
      icon: markRaw(CloseOne),
      action: () => {
        tabsStore.closeTab(tab.id)
      }
    }
  ]

  // 只有非固定标签才显示"关闭下方标签页"、"关闭其他标签页"和"关闭所有标签页"
  if (!tab.isPinned) {
    // 添加关闭下方标签页选项
    menuItems.push({
      label: '关闭下方标签页',
      icon: markRaw(CloseOne),
      action: async () => {
        // 获取当前所有展示标签的顺序
        const allTabsOrdered = [...pinnedTabs.value, ...unpinnedTabs.value]

        // 找到当前标签在整体顺序中的位置
        const currentTabIndex = allTabsOrdered.findIndex((t) => t.id === tab.id)

        // 如果找到了当前标签，且不是最后一个
        if (currentTabIndex !== -1 && currentTabIndex < allTabsOrdered.length - 1) {
          // 获取下方的所有非固定标签
          const belowTabs = allTabsOrdered.slice(currentTabIndex + 1).filter((t) => !t.isPinned)

          // 关闭所有下方非固定标签
          for (const t of belowTabs) {
            await tabsStore.closeTab(t.id)
          }
        }
      }
    })

    // 其他菜单项类似，移除重复的标志位设置
    menuItems.push({
      label: '关闭其他标签页',
      icon: markRaw(CloseOne),
      action: async () => {
        const tabsToClose = allTabs.value.filter((t) => t.id !== tab.id && !t.isPinned)
        for (const t of tabsToClose) {
          await tabsStore.closeTab(t.id)
        }
      }
    })

    menuItems.push({
      label: '关闭所有标签页',
      icon: markRaw(CloseOne),
      action: async () => {
        const tabsToClose = allTabs.value.filter((t) => !t.isPinned)
        for (const t of tabsToClose) {
          await tabsStore.closeTab(t.id)
        }
      }
    })
  }

  // 显示上下文菜单
  contextMenuStore.showMenuAtPosition(event.clientX, event.clientY, menuItems)
}

// 处理鼠标离开事件
const handleMouseLeave = (event: MouseEvent) => {
  // 如果上下文菜单打开，不关闭悬浮菜单
  if (isContextMenuOpen.value) {
    return
  }

  // 检查是否移动到了上下文菜单上
  const relatedTarget = event.relatedTarget as HTMLElement

  if (relatedTarget?.closest('.global-context-menu')) {
    return
  }

  // 检查是否移回到了按钮上
  if (relatedTarget?.closest('.action-btn[data-menu="tabs"]')) {
    return
  }

  emit('mouseleave', event)
}

// 处理鼠标进入事件
const handleMouseEnter = () => {
  // 发出mouseenter事件，让父组件知道用户鼠标进入了菜单
  emit('mouseenter')
}

// 页面加载时初始化
onMounted(async () => {
  // 确保标签数据已初始化
  await tabsStore.initialize()

  // 初始化本地模型数据
  pinnedTabsModel.value = [...pinnedTabs.value]
  unpinnedTabsModel.value = [...unpinnedTabs.value]

  // 添加ESC键监听，当按下ESC键时关闭上下文菜单标志
  document.addEventListener('keydown', handleKeyDown)

  // 添加全局点击监听，辅助处理上下文菜单关闭
  document.addEventListener('click', handleGlobalClick)
})

// 组件卸载时清理
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('click', handleGlobalClick)
})

// 处理键盘事件
const handleKeyDown = (e: KeyboardEvent) => {
  // 当按下ESC键时，重置上下文菜单标志
  if (e.key === 'Escape') {
    isContextMenuOpen.value = false
  }
}

// 处理全局点击，帮助检测上下文菜单关闭
const handleGlobalClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement

  // 如果点击位置不在上下文菜单内，且上下文菜单标志为打开状态，则重置标志
  if (
    isContextMenuOpen.value &&
    !target.closest('.global-context-menu') &&
    !target.closest('.tab-item')
  ) {
    isContextMenuOpen.value = false
  }
}
</script>

<style lang="scss" scoped>
.floating-tabs-menu {
  position: absolute;
  /* 完全依靠计算属性控制位置 */
  background-color: var(--color-bg-primary);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(var(--color-sidebar-icon-bg), 0.1);
  z-index: 1000;
  width: 260px;
  max-height: 50vh;
  overflow-y: auto;
  padding: 12px;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-10px) translateY(0);
  }
  to {
    opacity: 1;
    transform: translateX(0) translateY(0);
  }
}

.tabs-container {
  width: 100%;
  height: 100%;
  max-height: calc(80vh - 24px); /* 减去padding */
  overflow-y: auto;
  position: relative;
}

.tabs-group {
  margin-bottom: 12px;

  .group-header {
    padding: 0 2px 4px 2px;

    .title {
      font-size: 12px;
      color: var(--color-text-secondary);
      opacity: 0.7;
    }
  }
}

.tabs-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: grab; /* 改为grab光标，表示可拖拽 */
  transition: all 0.2s ease;
  user-select: none;
  position: relative;
  border: 2px solid transparent;

  &:hover {
    background: rgba(var(--color-sidebar-icon-bg), 0.04);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);

    .actions {
      opacity: 1;
    }
  }

  &.active {
    background: rgba(var(--color-sidebar-icon-bg), 0.04);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);

    .title {
      font-weight: 500;
    }
  }

  &:active {
    cursor: grabbing; /* 抓取中的光标 */
    transform: scale(1.02);
    transition: transform 0.2s ease;
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 8px;
    width: 16px;
    height: 16px;
    flex-shrink: 0;

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 16px;
      height: 16px;
    }
  }

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;

    .address {
      font-size: 10px;
      color: var(--color-text-secondary);
      opacity: 0.7;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }

    .title {
      font-size: 13px;
      color: var(--color-sidebar-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .actions {
    display: flex;
    opacity: 0;
    transition: opacity 0.2s;
    flex-shrink: 0;
  }

  .close-button {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    cursor: pointer;

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

    &:hover {
      background-color: rgba(var(--color-sidebar-icon-bg), 0.1);
    }
  }
}

.active .actions {
  opacity: 1;
}

/* 拖拽时的占位样式 */
.ghost-class {
  opacity: 0.6;
  background: rgba(var(--color-primary-rgb), 0.08);
  border: 2px dashed var(--color-primary);
  box-shadow: 0 0 8px rgba(var(--color-primary-rgb), 0.2);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 6px;
    background: rgba(var(--color-primary-rgb), 0.05);
    pointer-events: none;
  }
}

/* 正在拖拽的元素样式 */
.sortable-drag {
  opacity: 0.8;
  background: rgba(var(--color-sidebar-icon-bg), 0.12);
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 拖拽选择样式 */
.sortable-chosen {
  background: rgba(var(--color-sidebar-icon-bg), 0.08);
}
</style>
