<template>
  <div class="category-edit-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="handleGoBack" :icon="ArrowLeft">返回</el-button>
        <h2>{{ isEdit ? '编辑分类' : '添加分类' }}</h2>
      </div>
      <div class="header-right">
        <el-button @click="handleReset" v-if="!readonly">重置</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving" v-if="!readonly">
          保存
        </el-button>
      </div>
    </div>

    <el-card class="form-card" shadow="never" v-loading="loading">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        :disabled="readonly"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="分类名称" prop="name" required>
              <el-input v-model="form.name" placeholder="请输入分类名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分类类型" prop="type" required>
              <el-input v-model="form.type" placeholder="请输入分类类型" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item v-if="parentCategoryName" label="所属分类">
          <el-tag type="primary" size="large">{{ parentCategoryName }}</el-tag>
        </el-form-item>
        
        <el-form-item label="分类描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="请输入分类描述"
          />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 关联模板 -->
    <el-card v-if="isEdit" class="templates-card" shadow="never">
      <template #header>
        <h3>关联的数据模板</h3>
      </template>
      
      <el-table :data="relatedTemplates" border stripe>
        <el-table-column prop="title" label="模板标题" min-width="200" />
        <el-table-column prop="description" label="描述" min-width="250" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleViewTemplate(row)">
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty 
        v-if="relatedTemplates.length === 0"
        description="暂无关联的数据模板"
        :image-size="120"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { categoriesAPI, templateAPI } from '../api'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()

const formRef = ref()
const saving = ref(false)
const loading = ref(true)
const relatedTemplates = ref([])
const parentCategoryName = ref('')

// 计算属性
const isEdit = computed(() => !!route.params.id)
const readonly = computed(() => route.query.readonly === 'true')

// 表单数据
const form = reactive({
  name: '',
  type: '',
  description: '',
  parentId: route.query.parentId || '' // 从URL获取父分类ID
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

// 获取父分类名称
const fetchParentCategoryName = async (parentId) => {
  if (!parentId) return
  
  try {
    const response = await categoriesAPI.getCategory(parentId)
    parentCategoryName.value = response?.category?.name || ''
  } catch (error) {
    console.error('获取父分类名称失败:', error)
  }
}

// 获取分类详情
const fetchCategory = async (id) => {
  try {
    const response = await categoriesAPI.getCategory(id)
    const category = response?.category
    
    Object.assign(form, {
      name: category.name,
      type: category.type || '',
      description: category.description || '',
      parentId: category.parentId || ''
    })

    // 获取父分类名称
    if (category.parentId) {
      await fetchParentCategoryName(category.parentId)
    }
  } catch (error) {
    console.error('获取分类失败:', error)
    ElMessage.error('获取分类失败')
  }
}

// 获取关联模板
const fetchRelatedTemplates = async (categoryId) => {
  try {
    const response = await templateAPI.getTemplates({ categoryId })
    relatedTemplates.value = response?.templates || []
  } catch (error) {
    console.error('获取关联模板失败:', error)
  }
}

// 查看模板
const handleViewTemplate = (template) => {
  router.push({ 
    name: 'DataTemplateEdit', 
    params: { id: template.id }, 
    query: { readonly: 'true' } 
  })
}

// 保存
const handleSave = async () => {
  try {
    await formRef.value.validate()
    
    saving.value = true
    
    const data = {
      name: form.name,
      type: form.type,
      description: form.description,
      level: 2, // 固定为二级分类
      parentId: form.parentId || null
    }
    
    if (isEdit.value) {
      await categoriesAPI.updateCategory(route.params.id, data)
      ElMessage.success('更新成功')
    } else {
      await categoriesAPI.createCategory(data)
      ElMessage.success('创建成功')
    }
    
    // 返回到分类列表，带上父分类ID
    router.push({ 
      path: '/categories',
      query: form.parentId ? { parentId: form.parentId } : {}
    })
  } catch (error) {
    if (error !== false) {
      console.error('保存失败:', error)
      ElMessage.error(error.response?.data?.error || '保存失败')
    }
  } finally {
    saving.value = false
  }
}

// 重置表单
const handleReset = () => {
  if (isEdit.value) {
    fetchCategory(route.params.id)
  } else {
    Object.assign(form, {
      name: '',
      type: '',
      description: '',
      parentId: route.query.parentId || ''
    })
  }
}

// 返回
const handleGoBack = () => {
  router.push({ 
    path: '/categories',
    query: form.parentId ? { parentId: form.parentId } : {}
  })
}

// 页面加载时获取数据
onMounted(async () => {
  try {
    loading.value = true
    
    // 如果是新建且有父分类ID，获取父分类名称
    if (!isEdit.value && form.parentId) {
      await fetchParentCategoryName(form.parentId)
    }
    
    if (isEdit.value) {
      await Promise.all([
        fetchCategory(route.params.id),
        fetchRelatedTemplates(route.params.id)
      ])
    }
  } catch (error) {
    console.error('页面初始化失败:', error)
    ElMessage.error('页面加载失败，请刷新重试')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.category-edit-page {
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

.form-card, 
.templates-card {
  margin-bottom: 20px;
}

.templates-card h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
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
  
  .category-edit-page {
    padding: 12px;
  }
}
</style>