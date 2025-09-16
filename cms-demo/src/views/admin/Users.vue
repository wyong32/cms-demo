<template>
  <div class="admin-users-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>用户管理</h2>
      <p>管理员用户管理功能，创建、编辑和管理用户账号</p>
      <div class="header-actions">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          创建用户
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="用户名">
          <el-input
            v-model="searchForm.search"
            placeholder="请输入用户名或邮箱"
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

    <!-- 用户表格 -->
    <el-card class="table-card" shadow="never">
      <el-table 
        v-loading="loading"
        :data="tableData" 
        border
        stripe
      >
        <el-table-column prop="username" label="用户名" min-width="150" />
        <el-table-column prop="email" label="邮箱" min-width="200">
          <template #default="{ row }">
            {{ row.email || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="角色" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.role === 'ADMIN' ? 'danger' : 'primary'">
              {{ row.role === 'ADMIN' ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'">
              {{ row.isActive ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button 
              type="warning" 
              size="small" 
              @click="handleEditRole(row)"
              :disabled="row.id === authStore.user?.id"
            >
              修改角色
            </el-button>
            <el-button 
              :type="row.isActive ? 'danger' : 'success'" 
              size="small" 
              @click="handleToggleStatus(row)"
              :disabled="row.id === authStore.user?.id"
            >
              {{ row.isActive ? '禁用' : '启用' }}
            </el-button>
            <el-button 
              type="danger" 
              size="small" 
              @click="handleDelete(row)"
              :disabled="row.id === authStore.user?.id"
            >
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

    <!-- 创建用户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="创建用户"
      width="600px"
      class="user-dialog"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="请输入密码" 
            show-password
          />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱（可选）" />
        </el-form-item>
        <el-form-item label="用户角色" prop="role">
          <el-radio-group v-model="form.role">
            <el-radio label="USER">普通用户</el-radio>
            <el-radio label="ADMIN">管理员</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-alert
          title="注意事项"
          type="info"
          :closable="false"
          description="用户名必须是唯一的，密码可以随意设置。创建后的用户默认为正常状态，用户可以直接登录系统。"
        />
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- 修改角色对话框 -->
    <el-dialog
      v-model="roleDialogVisible"
      title="修改用户角色"
      width="500px"
    >
      <div v-if="selectedUser" class="role-form">
        <p>用户：<strong>{{ selectedUser.username }}</strong></p>
        <p>当前角色：
          <el-tag :type="selectedUser.role === 'ADMIN' ? 'danger' : 'primary'">
            {{ selectedUser.role === 'ADMIN' ? '管理员' : '普通用户' }}
          </el-tag>
        </p>
        <el-form label-width="80px">
          <el-form-item label="新角色">
            <el-radio-group v-model="newRole">
              <el-radio label="USER">普通用户</el-radio>
              <el-radio label="ADMIN">管理员</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <el-alert
          v-if="newRole === 'ADMIN'"
          title="警告"
          type="warning"
          :closable="false"
          description="将用户设置为管理员后，该用户将拥有系统的所有权限！"
        />
      </div>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveRole">
          确认修改
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { authAPI } from '../../api/index.js'
import { useAuthStore } from '../../stores/counter.js'
import dayjs from 'dayjs'

const authStore = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const tableData = ref([])
const dialogVisible = ref(false)
const roleDialogVisible = ref(false)
const selectedUser = ref(null)
const newRole = ref('')
const formRef = ref(null)

// 搜索表单
const searchForm = reactive({
  search: ''
})

// 表单数据
const form = reactive({
  username: '',
  password: '',
  email: '',
  role: 'USER'
})

// 表单验证规则
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择用户角色', trigger: 'change' }
  ]
}

// 分页信息
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 格式化日期
const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

// 获取用户列表
const fetchUsers = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit
    }
    
    if (searchForm.search && searchForm.search.trim()) {
      params.search = searchForm.search.trim()
    }
    
    const response = await authAPI.getUsers(params)
    tableData.value = response.data.users || []
    pagination.total = response.data.pagination?.total || 0
  } catch (error) {
    console.error('获取用户列表失败:', error)
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

// 处理添加
const handleAdd = () => {
  resetForm()
  dialogVisible.value = true
}

// 处理修改角色
const handleEditRole = (row) => {
  selectedUser.value = row
  newRole.value = row.role
  roleDialogVisible.value = true
}

// 处理切换状态
const handleToggleStatus = async (row) => {
  try {
    const action = row.isActive ? '禁用' : '启用'
    await ElMessageBox.confirm(
      `确定要${action}用户“${row.username}”吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await authAPI.updateUser(row.id, {
      isActive: !row.isActive
    })
    
    ElMessage.success(`${action}成功`)
    fetchUsers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('更新用户状态失败:', error)
      ElMessage.error('更新用户状态失败')
    }
  }
}

// 处理删除
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户“${row.username}”吗？删除后将无法恢复！`,
      '警告',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await authAPI.deleteUser(row.id)
    ElMessage.success('用户删除成功')
    fetchUsers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用户失败:', error)
      ElMessage.error('删除用户失败')
    }
  }
}

// 处理搜索
const handleSearch = () => {
  pagination.page = 1
  fetchUsers()
}

// 处理重置
const handleReset = () => {
  searchForm.search = ''
  pagination.page = 1
  fetchUsers()
}

// 处理页码变化
const handlePageChange = (page) => {
  pagination.page = page
  fetchUsers()
}

// 处理页大小变化
const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  fetchUsers()
}

// 重置表单
const resetForm = () => {
  form.username = ''
  form.password = ''
  form.email = ''
  form.role = 'USER'
}

// 保存用户
const handleSave = async () => {
  try {
    await formRef.value.validate()
    
    saving.value = true
    
    const submitData = {
      username: form.username.trim(),
      password: form.password,
      role: form.role
    }
    
    if (form.email && form.email.trim()) {
      submitData.email = form.email.trim()
    }
    
    await authAPI.register(submitData)
    ElMessage.success('用户创建成功')
    
    dialogVisible.value = false
    fetchUsers()
  } catch (error) {
    if (error !== false) { // 验证失败会返回false
      console.error('创建用户失败:', error)
      ElMessage.error('创建用户失败')
    }
  } finally {
    saving.value = false
  }
}

// 保存角色修改
const handleSaveRole = async () => {
  try {
    if (newRole.value === selectedUser.value.role) {
      ElMessage.info('角色没有变化')
      return
    }
    
    saving.value = true
    
    await authAPI.updateUser(selectedUser.value.id, {
      role: newRole.value
    })
    
    ElMessage.success('角色修改成功')
    roleDialogVisible.value = false
    fetchUsers()
  } catch (error) {
    console.error('修改用户角色失败:', error)
    ElMessage.error('修改用户角色失败')
  } finally {
    saving.value = false
  }
}

// 页面加载时获取数据
onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.admin-users-page {
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

.role-form {
  margin: 20px 0;
}

.role-form p {
  margin-bottom: 12px;
  color: #606266;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .admin-users-page {
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
}
</style>