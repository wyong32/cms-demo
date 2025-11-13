<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h2>欢迎使用 CMS 后台管理系统</h2>
      <p>当前用户：{{ authStore.username }} ({{ authStore.user?.role === 'ADMIN' ? '管理员' : '普通用户' }})</p>
    </div>
    
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #409eff;">
              <el-icon size="24"><Document /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">
                <el-skeleton v-if="loading" :rows="1" animated />
                <span v-else>{{ stats.totalTemplates }}</span>
              </div>
              <div class="stats-label">数据模板</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #67c23a;">
              <el-icon size="24"><FolderOpened /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">
                <el-skeleton v-if="loading" :rows="1" animated />
                <span v-else>{{ stats.totalCategories }}</span>
              </div>
              <div class="stats-label">分类</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #e6a23c;">
              <el-icon size="24"><Folder /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">
                <el-skeleton v-if="loading" :rows="1" animated />
                <span v-else>{{ stats.totalProjects }}</span>
              </div>
              <div class="stats-label">项目</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #f56c6c;">
              <el-icon size="24"><DataLine /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">
                <el-skeleton v-if="loading" :rows="1" animated />
                <span v-else>{{ stats.totalProjectData }}</span>
              </div>
              <div class="stats-label">项目数据</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- AI使用情况统计 -->
    <el-row :gutter="20" class="stats-row" v-if="aiStats && aiStats.summary">
      <el-col :xs="24" :sm="8" :md="6">
        <el-card class="stats-card ai-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #9c27b0;">
              <el-icon size="24"><MagicStick /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">
                <el-skeleton v-if="aiLoading" :rows="1" animated />
                <span v-else>{{ aiStats.summary?.totalAiGenerated || 0 }}</span>
              </div>
              <div class="stats-label">AI生成总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="8" :md="6">
        <el-card class="stats-card ai-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #ff9800;">
              <el-icon size="24"><Document /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">
                <el-skeleton v-if="aiLoading" :rows="1" animated />
                <span v-else>{{ aiStats.summary?.aiTemplates || 0 }}</span>
              </div>
              <div class="stats-label">AI模板</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="8" :md="6">
        <el-card class="stats-card ai-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #4caf50;">
              <el-icon size="24"><DataLine /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">
                <el-skeleton v-if="aiLoading" :rows="1" animated />
                <span v-else>{{ aiStats.summary?.aiProjectData || 0 }}</span>
              </div>
              <div class="stats-label">AI项目数据</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="8" :md="6">
        <el-card class="stats-card ai-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #2196f3;">
              <el-icon size="24"><Setting /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">
                <el-skeleton v-if="aiLoading" :rows="1" animated />
                <span v-else>{{ aiStatus?.provider || 'N/A' }}</span>
              </div>
              <div class="stats-label">AI服务商</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    
    <!-- 内容区域 -->
    <el-row :gutter="20" class="content-row">
      <!-- 最近活动 -->
      <el-col :xs="24" :lg="12">
        <el-card class="content-card">
          <template #header>
            <div class="card-header">
              <h3>最近活动</h3>
              <el-button type="text" @click="refreshActivities">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
          </template>
          
          <div class="activities-list" v-loading="activitiesLoading">
            <div 
              v-for="activity in recentActivities" 
              :key="activity.id"
              class="activity-item"
            >
              <div class="activity-icon">
                <el-icon>
                  <Plus v-if="activity.action === 'CREATE'" />
                  <Edit v-else-if="activity.action === 'UPDATE'" />
                  <Delete v-else-if="activity.action === 'DELETE'" />
                  <Operation v-else />
                </el-icon>
              </div>
              <div class="activity-content">
                <div class="activity-description">{{ activity.description }}</div>
                <div class="activity-meta">
                  <span class="activity-user">{{ activity.user?.username }}</span>
                  <span class="activity-time">{{ formatTime(activity.createdAt) }}</span>
                </div>
              </div>
            </div>
            
            <div v-if="recentActivities.length === 0" class="empty-state">
              <el-empty description="暂无活动记录" />
            </div>
          </div>
        </el-card>
      </el-col>
      
      <!-- 快速操作 -->
      <el-col :xs="24" :lg="12">
        <el-card class="content-card">
          <template #header>
            <h3>快速操作</h3>
          </template>
          
          <div class="quick-actions">
            <el-button-group class="action-group">
              <el-button type="primary" @click="$router.push('/data-templates')">
                <el-icon><Plus /></el-icon>
                添加数据模板
              </el-button>
              <el-button @click="$router.push('/categories')">
                <el-icon><FolderOpened /></el-icon>
                管理分类
              </el-button>
            </el-button-group>
            
            <el-button-group class="action-group">
              <el-button @click="$router.push('/projects')">
                <el-icon><Folder /></el-icon>
                查看项目
              </el-button>
              <el-button @click="$router.push('/operations')">
                <el-icon><Operation /></el-icon>
                操作管理
              </el-button>
            </el-button-group>
            
            <el-button-group v-if="authStore.isAdmin" class="action-group">
              <el-button type="success" @click="$router.push('/admin/projects')">
                <el-icon><Plus /></el-icon>
                添加项目
              </el-button>
              <el-button type="warning" @click="$router.push('/admin/users')">
                <el-icon><UserFilled /></el-icon>
                管理用户
              </el-button>
            </el-button-group>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/counter.js'
import { logAPI, statsAPI } from '../api/index.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { 
  Document, 
  FolderOpened, 
  Folder, 
  DataLine, 
  Refresh, 
  Plus, 
  Edit, 
  Delete, 
  Operation, 
  UserFilled,
  MagicStick,
  Setting,
} from '@element-plus/icons-vue'

// 配置dayjs
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const authStore = useAuthStore()

// 统计数据
const stats = ref({
  totalTemplates: 0,
  totalCategories: 0,
  totalProjects: 0,
  totalProjectData: 0
})

// AI统计数据
const aiStats = ref({
  summary: {
    totalAiGenerated: 0,
    aiTemplates: 0,
    aiProjectData: 0
  }
})
const aiStatus = ref({
  provider: 'unknown'
})

// 加载状态
const loading = ref(true)
const activitiesLoading = ref(false)
const aiLoading = ref(false)

// 最近活动
const recentActivities = ref([])

// 格式化时间
const formatTime = (time) => {
  return dayjs(time).fromNow()
}


// 获取AI使用统计
const fetchAIStats = async () => {
  try {
    aiLoading.value = true
    
    const [aiUsageResponse, aiStatusResponse] = await Promise.all([
      statsAPI.getAIUsage('30d'),
      statsAPI.getAIStatus()
    ])
    
    if (aiUsageResponse.data?.success) {
      aiStats.value = aiUsageResponse.data.data
    }
    
    if (aiStatusResponse.data?.success) {
      aiStatus.value = aiStatusResponse.data.data
    }
    
  } catch (error) {
    console.error('获取AI统计失败:', error)
  } finally {
    aiLoading.value = false
  }
}

// 获取统计数据
const fetchStats = async () => {
  try {
    loading.value = true
    const response = await statsAPI.getOverview()
    
    if (response.data?.success && response.data?.data?.overview) {
      const overview = response.data.data.overview
      stats.value = {
        totalTemplates: overview.totalTemplates,
        totalCategories: overview.totalCategories,
        totalProjects: overview.totalProjects,
        totalProjectData: overview.totalProjectData
      }
    } else {
      throw new Error('统计数据格式错误')
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    // 如果API调用失败，使用默认值
    stats.value = {
      totalTemplates: 0,
      totalCategories: 0,
      totalProjects: 0,
      totalProjectData: 0
    }
  } finally {
    loading.value = false
  }
}

// 刷新活动列表
const refreshActivities = async () => {
  try {
    activitiesLoading.value = true
    const response = await logAPI.getLogs({ page: 1, limit: 10 })
    recentActivities.value = response?.data?.logs || []
  } catch (error) {
    console.error('获取活动记录失败:', error)
    // 使用模拟数据
    recentActivities.value = [
      {
        id: 1,
        action: 'CREATE',
        description: '创建了新的数据模板 "用户信息模板"',
        user: { username: 'admin' },
        createdAt: new Date(Date.now() - 1000 * 60 * 30) // 30分钟前
      },
      {
        id: 2,
        action: 'UPDATE',
        description: '更新了项目 "电商系统"',
        user: { username: 'user1' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2小时前
      },
      {
        id: 3,
        action: 'CREATE',
        description: '添加了新分类 "前端组件"',
        user: { username: 'admin' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5) // 5小时前
      }
    ]
  } finally {
    activitiesLoading.value = false
  }
}

// 页面加载时获取数据
onMounted(async () => {
  try {
    await Promise.all([
      fetchStats(),
      fetchAIStats(),
      refreshActivities()
    ])
  } catch (error) {
    console.error('页面初始化失败:', error)
  }
})
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.dashboard-header {
  margin-bottom: 24px;
}

.dashboard-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.dashboard-header p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.stats-row {
  margin-bottom: 24px;
}

.stats-card {
  height: 120px;
}

.ai-card {
  border-left: 4px solid #9c27b0;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
}

.ai-card .stats-icon {
  box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
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
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 8px;
  min-height: 32px;
  display: flex;
  align-items: center;
}

.stats-number .el-skeleton {
  width: 60px;
  height: 28px;
}

.stats-label {
  font-size: 14px;
  color: #909399;
}

.content-row {
  margin-bottom: 24px;
}

.content-card {
  height: 400px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.activities-list {
  height: 320px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
  color: #909399;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-description {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
  line-height: 1.4;
}

.activity-meta {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #909399;
}

.activity-user {
  margin-right: 12px;
}

.activity-time {
  color: #c0c4cc;
}

.quick-actions {
  padding: 20px 0;
}

.action-group {
  display: flex;
  margin-bottom: 16px;
  width: 100%;
}

.action-group .el-button {
  flex: 1;
  margin-right: 12px;
}

.action-group .el-button:last-child {
  margin-right: 0;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .stats-row {
    margin-bottom: 16px;
  }
  
  .content-card {
    height: auto;
    margin-bottom: 16px;
  }
  
  .activities-list {
    height: auto;
    max-height: 300px;
  }
  
  .dashboard {
    padding: 12px;
  }
}
</style>