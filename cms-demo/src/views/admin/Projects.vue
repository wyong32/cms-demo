<template>
  <div class="admin-projects-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>项目管理</h2>
      <p>管理员项目管理功能，创建、编辑和删除项目</p>
      <div class="header-actions">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          创建项目
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="项目名称">
          <el-input
            v-model="searchForm.name"
            placeholder="请输入项目名称"
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

    <!-- 项目表格 -->
    <el-card class="table-card" shadow="never">
      <el-table 
        v-loading="loading"
        :data="tableData" 
        border
        stripe
      >
        <el-table-column prop="name" label="项目名称" min-width="180" />
        <el-table-column prop="category" label="项目分类" width="120">
          <template #default="{ row }">
            {{ row.category || '无分类' }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="项目描述" min-width="250">
          <template #default="{ row }">
            {{ row.description || '无描述' }}
          </template>
        </el-table-column>
        <el-table-column label="字段数量" width="120" align="center">
          <template #default="{ row }">
            {{ row.fields?.length || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="数据量" width="120" align="center">
          <template #default="{ row }">
            {{ row._count?.projectData || 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="creator.username" label="创建者" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleView(row)">
              查看
            </el-button>
            <el-button type="warning" size="small" @click="handleEdit(row)">
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

    <!-- 创建/编辑项目对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑项目' : '创建项目'"
      width="800px"
      class="project-dialog"
    >
      <div v-loading="dialogLoading">
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="100px"
        >
          <el-form-item label="项目名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入项目名称" />
          </el-form-item>
          <el-form-item label="项目分类" prop="category">
            <el-input v-model="form.category" placeholder="请输入项目分类（可选）" />
          </el-form-item>
          <el-form-item label="项目描述" prop="description">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="3"
              placeholder="请输入项目描述（可选）"
            />
          </el-form-item>
          <el-form-item label="自定义字段">
            <div class="custom-fields">
              <div class="fields-header">
                <span>自定义字段配置（系统已内置默认字段）</span>
                <el-button type="primary" size="small" @click="addField">
                  <el-icon><Plus /></el-icon>
                  添加字段
                </el-button>
              </div>
              <div v-if="form.fields.length === 0" class="no-fields">
                暂无自定义字段
              </div>
              <div 
                v-for="(field, index) in form.fields" 
                :key="index"
                class="field-item"
              >
                <el-row :gutter="12">
                  <el-col :span="8">
                    <el-input
                      v-model="field.fieldName"
                      placeholder="字段名称"
                      :class="{ 'is-error': !field.fieldName }"
                    />
                  </el-col>
                  <el-col :span="6">
                    <el-select v-model="field.fieldType" placeholder="字段类型">
                      <el-option label="字符串" value="STRING" />
                      <el-option label="数组" value="ARRAY" />
                    </el-select>
                  </el-col>
                  <el-col :span="6">
                    <el-checkbox v-model="field.isRequired">必填</el-checkbox>
                  </el-col>
                  <el-col :span="4">
                    <el-button 
                      type="danger" 
                      size="small" 
                      @click="removeField(index)"
                      class="remove-btn"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </el-col>
                </el-row>
              </div>
            </div>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          {{ isEdit ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 项目详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="项目详情"
      width="900px"
    >
      <div v-if="selectedProject" class="project-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="项目名称">
            {{ selectedProject.name }}
          </el-descriptions-item>
          <el-descriptions-item label="项目分类">
            {{ selectedProject.category || '无分类' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建者">
            {{ selectedProject.creator?.username }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(selectedProject.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="数据量">
            {{ selectedProject._count?.projectData || 0 }} 条
          </el-descriptions-item>
          <el-descriptions-item label="字段数量">
            {{ selectedProject.fields?.length || 0 }} 个
          </el-descriptions-item>
          <el-descriptions-item label="项目描述" :span="2">
            {{ selectedProject.description || '无描述' }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="fields-section">
          <h3>字段配置</h3>
          <el-table :data="selectedProject.fields" border>
            <el-table-column prop="fieldName" label="字段名称" />
            <el-table-column label="字段类型" width="120">
              <template #default="{ row }">
                <el-tag :type="row.fieldType === 'ARRAY' ? 'warning' : 'info'">
                  {{ row.fieldType === 'ARRAY' ? '数组' : '字符串' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="是否必填" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.isRequired ? 'danger' : 'success'">
                  {{ row.isRequired ? '必填' : '可选' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="order" label="排序" width="80" align="center" />
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { projectAPI } from '../../api/index.js'
import { PAGINATION } from '../../constants'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const dialogLoading = ref(false)
const tableData = ref([])
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const isEdit = ref(false)
const selectedProject = ref(null)
const formRef = ref(null)

// 搜索表单
const searchForm = reactive({
  name: ''
})

// 表单数据
const form = reactive({
  name: '',
  category: '',
  description: '',
  fields: []
})

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' },
    { min: 2, max: 50, message: '项目名称长度2-50个字符', trigger: 'blur' }
  ]
}

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

// 获取项目列表
const fetchProjects = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit
    }
    
    if (searchForm.name && searchForm.name.trim()) {
      params.search = searchForm.name.trim()
    }
    
    const response = await projectAPI.getProjects(params)
    tableData.value = response.data.projects || []
    pagination.total = response.data.pagination?.total || 0
  } catch (error) {
    console.error('获取项目列表失败:', error)
    ElMessage.error('获取项目列表失败')
  } finally {
    loading.value = false
  }
}

// 处理添加
const handleAdd = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 处理查看
const handleView = async (row) => {
  try {
    const response = await projectAPI.getProject(row.id)
    selectedProject.value = response.data.project
    detailDialogVisible.value = true
  } catch (error) {
    console.error('获取项目详情失败:', error)
    ElMessage.error('获取项目详情失败')
  }
}

// 处理编辑
const handleEdit = async (row) => {
  try {
    dialogLoading.value = true
    const response = await projectAPI.getProject(row.id)
    const project = response.data.project
    
    isEdit.value = true
    form.id = project.id
    form.name = project.name
    form.category = project.category || ''
    form.description = project.description || ''
    
    // 只显示自定义字段（order > 12的字段，因为默认字段现在是1-12）
    form.fields = project.fields
      .filter(field => field.order > 12)
      .map(field => ({
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        isRequired: field.isRequired
      }))
    
    dialogVisible.value = true
  } catch (error) {
    console.error('获取项目信息失败:', error)
    ElMessage.error('获取项目信息失败')
  } finally {
    dialogLoading.value = false
  }
}

// 处理删除
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除项目"${row.name}"吗？删除后将无法恢复！`,
      '警告',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const loadingMessage = ElMessage({
      message: `正在删除项目"${row.name}"...`,
      type: 'info',
      duration: 0 // 不自动关闭
    })
    
    try {
      await projectAPI.deleteProject(row.id)
      loadingMessage.close()
      ElMessage.success('项目删除成功')
      fetchProjects()
    } catch (deleteError) {
      loadingMessage.close()
      throw deleteError
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除项目失败:', error)
      ElMessage.error('删除项目失败')
    }
  }
}

// 处理搜索
const handleSearch = () => {
  pagination.page = 1
  fetchProjects()
}

// 处理重置
const handleReset = () => {
  searchForm.name = ''
  pagination.page = 1
  fetchProjects()
}

// 处理页码变化
const handlePageChange = (page) => {
  pagination.page = page
  fetchProjects()
}

// 处理页大小变化
const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  fetchProjects()
}

// 添加字段
const addField = () => {
  form.fields.push({
    fieldName: '',
    fieldType: 'STRING',
    isRequired: false
  })
}

// 移除字段
const removeField = (index) => {
  form.fields.splice(index, 1)
}

// 重置表单
const resetForm = () => {
  form.id = ''
  form.name = ''
  form.category = ''
  form.description = ''
  form.fields = []
}

// 保存项目
const handleSave = async () => {
  try {
    await formRef.value.validate()
    
    // 验证自定义字段
    const invalidFields = form.fields.filter(field => !field.fieldName || !field.fieldName.trim())
    if (invalidFields.length > 0) {
      ElMessage.error('请填写所有字段名称')
      return
    }
    
    // 检查字段名是否重复
    const fieldNames = form.fields.map(f => f.fieldName.trim())
    const uniqueFieldNames = [...new Set(fieldNames)]
    if (fieldNames.length !== uniqueFieldNames.length) {
      ElMessage.error('字段名称不能重复')
      return
    }
    
    saving.value = true
    
    const submitData = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      fields: form.fields.map(field => ({
        fieldName: field.fieldName.trim(),
        fieldType: field.fieldType,
        isRequired: field.isRequired
      }))
    }
    
    if (isEdit.value) {
      await projectAPI.updateProject(form.id, submitData)
      ElMessage.success('项目更新成功')
    } else {
      await projectAPI.createProject(submitData)
      ElMessage.success('项目创建成功')
    }
    
    dialogVisible.value = false
    fetchProjects()
  } catch (error) {
    if (error !== false) { // 验证失败会返回false
      console.error('保存项目失败:', error)
      ElMessage.error('保存项目失败')
    }
  } finally {
    saving.value = false
  }
}

// 页面加载时获取数据
onMounted(() => {
  fetchProjects()
})
</script>

<style scoped>
.admin-projects-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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

.custom-fields {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 16px;
}

.fields-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.no-fields {
  text-align: center;
  color: #909399;
  padding: 20px;
}

.field-item {
  margin-bottom: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
}

.field-item:last-child {
  margin-bottom: 0;
}

.remove-btn {
  width: 100%;
}

.is-error :deep(.el-input__inner) {
  border-color: #f56c6c;
}

.project-detail {
  margin: 20px 0;
}

.fields-section {
  margin-top: 24px;
}

.fields-section h3 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .admin-projects-page {
    padding: 12px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-actions {
    margin-top: 12px;
    width: 100%;
  }
  
  .field-item {
    padding: 8px;
  }
}
</style>