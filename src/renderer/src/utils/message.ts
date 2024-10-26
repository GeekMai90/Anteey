import { createApp } from 'vue'
import MessageToast from '../components/common/MessageToast.vue'

export const message = {
  success(message: string, duration = 2000) {
    this.show(message, 'success', duration)
  },

  error(message: string, duration = 2000) {
    this.show(message, 'error', duration)
  },

  show(message: string, type: 'success' | 'error', duration: number) {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const app = createApp(MessageToast, {
      message,
      type,
      duration
    })

    app.mount(container)

    setTimeout(() => {
      app.unmount()
      document.body.removeChild(container)
    }, duration + 300) // 加300ms确保动画完成
  }
}
