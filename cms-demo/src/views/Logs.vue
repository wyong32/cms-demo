<template>
  <div class="logs-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>操作日志</h2>
      <p>系统操作记录与统计分析</p>
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
              <div class="stats-number">{{ logStats.totalLogs || 0 }}</div>
              <div class="stats-label">总日志数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #67c23a;">
              <el-icon size="24"><Plus /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">{{ getActionCount('CREATE') }}</div>
              <div class="stats-label">创建操作</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #e6a23c;">
              <el-icon size="24"><Edit /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">{{ getActionCount('UPDATE') }}</div>
              <div class="stats-label">更新操作</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #f56c6c;">
              <el-icon size="24"><Delete /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">{{ getActionCount('DELETE') }}</div>
              <div class="stats-label">删除操作</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选和搜索 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="操作类型">
          <el-select 
            v-model="searchForm.action" 
            placeholder="请选择操作类型" 
            clearable 
            @change="handleSearch"
            style="width: 150px"
          >
            <el-option label="创建" value="CREATE" />
            <el-option label="更新" value="UPDATE" />
            <el-option label="删除" value="DELETE" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标类型">
          <el-select 
            v-model="searchForm.targetType" 
            placeholder="请选择目标类型" 
            clearable 
            @change="handleSearch"
            style="width: 150px"
          >
            <el-option label="项目" value="PROJECT" />
            <el-option label="模板" value="TEMPLATE" />
            <el-option label="分类" value="CATEGORY" />
            <el-option label="项目数据" value="PROJECT_DATA" />
            <el-option label="用户" value="USER" />
          </el-select>
        </el-form-item>
        <el-form-item label="用户">
          <el-input
            v-model="searchForm.username"
            placeholder="请输入用户名"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
            style="width: 150px"
          />
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @change="handleDateChange"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button v-if="authStore.isAdmin" type="danger" @click="handleCleanup">
            <el-icon><Delete /></el-icon>
            清理旧日志
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 日志表格 -->
    <el-card class="table-card" shadow="never">
      <el-table 
        v-loading="loading"
        :data="tableData" 
        border
        stripe
      >
        <el-table-column label="操作类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag 
              :type="getActionTagType(row.action)"
              size="small"
            >
              {{ getActionText(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="目标类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag type="info" size="small">
              {{ getTargetTypeText(row.targetType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作描述" min-width="300">
          <template #default="{ row }">
            {{ row.description }}
          </template>
        </el-table-column>
        <el-table-column label="操作用户" width="120">
          <template #default="{ row }">
            <div class="user-info">
              <span>{{ row.user?.username }}</span>
              <el-tag 
                v-if="row.user?.role === 'ADMIN'" 
                type="warning" 
                size="small"
                class="role-tag"
              >
                管理员
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleViewDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          :current-page="pagination.page"
          :page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 日志详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="日志详情"
      width="600px"
    >
      <div v-if="selectedLog" class="log-detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="操作ID">
            {{ selectedLog.id }}
          </el-descriptions-item>
          <el-descriptions-item label="操作类型">
            <el-tag :type="getActionTagType(selectedLog.action)">
              {{ getActionText(selectedLog.action) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="目标类型">
            <el-tag type="info">
              {{ getTargetTypeText(selectedLog.targetType) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="目标ID">
            {{ selectedLog.targetId }}
          </el-descriptions-item>
          <el-descriptions-item label="操作描述">
            {{ selectedLog.description }}
          </el-descriptions-item>
          <el-descriptions-item label="操作用户">
            <div class="user-detail">
              <span>{{ selectedLog.user?.username }}</span>
              <el-tag 
                v-if="selectedLog.user?.role === 'ADMIN'" 
                type="warning" 
                size="small"
              >
                管理员
              </el-tag>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="操作时间">
            {{ formatDate(selectedLog.createdAt) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- 清理日志对话框 -->
    <el-dialog
      v-model="cleanupDialogVisible"
      title="清理旧日志"
      width="500px"
    >
      <div class="cleanup-form">
        <p>选择要清理的日志时间范围：</p>
        <el-form :model="cleanupForm" label-width="100px">
          <el-form-item label="保留天数">
            <el-input-number
              v-model="cleanupForm.keepDays"
              :min="1"
              :max="365"
              placeholder="保留最近N天的日志"
            />
            <span class="form-help">保留最近 {{ cleanupForm.keepDays }} 天的日志，删除更早的记录</span>
          </el-form-item>
        </el-form>
        <div class="cleanup-warning">
          <el-alert
            title="警告"
            type="warning"
            description="此操作将永久删除旧日志记录，无法恢复！"
            :closable="false"
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="cleanupDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmCleanup">确认清理</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { logAPI } from '../api'
import { useAuthStore } from '../stores/counter'
import { PAGINATION } from '../constants'
import dayjs from 'dayjs'

const authStore = useAuthStore()
const loading = ref(false)
const tableData = ref([])
const detailDialogVisible = ref(false)
const cleanupDialogVisible = ref(false)
const selectedLog = ref(null)
const dateRange = ref([])

// 日志统计数据
const logStats = ref({
  totalLogs: 0,
  actionStats: [],
  targetTypeStats: [],
  userStats: []
})

// 搜索表单
const searchForm = reactive({
  action: '',
  targetType: '',
  username: '',
  startDate: '',
  endDate: ''
})

// 清理表单
const cleanupForm = reactive({
  keepDays: 30
})

// 分页信息
const pagination = reactive({
  page: PAGINATION.DEFAULT_PAGE,
  limit: PAGINATION.DEFAULT_LIMIT,
  total: 0
})

// 获取操作类型统计数量
const getActionCount = (action) => {
  const stat = logStats.value.actionStats?.find(s => s.action === action)
  return stat?._count?.id || 0
}

// 格式化日期
const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

// 获取操作类型文本
const getActionText = (action) => {
  const actionMap = {
    'CREATE': '创建',
    'UPDATE': '更新',
    'DELETE': '删除'
  }
  return actionMap[action] || action
}

// 获取操作类型标签类型
const getActionTagType = (action) => {
  const typeMap = {
    'CREATE': 'success',
    'UPDATE': 'warning',
    'DELETE': 'danger'
  }
  return typeMap[action] || 'info'
}

// 获取目标类型文本
const getTargetTypeText = (targetType) => {
  const typeMap = {
    'PROJECT': '项目',
    'TEMPLATE': '模板',
    'CATEGORY': '分类',
    'PROJECT_DATA': '项目数据',
    'USER': '用户'
  }
  return typeMap[targetType] || targetType
}

// 获取日志统计
const fetchLogStats = async () => {
  try {
    const params = {}
    if (searchForm.startDate) {
      params.startDate = searchForm.startDate
    }
    if (searchForm.endDate) {
      params.endDate = searchForm.endDate
    }
    
    const response = await logAPI.getLogStats(params)
    logStats.value = response.data || {}
  } catch (error) {
    console.error('获取日志统计失败:', error)
  }
}

// 获取日志列表
const fetchLogs = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit
    }
    
    if (searchForm.action) {
      params.action = searchForm.action
    }
    
    if (searchForm.targetType) {
      params.targetType = searchForm.targetType
    }
    
    if (searchForm.username && searchForm.username.trim()) {
      params.username = searchForm.username.trim()
    }
    
    if (searchForm.startDate) {
      params.startDate = searchForm.startDate
    }
    
    if (searchForm.endDate) {
      params.endDate = searchForm.endDate
    }
    
    const response = await logAPI.getLogs(params)
    tableData.value = response.data.logs || []
    pagination.total = response.data.pagination?.total || 0
  } catch (error) {
    console.error('获取日志列表失败:', error)
    ElMessage.error('获取日志列表失败')
  } finally {
    loading.value = false
  }
}

// 处理日期范围变化
const handleDateChange = (dates) => {
  if (dates && dates.length === 2) {
    searchForm.startDate = dayjs(dates[0]).format('YYYY-MM-DD')
    searchForm.endDate = dayjs(dates[1]).format('YYYY-MM-DD')
  } else {
    searchForm.startDate = ''
    searchForm.endDate = ''
  }
  handleSearch()
}

// 处理搜索
const handleSearch = () => {
  pagination.page = 1
  fetchLogs()
  fetchLogStats()
}

// 处理重置
const handleReset = () => {
  searchForm.action = ''
  searchForm.targetType = ''
  searchForm.username = ''
  searchForm.startDate = ''
  searchForm.endDate = ''
  dateRange.value = []
  pagination.page = 1
  fetchLogs()
  fetchLogStats()
}

// 处理页码变化
const handlePageChange = (page) => {
  pagination.page = page
  fetchLogs()
}

// 处理页大小变化
const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  fetchLogs()
}

// 处理查看详情
const handleViewDetail = (row) => {
  selectedLog.value = row
  detailDialogVisible.value = true
}

// 处理清理日志
const handleCleanup = () => {
  cleanupDialogVisible.value = true
}

// 确认清理日志
const confirmCleanup = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 ${cleanupForm.keepDays} 天前的所有日志记录吗？此操作无法撤销！`,
      '确认清理',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await logAPI.cleanupLogs({
      keepDays: cleanupForm.keepDays
    })
    
    ElMessage.success('日志清理成功')
    cleanupDialogVisible.value = false
    
    // 刷新数据
    fetchLogs()
    fetchLogStats()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清理日志失败:', error)
      ElMessage.error('清理日志失败')
    }
  }
}

// 页面加载时获取数据
onMounted(() => {
  fetchLogs()
  fetchLogStats()
})
</script>

<style scoped>
.logs-page {
  padding: 0;
}

.page-header {
  margin-bottom: 20px;
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

.stats-row {
  margin-bottom: 20px;
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
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 8px;
}

.stats-label {
  font-size: 14px;
  color: #909399;
}

.filter-card {
  margin-bottom: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-tag {
  font-size: 10px;
}

.log-detail {
  margin: 20px 0;
}

.user-detail {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cleanup-form {
  margin: 20px 0;
}

.form-help {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}

.cleanup-warning {
  margin-top: 20px;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .logs-page {
    padding: 12px;
  }
  
  .stats-row {
    margin-bottom: 16px;
  }
  
  .stats-card {
    margin-bottom: 12px;
  }
}
</style>