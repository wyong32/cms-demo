import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/counter.js'

const app = createApp(App)
const pinia = createPinia()

// 注册状态管理
app.use(pinia)

// 注册Element Plus
app.use(ElementPlus, {
  locale: zhCn,
})

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 注册路由
app.use(router)

// 挂载应用
app.mount('#app')

// 初始化认证状态
const authStore = useAuthStore()
authStore.initializeAuth()
