<template>
  <div class="data-templates-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>数据模板管理</h2>
      <div class="header-actions">
        <el-button type="success" @click="handleAIGenerate">
          <el-icon><MagicStick /></el-icon>
          AI生成
        </el-button>
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
        <el-table-column prop="title" label="模板名称" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="category.name" label="分类" width="120" />

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
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, MagicStick } from '@element-plus/icons-vue'
import { dataTemplateAPI, categoryAPI } from '@/api'
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
  limit: 20,
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

// 处理AI生成
const handleAIGenerate = () => {
  router.push({ name: 'AIGenerateForm', params: { type: 'template' } })
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
    
    await dataTemplateAPI.deleteTemplate(row.id)
    ElMessage.success('删除成功')
    fetchDataTemplates()
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
    
    const promises = selectedRows.value.map(row => dataTemplateAPI.deleteTemplate(row.id))
    await Promise.all(promises)
    
    ElMessage.success('批量删除成功')
    selectedRows.value = []
    fetchDataTemplates()
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