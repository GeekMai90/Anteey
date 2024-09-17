import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import './styles/main.scss'
// import clickOutside from './utils/clickOutside'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import FloatingVue from 'floating-vue'
import 'floating-vue/dist/style.css'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
// app.directive('click-outside', clickOutside)
// app.use(FloatingVue);
app.use(FloatingVue, {
  delay: {
    show: 10000, // 显示延迟 500 毫秒
    hide: 0 // 隐藏无延迟
  }
})

app.mount('#app')
