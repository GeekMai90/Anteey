// src/components/AppToolbar.vue

<template>
  <div class="app-toolbar">
    <div class="toolbar-section left">
      <div
        v-tooltip.bottom="{ content: 'Cmd + \\', delay: { show: 1000 } }"
        class="toggle-left-sidebar"
        @click="toggleSidebar"
      >
        <div class="icon">
          <ExpandRight theme="outline" size="20" fill="#b6b6b6" />
        </div>
      </div>
      <div v-if="showBackButton" class="back-button" :disabled="!canGoBack" @click="goBack">
        <div class="icon">
          <Left theme="outline" size="20" fill="#b6b6b6" />
        </div>
      </div>
      <div
        v-if="showForwardButton"
        class="forward-button"
        :disabled="!canGoForward"
        @click="goForward"
      >
        <div class="icon">
          <Right theme="outline" size="20" fill="#b6b6b6" />
        </div>
      </div>
      <slot name="left"></slot>
    </div>
    <div class="toolbar-section center">
      <slot name="center"></slot>
    </div>
    <div class="toolbar-section right">
      <div
        v-tooltip.bottom="{ content: 'Cmd + Option + \\', delay: { show: 1000 } }"
        class="toggle-right-sidebar"
        @click="toggleRightSidebar"
      >
        <div class="icon">
          <ExpandLeft theme="outline" size="20" fill="#b6b6b6" />
        </div>
      </div>
      <slot name="right"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Left, Right, ExpandLeft, ExpandRight } from '@icon-park/vue-next'
import { useNoteStore } from '@renderer/stores/noteStores'

const noteStore = useNoteStore()
const router = useRouter()

const props = defineProps({
  showBackButton: { type: Boolean, default: true },
  showForwardButton: { type: Boolean, default: true },
  showRefreshButton: { type: Boolean, default: true }
})

const canGoBack = ref(false)
const canGoForward = ref(false)

const updateNavigationState = () => {
  canGoBack.value = window.history.length > 1
  canGoForward.value = window.history.length > window.history.state?.position + 1
}

const goBack = () => canGoBack.value && router.back()
const goForward = () => canGoForward.value && router.forward()
// const refresh = () => console.log('Refresh clicked')
const toggleSidebar = () => noteStore.toggleSidebar()

const toggleRightSidebar = () => (noteStore.isRightSidebarOpen = !noteStore.isRightSidebarOpen)

onMounted(() => {
  updateNavigationState()
  window.addEventListener('popstate', updateNavigationState)
})

onUnmounted(() => {
  window.removeEventListener('popstate', updateNavigationState)
})
</script>

<style lang="scss" scoped>
.app-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  background-color: var(--color-bg-primary);
  width: 100%;
  box-sizing: border-box;
  height: 40px;
}

.toolbar-section {
  display: flex;
  align-items: center;

  &.left {
    justify-content: flex-start;
    flex: 1;
  }

  &.center {
    justify-content: center;
    flex: 2;
  }

  &.right {
    justify-content: flex-end;
    flex: 1;
  }
}

.toggle-left-sidebar,
.back-button,
.forward-button,
.toggle-right-sidebar {
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

    // &:hover:not(:disabled) {
    //   background-color: rgba(0, 0, 0, 0.05);
    // }

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
  }

  &:hover {
    background-color: var(--color-hover-button);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }
}

// {
//   position: relative;
//   display: flex;
//   align-items: center;
//   // width: 200px;
//   padding: 3px;
//   border: none;
//   background: none;
//   cursor: pointer;
//   transition: background-color 0.2s;
//   border-radius: 8px;
//   // margin: 2px 8px;

//   .icon {
//     background: none;
//     border: none;
//     cursor: pointer;
//     width: 24px;
//     height: 24px;
//     display: flex;
//     align-items: center;
//     justify-content: center;
//     border-radius: 6px;
//     transition: background-color 0.2s;
//     padding: 0;
//     // margin-right: 3px;

//     &:hover:not(:disabled) {
//       background-color: var(--color-hover-bg);
//     }

//     &:disabled {
//       opacity: 0.5;
//       cursor: not-allowed;
//     }

//     // 新增以下样式来处理 i-icon 类
//     :deep(.i-icon) {
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       width: 100%;
//       height: 100%;
//     }

//     :deep(svg) {
//       width: 18px; // 或者您想要的大小
//       height: 18px; // 或者您想要的大小
//     }
//   }

//   .name {
//     flex-grow: 0;
//     text-align: left;
//     color: var(--default-text-color);
//     font-size: 15px;
//     white-space: nowrap; // 防止文字换行
//     writing-mode: horizontal-tb; // 确保文字是水平排列的
//   }

//   &:hover {
//     background-color: var(--color-hover-bg);
//   }

//   &.active {
//     background-color: var(--color-menu-active-bg);
//     // border: 1px solid var(--color-primary);
//   }
// }

// .toggle-right-sidebar {
//   display: flex;
//   align-items: center;
//   // width: 200px;
//   // padding: 8px 12px;
//   border: none;
//   background: none;
//   cursor: pointer;
//   transition: background-color 0.2s;
//   border-radius: 8px;
//   // margin: 2px 8px;

//   .icon {
//     background: none;
//     border: none;
//     cursor: pointer;
//     width: 20px;
//     height: 20px;
//     display: flex;
//     align-items: center;
//     justify-content: center;
//     border-radius: 6px;
//     transition: background-color 0.2s;
//     padding: 0;
//     // margin-right: 3px;

//     &:hover:not(:disabled) {
//       background-color: var(--color-hover-bg);
//     }

//     &:disabled {
//       opacity: 0.5;
//       cursor: not-allowed;
//     }

//     // 新增以下样式来处理 i-icon 类
//     :deep(.i-icon) {
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       width: 100%;
//       height: 100%;
//     }

//     :deep(svg) {
//       width: 18px; // 或者您想要的大小
//       height: 18px; // 或者您想要的大小
//     }
//   }

//   &:hover {
//     background-color: var(--color-hover-bg);
//   }
// }
</style>
