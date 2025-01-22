// src/composables/useGlobalHotkeys.ts
import { onMounted, onUnmounted } from 'vue'
import hotkeys from 'hotkeys-js'
import { useNoteStore } from '../stores/noteStore'
import { useRouter } from 'vue-router'
import { useUIStore } from '../stores/UIStore'
import { useThemeStore } from '../stores/themeStore'
export function useGlobalHotkeys() {
  const noteStore = useNoteStore()
  const router = useRouter()
  const uiStore = useUIStore()
  const themeStore = useThemeStore()
  const setupHotkeys = () => {
    // 配置 hotkeys，让它在所有元素上都生效，包括输入框和编辑器
    hotkeys.filter = () => true

    // 添加笔记快捷键
    hotkeys('ctrl+n, command+n', (event) => {
      event.preventDefault()
      noteStore.createAndOpenNewNote()
    })
    // 搜索笔记
    hotkeys('ctrl+s, command+s', (event) => {
      event.preventDefault()
      uiStore.openSearchModal()
    })
    // 打开主页的快捷键
    hotkeys('command+shift+h, ctrl+shift+h', (event) => {
      event.preventDefault()
      router.push('/home')
    })
    // 打开时光记的快捷键
    hotkeys('command+j, ctrl+j', (event) => {
      event.preventDefault()
      router.push('/timeblock')
    })
    // 打开笔记流页面
    hotkeys('command+l, ctrl+l', (event) => {
      event.preventDefault()
      router.push('/timeline')
    })
    // 打开草稿纸页面
    // hotkeys('command+;, ctrl+;', (event) => {
    //   event.preventDefault()
    //   router.push('/drafts')
    // })
    // 打开卡片盒
    hotkeys('command+o, ctrl+o', (event) => {
      event.preventDefault()
      router.push('/cardbox')
    })
    // 打开思维板
    hotkeys('command+shift+w, ctrl+shift+w', (event) => {
      event.preventDefault()
      router.push('/whiteboard')
    })
    // 打开设置
    hotkeys('command+,, ctrl+,', (event) => {
      event.preventDefault()
      uiStore.openSettingsPage()
    })
    // 折叠/展开左侧边栏
    hotkeys('command+shift+/, ctrl+shift+/', (event) => {
      event.preventDefault()
      uiStore.toggleSidebar()
    })
    // 折叠/展开右侧边栏
    hotkeys('command+/, ctrl+/', (event) => {
      event.preventDefault()
      uiStore.toggleRightSidebar()
    })
    // 切换主题
    hotkeys('command+shift+t, ctrl+shift+t', (event) => {
      event.preventDefault()
      themeStore.toggleThemeMode()
    })
    // 打开/关闭右侧边栏多开笔记
    hotkeys("command+', ctrl+'", (event) => {
      event.preventDefault()

      // 如果右侧边栏已打开且当前是多开笔记标签，则关闭右侧边栏
      if (uiStore.isRightSidebarOpen && uiStore.rightSidebarTab === 'multi') {
        uiStore.toggleRightSidebar()
      } else {
        // 否则，确保右侧边栏打开并切换到多开笔记标签
        if (!uiStore.isRightSidebarOpen) {
          uiStore.toggleRightSidebar()
        }
        uiStore.rightSidebarTab = 'multi'
      }
    })
    // 打开/关闭右侧边栏草稿纸
    hotkeys('command+;, ctrl+;', (event) => {
      event.preventDefault()

      // 如果右侧边栏已打开且当前是草稿纸标签，则关闭右侧边栏
      if (uiStore.isRightSidebarOpen && uiStore.rightSidebarTab === 'drafts') {
        uiStore.toggleRightSidebar()
      } else {
        // 否则，确保右侧边栏打开并切换到草稿纸标签
        if (!uiStore.isRightSidebarOpen) {
          uiStore.toggleRightSidebar()
        }
        uiStore.rightSidebarTab = 'drafts'
      }
    })
    // 打开/关闭右侧边栏小组件
    hotkeys('command+., ctrl+.', (event) => {
      event.preventDefault()

      // 如果右侧边栏已打开且当前是小组件标签，则关闭右侧边栏
      if (uiStore.isRightSidebarOpen && uiStore.rightSidebarTab === 'widgets') {
        uiStore.toggleRightSidebar()
      } else {
        // 否则，确保右侧边栏打开并切换到小组件标签
        if (!uiStore.isRightSidebarOpen) {
          uiStore.toggleRightSidebar()
        }
        uiStore.rightSidebarTab = 'widgets'
      }
    })
  }

  onMounted(() => {
    setupHotkeys()
  })

  onUnmounted(() => {
    // 重置 hotkeys 的过滤器
    hotkeys.filter = function (event) {
      const target = event.target as HTMLElement
      const { tagName } = target
      return !(target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA')
    }
    hotkeys.unbind()
  })
}
