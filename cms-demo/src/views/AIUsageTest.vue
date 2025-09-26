<template>
  <div class="ai-usage-test">
    <h2>AI使用情况测试</h2>
    <p>这是一个简化的测试页面，用于验证AI使用情况功能是否正常。</p>
    
    <!-- 基本状态显示 -->
    <el-card>
      <template #header>
        <h3>AI服务状态</h3>
      </template>
      
      <div v-if="aiStatus">
        <p>服务提供商: {{ aiStatus.provider }}</p>
        <p>客户端状态: {{ aiStatus.clientInitialized ? '已连接' : '未连接' }}</p>
        <p>API密钥: {{ aiStatus.environmentVariables?.GOOGLE_API_KEY === 'configured' ? '已配置' : '未配置' }}</p>
      </div>
      <div v-else>
        <p>正在加载AI服务状态...</p>
      </div>
    </el-card>
    
    <!-- 基本统计显示 -->
    <el-card>
      <template #header>
        <h3>AI使用统计</h3>
      </template>
      
      <div v-if="aiStats">
        <p>总AI生成次数: {{ aiStats.summary?.totalAiGenerated || 0 }}</p>
        <p>AI生成模板: {{ aiStats.summary?.aiTemplates || 0 }}</p>
        <p>AI生成项目数据: {{ aiStats.summary?.aiProjectData || 0 }}</p>
      </div>
      <div v-else>
        <p>正在加载AI使用统计...</p>
      </div>
    </el-card>
    
    <!-- 测试按钮 -->
    <el-button @click="testAPI" :loading="loading">
      测试API连接
    </el-button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { statsAPI } from '../api/index.js'

// 数据状态
const loading = ref(false)
const aiStats = ref(null)
const aiStatus = ref(null)

// 测试API连接
const testAPI = async () => {
  try {
    loading.value = true
    console.log('🧪 测试API连接...')
    
    const [aiUsageResponse, aiStatusResponse] = await Promise.all([
      statsAPI.getAIUsage('30d'),
      statsAPI.getAIStatus()
    ])
    
    if (aiUsageResponse.data?.success) {
      aiStats.value = aiUsageResponse.data.data
      console.log('✅ AI使用统计获取成功')
    }
    
    if (aiStatusResponse.data?.success) {
      aiStatus.value = aiStatusResponse.data.data
      console.log('✅ AI服务状态获取成功')
    }
    
  } catch (error) {
    console.error('❌ API测试失败:', error)
  } finally {
    loading.value = false
  }
}

// 页面加载时测试
onMounted(() => {
  testAPI()
})
</script>

<style scoped>
.ai-usage-test {
  padding: 20px;
}

.el-card {
  margin-bottom: 20px;
}
</style>
