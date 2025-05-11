<template>
  <div class="tabs-list">
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
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useTabsStore } from '@renderer/stores/tabsStore'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useContextMenuStore } from '@renderer/stores/contextMenuStore'
import { useRouter } from 'vue-router'
import { TabItem, TabItemType } from '@shared/types/tabs'
import { Close, CloseOne, Notes, Workbench, FileText, Pushpin, Other } from '@icon-park/vue-next'
import draggable from 'vuedraggable'
import { markRaw } from 'vue'

const tabsStore = useTabsStore()
const noteStore = useNoteStore()
const router = useRouter()
const contextMenuStore = useContextMenuStore()

// 接收active属性
const props = defineProps<{
  active?: boolean
}>()

// 从 store 获取数据
const allTabs = computed(() => tabsStore.allTabs)
const pinnedTabs = computed(() => tabsStore.pinnedTabs)
const unpinnedTabs = computed(() => tabsStore.unpinnedTabs)
const activeTabId = computed(() => tabsStore.activeTabId)

// 创建可拖拽的标签模型
const pinnedTabsModel = ref<TabItem[]>([...pinnedTabs.value])
const unpinnedTabsModel = ref<TabItem[]>([...unpinnedTabs.value])
// 添加一个标记，表示拖拽后的顺序是否已被保存
const sortModified = ref(false)

// 监听原始标签变化，更新拖拽模型，但只在没有进行过拖拽排序或有新标签时更新
watch(
  pinnedTabs,
  (newTabs, oldTabs) => {
    // 如果标签数量变化，说明有新增或删除，这时需要更新模型
    if (!sortModified.value || newTabs.length !== oldTabs.length) {
      pinnedTabsModel.value = [...newTabs]
    }
  },
  { deep: true }
)

watch(
  unpinnedTabs,
  (newTabs, oldTabs) => {
    // 如果标签数量变化，说明有新增或删除，这时需要更新模型
    if (!sortModified.value || newTabs.length !== oldTabs.length) {
      unpinnedTabsModel.value = [...newTabs]
    }
  },
  { deep: true }
)

// 处理固定标签拖拽结束
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
      await tabsStore.reorderTabs({ tabs: reorderData })
      console.log('固定标签排序已更新')
      sortModified.value = true
    } catch (error) {
      console.error('固定标签排序更新失败:', error)
    }
  }
}

// 处理普通标签拖拽结束
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
      await tabsStore.reorderTabs({ tabs: reorderData })
      console.log('普通标签排序已更新')
      sortModified.value = true
    } catch (error) {
      console.error('普通标签排序更新失败:', error)
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
  // 未来可以添加其他类型的处理逻辑
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

  // 基础菜单项 - 对所有标签都显示
  const menuItems = [
    {
      label: tab.isPinned ? '取消固定' : '固定标签页',
      icon: markRaw(Pushpin),
      action: () => {
        tabsStore.pinTab(tab.id, !tab.isPinned)
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
        const allTabsOrdered = [...pinnedTabsModel.value, ...unpinnedTabsModel.value]

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

    // 添加关闭所有标签页选项 - 只在非固定标签页菜单中显示
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

  contextMenuStore.showMenuAtPosition(event.clientX, event.clientY, menuItems)
}

// 监听active属性变化，当组件激活时加载数据
watch(
  () => props.active,
  async (newActive) => {
    if (newActive) {
      // 当组件变为激活状态时加载标签页数据，但保持当前顺序
      await tabsStore.initialize()
    }
  }
)

// 页面加载时初始化
onMounted(async () => {
  if (allTabs.value.length === 0) {
    await tabsStore.initialize()
  }

  // 调试输出标签页信息
  console.log('TabsList mounted, tabs:', allTabs.value)
  console.log('Pinned tabs:', pinnedTabs.value)
  console.log('Unpinned tabs:', unpinnedTabs.value)

  // 检查标签页是否有地址信息
  allTabs.value.forEach((tab) => {
    console.log(`Tab ${tab.id} (${tab.title}) address:`, tab.address)
  })
})
</script>

<style lang="scss" scoped>
.tabs-list {
  width: 100%;
  height: 100%;
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
  padding: 6px 8px;
  border-radius: 6px;
  cursor: grab;
  transition: all 0.2s ease;
  user-select: none;
  position: relative;

  &:hover {
    background: rgba(var(--color-sidebar-icon-bg), 0.04);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);

    .actions {
      opacity: 1;
    }
  }

  &.active {
    background: rgba(var(--color-sidebar-icon-bg), 0.08);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);

    .title {
      font-weight: 500;
    }
  }

  &:active {
    cursor: grabbing;
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

// .active .actions {
//   opacity: 1;
// }

/* 拖拽时的占位样式 */
.ghost-class {
  opacity: 0.5;
  background: rgba(var(--color-primary-rgb), 0.1);
}
</style>
