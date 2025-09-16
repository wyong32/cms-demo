<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1>CMS 后台管理系统</h1>
        <p>欢迎使用内容管理系统</p>
      </div>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        status-icon
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            size="large"
            placeholder="请输入用户名"
            prefix-icon="User"
            clearable
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            size="large"
            placeholder="请输入密码"
            prefix-icon="Lock"
            show-password
            clearable
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-button"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-footer">
        <p>默认管理员账户</p>
        <p>用户名: <code>admin</code> 密码: <code>wanghuan1235789</code></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/counter.js'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()

// 表单引用
const loginFormRef = ref()

// 登录表单数据
const loginForm = reactive({
  username: '',
  password: ''
})

// 表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ]
}

// 加载状态
const loading = ref(false)

// 处理登录
const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  try {
    // 验证表单
    await loginFormRef.value.validate()
    
    loading.value = true
    
    // 调用登录接口
    await authStore.login({
      username: loginForm.username.trim(),
      password: loginForm.password
    })
    
    // 登录成功，跳转到首页
    router.push({ name: 'Dashboard' })
  } catch (error) {
    console.error('登录失败:', error)
    if (error.errors) {
      // 表单验证错误
      return
    }
    ElMessage.error('登录失败，请检查用户名和密码')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-box {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.login-header {
  text-align: center;
  padding: 40px 30px 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.login-header h1 {
  margin: 0 0 10px;
  font-size: 28px;
  font-weight: 600;
}

.login-header p {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.login-form {
  padding: 40px 30px 30px;
}

.login-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
}

.login-footer {
  padding: 0 30px 30px;
  text-align: center;
  color: #666;
  font-size: 12px;
  border-top: 1px solid #f0f0f0;
  margin-top: 20px;
  padding-top: 20px;
}

.login-footer p {
  margin: 5px 0;
}

.login-footer code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-button) {
  border-radius: 8px;
}
</style>