<template>
  <div class="project-data-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="handleGoBack" :icon="ArrowLeft">返回</el-button>
        <h2>{{ projectName || '项目数据管理' }}</h2>
      </div>
      <div class="header-right">
        <el-button type="success" @click="handleAIGenerate">
          <el-icon><MagicStick /></el-icon>
          AI生成
        </el-button>
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          添加数据
        </el-button>
        <el-button @click="handleAddFromTemplate">
          <el-icon><Document /></el-icon>
          从模板创建
        </el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="数据标题">
          <el-input
            v-model="searchForm.title"
            placeholder="请输入数据标题"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
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
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">
              删除
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
      <el-button type="danger" @click="handleBatchDelete">
        批量删除 ({{ selectedRows.length }})
      </el-button>
      <el-button type="success" @click="handleBatchComplete">
        批量完成 ({{ selectedRows.length }})
      </el-button>
    </div>

    <!-- 从模板创建对话框 -->
    <el-dialog
      v-model="templateDialogVisible"
      title="从模板创建数据"
      width="900px"
      destroy-on-close
    >
      <div class="template-selector">
        <el-table 
          :data="templates" 
          v-loading="templatesLoading"
          @row-click="handleSelectTemplate"
          :row-class-name="getTemplateRowClassName"
          style="width: 100%"
        >
          <el-table-column label="标题" prop="title" min-width="200">
            <template #default="{ row }">
              <div class="template-title">
                <h4>{{ row.title }}</h4>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="类型" prop="category" width="120">
            <template #default="{ row }">
              <el-tag size="small" type="primary">
                {{ row.category?.name || '未分类' }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column label="图片" width="100">
            <template #default="{ row }">
              <div class="template-image">
                <img 
                  v-if="row.imageUrl" 
                  :src="getImageUrl(row.imageUrl)" 
                  :alt="row.imageAlt || row.title"
                  class="template-thumbnail"
                />
                <div v-else class="no-image">
                  <el-icon><Picture /></el-icon>
                  <span>无图片</span>
                </div>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button 
                type="primary" 
                size="small"
                :disabled="templateForm.templateId === row.id"
                @click.stop="handleSelectTemplate(row)"
              >
                {{ templateForm.templateId === row.id ? '已选择' : '选择该模板' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-empty v-if="!templatesLoading && templates.length === 0" description="暂无模板数据" />
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-text type="info" v-if="templateForm.templateId">
            已选择模板，点击创建按钮继续
          </el-text>
          <el-button @click="templateDialogVisible = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="handleCreateFromTemplate"
            :disabled="!templateForm.templateId"
          >
            创建
          </el-button>
        </div>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus, Document, MagicStick, Picture } from '@element-plus/icons-vue'
import { projectDataAPI, dataTemplateAPI } from '../api'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const templatesLoading = ref(false)
const tableData = ref([])
const selectedRows = ref([])
const templates = ref([])

const templateDialogVisible = ref(false)

// 项目信息
const projectId = computed(() => route.params.projectId)
const projectName = computed(() => route.query.projectName)

// 搜索表单
const searchForm = reactive({
  title: '',
  isCompleted: ''
})

// 模板表单
const templateForm = reactive({
  templateId: ''
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

// 获取项目数据列表
const fetchProjectData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      projectId: projectId.value
    }
    
    if (searchForm.title && searchForm.title.trim()) {
      params.search = searchForm.title.trim()
    }
    
    if (searchForm.isCompleted !== '') {
      params.isCompleted = searchForm.isCompleted
    }
    
    const response = await projectDataAPI.getProjectData(params)
    tableData.value = response.data.projectData || []
    pagination.total = response.data.pagination?.total || 0
  } catch (error) {
    console.error('获取项目数据失败:', error)
    ElMessage.error('获取项目数据失败')
  } finally {
    loading.value = false
  }
}

// 获取模板列表
const fetchTemplates = async () => {
  templatesLoading.value = true
  try {
    const response = await dataTemplateAPI.getTemplatesForProject({})
    templates.value = response.data.templates || []
  } catch (error) {
    console.error('获取模板列表失败:', error)
    ElMessage.error('获取模板列表失败')
  } finally {
    templatesLoading.value = false
  }
}

// 处理返回
const handleGoBack = () => {
  router.push({ name: 'Projects' })
}

// 处理AI生成
const handleAIGenerate = () => {
  router.push({ 
    name: 'AIGenerateForm', 
    params: { type: 'project' },
    query: { projectId: projectId.value, projectName: projectName.value }
  })
}

// 处理添加
const handleAdd = () => {
  router.push({ 
    name: 'ProjectDataAdd',
    params: { projectId: projectId.value },
    query: { projectName: projectName.value }
  })
}

// 处理从模板创建
const handleAddFromTemplate = () => {
  templateDialogVisible.value = true
  fetchTemplates()
}

// 处理编辑
const handleEdit = (row) => {
  router.push({ 
    name: 'ProjectDataEdit',
    params: { 
      projectId: projectId.value,
      id: row.id 
    },
    query: { projectName: projectName.value }
  })
}


// 处理删除
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除这条数据吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await projectDataAPI.deleteProjectData(row.id)
    ElMessage.success('删除成功')
    fetchProjectData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 处理批量删除
const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 条数据吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const promises = selectedRows.value.map(row => projectDataAPI.deleteProjectData(row.id))
    await Promise.all(promises)
    
    ElMessage.success('批量删除成功')
    selectedRows.value = []
    fetchProjectData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
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
  searchForm.title = ''
  searchForm.isCompleted = ''
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

// 处理选择模板
const handleSelectTemplate = (template) => {
  templateForm.templateId = template.id
}

// 获取模板行样式类名
const getTemplateRowClassName = ({ row }) => {
  return templateForm.templateId === row.id ? 'selected-template-row' : ''
}

// 获取图片URL
const getImageUrl = (url) => {
  if (!url) return ''
  // 如果是完整URL（http或https开头），直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  // 如果是相对路径（以/api/开头），直接返回
  if (url.startsWith('/api/')) {
    return url
  }
  // 其他情况，假设是文件名，添加前缀
  return `/api/uploads/${url}`
}

// 处理从模板创建
const handleCreateFromTemplate = async () => {
  try {
    // 跳转到编辑页面，并传递模板信息
    router.push({ 
      name: 'ProjectDataAdd',
      params: { projectId: projectId.value },
      query: { 
        projectName: projectName.value,
        templateId: templateForm.templateId
      }
    })
    
    templateDialogVisible.value = false
    templateForm.templateId = ''
  } catch (error) {
    console.error('处理模板创建失败:', error)
    ElMessage.error('处理模板创建失败')
  }
}


// 页面加载时获取数据
onMounted(() => {
  fetchProjectData()
})
</script>

<style scoped>
.project-data-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.header-right {
  display: flex;
  gap: 12px;
}

.search-card {
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
  z-index: 1000;
  padding: 12px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.template-selector {
  max-height: 400px;
  overflow-y: auto;
}

.template-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.template-card:hover {
  border-color: #409eff;
}

.template-card.selected {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.template-header h4 {
  margin: 0;
  color: #303133;
}

.template-description {
  margin: 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}


/* 模板选择表格样式 */
.template-selector {
  max-height: 500px;
  overflow-y: auto;
}

.template-title h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
}

.template-image {
  display: flex;
  align-items: center;
  justify-content: center;
}

.template-thumbnail {
  width: 60px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.no-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 40px;
  background: #f5f7fa;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  color: #909399;
  font-size: 12px;
}

.no-image .el-icon {
  font-size: 16px;
  margin-bottom: 2px;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 选中行的样式 */
:deep(.selected-template-row) {
  background-color: #f0f9ff !important;
}

:deep(.selected-template-row:hover) {
  background-color: #e0f2fe !important;
}

/* 表格行点击效果 */
:deep(.el-table__row) {
  cursor: pointer;
  transition: background-color 0.3s;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .project-data-page {
    padding: 12px;
  }
  
  .template-thumbnail {
    width: 40px;
    height: 30px;
  }
  
  .no-image {
    width: 40px;
    height: 30px;
  }
}
</style>