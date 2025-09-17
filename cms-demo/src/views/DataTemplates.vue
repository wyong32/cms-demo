<template>
  <div class="data-templates-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>数据模板管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          添加数据模板
        </el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="模板名称">
          <el-input
            v-model="searchForm.title"
            placeholder="请输入模板名称"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select 
            v-model="searchForm.categoryId" 
            placeholder="请选择分类" 
            clearable 
            @change="handleCategoryChange" 
            @clear="handleCategoryChange"
            style="width: 200px"
            filterable
          >
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            >
              {{ category.name }}
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据模板卡片列表 -->
    <el-card class="template-list-card" shadow="never">
      <div v-loading="loading" class="template-list-container">
        <div class="template-grid">
          <div
            v-for="template in tableData"
            :key="template.id"
            class="template-card"
            :class="{ 'selected': selectedRows.some(item => item.id === template.id) }"
            @click="handleSelectTemplate(template)"
          >
            <!-- 选择框 -->
            <div class="template-checkbox">
              <el-checkbox
                :model-value="selectedRows.some(item => item.id === template.id)"
                @change="handleTemplateSelect(template, $event)"
                @click.stop
              />
            </div>
            
            <!-- 图片 -->
            <div class="template-image">
              <img
                v-if="template.imageUrl"
                :src="getImageUrl(template.imageUrl)"
                :alt="template.title"
                class="template-thumbnail"
              />
              <div v-else class="no-image">
                <el-icon><Picture /></el-icon>
              </div>
            </div>
            
            <!-- 信息 -->
            <div class="template-info">
              <h4 class="template-title">{{ template.title }}</h4>
              <p class="template-description">{{ template.description || '暂无描述' }}</p>
              <div class="template-meta">
                <el-tag size="small" type="primary">{{ template.category?.name || '未分类' }}</el-tag>
                <span class="template-creator">{{ template.creator?.username || '未知' }}</span>
              </div>
              <div class="template-date">{{ formatDate(template.createdAt) }}</div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="template-actions">
              <el-button type="primary" size="small" @click.stop="handleEdit(template)">
                编辑
              </el-button>
              <el-button type="danger" size="small" @click.stop="handleDelete(template)">
                删除
              </el-button>
            </div>
          </div>
        </div>

        <el-empty v-if="!loading && tableData.length === 0" description="暂无数据模板" />
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          :current-page="pagination.page"
          :page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[16, 32, 48, 80]"
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
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Picture } from '@element-plus/icons-vue'
import { dataTemplateAPI, categoryAPI } from '../api'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const tableData = ref([])
const categories = ref([])
const selectedRows = ref([])

// 搜索表单
const searchForm = reactive({
  title: '',
  categoryId: ''
})

// 分页信息
const pagination = reactive({
  page: 1,
  limit: 32, // 默认32个，适合8列x4行
  total: 0
})

// 格式化日期
const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

// 获取分类列表
const fetchCategories = async () => {
  try {
    console.log('开始获取分类列表...')
    const response = await categoryAPI.getCategories()
    console.log('分类API完整响应:', response)
    console.log('分类API响应数据:', response?.data)
    categories.value = response?.data?.categories || []
  } catch (error) {
    console.error('获取分类失败:', error)
    console.error('错误详情:', error.response || error.message)
    ElMessage.error('获取分类失败: ' + (error.response?.data?.error || error.message))
  }
}

// 获取数据模板列表
const fetchDataTemplates = async () => {
  loading.value = true
  try {
    console.log('开始获取数据模板列表...')
    const params = {
      page: pagination.page,
      limit: pagination.limit
    }
    
    // 只有当搜索内容不为空时才添加参数
    if (searchForm.title && searchForm.title.trim()) {
      params.search = searchForm.title.trim()
    }
    
    // 只有当分类ID不为空时才添加参数
    if (searchForm.categoryId) {
      params.categoryId = searchForm.categoryId
    }
    
    console.log('请求参数:', params)
    
    const response = await dataTemplateAPI.getTemplates(params)
    console.log('模板API完整响应:', response)
    console.log('模板API响应数据:', response?.data)
    tableData.value = response?.data?.templates || []
    pagination.total = response?.data?.pagination?.total || 0
  } catch (error) {
    console.error('获取数据模板失败:', error)
    console.error('错误详情:', error.response || error.message)
    ElMessage.error('获取数据模板失败: ' + (error.response?.data?.error || error.message))
  } finally {
    loading.value = false
  }
}

// 处理添加
const handleAdd = () => {
  router.push({ name: 'DataTemplateAdd' })
}


// 处理编辑
const handleEdit = (row) => {
  router.push({ name: 'DataTemplateEdit', params: { id: row.id } })
}

// 处理删除
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除数据模板"${row.title}"吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const loadingMessage = ElMessage({
      message: `正在删除模板"${row.title}"...`,
      type: 'info',
      duration: 0 // 不自动关闭
    })
    
    try {
      await dataTemplateAPI.deleteTemplate(row.id)
      loadingMessage.close()
      ElMessage.success('删除成功')
      fetchDataTemplates()
    } catch (deleteError) {
      loadingMessage.close()
      throw deleteError
    }
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
      `确定要删除选中的 ${selectedRows.value.length} 个数据模板吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const loadingMessage = ElMessage({
      message: `正在删除 ${selectedRows.value.length} 个数据模板...`,
      type: 'info',
      duration: 0 // 不自动关闭
    })
    
    try {
      const promises = selectedRows.value.map(row => dataTemplateAPI.deleteTemplate(row.id))
      await Promise.all(promises)
      
      loadingMessage.close()
      ElMessage.success('批量删除成功')
      selectedRows.value = []
      fetchDataTemplates()
    } catch (deleteError) {
      loadingMessage.close()
      throw deleteError
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

// 处理选择变化
const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

// 处理模板选择
const handleSelectTemplate = (template) => {
  // 卡片点击时不做任何操作，只用于视觉效果
}

// 处理复选框选择
const handleTemplateSelect = (template, checked) => {
  if (checked) {
    if (!selectedRows.value.some(item => item.id === template.id)) {
      selectedRows.value.push(template)
    }
  } else {
    selectedRows.value = selectedRows.value.filter(item => item.id !== template.id)
  }
}

// 获取图片URL
const getImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return `/api/uploads/${url}`
}

// 处理分类选择变化
const handleCategoryChange = () => {
  console.log('分类选择变化:', searchForm.categoryId)
  pagination.page = 1 // 重置到第一页
  fetchDataTemplates()
}

// 处理搜索
const handleSearch = () => {
  pagination.page = 1
  fetchDataTemplates()
}

// 处理重置
const handleReset = () => {
  searchForm.title = ''
  searchForm.categoryId = ''
  pagination.page = 1
  fetchDataTemplates()
}

// 处理页码变化
const handlePageChange = (page) => {
  pagination.page = page
  fetchDataTemplates()
}

// 处理页大小变化
const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  fetchDataTemplates()
}

// 页面加载时获取数据
onMounted(() => {
  fetchCategories()
  fetchDataTemplates()
})
</script>

<style scoped>
.data-templates-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-card {
  margin-bottom: 20px;
}

.filter-status {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.template-list-card {
  margin-bottom: 20px;
}

.template-list-container {
  min-height: 400px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

@media (max-width: 1800px) {
  .template-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

@media (max-width: 1400px) {
  .template-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (max-width: 1200px) {
  .template-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 900px) {
  .template-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 600px) {
  .template-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.template-card {
  position: relative;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fff;
  min-height: 280px;
  display: flex;
  flex-direction: column;
}

.template-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}

.template-card.selected {
  border-color: #409eff;
  background-color: rgba(64, 158, 255, 0.05);
}

.template-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
}

.template-image {
  width: 100%;
  height: 120px;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.template-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  color: #c0c4cc;
  font-size: 24px;
}

.template-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
}

.template-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-description {
  font-size: 12px;
  color: #606266;
  margin: 0 0 8px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.template-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.template-creator {
  font-size: 11px;
  color: #909399;
}

.template-date {
  font-size: 11px;
  color: #c0c4cc;
  margin-bottom: 8px;
}

.template-actions {
  display: flex;
  gap: 6px;
  margin-top: auto;
}

.template-actions .el-button {
  flex: 1;
  font-size: 12px;
  padding: 6px 8px;
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

/* 响应式样式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .data-templates-page {
    padding: 12px;
  }
}
</style>