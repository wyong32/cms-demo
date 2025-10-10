<template>
  <div class="top-categories-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>一级分类管理</h2>
      <el-button type="primary" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon>
        添加一级分类
      </el-button>
    </div>

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
        <el-table-column label="子分类数" width="100" align="center">
          <template #default="{ row }">
            {{ row._count?.children || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="模板数" width="100" align="center">
          <template #default="{ row }">
            {{ row._count?.dataTemplates || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="success" size="small" @click="handleViewChildren(row)">
              子分类
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty 
        v-if="tableData.length === 0 && !loading"
        description="暂无一级分类"
        :image-size="120"
      />
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingCategory ? '编辑一级分类' : '添加一级分类'"
      width="600px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="分类类型" prop="type">
          <el-input v-model="form.type" placeholder="请输入分类类型" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="请输入分类描述"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { categoriesAPI } from '../api'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const tableData = ref([])
const showAddDialog = ref(false)
const editingCategory = ref(null)
const formRef = ref()

// 表单数据
const form = reactive({
  name: '',
  type: '',
  description: ''
})

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请输入分类类型', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ]
}

// 格式化日期
const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

// 获取一级分类列表
const fetchCategories = async () => {
  loading.value = true
  try {
    const response = await categoriesAPI.getCategories({ level: 1 })
    tableData.value = response?.data?.categories || response?.categories || []
  } catch (error) {
    console.error('获取一级分类失败:', error)
    ElMessage.error('获取一级分类失败')
  } finally {
    loading.value = false
  }
}

// 处理编辑
const handleEdit = (category) => {
  editingCategory.value = category
  Object.assign(form, {
    name: category.name,
    type: category.type,
    description: category.description || ''
  })
  showAddDialog.value = true
}

// 处理查看子分类
const handleViewChildren = (category) => {
  router.push({ 
    path: '/categories',
    query: { parentId: category.id }
  })
}

// 处理删除
const handleDelete = async (category) => {
  try {
    // 检查是否有子分类
    if (category._count?.children > 0) {
      ElMessage.warning('该一级分类下还有子分类，无法删除')
      return
    }

    await ElMessageBox.confirm(
      `确定要删除一级分类"${category.name}"吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await categoriesAPI.deleteCategory(category.id)
    ElMessage.success('删除成功')
    fetchCategories()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(error.response?.data?.error || '删除失败')
    }
  }
}

// 处理保存
const handleSave = async () => {
  try {
    await formRef.value.validate()
    
    saving.value = true
    
    const data = {
      name: form.name,
      type: form.type,
      description: form.description,
      level: 1 // 固定为一级分类
    }
    
    if (editingCategory.value) {
      await categoriesAPI.updateCategory(editingCategory.value.id, data)
      ElMessage.success('更新成功')
    } else {
      await categoriesAPI.createCategory(data)
      ElMessage.success('创建成功')
    }
    
    showAddDialog.value = false
    fetchCategories()
    
    // 刷新左侧导航的一级分类列表
    window.location.reload()
  } catch (error) {
    if (error !== false) {
      console.error('保存失败:', error)
      ElMessage.error(error.response?.data?.error || '保存失败')
    }
  } finally {
    saving.value = false
  }
}

// 处理取消
const handleCancel = () => {
  showAddDialog.value = false
  editingCategory.value = null
  Object.assign(form, {
    name: '',
    type: '',
    description: ''
  })
  formRef.value?.resetFields()
}

// 页面加载时获取数据
onMounted(() => {
  fetchCategories()
})
</script>

<style scoped>
.top-categories-page {
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

.table-card {
  margin-bottom: 20px;
}

.field-note {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .top-categories-page {
    padding: 12px;
  }
}
</style>
