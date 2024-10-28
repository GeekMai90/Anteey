import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import './styles/main.scss'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import FloatingVue from 'floating-vue'
import 'floating-vue/dist/style.css'
import { useNoteStore } from './stores/note-store'
import ShortKey from 'vue3-shortkey'
// import log from 'electron-log/renderer' // 修改这里，使用 renderer 版本

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.directive('click-outside', {
  mounted(el, binding) {
    el.clickOutsideEvent = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value(event)
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent)
  }
})
app.use(ShortKey, { prevent: ['input', 'textarea'] })

// app.use(FloatingVue)
app.use(FloatingVue, {
  delay: {
    show: 10000, // 显示延迟 500 毫秒
    hide: 0 // 隐藏无延迟
  }
})
if (process.env.NODE_ENV === 'development') {
  ;(app.config as any).devtools = true
}

const noteStore = useNoteStore()
noteStore.initializeStore()

// 配置日志
// 直接使用 log 的方法
// console.log = (...args) => log.log(...args)
// console.error = (...args) => log.error(...args)
// console.warn = (...args) => log.warn(...args)
// console.info = (...args) => log.info(...args)

app.mount('#app')
