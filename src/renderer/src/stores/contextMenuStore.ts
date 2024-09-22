// src/stores/contextMenuStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useContextMenuStore = defineStore('contextMenu', () => {
  const show = ref(false)
  const x = ref(0)
  const y = ref(0)
  const items = ref<{ label: string; action: () => void; icon: any }[]>([])

  const menuStyle = computed(() => {
    const style: { [key: string]: string } = {
      position: 'fixed',
      top: `${y.value}px`,
      left: `${x.value}px`
    }

    // 检查是否靠近屏幕右边缘
    if (window.innerWidth - x.value < 200) {
      style.right = `${window.innerWidth - x.value}px`
      delete style.left
    }

    // 检查是否靠近屏幕底部
    if (window.innerHeight - y.value < 100) {
      style.bottom = `${window.innerHeight - y.value}px`
      delete style.top
    }

    return style
  })

  function showMenu(newX: number, newY: number, newItems: typeof items.value) {
    x.value = newX
    y.value = newY
    items.value = newItems
    show.value = true
  }

  function closeMenu() {
    show.value = false
  }

  return { show, x, y, items, menuStyle, showMenu, closeMenu }
})
