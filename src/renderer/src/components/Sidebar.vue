<template>
  <div class="sidebar" :style="{ width: `${sidebarWidth}px` }">
    <div class="sidebar-header">
      <div class="sidebar-titlebar"></div>
      <button class="antinet-button">
        <img src="@resources/icon.png" alt="Antinet" class="antinet-icon" />
        <div class="antinet-text">Antinet</div>
        <svg
          class="down-arrow"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7 10L12 15L17 10"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <div class="sidebar-nav">
      <nav>
        <ul>
          <li v-for="item in menuItems" :key="item.name">
            <router-link :to="item.path" class="nav-item" active-class="active">
              <div class="icon" :style="{ backgroundColor: item.color }">
                <component :is="item.icon" theme="filled" size="8" fill="#ffffff"></component>
              </div>
              <div class="name">{{ item.name }}</div>
            </router-link>
          </li>
        </ul>
      </nav>
    </div>
    <div class="sidebar-header-divider"></div>
    <div class="resize-handle" @mousedown="startResize"></div>
    <div class="sidebar-footer">
      <div class="new-card-wrapper">
        <div
          v-tooltip.top="{ content: 'Cmd+N', delay: { show: 1000 } }"
          class="new-card"
          @click="createNewCard"
        >
          <div class="icon">
            <DocAdd theme="outline" size="20" fill="var(--color-text-primary)" :strokeWidth="3" />
          </div>
          <div class="add-text">新建卡片</div>
        </div>
      </div>
      <div
        v-tooltip.top="{ content: 'Cmd+S', delay: { show: 1000 } }"
        class="search"
        @click="openSearch"
      >
        <div class="icon">
          <Search theme="outline" size="20" fill="var(--color-text-primary)" :strokeWidth="3" />
        </div>
      </div>
      <div class="help" @click="openHelp">
        <div class="icon">
          <Help theme="outline" size="20" fill="var(--color-text-primary)" :strokeWidth="3" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ListView, Box, Workbench, DocAdd, Search, Help } from '@icon-park/vue-next'
import { useNoteStore } from '../stores/noteStores'

// const props = defineProps({
//   isTemporaryVisible: Boolean,
// });

const imageSrc = ref('')

onMounted(async () => {
  imageSrc.value = await window.electronAPI.getResourcePath('icon.png')
})
const menuItems = [
  { name: '时间线', path: '/', icon: ListView, color: '#4CAF50' },
  { name: '卡片盒', path: '/cardbox', icon: Box, color: '#2196F3' },
  { name: '思维板', path: '/mindboard', icon: Workbench, color: '#9C27B0' }
]

const noteStore = useNoteStore()
// const isSidebarCollapsed = computed(() => noteStore.isSidebarCollapsed);
// const isSidebarVisible = computed(() => !isSidebarCollapsed.value || props.isTemporaryVisible);

// 侧边栏宽度调节
const emit = defineEmits(['resize'])
const sidebarWidth = ref(250)
const MIN_WIDTH = 250
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

<style lang="scss">
.sidebar {
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: var(--color-shape-tertiary);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  z-index: 5000;

  .sidebar-titlebar {
    height: 40px;
    -webkit-app-region: drag; /* 使区域可拖动 */
  }

  .sidebar-header {
    width: 100%; // 确保宽度为100%
    padding: 0px 0 6px 0; // 移除左右内边距

    .antinet-button {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      width: 100%;
      padding: 6px 10px;
      background-color: transparent;
      border: none;
      cursor: pointer;

      .antinet-icon {
        width: 30px;
        height: 30px;
        margin-right: 4px;
      }

      .antinet-text {
        font-size: 14px;
        font-weight: bold;
        color: #424242;
      }

      .down-arrow {
        margin-left: auto; // 将箭头推到右侧
        color: var(--color-icon-default);
      }

      &:hover {
        background-color: var(--color-hover-sidebar);
      }
    }
  }

  .sidebar-header-divider {
    border-bottom: 1px solid var(--color-border-sidebar);

    margin: 0px 10px;
  }

  .sidebar-nav {
    padding: 0px 10px;

    nav {
      ul {
        list-style-type: none;
        padding: 0;
        margin: 0;

        li {
          margin-bottom: 0px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          // width: 200px;
          padding: 6px 12px;
          border: none;
          background: none;
          cursor: pointer;
          transition: background-color 0.2s;
          border-radius: 8px;
          margin-bottom: 4px;
          // margin: 2px 8px;

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
            margin-right: 6px;

            // 新增以下样式来处理 i-icon 类
            .i-icon {
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
            color: var(--default-text-color);
            font-size: 15px;
            white-space: nowrap; // 防止文字换行
            writing-mode: horizontal-tb; // 确保文字是水平排列的
            font-weight: 400;
          }

          &:hover {
            background-color: var(--color-hover-sidebar);
          }

          &.active {
            background-color: var(--color-sidebar-active-bg);
            // border: 1px solid var(--color-primary);
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
    margin-top: auto; // 将footer推到底部
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

    .search,
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
    z-index: 9999;
    background-color: var(--color-shape-tertiary);
    padding: 12px 12px 10px 12px;
    width: 200px;
    min-width: 200px;
    overflow: hidden;
  }
}
</style>
