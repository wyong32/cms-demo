import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

import App from './App.vue'
import router from './router'

console.log('🚀 开始创建Vue应用')

const app = createApp(App)
const pinia = createPinia()

// 注册状态管理
app.use(pinia)
console.log('✅ Pinia已注册')

// 注册Element Plus
app.use(ElementPlus, {
  locale: zhCn,
})
console.log('✅ Element Plus已注册')

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
console.log('✅ Element Plus图标已注册')

// 注册路由
app.use(router)
console.log('✅ 路由已注册')

// 挂载应用
app.mount('#app')
console.log('✅ 应用已挂载')
