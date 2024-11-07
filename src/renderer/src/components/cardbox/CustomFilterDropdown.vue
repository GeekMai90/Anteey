<template>
  <div class="custom-filter-container">
    <!-- Custom 下拉按钮 -->
    <div class="custom-filter-dropdown" @click.stop="toggleMenu">
      <div class="icon">
        <Filter theme="outline" size="18" fill="var(--color-icon-menu-default)" :strokeWidth="3" />
      </div>
      <div class="name">{{ activeFilter?.name || '自定义筛选' }}</div>
      <div class="icon down-icon">
        <Down theme="outline" size="14" fill="var(--color-text-secondary)" :strokeWidth="3" />
      </div>
    </div>

    <!-- 筛选规则下拉菜单 -->
    <div v-if="showMenu" v-click-outside="closeMenu" class="filter-menu">
      <!-- 筛选规则列表 -->
      <div class="filter-list">
        <div
          v-for="filter in filteredRules"
          :key="filter.id"
          class="filter-item"
          :class="{ active: activeFilter?.id === filter.id }"
          @click="selectFilter(filter)"
        >
          <div class="filter-info">
            <div class="icon">
              <Filter
                theme="outline"
                size="16"
                fill="var(--color-icon-menu-default)"
                :strokeWidth="3"
              />
            </div>
            <div class="filter-name">{{ filter.name }}</div>
          </div>
          <div class="filter-actions">
            <div class="icon" @click.stop="togglePin(filter)">
              <Pushpin
                theme="outline"
                size="16"
                :fill="filter.isPinned ? 'var(--color-primary)' : 'var(--color-icon-menu-default)'"
                :strokeWidth="3"
              />
            </div>
            <div class="icon" @click.stop="showMoreMenu(filter, $event)">
              <More
                theme="outline"
                size="16"
                fill="var(--color-icon-menu-default)"
                :strokeWidth="3"
              />
            </div>
            <!-- 更多操作菜单 -->
            <!-- 更改更多菜单部分的代码 -->
            <div v-if="showMoreMenuId === filter.id" class="more-menu" :style="moreMenuPosition">
              <div class="more-menu-item" @click="toggleStar(filter)">
                <div class="icon">
                  <Star
                    theme="outline"
                    size="16"
                    :fill="
                      filter.isStarred ? 'var(--color-primary)' : 'var(--color-icon-menu-default)'
                    "
                    :strokeWidth="3"
                  />
                </div>
                <div class="name">{{ filter.isStarred ? '取消收藏' : '收藏' }}</div>
              </div>
              <div class="more-menu-item" @click="editFilter(filter)">
                <div class="icon">
                  <Edit
                    theme="outline"
                    size="16"
                    fill="var(--color-icon-menu-default)"
                    :strokeWidth="3"
                  />
                </div>
                <div class="name">编辑</div>
              </div>
              <div class="more-menu-item delete" @click="deleteFilter(filter)">
                <div class="icon">
                  <Delete theme="outline" size="16" fill="var(--color-danger)" :strokeWidth="3" />
                </div>
                <div class="name">删除</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="divider"></div>
      <!-- 添加筛选规则按钮 -->
      <div class="add-filter-button" @click="handleAddFilter">
        <div class="icon">
          <Plus theme="outline" size="18" fill="var(--color-icon-menu-default)" :strokeWidth="3" />
        </div>
        <div class="name">添加筛选规则</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Filter, Plus, Down, Pushpin, Edit, Delete, More, Star } from '@icon-park/vue-next'
import { useFilterStore } from '@renderer/stores/filterStore'
import type { CustomFilter } from '@renderer/types/Filter'

import { message } from '@renderer/utils/message'

const filterStore = useFilterStore()
const showMenu = ref(false)
const searchQuery = ref('')

// 计算筛选后的规则列表
const filteredRules = computed(() => {
  let rules = filterStore.customFilters

  // 先按照置顶状态和置顶顺序排序
  rules = [...rules].sort((a, b) => {
    // 如果两个都是置顶或都不是置顶，按照 pinnedOrder 排序
    if (a.isPinned === b.isPinned) {
      if (a.isPinned) {
        // 数字小的排在前面
        return (a.pinnedOrder || 0) - (b.pinnedOrder || 0)
      }
      // 非置顶的按照创建时间排序
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
    // 置顶的排在前面
    return a.isPinned ? -1 : 1
  })

  // 然后再进行搜索过滤
  if (!searchQuery.value) return rules
  const query = searchQuery.value.toLowerCase()
  return rules.filter((filter) => filter.name.toLowerCase().includes(query))
})

// 获取当前活动的筛选规则
const activeFilter = computed(() => filterStore.activeFilter)

// 切换菜单显示状态
const toggleMenu = () => {
  showMenu.value = !showMenu.value
}

const closeMenu = () => {
  showMenu.value = false
}

const emit = defineEmits(['reset', 'filter'])
// 选择筛选规则
// 选择筛选规则
const selectFilter = async (filter: CustomFilter) => {
  try {
    if (activeFilter.value?.id === filter.id) {
      filterStore.setActiveFilter(null)
      // 重置筛选状态
      emit('reset')
    } else {
      filterStore.setActiveFilter(filter)
      // 触发筛选
      emit('filter', filter)
    }
    closeMenu()
  } catch (error) {
    console.error('应用筛选规则失败:', error)
    message.error('应用筛选规则失败')
  }
}

// 切换置顶状态
const togglePin = async (filter: CustomFilter) => {
  try {
    await filterStore.toggleFilterPin(filter.id)
    message.success('操作成功')
  } catch (error) {
    message.error('操作失败')
  }
}

const showMoreMenuId = ref<string | null>(null)
const moreMenuPosition = ref({ top: '0px', left: '0px' })

// 显示更多菜单
// 显示更多菜单
const showMoreMenu = (filter: CustomFilter, event: MouseEvent) => {
  event.stopPropagation()

  // 如果点击的是同一个菜单，则关闭它
  if (showMoreMenuId.value === filter.id) {
    closeMoreMenu()
    return
  }

  // 否则，显示新的菜单
  showMoreMenuId.value = filter.id

  // 计算菜单位置
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  moreMenuPosition.value = {
    top: `${rect.bottom + 5}px`,
    left: `${rect.left}px`
  }

  // 添加点击外部关闭菜单的监听
  setTimeout(() => {
    document.addEventListener('click', closeMoreMenu)
  })
}

// 关闭更多菜单
const closeMoreMenu = () => {
  showMoreMenuId.value = null
  document.removeEventListener('click', closeMoreMenu)
}

// 切换收藏状态
const toggleStar = async (filter: CustomFilter) => {
  try {
    await filterStore.toggleFilterStar(filter.id)
    message.success('操作成功')
  } catch (error) {
    message.error('操作失败')
  }
}

// 删除筛选规则
const deleteFilter = async (filter: CustomFilter) => {
  if (await window.confirm(`确定要删除筛选规则 "${filter.name}" 吗？`)) {
    try {
      await filterStore.deleteFilter(filter.id)
      message.success('删除成功')
    } catch (error) {
      message.error('删除失败')
    }
  }
}
// 初始化加载筛选规则
filterStore.fetchCustomFilters()

// 删除 FilterDialog 相关代码
const handleAddFilter = () => {
  filterStore.openFilterDialog()
}

const editFilter = (filter: CustomFilter) => {
  filterStore.openFilterDialog(filter)
}
</script>

<style lang="scss" scoped>
.custom-filter-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 2px;
}

.custom-filter-dropdown {
  display: flex;
  align-items: center;
  padding: 4px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  user-select: none;

  &:hover {
    background-color: var(--color-hover-bg);
  }
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
      width: 15px;
      height: 15px;
    }
  }

  .name {
    flex-grow: 0;
    text-align: left;
    color: var(--default-text-color);
    font-size: 14px;
    font-weight: 400;
    margin-left: 3px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    line-height: 1;
  }
}

.filter-menu {
  position: absolute;
  top: 100%;
  left: 0;
  width: 280px;
  max-height: 400px;
  margin-top: 8px;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;

  z-index: 1000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.search-box {
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid var(--color-border);

  input {
    flex: 1;
    margin-left: 8px;
    padding: 4px;
    border: none;
    background: transparent;
    color: var(--color-text-primary);
    outline: none;

    &::placeholder {
      color: var(--color-text-placeholder);
    }
  }
}

.filter-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.filter-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background-color: var(--color-hover-bg);
  }

  &.active {
    background-color: var(--color-hover-bg);
  }
}

.filter-info {
  display: flex;
  align-items: center;
  gap: 2px;
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
      width: 18px;
      height: 18px;
    }
  }

  .filter-name {
    flex-grow: 0;
    text-align: left;
    color: var(--default-text-color);
    font-size: 14px;
    font-weight: 400;
    margin-left: 4px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    line-height: 1;
  }
}

.filter-name {
  font-size: 14px;
  color: var(--color-text-primary);
}

.filter-match-type {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.filter-actions {
  display: flex;
  gap: 6px;
  opacity: 0;

  .filter-item:hover & {
    opacity: 1;
  }

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
      width: 16px;
      height: 16px;
    }
  }
}

.divider {
  height: 1px;
  background-color: var(--color-border);
}

.add-filter-button {
  display: flex;
  align-items: center;
  padding: 8px;
  margin: 8px;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background-color: var(--color-hover-bg);
  }
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
      width: 18px;
      height: 18px;
    }
  }

  .name {
    flex-grow: 0;
    text-align: left;
    color: var(--default-text-color);
    font-size: 13px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    line-height: 1;
  }
}
.more-menu {
  position: fixed;
  background-color: var(--color-dropdown-bg);
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 9999;
  min-width: 120px;
  width: max-content;
  max-width: 300px;
  overflow-y: auto;
  padding: 6px 12px;
  white-space: nowrap;
  flex-direction: column; // 确保菜单项垂直排列
}

.more-menu-item {
  position: relative;
  display: flex;
  align-items: center;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
  padding: 4px 4px;
  margin: 2px;
  width: 100%; // 确保菜单项占满容器宽度

  gap: 6px;

  &:hover {
    background-color: var(--color-hover-button);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

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
    flex-shrink: 0; // 防止图标被压缩

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

  .name {
    flex-grow: 0;
    text-align: left;
    color: var(--color-text-primary);
    font-size: 14px;
    font-weight: 400;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1;
    user-select: none;
  }

  &.delete {
    .name {
      color: var(--color-danger);
    }
  }
}
</style>
