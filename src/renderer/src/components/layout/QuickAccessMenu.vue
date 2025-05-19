<template>
  <Teleport to="body">
    <Transition name="menu-fade">
      <div
        v-if="visible"
        class="quick-access-menu"
        :class="{ 'from-slim-sidebar': isFromSlimSidebar }"
        :style="{
          position: menuStyle.position as 'fixed',
          top: menuStyle.top,
          left: menuStyle.left,
          zIndex: menuStyle.zIndex
        }"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
      >
        <!-- 卡片类型分组 -->
        <div class="menu-group">
          <div class="group-title">卡片类型</div>
          <div class="menu-items">
            <div class="menu-item" @click="handleCardTypeSelect('Maincard')">
              <div class="icon">
                <Notes theme="outline" size="16" :strokeWidth="2" />
              </div>
              <div class="name">主要卡片</div>
            </div>
            <div class="menu-item" @click="handleCardTypeSelect('Indexcard')">
              <div class="icon">
                <ListAlphabet theme="outline" size="16" :strokeWidth="2" />
              </div>
              <div class="name">索引卡片</div>
            </div>
            <div class="menu-item" @click="handleCardTypeSelect('Bibcard')">
              <div class="icon">
                <Bookshelf theme="outline" size="16" :strokeWidth="2" />
              </div>
              <div class="name">参考卡片</div>
            </div>
          </div>
        </div>

        <!-- 卡片盒分组 -->
        <div class="menu-group">
          <div class="group-title">卡片盒</div>
          <div class="menu-items">
            <div
              v-for="box in cardBoxes"
              :key="box.id"
              class="menu-item"
              @click="handleCardBoxSelect(box.id)"
            >
              <div class="icon">
                <Box theme="outline" size="16" :strokeWidth="2" />
              </div>
              <div class="name">{{ box.name }}</div>
            </div>
          </div>
        </div>

        <!-- 自定义筛选分组 -->
        <div v-if="starredFilters.length > 0" class="menu-group">
          <div class="group-title">自定义</div>
          <div class="menu-items">
            <div
              v-for="filter in starredFilters"
              :key="filter.id"
              class="menu-item"
              @click="handleFilterSelect(filter)"
            >
              <div class="icon">
                <Filter theme="outline" size="16" :strokeWidth="2" />
              </div>
              <div class="name">{{ filter.name }}</div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { Notes, ListAlphabet, Bookshelf, Box, Filter } from '@icon-park/vue-next'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useFilterStore } from '@renderer/stores/filterStore'
import { CustomFilter } from '@shared/types'

const props = defineProps<{
  visible: boolean
  triggerRect?: DOMRect
}>()

// 修改计算属性的返回类型
interface MenuStyle {
  position: 'fixed'
  top: string
  left: string
  zIndex: number
}

// 计算是否从窄侧边栏调用
const isFromSlimSidebar = computed(() => {
  if (!props.triggerRect) return false
  return props.triggerRect.left < 60 // 假设窄侧边栏宽度小于60px
})

const menuStyle = computed<MenuStyle>(() => {
  if (!props.triggerRect) {
    return {
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: 1001
    }
  }

  // 在窄侧边栏中，将间距减小为0，确保菜单紧贴按钮
  const margin = isFromSlimSidebar.value ? 0 : 5

  // 计算理想位置 - 默认在触发元素右侧
  let left = props.triggerRect.right + margin
  let top = props.triggerRect.top - 5 // 向上偏移一点，增加鼠标移动到菜单的容错空间

  // 如果是从窄侧边栏调用，确保菜单显示在右侧
  if (isFromSlimSidebar.value) {
    // 窄侧边栏时的特殊处理
    left = props.triggerRect.right + margin

    // 计算菜单宽度并确保不超出右边界
    const menuWidth = 200 // 菜单的预估宽度
    if (left + menuWidth > window.innerWidth - 20) {
      // 留出右侧边距
      left = window.innerWidth - menuWidth - 20
    }
  } else {
    // 对于常规侧边栏，检查是否会超出右边界
    const menuWidth = 200 // 菜单的预估宽度
    if (left + menuWidth > window.innerWidth) {
      left = props.triggerRect.left - menuWidth - margin
    }
  }

  // 检查是否会超出底部边界
  const menuHeight = 300 // 菜单的预估高度
  if (top + menuHeight > window.innerHeight) {
    top = window.innerHeight - menuHeight - 20 // 留出底部边距
  }

  // 确保菜单不会太靠近顶部
  if (top < 10) {
    top = 10
  }

  return {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 1001
  }
})

const router = useRouter()
const noteStore = useNoteStore()
const cardBoxes = computed(() => noteStore.cardBoxes)
const filterStore = useFilterStore()

const emit = defineEmits(['update:visible', 'mouseleave'])

const handleMouseEnter = () => {
  // 确保菜单保持显示
  emit('update:visible', true)

  // 如果有可能的隐藏定时器在SlimSidebar组件中，可以通过事件通知它取消
  // 由于我们不能直接访问SlimSidebar中的状态，这里发出一个事件
  const event = new CustomEvent('quickAccessMenuEnter', { bubbles: true })
  document.dispatchEvent(event)
}

const handleMouseLeave = (event: MouseEvent) => {
  emit('mouseleave', event)
}

// 获取卡片盒数据
const fetchCardBoxes = async () => {
  await noteStore.fetchCardBoxes()
}

onMounted(() => {
  fetchCardBoxes()
  // 获取自定义筛选规则
  filterStore.fetchCustomFilters()
})

// 处理卡片类型选择
const handleCardTypeSelect = (type: string) => {
  router.push({
    name: 'cardbox',
    query: {
      type: type,
      box: 'all'
    }
  })
  emit('update:visible', false)
}
// 处理卡片盒选择
const handleCardBoxSelect = (boxId: string) => {
  router.push({
    name: 'cardbox',
    query: {
      box: boxId,
      page: '1' // 添加页码参数，默认从第一页开始
    }
  })
  emit('update:visible', false)
}

// 获取收藏的筛选规则
const starredFilters = computed(() => {
  return filterStore.customFilters.filter((filter: any) => filter.isStarred)
})

// 处理筛选规则选择
const handleFilterSelect = (filter: CustomFilter) => {
  filterStore.setActiveFilter(filter)
  router.push({
    name: 'cardbox',
    query: {
      box: 'all',
      filter: filter.id
    }
  })
  emit('update:visible', false)
}
</script>

<style lang="scss" scoped>
// 菜单过渡动画
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateX(-10px) scale(0.98);
}

.from-slim-sidebar.menu-fade-enter-from,
.from-slim-sidebar.menu-fade-leave-to {
  transform: translateX(-10px) scale(0.98);
}

.quick-access-menu {
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  padding: 8px;
  min-width: 200px;
  transition: opacity 0.2s ease;

  // 添加一个辅助区域，扩大鼠标感应范围
  &::before {
    content: '';
    position: absolute;
    top: -10px; // 扩展顶部区域
    left: -15px; // 扩展左侧区域（特别是连接按钮的地方）
    right: -10px; // 扩展右侧区域
    bottom: -10px; // 扩展底部区域
    z-index: -1; // 放在菜单后面
  }

  // 添加最大高度和滚动
  max-height: 80vh;
  overflow-y: auto;

  // 从窄侧边栏弹出时的特殊样式
  &.from-slim-sidebar {
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);

    // 窄侧边栏特有的辅助区域
    &::before {
      left: -20px; // 更宽的左侧区域，确保覆盖按钮和菜单之间的间隙
    }
  }

  .menu-group {
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }

    .group-title {
      font-size: 12px;
      color: var(--color-text-secondary);
      padding: 4px 8px;
      margin-bottom: 4px;
    }

    .menu-items {
      .menu-item {
        display: flex;
        align-items: center;
        padding: 6px 8px;
        border-radius: 6px;
        cursor: pointer;
        text-decoration: none;
        color: var(--color-text-primary);

        &:hover {
          background-color: var(--color-hover-sidebar);
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

        .name {
          flex-grow: 0;
          text-align: left;
          color: var(--color-text-primary);
          font-size: 13px;
          font-weight: 400;
          margin-left: 6px;
          white-space: nowrap;
          writing-mode: horizontal-tb;
          line-height: 1;
        }
      }
    }
  }
}
</style>
