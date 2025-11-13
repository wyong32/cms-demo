import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/counter.js'
import { API_TIMEOUT } from '../constants'

// 创建axios实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : 'https://cms-demo-api.vercel.app/api'),
  timeout: 30000, // 增加到30秒
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
    }
    
    // 为AI生成接口设置更长的超时时间
    if (config.url && config.url.includes('/ai/generate')) {
      config.timeout = API_TIMEOUT.AI_GENERATE
    }
    
    return config
  },
  (error) => {
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
          const authStore = useAuthStore()
          authStore.logout()
          ElMessage.error('登录已过期，请重新登录')
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
        case 405:
          ElMessage.error('请求方法不被允许，请检查API配置')
          break
        case 429:
          // 429错误（配额超限）由具体业务逻辑处理，这里不显示通用错误
          // 避免重复显示错误信息
          break
        case 500:
          ElMessage.error(data.error || '服务器内部错误')
          break
        default:
          ElMessage.error(data.error || '请求失败')
      }
    } else {
      // 网络错误或其他错误
      if (error.code === 'ERR_NETWORK') {
        ElMessage.error('网络连接失败，请检查网络设置')
      } else {
        ElMessage.error('网络错误，请检查网络连接')
      }
    }
    
    return Promise.reject(error)
  }
)

export default api