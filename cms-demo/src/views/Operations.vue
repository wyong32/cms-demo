<template>
  <div class="operations-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>操作管理</h2>
      <p>项目数据统计与代码生成</p>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #409eff;">
              <el-icon size="24"><DataLine /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">{{ stats.totalData }}</div>
              <div class="stats-label">总数据量</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #67c23a;">
              <el-icon size="24"><CircleCheck /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">{{ stats.completedData }}</div>
              <div class="stats-label">已完成</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #e6a23c;">
              <el-icon size="24"><Clock /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">{{ stats.pendingData }}</div>
              <div class="stats-label">未完成</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #f56c6c;">
              <el-icon size="24"><TrendCharts /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">{{ completionRate }}%</div>
              <div class="stats-label">完成率</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选和搜索 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="项目">
          <el-select 
            v-model="searchForm.projectId" 
            placeholder="请选择项目" 
            clearable 
            @change="handleSearch"
            style="width: 200px"
          >
            <el-option
              v-for="project in projects"
              :key="project.id"
              :label="project.name"
              :value="project.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-select 
            v-model="searchForm.categoryId" 
            placeholder="请选择分类" 
            clearable 
            @change="handleSearch"
            style="width: 200px"
          >
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select 
            v-model="searchForm.isCompleted" 
            placeholder="请选择状态" 
            clearable 
            @change="handleSearch"
            style="width: 120px"
          >
            <el-option label="未完成" :value="false" />
            <el-option label="已完成" :value="true" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题">
          <el-input
            v-model="searchForm.title"
            placeholder="请输入数据标题"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never">
      <el-table 
        v-loading="loading"
        :data="tableData" 
        border
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column label="标题" min-width="200">
          <template #default="{ row }">
            {{ row.data?.title || '无标题' }}
          </template>
        </el-table-column>
        <el-table-column label="项目" width="150">
          <template #default="{ row }">
            {{ row.project?.name || '无项目' }}
          </template>
        </el-table-column>
        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            {{ row.category?.name || '无分类' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isCompleted ? 'success' : 'warning'">
              {{ row.isCompleted ? '已完成' : '未完成' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creator.username" label="创建者" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button 
              type="success" 
              size="small" 
              @click="handleComplete(row)"
              :disabled="row.isCompleted"
            >
              完成
            </el-button>
            <el-button type="info" size="small" @click="handleViewCode(row)">
              代码
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

    <!-- 批量操作 -->
    <div v-if="selectedRows.length > 0" class="batch-actions">
      <el-button type="success" @click="handleBatchComplete">
        批量完成 ({{ selectedRows.length }})
      </el-button>
      <el-button type="info" @click="handleBatchGenerateCode">
        批量生成代码 ({{ selectedRows.length }})
      </el-button>
    </div>

    <!-- JS代码查看对话框 -->
    <el-dialog
      v-model="codeDialogVisible"
      title="JS对象代码片段"
      width="800px"
      class="code-dialog"
    >
      <div class="code-container">
        <div class="code-header">
          <span>生成的JS对象代码：</span>
          <el-button type="primary" size="small" @click="copyCode">
            <el-icon><DocumentCopy /></el-icon>
            复制代码
          </el-button>
        </div>
        <el-input
          v-model="jsCode"
          type="textarea"
          :rows="20"
          readonly
          class="code-textarea"
        />
      </div>
    </el-dialog>

    <!-- 批量代码生成对话框 -->
    <el-dialog
      v-model="batchCodeDialogVisible"
      title="批量生成JS代码"
      width="900px"
      class="code-dialog"
    >
      <div class="batch-code-container">
        <div class="code-header">
          <span>批量生成的JS数组代码：</span>
          <el-button type="primary" size="small" @click="copyBatchCode">
            <el-icon><DocumentCopy /></el-icon>
            复制代码
          </el-button>
        </div>
        <el-input
          v-model="batchJsCode"
          type="textarea"
          :rows="25"
          readonly
          class="code-textarea"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { projectDataAPI, projectAPI, categoryAPI } from '@/api'
import dayjs from 'dayjs'

const loading = ref(false)
const tableData = ref([])
const projects = ref([])
const categories = ref([])
const selectedRows = ref([])
const codeDialogVisible = ref(false)
const batchCodeDialogVisible = ref(false)
const jsCode = ref('')
const batchJsCode = ref('')

// 统计数据
const stats = ref({
  totalData: 0,
  completedData: 0,
  pendingData: 0
})

// 完成率
const completionRate = computed(() => {
  if (stats.value.totalData === 0) return 0
  return Math.round((stats.value.completedData / stats.value.totalData) * 100)
})

// 搜索表单
const searchForm = reactive({
  projectId: '',
  categoryId: '',
  isCompleted: '',
  title: ''
})

// 分页信息
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 格式化日期
const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

// 获取项目列表
const fetchProjects = async () => {
  try {
    const response = await projectAPI.getProjects()
    projects.value = response.data.projects || []
  } catch (error) {
    console.error('获取项目列表失败:', error)
  }
}

// 获取分类列表
const fetchCategories = async () => {
  try {
    const response = await categoryAPI.getCategories()
    categories.value = response.data.categories || []
  } catch (error) {
    console.error('获取分类失败:', error)
  }
}

// 获取项目数据列表
const fetchProjectData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit
    }
    
    if (searchForm.projectId) {
      params.projectId = searchForm.projectId
    }
    
    if (searchForm.categoryId) {
      params.categoryId = searchForm.categoryId
    }
    
    if (searchForm.isCompleted !== '') {
      params.isCompleted = searchForm.isCompleted
    }
    
    if (searchForm.title && searchForm.title.trim()) {
      params.search = searchForm.title.trim()
    }
    
    const response = await projectDataAPI.getProjectData(params)
    tableData.value = response.data.projectData || []
    pagination.total = response.data.pagination?.total || 0
    
    // 计算统计数据
    calculateStats()
  } catch (error) {
    console.error('获取项目数据失败:', error)
    ElMessage.error('获取项目数据失败')
  } finally {
    loading.value = false
  }
}

// 计算统计数据
const calculateStats = async () => {
  try {
    // 获取所有数据进行统计
    const response = await projectDataAPI.getProjectData({ page: 1, limit: 10000 })
    const allData = response.data.projectData || []
    
    stats.value.totalData = allData.length
    stats.value.completedData = allData.filter(item => item.isCompleted).length
    stats.value.pendingData = allData.filter(item => !item.isCompleted).length
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

// 处理完成
const handleComplete = async (row) => {
  try {
    await projectDataAPI.markAsCompleted(row.id)
    ElMessage.success('标记为已完成')
    fetchProjectData()
  } catch (error) {
    console.error('标记完成失败:', error)
    ElMessage.error('标记完成失败')
  }
}

// 处理查看代码
const handleViewCode = async (row) => {
  try {
    const response = await projectDataAPI.generateCode(row.id)
    jsCode.value = response.data.jsCode
    codeDialogVisible.value = true
  } catch (error) {
    console.error('生成代码失败:', error)
    ElMessage.error('生成代码失败')
  }
}

// 处理批量完成
const handleBatchComplete = async () => {
  try {
    const incompleteRows = selectedRows.value.filter(row => !row.isCompleted)
    
    if (incompleteRows.length === 0) {
      ElMessage.info('所选数据均已完成')
      return
    }
    
    const promises = incompleteRows.map(row => projectDataAPI.markAsCompleted(row.id))
    await Promise.all(promises)
    
    ElMessage.success('批量标记完成成功')
    selectedRows.value = []
    fetchProjectData()
  } catch (error) {
    console.error('批量完成失败:', error)
    ElMessage.error('批量完成失败')
  }
}

// 处理批量生成代码
const handleBatchGenerateCode = async () => {
  try {
    const promises = selectedRows.value.map(row => projectDataAPI.generateCode(row.id))
    const responses = await Promise.all(promises)
    
    const codes = responses.map(response => response.data.jsCode)
    batchJsCode.value = `[\n${codes.join(',\n')}\n]`
    
    batchCodeDialogVisible.value = true
  } catch (error) {
    console.error('批量生成代码失败:', error)
    ElMessage.error('批量生成代码失败')
  }
}

// 处理选择变化
const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

// 处理搜索
const handleSearch = () => {
  pagination.page = 1
  fetchProjectData()
}

// 处理重置
const handleReset = () => {
  searchForm.projectId = ''
  searchForm.categoryId = ''
  searchForm.isCompleted = ''
  searchForm.title = ''
  pagination.page = 1
  fetchProjectData()
}

// 处理页码变化
const handlePageChange = (page) => {
  pagination.page = page
  fetchProjectData()
}

// 处理页大小变化
const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  fetchProjectData()
}

// 复制代码
const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(jsCode.value)
    ElMessage.success('代码已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}

// 复制批量代码
const copyBatchCode = async () => {
  try {
    await navigator.clipboard.writeText(batchJsCode.value)
    ElMessage.success('代码已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}

// 页面加载时获取数据
onMounted(() => {
  fetchProjects()
  fetchCategories()
  fetchProjectData()
})
</script>

<style scoped>
.operations-page {
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

.batch-actions {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 12px 20px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.code-container {
  height: 100%;
}

.batch-code-container {
  height: 100%;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.code-textarea {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.code-textarea :deep(.el-textarea__inner) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.4;
  background: #fafafa;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .operations-page {
    padding: 12px;
  }
  
  .stats-row {
    margin-bottom: 16px;
  }
  
  .stats-card {
    margin-bottom: 12px;
  }
  
  .batch-actions {
    left: 12px;
    right: 12px;
    transform: none;
    text-align: center;
  }
}
</style>