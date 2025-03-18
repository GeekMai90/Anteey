import { createApp } from 'vue'
import MessageToast from '../components/common/MessageToast.vue'

interface MessageInstance {
  close: () => void
}

// 存储所有活动的消息实例
const activeMessages: MessageInstance[] = []

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

  loading(message: string, duration = 0) {
    return this.show(message, 'loading', duration)
  },

  show(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' | 'loading',
    duration: number
  ): MessageInstance | null {
    const container = document.createElement('div')

    // 找到消息容器并添加
    const messageContainer = document.querySelector('.message-container')
    if (!messageContainer) {
      console.error('Message container not found')
      return null
    }
    messageContainer.appendChild(container)

    const app = createApp(MessageToast, {
      message,
      type,
      duration
    })

    app.mount(container)

    let timer: number | null = null
    if (duration > 0) {
      timer = window.setTimeout(() => {
        app.unmount()
        messageContainer.removeChild(container)
        const index = activeMessages.indexOf(instance)
        if (index > -1) {
          activeMessages.splice(index, 1)
        }
      }, duration + 300) // 加300ms确保动画完成
    }

    const instance = {
      close: () => {
        if (timer) {
          clearTimeout(timer)
        }
        app.unmount()
        messageContainer.removeChild(container)
        const index = activeMessages.indexOf(instance)
        if (index > -1) {
          activeMessages.splice(index, 1)
        }
      }
    }

    activeMessages.push(instance)
    return instance
  },

  // 销毁所有消息
  destroy() {
    activeMessages.forEach((instance) => instance.close())
    activeMessages.length = 0
  }
}
