<template>
  <div class="categories-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>分类管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        添加分类
      </el-button>
    </div>

    <!-- 搜索栏 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="分类名称">
          <el-input
            v-model="searchForm.name"
            placeholder="请输入分类名称"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
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
        <el-table-column prop="name" label="分类名称" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="模板数量" width="100" align="center">
          <template #default="{ row }">
            {{ row._count?.dataTemplates || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="创建者" width="120">
          <template #default="{ row }">
            {{ row.creator?.username || '-' }}
          </template>
        </el-table-column>
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
import { categoryAPI } from '@/api'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const tableData = ref([])
const selectedRows = ref([])

// 搜索表单
const searchForm = reactive({
  name: ''
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
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      search: searchForm.name
    }
    
    const response = await categoryAPI.getCategories(params)
    console.log('Categories API响应:', response?.data) // 调试日志
    tableData.value = response?.data?.categories || []
    pagination.total = response?.data?.pagination?.total || 0
  } catch (error) {
    console.error('获取分类失败:', error)
    ElMessage.error('获取分类失败')
  } finally {
    loading.value = false
  }
}

// 处理添加
const handleAdd = () => {
  router.push({ name: 'CategoryAdd' })
}

// 处理编辑
const handleEdit = (row) => {
  router.push({ name: 'CategoryEdit', params: { id: row.id } })
}

// 处理删除
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除分类"${row.name}"吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await categoryAPI.deleteCategory(row.id)
    ElMessage.success('删除成功')
    fetchCategories()
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
      `确定要删除选中的 ${selectedRows.value.length} 个分类吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const promises = selectedRows.value.map(row => categoryAPI.deleteCategory(row.id))
    await Promise.all(promises)
    
    ElMessage.success('批量删除成功')
    selectedRows.value = []
    fetchCategories()
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

// 处理搜索
const handleSearch = () => {
  pagination.page = 1
  fetchCategories()
}

// 处理重置
const handleReset = () => {
  searchForm.name = ''
  pagination.page = 1
  fetchCategories()
}

// 处理页码变化
const handlePageChange = (page) => {
  pagination.page = page
  fetchCategories()
}

// 处理页大小变化
const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  fetchCategories()
}

// 页面加载时获取数据
onMounted(() => {
  fetchCategories()
})
</script>

<style scoped>
.categories-page {
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

/* 响应式样式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .categories-page {
    padding: 12px;
  }
}
</style>