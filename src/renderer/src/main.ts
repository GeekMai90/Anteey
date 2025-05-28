import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import './styles/main.scss'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import FloatingVue from 'floating-vue'
import 'floating-vue/dist/style.css'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import { useNoteStore } from './stores/noteStore'
import ShortKey from 'vue3-shortkey'
import { useAppearanceStore } from './stores/appearanceStore'
import { useAuthStore } from './stores/authStore'
import { useImageBedStore } from './stores/imageBedStore'

async function initializeApp() {
  const app = createApp(App)

  // 初始化 Pinia
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  app.use(pinia)
  app.use(router)

  // 注册 click-outside 指令
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
    delay: { show: 10000, hide: 0 }
  })

  // 并行初始化 stores
  const initPromises = [
    useNoteStore().initializeStore(),
    useAppearanceStore().initializeSettings(),
    useAuthStore().initStore(), // 添加认证初始化
    useImageBedStore().initialize() // 添加图床store初始化
  ]

  // 挂载应用不等待初始化完成
  app.mount('#app')

  // 异步等待所有初始化完成
  try {
    await Promise.all(initPromises)
  } catch (error) {
    console.error('Store 初始化失败:', error)
  }
}

// 启动应用
initializeApp().catch(console.error)
