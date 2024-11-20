import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import './styles/main.scss'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import FloatingVue from 'floating-vue'
import 'floating-vue/dist/style.css'
import { useNoteStore } from './stores/noteStores'
import ShortKey from 'vue3-shortkey'
import { useAppearanceStore } from './stores/appearanceStore'

async function initializeApp() {
  const app = createApp(App)

  // 初始化 Pinia
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  app.use(pinia)

  // 初始化路由
  app.use(router)

  // 注册指令
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

  // 注册插件
  app.use(ShortKey, { prevent: ['input', 'textarea'] })
  app.use(FloatingVue, {
    delay: {
      show: 10000,
      hide: 0
    }
  })

  if (process.env.NODE_ENV === 'development') {
    ;(app.config as any).devtools = true
  }

  // 初始化 stores
  const noteStore = useNoteStore()
  await noteStore.initializeStore()

  // 初始化外观设置
  const appearanceStore = useAppearanceStore()
  await appearanceStore.initializeSettings()

  // 挂载应用
  app.mount('#app')
}

// 启动应用
initializeApp().catch(console.error)
