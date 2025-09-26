<template>
  <div class="ai-usage">
    <div class="page-header">
      <h2>AI使用情况监控</h2>
      <p>查看AI生成内容的使用统计和服务状态</p>
    </div>
    
    <!-- 时间范围选择 -->
    <div class="time-range-selector">
      <el-radio-group v-model="selectedTimeRange" @change="handleTimeRangeChange">
        <el-radio-button label="7d">最近7天</el-radio-button>
        <el-radio-button label="30d">最近30天</el-radio-button>
        <el-radio-button label="90d">最近90天</el-radio-button>
      </el-radio-group>
      <el-button @click="refreshData" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新数据
      </el-button>
    </div>
    
    <!-- AI服务状态 -->
    <el-card class="status-card" v-if="aiStatus && aiStatus.provider">
      <template #header>
        <div class="card-header">
          <h3>AI服务状态</h3>
          <el-tag :type="aiStatus.clientInitialized ? 'success' : 'danger'">
            {{ aiStatus.clientInitialized ? '已连接' : '未连接' }}
          </el-tag>
        </div>
      </template>
      
      <el-row :gutter="20">
        <el-col :span="8">
          <div class="status-item">
            <label>服务提供商</label>
            <span class="status-value">{{ aiStatus.provider?.toUpperCase() || 'N/A' }}</span>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="status-item">
            <label>API密钥状态</label>
            <span class="status-value">
              <el-tag :type="aiStatus.environmentVariables?.GOOGLE_API_KEY === 'configured' ? 'success' : 'danger'">
                {{ aiStatus.environmentVariables?.GOOGLE_API_KEY === 'configured' ? '已配置' : '未配置' }}
              </el-tag>
            </span>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="status-item">
            <label>最后检查</label>
            <span class="status-value">{{ formatTime(aiStatus.lastChecked) }}</span>
          </div>
        </el-col>
      </el-row>
    </el-card>
    
    <!-- 使用统计概览 -->
    <el-row :gutter="20" class="stats-row" v-if="aiStats && aiStats.summary">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #9c27b0;">
              <el-icon size="24"><MagicStick /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">{{ aiStats.summary?.totalAiGenerated || 0 }}</div>
              <div class="stats-label">总AI生成次数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #ff9800;">
              <el-icon size="24"><Document /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">{{ aiStats.summary?.aiTemplates || 0 }}</div>
              <div class="stats-label">AI生成模板</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #4caf50;">
              <el-icon size="24"><DataLine /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">{{ aiStats.summary?.aiProjectData || 0 }}</div>
              <div class="stats-label">AI生成项目数据</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #2196f3;">
              <el-icon size="24"><TrendCharts /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">{{ aiStats.dailyUsage?.length || 0 }}</div>
              <div class="stats-label">活跃天数</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    
    <!-- 详细统计 -->
    <el-row :gutter="20" class="content-row">
      <!-- 每日使用趋势 -->
      <el-col :xs="24" :lg="12">
        <el-card class="chart-card">
          <template #header>
            <h3>每日AI使用趋势</h3>
          </template>
          
          <div class="chart-container" v-loading="loading">
            <div v-if="aiStats?.dailyUsage?.length > 0" class="daily-usage-list">
              <div 
                v-for="day in aiStats.dailyUsage" 
                :key="day.date"
                class="daily-item"
              >
                <div class="date">{{ formatDate(day.date) }}</div>
                <div class="count">{{ day.count }} 次</div>
                <div class="bar">
                  <div 
                    class="bar-fill" 
                    :style="{ width: getBarWidth(day.count) }"
                  ></div>
                </div>
              </div>
            </div>
            <div v-else class="no-data">
              <el-empty description="暂无使用数据" />
            </div>
          </div>
        </el-card>
      </el-col>
      
      <!-- 用户使用排行 -->
      <el-col :xs="24" :lg="12">
        <el-card class="chart-card">
          <template #header>
            <h3>用户AI使用排行</h3>
          </template>
          
          <div class="chart-container" v-loading="loading">
            <div v-if="aiStats?.usageByUser?.length > 0" class="user-usage-list">
              <div 
                v-for="(user, index) in aiStats.usageByUser" 
                :key="user.userId"
                class="user-item"
              >
                <div class="rank">{{ index + 1 }}</div>
                <div class="user-info">
                  <div class="username">{{ user.username }}</div>
                  <div class="role">{{ user.role }}</div>
                </div>
                <div class="count">{{ user.aiUsageCount }} 次</div>
                <div class="bar">
                  <div 
                    class="bar-fill" 
                    :style="{ width: getBarWidth(user.aiUsageCount, getMaxUserUsage()) }"
                  ></div>
                </div>
              </div>
            </div>
            <div v-else class="no-data">
              <el-empty description="暂无用户数据" />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 最近AI活动 -->
    <el-card class="activities-card">
      <template #header>
        <h3>最近AI活动</h3>
      </template>
      
      <div v-loading="loading">
        <div v-if="aiStats?.recentActivities?.length > 0" class="activities-list">
          <div 
            v-for="activity in aiStats.recentActivities" 
            :key="activity.id"
            class="activity-item"
          >
            <div class="activity-icon">
              <el-icon><MagicStick /></el-icon>
            </div>
            <div class="activity-content">
              <div class="activity-description">{{ activity.description }}</div>
              <div class="activity-meta">
                <span class="user">{{ activity.user?.username }}</span>
                <span class="time">{{ formatTime(activity.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="no-data">
          <el-empty description="暂无AI活动记录" />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { statsAPI } from '../api/index.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { 
  MagicStick, 
  Document, 
  DataLine, 
  TrendCharts, 
  Refresh,
} from '@element-plus/icons-vue'

// 配置dayjs
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

// 数据状态
const loading = ref(false)
const selectedTimeRange = ref('30d')
const aiStats = ref({
  summary: {
    totalAiGenerated: 0,
    aiTemplates: 0,
    aiProjectData: 0
  },
  dailyUsage: [],
  usageByUser: [],
  recentActivities: []
})
const aiStatus = ref({
  provider: 'unknown',
  clientInitialized: false,
  environmentVariables: {},
  lastChecked: new Date().toISOString()
})

// 格式化时间
const formatTime = (time) => {
  return dayjs(time).fromNow()
}

// 格式化日期
const formatDate = (date) => {
  return dayjs(date).format('MM-DD')
}

// 获取柱状图宽度
const getBarWidth = (count, max = null) => {
  if (!count || count === 0) return '0%'
  const maxCount = max || Math.max(...(aiStats.value?.dailyUsage?.map(d => d.count) || [1]))
  if (maxCount === 0) return '0%'
  return `${(count / maxCount) * 100}%`
}

// 获取用户使用最大值
const getMaxUserUsage = () => {
  if (!aiStats.value?.usageByUser?.length) return 1
  return Math.max(...aiStats.value.usageByUser.map(u => u.aiUsageCount))
}


// 获取AI使用数据
const fetchAIUsage = async () => {
  try {
    loading.value = true
    console.log('🤖 正在获取AI使用统计...')
    
    const [aiUsageResponse, aiStatusResponse] = await Promise.all([
      statsAPI.getAIUsage(selectedTimeRange.value),
      statsAPI.getAIStatus()
    ])
    
    if (aiUsageResponse.data?.success) {
      aiStats.value = aiUsageResponse.data.data
      console.log('✅ AI使用统计获取成功:', aiStats.value.summary)
    }
    
    if (aiStatusResponse.data?.success) {
      aiStatus.value = aiStatusResponse.data.data
      console.log('✅ AI服务状态获取成功:', aiStatus.value.provider)
    }
    
  } catch (error) {
    console.error('❌ 获取AI统计失败:', error)
  } finally {
    loading.value = false
  }
}

// 时间范围变化处理
const handleTimeRangeChange = () => {
  fetchAIUsage()
}

// 刷新数据
const refreshData = () => {
  fetchAIUsage()
}

// 页面加载时获取数据
onMounted(() => {
  fetchAIUsage()
})
</script>

<style scoped>
.ai-usage {
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.time-range-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.status-card {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-item label {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

.status-value {
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

.stats-row {
  margin-bottom: 24px;
}

.stats-card {
  height: 120px;
}


.stats-item {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 20px;
}

.stats-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  color: white;
}

.stats-content {
  flex: 1;
}

.stats-number {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stats-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.content-row {
  margin-bottom: 24px;
}

.chart-card {
  height: 400px;
}

.chart-card .card-header h3 {
  margin: 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.chart-container {
  height: 320px;
  overflow-y: auto;
}

.daily-usage-list,
.user-usage-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.daily-item,
.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.date {
  font-weight: 600;
  color: #303133;
  min-width: 60px;
}

.count {
  font-weight: 600;
  color: #409eff;
  min-width: 50px;
  text-align: right;
}

.bar {
  flex: 1;
  height: 8px;
  background: #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #67c23a);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.rank {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #409eff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.user-info {
  flex: 1;
}

.username {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.role {
  font-size: 12px;
  color: #909399;
}

.activities-card {
  margin-bottom: 24px;
}

.activities-card .card-header h3 {
  margin: 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.activities-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #9c27b0;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.activity-content {
  flex: 1;
}

.activity-description {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.activity-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}

.user {
  font-weight: 500;
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}
</style>
