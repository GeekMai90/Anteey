// src/stores/contextMenuStore.ts
import { defineStore } from 'pinia'
import { ref, computed, nextTick } from 'vue'
import { computePosition, flip, shift, offset } from '@floating-ui/dom'
import type { CSSProperties } from 'vue'

export const useContextMenuStore = defineStore('contextMenu', () => {
  const show = ref(false)
  const x = ref(0)
  const y = ref(0)
  const items = ref<{ label: string; action: () => void; icon: any }[]>([])

  const menuStyle = computed<CSSProperties>(() => ({
    position: 'fixed' as const,
    top: `${y.value}px`,
    left: `${x.value}px`
  }))

  async function showMenu(buttonElement: HTMLElement, newItems: typeof items.value) {
    // 先设置初始位置（使用按钮的位置）
    const buttonRect = buttonElement.getBoundingClientRect()
    x.value = buttonRect.left
    y.value = buttonRect.bottom
    items.value = newItems
    show.value = true

    // 等待 DOM 更新
    await nextTick()

    // 获取菜单元素
    const menuEl = document.querySelector('.global-context-menu') as HTMLElement
    if (!menuEl) return

    // 计算最终位置
    const { x: floatingX, y: floatingY } = await computePosition(buttonElement, menuEl, {
      placement: 'bottom-start',
      middleware: [
        offset(4),
        flip({
          fallbackPlacements: ['top-start', 'left-start', 'right-start']
        }),
        shift({ padding: 8 })
      ]
    })

    // 更新到最终位置
    x.value = floatingX
    y.value = floatingY
  }

  function closeMenu() {
    show.value = false
  }

  return { show, x, y, items, menuStyle, showMenu, closeMenu }
})
