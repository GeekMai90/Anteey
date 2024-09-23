import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import './styles/main.scss'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import FloatingVue from 'floating-vue'
import 'floating-vue/dist/style.css'

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
// 添加这部分代码
router.isReady().then(() => {
  console.log('Router is ready, current path:', router.currentRoute.value.path)
  if (router.currentRoute.value.path === '/' || router.currentRoute.value.path === '') {
    console.log('Redirecting to /home')
    router.push('/home')
  }
})

app.mount('#app')
