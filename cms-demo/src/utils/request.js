import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/counter.js'

// 创建axios实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://cms-demo-api.vercel.app/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('cms_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 为上传接口设置正确的Content-Type
    if (config.url && config.url.includes('/upload/')) {
      // 上传文件时，让浏览器自动设置Content-Type为multipart/form-data
      delete config.headers['Content-Type']
      console.log('📤 上传请求: 移除Content-Type让浏览器自动设置')
    }
    
    // 为AI生成接口设置更长的超时时间
    if (config.url && config.url.includes('/ai/generate')) {
      config.timeout = 60000 // AI生成设置60秒超时
      console.log('🤖 AI生成请求: 设置超时时间为60秒')
    }
    
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 直接返回整个响应，让调用方决定如何处理数据
    return response
  },
  (error) => {
    console.error('响应错误:', error)
    
    // 处理超时错误
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      if (error.config && error.config.url && error.config.url.includes('/ai/generate')) {
        ElMessage.error('AI生成超时，请稍后再试或检查网络连接')
      } else {
        ElMessage.error('请求超时，请检查网络连接')
      }
      return Promise.reject(error)
    }
    
    const { response } = error
    
    if (response) {
      const { status, data } = response
      
      switch (status) {
        case 401:
          // Token过期或无效，清除认证状态并跳转登录
          console.log('🔒 收到401错误，清除认证状态')
          const authStore = useAuthStore()
          authStore.logout()
          ElMessage.error('登录已过期，请重新登录')
          // 使用路由跳转而不是直接修改location
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          break
        case 403:
          ElMessage.error(data.error || '权限不足')
          break
        case 404:
          ElMessage.error(data.error || '请求的资源不存在')
          break
        case 500:
          ElMessage.error(data.error || '服务器内部错误')
          break
        default:
          ElMessage.error(data.error || '请求失败')
      }
    } else {
      // 网络错误或其他错误
      if (error.code === 'ECONNABORTED') {
        // 超时错误已在上面处理
      } else if (error.code === 'ERR_NETWORK') {
        ElMessage.error('网络连接失败，请检查网络设置')
      } else {
        ElMessage.error('网络错误，请检查网络连接')
      }
    }
    
    return Promise.reject(error)
  }
)

export default api