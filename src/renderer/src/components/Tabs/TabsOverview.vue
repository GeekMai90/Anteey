<template>
  <Modal v-model="isVisible" @outside-click="handleOutsideClick">
    <div class="tabs-overview-container">
      <!-- 固定标签页区域 -->
      <div v-if="pinnedTabs.length > 0" class="pinned-tabs-section">
        <draggable
          v-model="pinnedTabsModel"
          class="tabs-row pinned"
          item-key="id"
          :animation="200"
          ghost-class="ghost-class"
          @end="handlePinnedDragEnd"
        >
          <template #item="{ element }">
            <div
              class="tab-card pinned-tab"
              :class="{ active: element.id === activeTabId }"
              @click="switchToTab(element)"
              @contextmenu="showContextMenu($event, element)"
            >
              <div class="tab-icon">
                <component
                  :is="getTabIcon(element.type)"
                  theme="outline"
                  size="16"
                  fill="var(--color-text-primary)"
                  :strokeWidth="2"
                />
              </div>
              <div class="tab-info">
                <div class="tab-title">{{ element.title }}</div>
              </div>
              <div class="tab-actions">
                <button
                  class="action-btn pin-btn"
                  :title="'取消固定'"
                  @click.stop="togglePin(element)"
                >
                  <Pushpin theme="outline" size="14" fill="var(--color-primary)" :strokeWidth="2" />
                </button>
                <button
                  class="action-btn close-btn"
                  title="关闭标签页"
                  @click.stop="closeTab(element.id)"
                >
                  <CloseOne
                    theme="outline"
                    size="14"
                    fill="var(--color-text-secondary)"
                    :strokeWidth="2"
                  />
                </button>
              </div>
            </div>
          </template>
        </draggable>
      </div>

      <!-- 普通标签页区域 - 水平滚动 -->
      <div class="regular-tabs-section">
        <draggable
          v-model="regularTabsModel"
          class="tabs-row"
          item-key="id"
          :animation="200"
          ghost-class="ghost-class"
          @end="handleRegularDragEnd"
        >
          <template #item="{ element }">
            <div
              class="tab-card"
              :class="{ active: element.id === activeTabId }"
              @click="switchToTab(element)"
              @contextmenu="showContextMenu($event, element)"
            >
              <div class="tab-card-content">
                <div class="tab-header">
                  <div class="tab-icon">
                    <component
                      :is="getTabIcon(element.type)"
                      theme="outline"
                      size="18"
                      fill="var(--color-text-primary)"
                      :strokeWidth="2"
                    />
                  </div>
                  <div class="tab-meta">
                    <span v-if="element.type === 'Note' && element.address" class="tab-address">{{
                      element.address
                    }}</span>
                    <span v-else class="tab-update-time">{{
                      formatUpdateTime(element.lastAccessTime)
                    }}</span>
                  </div>
                </div>
                <div class="tab-info">
                  <div class="tab-title">{{ element.title }}</div>
                </div>
              </div>

              <!-- 底部操作栏 -->
              <div class="tab-actions">
                <button
                  class="action-btn pin-btn"
                  :title="'固定标签页'"
                  @click.stop="togglePin(element)"
                >
                  <Pushpin
                    theme="outline"
                    size="14"
                    fill="var(--color-text-secondary)"
                    :strokeWidth="2"
                  />
                </button>
                <button
                  class="action-btn close-btn"
                  title="关闭标签页"
                  @click.stop="closeTab(element.id)"
                >
                  <CloseOne
                    theme="outline"
                    size="14"
                    fill="var(--color-text-secondary)"
                    :strokeWidth="2"
                  />
                </button>
              </div>
            </div>
          </template>
        </draggable>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useTabsStore } from '@renderer/stores/tabsStore'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useContextMenuStore } from '@renderer/stores/contextMenuStore'
import { TabItem, TabItemType } from '@shared/types/tabs'
import Modal from '@renderer/components/common/Modal.vue'
import { Notes, Workbench, FileText, Pushpin, CloseOne, Other } from '@icon-park/vue-next'
import draggable from 'vuedraggable'
import { markRaw } from 'vue'

const tabsStore = useTabsStore()
const noteStore = useNoteStore()
const router = useRouter()
const contextMenuStore = useContextMenuStore()
const isVisible = ref(false)

// 从 store 获取数据
const allTabs = computed(() => tabsStore.allTabs)
const activeTabId = computed(() => tabsStore.activeTabId)

// 分离固定标签页和普通标签页
const pinnedTabs = computed(() => {
  return allTabs.value.filter((tab) => tab.isPinned)
})

const regularTabs = computed(() => {
  return allTabs.value.filter((tab) => !tab.isPinned)
})

// 创建可拖拽的标签模型
const pinnedTabsModel = ref<TabItem[]>([...pinnedTabs.value])
const regularTabsModel = ref<TabItem[]>([...regularTabs.value])
// 添加一个标记，表示拖拽后的顺序是否已被保存
const sortModified = ref(false)

// 监听原始标签变化，更新拖拽模型，但只在没有进行过拖拽排序或有新标签时更新
watch(
  pinnedTabs,
  (newTabs, oldTabs) => {
    // 只在标签数量变化时更新模型
    if (newTabs.length !== oldTabs.length) {
      pinnedTabsModel.value = [...newTabs]
      // 重置排序状态
      sortModified.value = false
    }
  },
  { deep: true }
)

watch(
  regularTabs,
  (newTabs, oldTabs) => {
    // 只在标签数量变化时更新模型
    if (newTabs.length !== oldTabs.length) {
      regularTabsModel.value = [...newTabs]
      // 重置排序状态
      sortModified.value = false
    }
  },
  { deep: true }
)

// 处理固定标签拖拽结束
const handlePinnedDragEnd = async () => {
  if (pinnedTabsModel.value.length === 0) return

  // 设置为已修改状态
  sortModified.value = true

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
      await tabsStore.reorderTabs({ tabs: reorderData })
      console.log('TabsOverview: 固定标签排序已保存')

      // 通知其他组件标签顺序已更新
      setTimeout(() => {
        tabsStore.initialize(true)
      }, 100)
    } catch (error) {
      console.error('固定标签排序更新失败:', error)
    }
  }
}

// 处理普通标签拖拽结束
const handleRegularDragEnd = async () => {
  if (regularTabsModel.value.length === 0) return

  // 生成新的顺序数据
  const reorderData = regularTabsModel.value.map((tab, index) => ({
    id: tab.id,
    order: pinnedTabsModel.value.length + index
  }))

  // 获取原始顺序用于比较
  const originalOrders = regularTabs.value.map((tab) => ({
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
      await tabsStore.reorderTabs({ tabs: reorderData })
      console.log('TabsOverview: 普通标签排序已保存')

      // 通知其他组件标签顺序已更新
      setTimeout(() => {
        tabsStore.initialize(true)
      }, 100)
    } catch (error) {
      console.error('普通标签排序更新失败:', error)
    }
  }
}

// 处理点击外部关闭
const handleOutsideClick = () => {
  isVisible.value = false
}

// 滚动到当前激活的标签
const scrollToActiveTab = async () => {
  // 等待DOM更新
  await nextTick()

  // 尝试查找当前激活的标签元素
  const activeTabElement = document.querySelector('.tab-card.active')

  if (activeTabElement) {
    // 设置滚动选项，使滚动更平滑，并且将标签定位到中间位置
    activeTabElement.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    })
  }
}

// 监听可见性变化，当打开概览时滚动到激活标签
watch(isVisible, (newValue) => {
  if (newValue) {
    // 组件变为可见时，滚动到激活标签
    scrollToActiveTab()
  }
})

// 切换到指定标签页
const switchToTab = async (tab: TabItem) => {
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

  // 选择后关闭概览窗口
  isVisible.value = false
}

// 固定/取消固定标签页
const togglePin = (tab: TabItem) => {
  tabsStore.pinTab(tab.id, !tab.isPinned)
}

// 关闭标签页
const closeTab = (id: string) => {
  tabsStore.closeTab(id)
}

// 上下文菜单相关 - 显示右键菜单
const showContextMenu = (event: MouseEvent, tab: TabItem) => {
  event.preventDefault()

  // 初始化菜单项数组
  interface MenuItem {
    label: string
    icon: ReturnType<typeof markRaw>
    action: () => Promise<void>
  }
  const menuItems: MenuItem[] = []

  // 只为非固定标签显示高级操作菜单项
  if (!tab.isPinned) {
    // 添加关闭下方标签页选项
    menuItems.push({
      label: '关闭下方标签页',
      icon: markRaw(CloseOne),
      action: async () => {
        // 获取当前所有展示标签的顺序
        const allTabsOrdered = [...pinnedTabsModel.value, ...regularTabsModel.value]

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

    // 添加关闭其他标签页选项
    menuItems.push({
      label: '关闭其他标签页',
      icon: markRaw(CloseOne),
      action: async () => {
        // 过滤出需要关闭的标签页：非当前标签且未被固定的标签
        const tabsToClose = allTabs.value.filter((t) => t.id !== tab.id && !t.isPinned)

        for (const t of tabsToClose) {
          await tabsStore.closeTab(t.id)
        }
      }
    })

    // 添加关闭所有标签页选项
    menuItems.push({
      label: '关闭所有标签页',
      icon: markRaw(CloseOne),
      action: async () => {
        // 获取所有非固定标签
        const tabsToClose = allTabs.value.filter((t) => !t.isPinned)

        // 关闭所有非固定标签
        for (const t of tabsToClose) {
          await tabsStore.closeTab(t.id)
        }
      }
    })
  }

  // 只有当有菜单项时才显示菜单
  if (menuItems.length > 0) {
    contextMenuStore.showMenuAtPosition(event.clientX, event.clientY, menuItems)
  }
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

// 打开标签页概览
const openTabsOverview = () => {
  // 确保有最新数据
  tabsStore.initialize(true).then(() => {
    // 初始化拖拽模型
    pinnedTabsModel.value = [...pinnedTabs.value]
    regularTabsModel.value = [...regularTabs.value]
    // 显示概览
    isVisible.value = true
    // 数据加载完成后滚动到激活标签
    scrollToActiveTab()
  })
}

// 页面加载时添加快捷键监听
onMounted(() => {
  // 添加静态方法到window对象，方便外部调用
  ;(window as any).openTabsOverviewGlobal = () => {
    isVisible.value = true
    scrollToActiveTab()
  }
})

// 组件卸载时清理快捷键监听
onUnmounted(() => {
  // 移除全局函数
  if ((window as any).openTabsOverviewGlobal) {
    delete (window as any).openTabsOverviewGlobal
  }
})

// 关闭标签页概览
const closeTabsOverview = () => {
  isVisible.value = false
}

// 获取isVisible的当前状态 - 为了解决响应式引用问题
const getIsVisible = () => isVisible.value

// 暴露方法供外部调用
defineExpose({
  openTabsOverview,
  closeTabsOverview,
  isVisible,
  getIsVisible
})

// 在script部分添加时间格式化函数
const formatUpdateTime = (timestamp: number | string) => {
  if (!timestamp) return ''

  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    // 今天，显示时:分
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`
  } else if (diffDays === 1) {
    // 昨天
    return '昨天'
  } else if (diffDays < 7) {
    // 一周内，显示天数
    return `${diffDays}天前`
  } else {
    // 超过一周，显示年-月-日
    return `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
  }
}
</script>

<style lang="scss" scoped>
.tabs-overview-container {
  width: 80vw;
  max-width: 960px;
  background-color: transparent;
  border-radius: 16px;
  overflow: hidden;
  padding: 10px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

// 固定标签页区域
.pinned-tabs-section {
  width: 100%;
  background-color: var(--color-bg-primary);
  border-radius: 12px;
  padding: 8px 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);

  .tabs-row {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 4px 0;
    height: 36px;
    margin-right: 4px;

    &::-webkit-scrollbar {
      height: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background-color: var(--color-scrollbar);
      border-radius: 2px;
    }
    // 新增：第一个固定标签左侧加间距
    .pinned-tab:first-child {
      margin-left: 4px; // 你可以根据实际视觉调整，比如 8px
    }
  }
}

// 普通标签页区域
.regular-tabs-section {
  width: 100%;
  background-color: var(--color-bg-primary);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);

  .tabs-row {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 8px 4px 12px 4px;
    margin-right: 6px;
    scroll-behavior: smooth;

    &::-webkit-scrollbar {
      height: 6px;
    }

    &::-webkit-scrollbar-thumb {
      background-color: var(--color-scrollbar);
      border-radius: 3px;
    }
  }
}

.tab-card {
  background-color: var(--color-bg-secondary);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  min-height: 100px;
  min-width: 170px;
  max-width: 210px;
  flex: 0 0 auto;
  position: relative;
  border: 1px solid transparent;

  &.pinned-tab {
    min-height: auto;
    height: 28px;
    min-width: 150px;
    max-width: 180px;
    flex-direction: row;
    align-items: center;
    padding: 0 10px;
    background-color: var(--color-bg-secondary);
    border-radius: 8px;
    border: 1px solid transparent;

    .tab-icon {
      margin-bottom: 0;
      margin-right: 8px;
      display: flex;
      align-items: center;
      justify-content: center;

      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      :deep(svg) {
        width: 16px;
        height: 16px;
      }
    }

    .tab-info {
      flex: 1;
      overflow: hidden;
    }

    .tab-actions {
      margin-left: auto;
      padding: 0;
      opacity: 0.4;
      background-color: transparent;
      gap: 4px;
      display: flex;
      align-items: center;
      height: 100%;
    }

    &:hover {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      background: rgba(var(--color-sidebar-icon-bg), 0.04);

      .tab-actions {
        opacity: 1;
      }
    }

    &.active {
      border: 1px solid var(--color-primary);
      background-color: rgba(var(--color-primary-rgb), 0.05);
    }
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    background: rgba(var(--color-sidebar-icon-bg), 0.02);

    .tab-actions {
      opacity: 1;
    }
  }

  &.active {
    border-color: var(--color-primary);
    border-width: 1px;
    background-color: rgba(var(--color-primary-rgb), 0.05);
    box-shadow: 0 0 0 1px var(--color-primary);
  }
}

.tab-card-content {
  padding: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tab-icon {
  margin-bottom: 0;
  display: flex;
  align-items: center;

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

.tab-meta {
  font-size: 11px;
  color: var(--color-text-secondary);
  opacity: 0.7;
}

.tab-address,
.tab-update-time {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  display: inline-block;
}

.tab-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-top: 4px;
}

.tab-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-actions {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  background-color: rgba(var(--color-sidebar-icon-bg), 0.05);
  opacity: 0.3;
  transition: opacity 0.2s ease;
}

.action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  :deep(.i-icon) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  &:hover {
    background-color: rgba(var(--color-sidebar-icon-bg), 0.1);
  }

  &.pin-btn:hover {
    color: var(--color-primary);
  }
}

/* 拖拽相关样式 */
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
  cursor: grabbing;
}

/* 拖拽选择样式 */
.sortable-chosen {
  background: rgba(var(--color-sidebar-icon-bg), 0.08);
  cursor: grabbing;
}
</style>
