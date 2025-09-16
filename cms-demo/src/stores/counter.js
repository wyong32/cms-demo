import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'

// 用户认证状态管理
export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref(null)
  const token = ref(localStorage.getItem('cms_token') || '')
  const isLoading = ref(false)

  // 计算属性
  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const username = computed(() => user.value?.username || '')

  // 动作
  const login = async (credentials, authAPI) => {
    try {
      isLoading.value = true
      const response = await authAPI.login(credentials)
      
      token.value = response.data.token
      user.value = response.data.user
      
      // 保存到本地存储
      localStorage.setItem('cms_token', response.data.token)
      localStorage.setItem('cms_user', JSON.stringify(response.data.user))
      
      ElMessage.success('登录成功')
      return response.data
    } catch (error) {
      ElMessage.error(error.response?.data?.error || '登录失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const logout = () => {
    token.value = ''
    user.value = null
    
    // 清除本地存储
    localStorage.removeItem('cms_token')
    localStorage.removeItem('cms_user')
    
    ElMessage.success('已退出登录')
  }

  const getCurrentUser = async (authAPI) => {
    try {
      if (!token.value) return null
      
      const response = await authAPI.getCurrentUser()
      user.value = response.data.user
      
      // 更新本地存储
      localStorage.setItem('cms_user', JSON.stringify(response.data.user))
      
      return response.data.user
    } catch (error) {
      console.error('获取用户信息失败:', error)
      // 如果是网络错误，不立即清除登录状态，让用户手动重试
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
        console.log('🌐 网络错误，保持当前状态')
        throw error
      }
      // 如果是认证错误，清除登录状态
      logout()
      throw error
    }
  }

  const initializeAuth = async () => {
    console.log('🔧 初始化认证状态...')
    
    // 从本地存储恢复token和用户信息
    const savedToken = localStorage.getItem('cms_token')
    const savedUser = localStorage.getItem('cms_user')
    
    if (savedToken) {
      token.value = savedToken
      console.log('✅ 从本地存储恢复令牌')
    }
    
    if (savedUser) {
      try {
        user.value = JSON.parse(savedUser)
        console.log('✅ 从本地存储恢复用户信息:', user.value?.username)
      } catch (error) {
        console.error('❌ 解析用户信息失败:', error)
        logout()
      }
    }
  }

  return {
    // 状态
    user,
    token,
    isLoading,
    
    // 计算属性
    isLoggedIn,
    isAdmin,
    username,
    
    // 动作
    login,
    logout,
    getCurrentUser,
    initializeAuth
  }
})
