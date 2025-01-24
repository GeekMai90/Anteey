import { reactive, Ref, nextTick, onMounted, onUnmounted } from 'vue'

// 类型定义
interface MenuPosition {
  x: number
  y: number
}

interface MenuState {
  isOpen: boolean
  position: MenuPosition
}

interface MenuOptions {
  buttonRef: Ref<HTMLElement | null>
  menuRef?: Ref<HTMLElement | null>
  onOpen?: () => void
  onClose?: () => void
}

// 核心逻辑
export function useMenu(options: MenuOptions) {
  const menuState = reactive<MenuState>({
    isOpen: false,
    position: { x: 0, y: 0 }
  })

  // 计算菜单位置
  const calculateMenuPosition = async (buttonElement: HTMLElement) => {
    const buttonRect = buttonElement.getBoundingClientRect()
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    // 默认位置：按钮正下方
    let x = buttonRect.left
    let y = buttonRect.bottom + 8 // 在按钮下方 8px 的位置

    if (options.menuRef?.value) {
      const menuWidth = options.menuRef.value.offsetWidth
      const menuHeight = options.menuRef.value.offsetHeight

      // 1. 优先保持在按钮正下方
      x = buttonRect.left

      // 2. 检查右侧空间
      if (x + menuWidth > windowWidth - 10) {
        // 右侧空间不足，尝试左对齐到窗口右边界
        x = windowWidth - menuWidth - 10

        // 如果左对齐后 x 为负，则改为左对齐到窗口左边界
        if (x < 10) {
          x = 10
        }
      }

      // 3. 检查下方空间
      if (y + menuHeight > windowHeight - 10) {
        // 下方空间不足，显示在按钮上方
        y = buttonRect.top - menuHeight - 8
      }
    }

    return { x, y }
  }

  const toggleMenu = async (event?: MouseEvent) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    menuState.isOpen = !menuState.isOpen

    if (menuState.isOpen && options.buttonRef?.value) {
      // 先设置一个初始位置，让菜单显示出来
      const buttonRect = options.buttonRef.value.getBoundingClientRect()
      menuState.position = {
        x: buttonRect.left,
        y: buttonRect.bottom + 8
      }

      // 等待菜单渲染完成后再精确计算位置
      await nextTick()
      if (options.menuRef?.value) {
        menuState.position = await calculateMenuPosition(options.buttonRef.value)
      }

      options.onOpen?.()
    } else {
      options.onClose?.()
    }
  }

  // 关闭菜单
  const closeMenu = () => {
    menuState.isOpen = false
    options.onClose?.()
  }

  // 修改 handleDocumentClick 函数
  const handleDocumentClick = (event: MouseEvent) => {
    // 如果菜单未打开，不处理
    if (!menuState.isOpen) return

    const target = event.target as Node
    const buttonEl = options.buttonRef?.value

    // 只处理按钮的点击，其他的交给 PopupMenu 组件处理
    if (buttonEl?.contains(target)) {
      return
    }
  }

  // 添加 ESC 键关闭菜单
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && menuState.isOpen) {
      closeMenu()
    }
  }

  // 在组件挂载时添加事件监听
  onMounted(() => {
    document.addEventListener('click', handleDocumentClick)
    document.addEventListener('keydown', handleKeyDown)
  })

  // 在组件卸载时移除事件监听
  onUnmounted(() => {
    document.removeEventListener('click', handleDocumentClick)
    document.removeEventListener('keydown', handleKeyDown)
  })

  return {
    menuState,
    toggleMenu,
    closeMenu
  }
}
