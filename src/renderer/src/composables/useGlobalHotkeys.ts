// src/composables/useGlobalHotkeys.ts
import { onMounted, onUnmounted } from 'vue'
import hotkeys from 'hotkeys-js'
import { useNoteStore } from '../stores/note-store'
import { useRouter } from 'vue-router'
import { useUIStore } from '../stores/useUIStore'

export function useGlobalHotkeys() {
  const noteStore = useNoteStore()
  const router = useRouter()
  const uiStore = useUIStore()

  const setupHotkeys = () => {
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
      router.push('/home') // 假设主页的路由是 '/'
    })
    // 打开时间线页面
    hotkeys('command+j, ctrl+j', (event) => {
      event.preventDefault()
      router.push('/timeline') // 假设时间线页面的路由是 '/timeline'
    })
    // 打开卡片盒
    hotkeys('command+shift+b, ctrl+shift+b', (event) => {
      event.preventDefault()
      router.push('/cardbox') // 假设时间线页面的路由是 '/timeline'
    })
    // 打开主要卡片盒
    hotkeys('command+shift+m, ctrl+shift+m', (event) => {
      event.preventDefault()
      router.push('/maincard') // 假设时间线页面的路由是 '/timeline'
    })
    // 打开索引卡片盒
    hotkeys('command+shift+i, ctrl+shift+i', (event) => {
      event.preventDefault()
      router.push('/indexcard') // 假设时间线页面的路由是 '/timeline'
    })
    // 打开文献卡片盒
    hotkeys('command+shift+l, ctrl+shift+l', (event) => {
      event.preventDefault()
      router.push('/bibcard') // 假设时间线页面的路由是 '/timeline'
    })
    // 打开思维板
    hotkeys('command+shift+w, ctrl+shift+w', (event) => {
      event.preventDefault()
      router.push('/whiteboard') // 假设时间线页面的路由是 '/timeline'
    })
    // 打开设置
    hotkeys('command+,, ctrl+,', (event) => {
      event.preventDefault()
      uiStore.openSettingsPage()
    })
    // 折叠/展开左侧边栏
    hotkeys('command+/, ctrl+/', (event) => {
      event.preventDefault()
      uiStore.toggleSidebar()
    })
    // 折叠/展开右侧边栏
    hotkeys('command+shift+/, ctrl+shift+/', (event) => {
      event.preventDefault()
      uiStore.toggleRightSidebar()
    })
    // 切换主题
    hotkeys('command+shift+t, ctrl+shift+t', (event) => {
      event.preventDefault()
      uiStore.toggleTheme()
    })
  }

  onMounted(() => {
    setupHotkeys()
  })

  onUnmounted(() => {
    hotkeys.unbind()
  })
}
