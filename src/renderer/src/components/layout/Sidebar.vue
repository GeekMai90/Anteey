<!-- src/renderer/src/components/Sidebar.vue -->
<template>
  <div class="sidebar" :style="{ width: `${sidebarWidth}px` }">
    <div class="sidebar-header">
      <div class="sidebar-titlebar"></div>
      <div class="antinet-button" @click.stop="uiStore.toggleSettingDropdown">
        <img src="@resources/icon.png" alt="Antinet" class="antinet-icon" />
        <div class="antinet-text">Antinet</div>
        <div class="status-icon" :class="saveStatusClass"></div>
        <SettingDropdownMenu />
      </div>
      <!-- 新增搜索区域 -->
      <div class="search-area">
        <div class="search-input" @click="openSearch">
          <div class="search-icon">
            <div class="icon">
              <Search
                theme="outline"
                size="16"
                fill="var(--color-icon-secondary)"
                :strokeWidth="3"
              />
            </div>
            <div class="name">搜索</div>
          </div>
          <div class="search-input-text">⌘ S</div>
        </div>
        <button
          v-tooltip.top="{
            content: '添加笔记<br>Cmd+N',
            delay: { show: 1000 },
            html: true
          }"
          class="new-note-btn"
          @click="createNewCard"
        >
          <div class="icon">
            <Plus theme="outline" size="16" fill="var(--color-icon-secondary)" :strokeWidth="3" />
          </div>
        </button>
      </div>
    </div>
    <!-- 添加可滚动容器 -->

    <div class="sidebar-nav">
      <nav>
        <ul>
          <li v-for="item in menuItems" :key="item.name" class="nav-item-wrapper">
            <div class="nav-item" :class="{ active: isActiveOrHasActiveChild(item) }">
              <router-link
                :to="item.path"
                class="nav-link"
                :class="{ active: isActive(item.path) }"
              >
                <div class="icon">
                  <component
                    :is="item.icon"
                    theme="outline"
                    size="18"
                    :fill="getIconFill(item.path)"
                    :strokeWidth="2"
                  ></component>
                </div>
                <div class="name">{{ item.name }}</div>
              </router-link>
              <div v-if="item.children" class="expand-button" @click.stop="toggleSubMenu(item)">
                <div class="icon">
                  <Down
                    v-if="expanded"
                    theme="outline"
                    size="16"
                    fill="var(--color-text-primary)"
                    :strokeWidth="2"
                  />
                  <Right
                    v-else
                    theme="outline"
                    size="16"
                    fill="var(--color-text-primary)"
                    :strokeWidth="2"
                  />
                </div>
              </div>
            </div>
            <ul v-if="item.children && expanded" class="sub-menu">
              <li v-for="child in item.children" :key="child.name">
                <router-link
                  :to="child.path"
                  class="nav-link sub-item"
                  :class="{ active: isActive(child.path) }"
                  @click.stop
                >
                  <div class="icon">
                    <component
                      :is="child.icon || item.icon"
                      theme="outline"
                      size="18"
                      :fill="getIconFill(child.path)"
                      :strokeWidth="2"
                    ></component>
                  </div>
                  <div class="name">{{ child.name }}</div>
                </router-link>
              </li>
            </ul>
          </li>
        </ul>
      </nav>
    </div>
    <div class="sidebar-header-divider"></div>
    <div class="scrollable-content">
      <StarredNotes />
      <RecentNotes />
      <TagsTree />
    </div>
    <div class="resize-handle" @mousedown="startResize"></div>
    <div class="sidebar-footer">
      <div class="new-card-wrapper"></div>
      <!-- 主题切换按钮 -->
      <div
        v-tooltip.top="{
          content: uiStore.isDarkTheme ? '切换亮色主题' : '切换暗色主题',
          delay: { show: 1000 }
        }"
        class="theme-toggle"
        @click="uiStore.setThemeMode(uiStore.isDarkTheme ? 'light' : 'dark')"
      >
        <div class="icon">
          <Moon
            v-if="!uiStore.isDarkTheme"
            theme="outline"
            size="20"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="2"
          />
          <SunOne
            v-else
            theme="outline"
            size="20"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="2"
          />
        </div>
      </div>
      <!-- 清除空笔记 -->
      <div
        v-tooltip.top="{ content: '清除空笔记', delay: { show: 1000 } }"
        class="clear-empty-note"
        @click="noteStore.moveEmptyNotesToTrash"
      >
        <div class="icon">
          <Clear theme="outline" size="20" fill="var(--color-icon-menu-default)" :strokeWidth="2" />
        </div>
      </div>
      <div
        v-tooltip.top="{ content: '帮助中心', delay: { show: 1000 } }"
        class="help"
        @click="openHelp"
      >
        <div class="icon">
          <Help theme="outline" size="20" fill="var(--color-icon-menu-default)" :strokeWidth="2" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  Time,
  Box,
  Workbench,
  Plus,
  Search,
  Help,
  Home,
  Down,
  Right,
  Notes,
  ListAlphabet,
  Bookshelf,
  Clear,
  Moon,
  SunOne
} from '@icon-park/vue-next'
import { useNoteStore } from '@renderer/stores/noteStores'
import SettingDropdownMenu from '@renderer/components/settings/SettingDropdownMenu.vue'
import StarredNotes from '@renderer/components/layout/StarredNotes.vue'
import { useUIStore } from '@renderer/stores/useUIStore'
import { useRoute } from 'vue-router'
import RecentNotes from '@renderer/components/layout/RecentNotes.vue'
import { storeToRefs } from 'pinia'
import TagsTree from '@renderer/components/layout/TagsTree.vue'

const imageSrc = ref('')
const uiStore = useUIStore()
const route = useRoute()

const getIconFill = computed(
  () => (path: string) =>
    // route.path === path ? 'var(--color-primary)' : 'var(--color-text-primary)'
    route.path === path ? 'var(--color-text-primary)' : 'var(--color-text-primary)'
)

onMounted(async () => {
  imageSrc.value = await window.electronAPI.getResourcePath('icon.png')
})
const expanded = ref(false)
const menuItems = [
  { name: '主页', path: '/home', icon: Home },
  { name: '时间线', path: '/timeline', icon: Time },
  {
    name: '卡片盒',
    path: '/cardbox',
    icon: Box,
    children: [
      { name: '主要卡片', path: '/maincard', icon: Notes },
      { name: '索引卡片', path: '/indexcard', icon: ListAlphabet },
      { name: '文献卡片', path: '/bibcard', icon: Bookshelf }
    ]
  },
  { name: '思维板', path: '/whiteboard', icon: Workbench }
]

const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}

const isActiveOrHasActiveChild = (item: any) => {
  if (isActive(item.path)) return true
  if (item.children) {
    return item.children.some((child: any) => isActive(child.path))
  }
  return false
}
const toggleSubMenu = (item: any) => {
  expanded.value = !expanded.value
  console.log('Toggled:', item.name, 'Expanded:', item.expanded)
}

const noteStore = useNoteStore()
const { getCurrentNoteSaveStatus } = storeToRefs(noteStore)
// 使用计算属性来处理保存状态的显示
// 简化状态类的计算
const saveStatusClass = computed(() => {
  console.log('当前保存状态:', getCurrentNoteSaveStatus.value) // 添加日志
  return {
    'status-saving': getCurrentNoteSaveStatus.value === 'saving',
    'status-saved': getCurrentNoteSaveStatus.value === 'saved',
    'status-error': getCurrentNoteSaveStatus.value === 'error'
  }
})
// const isSidebarCollapsed = computed(() => noteStore.isSidebarCollapsed);
// const isSidebarVisible = computed(() => !isSidebarCollapsed.value || props.isTemporaryVisible);

// 侧边栏宽度调节
const emit = defineEmits(['resize'])
const sidebarWidth = ref(280)
const MIN_WIDTH = 280
const MAX_WIDTH = 400

watch(sidebarWidth, (newWidth) => {
  emit('resize', newWidth)
})

const startResize = (e: MouseEvent) => {
  e.preventDefault()
  document.addEventListener('mousemove', resize)
  document.addEventListener('mouseup', stopResize)
}

const resize = (e: MouseEvent) => {
  let newWidth = e.clientX
  if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH
  if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH
  sidebarWidth.value = newWidth
}

const stopResize = () => {
  document.removeEventListener('mousemove', resize)
  document.removeEventListener('mouseup', stopResize)
}

const createNewCard = () => {
  // 实现新建卡片的逻辑
  noteStore.createAndOpenNewNote()
  console.log('创建新卡片')
}

const openSearch = () => {
  // 实现打开搜索的逻辑
  noteStore.openSearchModal()
  console.log('打开搜索')
}

const openHelp = () => {
  // 实现打开帮助的逻辑
  console.log('打开帮助')
}
</script>

<style lang="scss" scoped>
.sidebar {
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  z-index: 1000;
  border-right: 1px solid var(--color-border-sidebar);

  .sidebar-titlebar {
    height: 35px;
    -webkit-app-region: drag; /* 使区域可拖动 */
  }

  .sidebar-header {
    width: 100%; // 确保宽度为100%
    flex-shrink: 0; // 防止头部被压缩
    // padding-bottom: 10px; // 移除左右内边距

    .antinet-button {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      width: 100%;
      padding: 2px 10px 2px 6px;
      background-color: transparent;
      border: none;
      cursor: pointer;
      position: relative;
      .antinet-icon {
        width: 40px;
        height: 40px;
        margin-right: 4px;
        object-fit: cover;
      }

      .antinet-text {
        font-size: 16px;
        font-weight: bold;
        color: var(--color-text-primary);
        user-select: none;
      }

      .down-arrow {
        margin-left: auto; // 将箭头推到右侧
        color: var(--color-icon-default);
      }

      &:hover {
        background-color: var(--color-hover-sidebar);
      }
    }
    .search-area {
      display: flex;
      align-items: center;
      padding: 10px;
      gap: 10px;
      cursor: pointer;
      // margin-bottom: 5px;

      .search-input {
        flex-grow: 1;
        height: 32px;
        border: 1px solid var(--color-border-sidebar);
        border-radius: 8px;
        background-color: var(--color-shape-tertiary);
        color: var(--color-text-primary);
        font-size: 14px;
        display: flex;
        align-items: center;
        padding: 0 5px;
        justify-content: space-between; // 添加这行

        .search-icon {
          position: relative;
          display: flex;
          align-items: center;
          border: none;
          background: none;
          border-radius: 6px;

          .icon {
            background: none;
            border: none;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
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
            color: var(--color-text-secondary);
            font-size: 14px;
            font-weight: 400;
            white-space: nowrap;
            writing-mode: horizontal-tb;
            line-height: 1;
          }
        }
        .search-input-text {
          margin-left: auto; // 添加这行
          color: var(--color-text-secondary); // 可选：设置文字颜色
          font-size: 14px; // 可选：设置字体大小
        }
      }

      .new-note-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background-color: var(--color-shape-tertiary);
        cursor: pointer;
        transition: background-color 0.2s;
        border: 1px solid var(--color-border-sidebar);

        .icon {
          background: none;
          border: none;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
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

        &:hover {
          background-color: var(--color-hover-sidebar);
        }
      }
    }
  }

  .sidebar-header-divider {
    border-bottom: 1px solid var(--color-border-sidebar);
    flex-shrink: 0; // 防止分割线被压缩
    margin: 6px;
  }

  .sidebar-nav {
    padding: 0px 10px;
    flex-shrink: 0; // 防止导航菜单被压缩

    nav {
      ul {
        list-style-type: none;
        padding: 0;
        margin: 0;
        .nav-item-wrapper {
          margin-bottom: 4px;
        }
        .nav-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 6px 8px;
          border-radius: 8px;
          transition: background-color 0.2s;
          user-select: none;

          &:hover {
            background-color: var(--color-hover-sidebar);
          }
          &.active {
            background-color: var(--color-hover-sidebar);
          }
        }
        .nav-link {
          display: flex;
          align-items: center;
          flex-grow: 1;
          text-decoration: none;
          color: inherit;

          .icon {
            background: none;
            border: none;
            cursor: pointer;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: background-color 0.2s;
            padding: 0;
            margin-right: 8px;

            // 新增以下样式来处理 i-icon 类
            :deep(.i-icon) {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
            }

            svg {
              width: 16px; // 或者您想要的大小
              height: 12px; // 或者您想要的大小
            }
          }

          .name {
            flex-grow: 0;
            text-align: left;
            color: var(--color-text-primary);
            font-size: 14px;
            white-space: nowrap; // 防止文字换行
            writing-mode: horizontal-tb; // 确保文字是水平排列的
            font-weight: 400;
          }

          // &:hover {
          //   background-color: var(--color-hover-sidebar);
          // }
        }

        .expand-button {
          background: none;
          border: none;
          cursor: pointer;
          transition: transform 0.3s ease;
          border-radius: 6px;
          &:hover {
            background-color: var(--color-hover-button);
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

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }

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

        .expand-button .rotated {
          transform: translateY(-50%) rotate(180deg);
        }

        .sub-menu {
          list-style-type: none;
          padding-left: 26px; // 与图标对齐
          margin-top: 4px;
        }

        .sub-item {
          display: flex;
          align-items: center;
          padding: 6px 8px;
          font-size: 14px;
          border-radius: 8px;
          text-decoration: none;
          color: inherit;
          margin-bottom: 4px;
          &:hover {
            background-color: var(--color-hover-sidebar);
          }
          &.active {
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
            border-radius: 6px;
            transition: background-color 0.2s;
            padding: 0;
            margin-right: 8px;

            // 新增以下样式来处理 i-icon 类
            :deep(.i-icon) {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
            }

            svg {
              width: 16px; // 或者您想要的大小
              height: 12px; // 或者您想要的大小
            }
          }

          .name {
            flex-grow: 0;
            text-align: left;
            color: var(--color-text-primary);
            font-size: 14px;
            white-space: nowrap; // 防止文字换行
            writing-mode: horizontal-tb; // 确保文字是水平排列的
            font-weight: 400;
          }
        }
      }
    }
  }

  .resize-handle {
    position: absolute;
    top: 0;
    right: -5px;
    width: 10px;
    height: 100%;
    cursor: col-resize;
  }

  .sidebar-footer {
    // margin-top: auto; // 将footer推到底部
    margin-top: 0; // 移除 margin-top: auto
    flex-shrink: 0; // 防止底部工具栏被压缩
    padding: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--color-border-sidebar);

    .new-card-wrapper {
      flex-grow: 1;
      display: flex;
      align-items: center;

      .new-card {
        display: flex;
        align-items: center;
        padding: 5px 14px 5px 10px;
        border-radius: 8px;
        cursor: pointer;

        .icon {
          width: 20px;
          height: 20px;
          display: flex;
          justify-content: center;
          align-items: center;

          .i-icon {
            width: 16px;
            height: 16px;
            display: flex;
            justify-content: center;
            align-items: center;
          }
        }

        .add-text {
          margin-left: 3px;
          font-size: 12px;
        }

        &:hover {
          background-color: var(--color-hover-sidebar);
        }
      }
    }

    .clear-empty-note,
    .theme-toggle,
    .help {
      width: 30px;
      height: 30px;
      justify-content: center;
      align-items: center;
      margin-left: 2px;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 6px;

      .icon {
        width: 20px;
        height: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 6px;
        transition: background-color 0.2s;

        .i-icon {
          width: 16px;
          height: 16px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
      }

      &:hover {
        background-color: var(--color-hover-sidebar);
      }
    }
    .theme-toggle {
      .icon {
        transition: transform 0.3s ease;
      }

      &:hover .icon {
        transform: rotate(15deg);
      }
    }
  }
}

/* 定义过渡动画 */
.sidebar-enter-active,
.sidebar-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.sidebar-enter-from,
.sidebar-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 30px;
    bottom: 30px;
    left: 0;
    z-index: 9000;
    background-color: var(--color-shape-tertiary);
    padding: 12px 12px 10px 12px;
    width: 200px;
    min-width: 200px;
    overflow: hidden;
  }
}

.status-icon {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  position: absolute;
  top: 19px;
  right: 22px;
  box-shadow: 0 0 5px 1px currentColor;
  transition: all 0.3s ease;
}

.status-icon.status-idle {
  background-color: #808080;
  box-shadow: 0 0 5px 1px rgba(128, 128, 128, 0.5);
}

.status-icon.status-saving {
  background-color: #ffa500;
  box-shadow: 0 0 5px 1px rgba(255, 165, 0, 0.7);
  animation: pulse 1s infinite alternate;
}

.status-icon.status-saved {
  background-color: var(--color-primary);
  box-shadow: 0 0 5px 1px rgba(var(--color-primary-rgb), 0.7);
}

.status-icon.status-error {
  background-color: #ff0000;
  box-shadow: 0 0 5px 1px rgba(255, 0, 0, 0.7);
}

@keyframes pulse {
  from {
    opacity: 0.5;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1.1);
  }
}
// 添加一个内容容器来包裹可滚动的内容
.scrollable-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0; // 重要：确保内容可以正确滚动
}
</style>
