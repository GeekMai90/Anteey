// src/composables/useGlobalHotkeys.ts
import { onMounted, onUnmounted } from 'vue'
import hotkeys from 'hotkeys-js'
import { useNoteStore } from '../stores/noteStores'
import { useRouter } from 'vue-router'

export function useGlobalHotkeys() {
  const noteStore = useNoteStore()
  const router = useRouter()

  const setupHotkeys = () => {
    // 添加笔记快捷键
    hotkeys('ctrl+n, command+n', (event) => {
      event.preventDefault()
      noteStore.createAndOpenNewNote()
    })
    // 添加搜索快捷键
    hotkeys('ctrl+s, command+s', (event) => {
      event.preventDefault()
      noteStore.openSearchModal()
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
  }

  onMounted(() => {
    setupHotkeys()
  })

  onUnmounted(() => {
    hotkeys.unbind()
  })
}
