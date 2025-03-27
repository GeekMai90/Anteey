<template>
  <div class="table-of-contents">
    <div class="toc-header">
      <h3 class="toc-title">标题目录</h3>
      <Dropdown
        type="text"
        icon-only
        :icon="More"
        :items="menuItems"
        align="end"
        :tooltip="{
          content: '目录操作',
          delay: { show: 500 },
          placement: 'top'
        }"
        @select="handleMenuSelect"
        @switch-change="handleSwitchChange"
      />
    </div>

    <div class="toc-content">
      <div v-if="items.length === 0" class="toc-empty-state">
        <div class="empty-text">暂无目录</div>
      </div>
      <div v-else>
        <div
          v-for="item in flatItems"
          :key="item.id"
          class="toc-item"
          :class="{
            'is-active': isItemActive(item),
            'is-scrolled-over': item.isScrolledOver,
            'has-children': item.hasChildren
          }"
          :style="{
            '--level': item.level,
            '--indent': item.effectiveLevel
          }"
        >
          <div class="toc-item-content" @click="onItemClick($event, item.id)">
            <span
              v-if="item.hasChildren"
              class="toggle-icon"
              :class="{ 'is-expanded': item.isExpanded }"
              @click.stop="toggleExpand(item)"
            >
              <span class="triangle"></span>
            </span>
            <span class="item-text" :class="{ 'full-title': showFullTitle }">
              {{ item.textContent }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TextSelection } from '@tiptap/pm/state'
import { Editor } from '@tiptap/vue-3'
import { computed, ref, reactive, onMounted } from 'vue'
import { More } from '@icon-park/vue-next'
import Dropdown from '@renderer/components/ui/Dropdown.vue'

interface TocItemData {
  id: string
  level: number
  textContent: string
  itemIndex: number
  isActive: boolean
  isScrolledOver: boolean
  parentId?: string
  children?: string[]
  hasChildren?: boolean
  isExpanded?: boolean
  effectiveLevel?: number
}

const props = defineProps<{
  items: TocItemData[]
  editor: Editor | null
}>()

// 转换扁平结构，记录展开状态
const itemsMap = reactive(new Map<string, TocItemData>())
const expandedItems = ref(new Set<string>())
const collapsedItems = ref(new Set<string>())
const activeItemId = ref<string | null>(null)
const initialized = ref(false)

// 是否显示完整标题
const showFullTitle = ref(false)

// 修改菜单项，增加开关选项
const menuItems = [
  {
    label: '全部展开',
    key: 'expand-all'
  },
  {
    label: '展开到大标题(H2)',
    key: 'expand-h2'
  },
  {
    label: '展开到中标题(H3)',
    key: 'expand-h3'
  },
  {
    label: '展开到小标题(H4)',
    key: 'expand-h4'
  },
  {
    label: '全部折叠',
    key: 'collapse-all'
  },
  {
    divided: true as const
  },
  {
    label: '显示完整标题',
    key: 'show-full-title',
    switchable: true as const,
    checked: showFullTitle.value
  }
]

// 处理开关变化
const handleSwitchChange = (key: string, checked: boolean) => {
  if (key === 'show-full-title') {
    showFullTitle.value = checked
    // 更新菜单项的选中状态
    const item = menuItems.find((item) => 'key' in item && item.key === 'show-full-title')
    if (item && 'switchable' in item) {
      item.checked = checked
    }
  }
}

// 修改菜单处理函数，添加对开关事件的处理
const handleMenuSelect = (key: string) => {
  console.log(`选择菜单项: ${key}`)

  if (key === 'expand-all') {
    expandAll()
  } else if (key === 'collapse-all') {
    collapseAll()
  } else if (key === 'expand-h2') {
    expandToLevel(2)
  } else if (key === 'expand-h3') {
    expandToLevel(3)
  } else if (key === 'expand-h4') {
    expandToLevel(4)
  }
}

// 全部展开方法
const expandAll = () => {
  // 清空折叠项集合
  collapsedItems.value.clear()

  // 将所有有子项的目录项添加到展开集合
  flatItems.value.forEach((item) => {
    if (item.hasChildren) {
      expandedItems.value.add(item.id)
      item.isExpanded = true
    }
  })
}

// 全部折叠方法
const collapseAll = () => {
  // 找出所有有子项的目录项，将其添加到折叠集合中
  flatItems.value.forEach((item) => {
    if (item.hasChildren) {
      collapsedItems.value.add(item.id)
      expandedItems.value.delete(item.id)
      item.isExpanded = false
    }
  })
}

// 修正展开到指定层级的方法
const expandToLevel = (maxLevel: number) => {
  console.log(`展开到级别: ${maxLevel}`)

  // 输出当前目录项的级别分布
  const levelCounts: Record<number, number> = {}
  flatItems.value.forEach((item) => {
    levelCounts[item.level] = (levelCounts[item.level] || 0) + 1
  })
  console.log('目录项级别分布:', levelCounts)

  // 先全部折叠
  collapsedItems.value.clear()
  expandedItems.value.clear()

  // 处理所有项目
  flatItems.value.forEach((item) => {
    if (item.hasChildren) {
      // 修正判断逻辑：
      // 对于标题级别 <= maxLevel 的项目，展开它们
      // 对于标题级别 > maxLevel 的项目，折叠它们
      if (item.level <= maxLevel) {
        // 标题级别 <= maxLevel，展开
        expandedItems.value.add(item.id)
        collapsedItems.value.delete(item.id)
        item.isExpanded = true
        console.log(`展开: ${item.textContent}, level: ${item.level}`)
      } else {
        // 标题级别 > maxLevel，折叠
        collapsedItems.value.add(item.id)
        expandedItems.value.delete(item.id)
        item.isExpanded = false
        console.log(`折叠: ${item.textContent}, level: ${item.level}`)
      }
    }
  })

  // 强制更新展开状态
  flatItems.value.forEach((item) => {
    if (item.hasChildren) {
      item.isExpanded = expandedItems.value.has(item.id)
    }
  })
}

// 初始化时默认展开所有项目
onMounted(() => {
  // 延迟执行，确保 flatItems 已经计算完成
  setTimeout(() => {
    // 标记已初始化
    initialized.value = true
  }, 0)
})

// 判断项目是否激活
const isItemActive = (item: TocItemData) => {
  return (
    (item.isActive && !item.isScrolledOver) ||
    (activeItemId.value && activeItemId.value === item.id)
  )
}

// 处理扁平结构的目录项目
const flatItems = computed(() => {
  // 清空并重建映射
  itemsMap.clear()

  // 建立父子关系
  const tempItems = props.items.map((item) => ({
    ...item,
    children: [] as string[],
    hasChildren: false,
    isExpanded: true,
    effectiveLevel: item.level
  }))

  // 构建ID映射
  tempItems.forEach((item) => {
    itemsMap.set(item.id, item)
  })

  // 构建父子关系
  const rootItems: TocItemData[] = []
  tempItems.forEach((item) => {
    if (item.level === 1) {
      rootItems.push(item)
    } else {
      // 找到父项
      for (let i = tempItems.indexOf(item) - 1; i >= 0; i--) {
        const potentialParent = tempItems[i]
        if (potentialParent.level < item.level) {
          item.parentId = potentialParent.id
          potentialParent.children!.push(item.id)
          potentialParent.hasChildren = true
          break
        }
      }
    }
  })

  // 设置展开状态
  tempItems.forEach((item) => {
    if (initialized.value) {
      if (collapsedItems.value.has(item.id)) {
        item.isExpanded = false
      } else if (expandedItems.value.has(item.id)) {
        item.isExpanded = true
      }
    }
  })

  // 过滤出应该显示的项目
  return tempItems.filter((item) => {
    if (item.level === 1) return true

    // 检查父级链是否都展开
    let currentId = item.parentId
    while (currentId) {
      const parent = itemsMap.get(currentId)
      if (!parent || !parent.isExpanded) {
        return false
      }
      currentId = parent.parentId
    }

    return true
  })
})

// 切换展开/折叠状态
const toggleExpand = (item: TocItemData) => {
  if (item.isExpanded) {
    collapsedItems.value.add(item.id)
    expandedItems.value.delete(item.id)
    item.isExpanded = false
  } else {
    expandedItems.value.add(item.id)
    collapsedItems.value.delete(item.id)
    item.isExpanded = true
  }
}

const onItemClick = (_event: MouseEvent, id: string) => {
  // 设置当前激活的项目
  activeItemId.value = id

  if (props.editor) {
    const element = props.editor.view.dom.querySelector(`[data-toc-id="${id}"]`)
    if (!element) return

    const pos = props.editor.view.posAtDOM(element, 0)

    // 设置选中
    const tr = props.editor.view.state.tr
    tr.setSelection(new TextSelection(tr.doc.resolve(pos)))
    props.editor.view.dispatch(tr)
    props.editor.view.focus()

    // 滚动到对应位置
    const container = props.editor.view.dom.closest('.editor-wrapper')
    if (container) {
      // 将 element 类型断言为 HTMLElement
      const targetElement = element as HTMLElement
      container.scrollTo({
        top: targetElement.offsetTop - 100, // 上方预留100px空间
        behavior: 'smooth'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.table-of-contents {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;

  .toc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 16px;
    border-bottom: 1px solid var(--color-border);
    border-left: 3px solid var(--color-hover-bg);

    .toc-title {
      margin: 0;
      font-size: 16px;
      font-weight: normal;
      color: var(--color-text-secondary);
    }
  }

  .toc-content {
    flex: 1;
    overflow-y: auto;
  }

  .toc-empty-state {
    padding: 32px 16px;
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 14px;
    border-left: 3px solid var(--color-hover-bg);
  }

  .toc-item {
    position: relative;
    font-size: 14px;
    border-left: 3px solid var(--color-hover-bg);
    transition: all 0.2s ease;
    color: var(--color-text-primary); // 确保所有标题默认使用相同颜色

    &:hover {
      border-left-color: var(--color-primary);
    }

    &.is-active {
      border-left-color: var(--color-primary);

      > .toc-item-content {
        color: var(--color-primary);
        background-color: var(--color-primary-light);
        font-weight: 500;
      }
    }

    .toc-item-content {
      display: flex;
      align-items: center;
      padding: 6px;
      padding-left: calc(var(--level) * 14px);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    &:hover > .toc-item-content {
      color: var(--color-primary);
      background-color: var(--color-primary-light);
    }

    .toggle-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      margin-right: 4px;
      cursor: pointer;

      .triangle {
        width: 0;
        height: 0;
        border-style: solid;
        border-width: 4px 0 4px 6px;
        border-color: transparent transparent transparent currentColor;
        transition: transform 0.2s ease;
      }

      &.is-expanded .triangle {
        transform: rotate(90deg);
      }
    }

    .item-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      &.full-title {
        white-space: normal;
        word-break: break-word;
      }
    }
  }
}
</style>
