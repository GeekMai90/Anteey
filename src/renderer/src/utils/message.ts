import { createApp } from 'vue'
import MessageToast from '../components/common/MessageToast.vue'

export const message = {
  success(message: string, duration = 2000) {
    return this.show(message, 'success', duration)
  },

  error(message: string, duration = 2000) {
    return this.show(message, 'error', duration)
  },

  warning(message: string, duration = 2000) {
    return this.show(message, 'warning', duration)
  },

  info(message: string, duration = 2000) {
    return this.show(message, 'info', duration)
  },

  show(message: string, type: 'success' | 'error' | 'warning' | 'info', duration: number) {
    const container = document.createElement('div')

    // 找到消息容器并添加
    const messageContainer = document.querySelector('.message-container')
    if (!messageContainer) {
      console.error('Message container not found')
      return
    }
    messageContainer.appendChild(container)

    const app = createApp(MessageToast, {
      message,
      type,
      duration
    })

    app.mount(container)

    const timer = setTimeout(() => {
      app.unmount()
      messageContainer.removeChild(container)
    }, duration + 300) // 加300ms确保动画完成

    return {
      close: () => {
        clearTimeout(timer)
        app.unmount()
        messageContainer.removeChild(container)
      }
    }
  }
}
