// clickOutside.ts
import { Directive } from 'vue'
import { ipcRenderer } from 'electron'

export const clickOutside: Directive = {
  mounted(el, binding) {
    el.clickOutsideEvent = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value(event)
      }
    }

    // 添加到当前窗口
    window.addEventListener('click', el.clickOutsideEvent)

    // 监听来自其他窗口的点击事件
    ipcRenderer.on('global-click', el.clickOutsideEvent)
  },
  unmounted(el) {
    window.removeEventListener('click', el.clickOutsideEvent)
    ipcRenderer.removeListener('global-click', el.clickOutsideEvent)
  }
}

// export default clickOutside
