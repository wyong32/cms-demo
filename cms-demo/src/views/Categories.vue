<template>
  <div class="categories-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>{{ currentParentCategory ? `${currentParentCategory.name} - 分类列表` : '数据分类列表' }}</h2>
      </div>
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
      >
        <el-table-column prop="name" label="分类名称" min-width="150" />
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column prop="description" label="描述" min-width="250" show-overflow-tooltip />
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { categoriesAPI } from '../api'
import { PAGINATION } from '../constants'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()
const loading = ref(true) // 初始状态为true，避免闪烁
const tableData = ref([])
const currentParentCategory = ref(null)

// 当前父分类ID（从URL获取）
const currentParentId = computed(() => route.query.parentId || '')

// 搜索表单
const searchForm = reactive({
  name: ''
})

// 分页信息
const pagination = reactive({
  page: PAGINATION.DEFAULT_PAGE,
  limit: PAGINATION.DEFAULT_LIMIT,
  total: 0
})

// 格式化日期
const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

// 获取当前父分类信息
const fetchParentCategory = async (parentId) => {
  if (!parentId) {
    currentParentCategory.value = null
    return
  }
  
  try {
    const response = await categoriesAPI.getCategory(parentId)
    currentParentCategory.value = response?.category
  } catch (error) {
    console.error('获取父分类信息失败:', error)
  }
}

// 获取分类列表（只显示二级分类）
const fetchCategories = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      level: 2, // 只查询二级分类
      search: searchForm.name
    }
    
    // 如果有父分类ID，则筛选该父分类下的分类
    if (currentParentId.value) {
      params.parentId = currentParentId.value
    }
    
    const response = await categoriesAPI.getCategories(params)
    tableData.value = response?.data?.categories || response?.categories || []
    pagination.total = response?.data?.pagination?.total || response?.pagination?.total || 0
  } catch (error) {
    console.error('获取分类失败:', error)
    ElMessage.error('获取分类失败')
  } finally {
    loading.value = false
  }
}

// 处理添加
const handleAdd = () => {
  // 如果有父分类，则传递父分类ID
  const query = currentParentId.value ? { parentId: currentParentId.value } : {}
  router.push({ 
    name: 'CategoryAdd',
    query
  })
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
    
    await categoriesAPI.deleteCategory(row.id)
    ElMessage.success('删除成功')
    fetchCategories()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(error.response?.data?.error || '删除失败')
    }
  }
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

// 监听路由变化
watch(() => route.query.parentId, async (newParentId) => {
  if (newParentId) {
    await fetchParentCategory(newParentId)
  } else {
    currentParentCategory.value = null
  }
  fetchCategories()
})

// 页面加载时获取数据
onMounted(async () => {
  if (currentParentId.value) {
    await fetchParentCategory(currentParentId.value)
  }
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

.header-left h2 {
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