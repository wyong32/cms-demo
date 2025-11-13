<template>
  <div class="data-template-edit-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="handleGoBack" :icon="ArrowLeft" :loading="navigatingBack" :disabled="saving || resetting">返回</el-button>
        <h2>{{ isEdit ? '编辑数据模板' : '添加数据模板' }}</h2>
      </div>
      <div class="header-right">
        <el-button 
          @click="handleReset" 
          v-if="!readonly"
          :loading="resetting"
          :disabled="saving || navigatingBack"
        >
          重置
        </el-button>
        <el-button 
          type="primary" 
          @click="handleSave" 
          :loading="saving" 
          v-if="!readonly"
          :disabled="resetting || navigatingBack"
        >
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
        <!-- 基本信息 -->
        <div class="form-section">
          <h3>基本信息</h3>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="模板标题" prop="title" required>
                <el-input v-model="form.title" placeholder="请输入模板标题" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="一级分类" prop="topCategoryId" required>
                <el-select 
                  v-model="form.topCategoryId" 
                  placeholder="请选择一级分类" 
                  style="width: 100%"
                  @change="handleTopCategoryChange"
                >
                  <el-option
                    v-for="topCategory in topCategories"
                    :key="topCategory.id"
                    :label="topCategory.name"
                    :value="topCategory.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="二级分类" prop="categoryId" required>
                <el-select 
                  v-model="form.categoryId" 
                  placeholder="请选择二级分类" 
                  style="width: 100%"
                  :disabled="!form.topCategoryId"
                  filterable
                >
                  <el-option
                    v-for="category in filteredCategories"
                    :key="category.id"
                    :label="category.name"
                    :value="category.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <!-- 占位，保持布局 -->
            </el-col>
          </el-row>
          
          <el-form-item label="描述" prop="description" required>
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="3"
              placeholder="请输入模板描述"
            />
          </el-form-item>

          <el-form-item label="iframe链接" prop="iframeUrl" required>
            <div class="iframe-input-group">
              <el-input 
                v-model="form.iframeUrl" 
                placeholder="请输入iframe链接地址"
                style="flex: 1; margin-right: 12px;"
              />
              <el-button 
                type="primary" 
                @click="handlePreviewIframe"
                :disabled="!form.iframeUrl"
              >
                预览
              </el-button>
            </div>
          </el-form-item>

          <el-form-item label="图片上传" prop="imageUrl" required>
            <el-upload
              ref="uploadRef"
              name="image"
              :show-file-list="false"
              :on-success="handleUploadSuccess"
              :before-upload="beforeUpload"
              :on-error="handleUploadError"
              :action="uploadAction"
              :headers="uploadHeaders"
              accept="image/*"
              class="image-uploader"
            >
              <div v-if="form.imageUrl" class="uploaded-image">
                <img :src="getImageUrl(form.imageUrl)" alt="上传的图片" />
                <div class="image-overlay">
                  <el-icon class="upload-icon"><Plus /></el-icon>
                  <span>点击更换</span>
                </div>
              </div>
              <div v-else class="upload-placeholder">
                <el-icon class="upload-icon"><Plus /></el-icon>
                <div class="upload-text">点击上传图片</div>
              </div>
            </el-upload>
          </el-form-item>
        </div>
      </el-form>
    </el-card>

    <!-- iframe预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      title="iframe预览"
      width="90%"
      class="preview-dialog"
    >
      <div class="preview-container">
        <iframe 
          v-if="previewUrl"
          :src="previewUrl" 
          frameborder="0" 
          class="preview-iframe"
        ></iframe>
        <div v-else class="no-preview">
          无效的iframe链接
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus } from '@element-plus/icons-vue'
import { dataTemplateAPI, categoryAPI, uploadAPI } from '../api'
import { getImageUrl } from '../utils/imageHelper'
import { getUploadAction, getUploadHeaders } from '../utils/uploadHelper'
import { checkTemplateDuplicate } from '../utils/duplicateChecker'
import { UPLOAD } from '../constants'

const router = useRouter()
const route = useRoute()

const formRef = ref()
const uploadRef = ref()
const saving = ref(false)
const loading = ref(true)
const resetting = ref(false)
const navigatingBack = ref(false)
const topCategories = ref([]) // 一级分类列表
const categories = ref([]) // 所有二级分类列表
const filteredCategories = ref([]) // 根据一级分类筛选的二级分类
const previewDialogVisible = ref(false)
const previewUrl = ref('')

// 使用工具函数获取上传配置
const uploadHeaders = computed(() => getUploadHeaders())
const uploadAction = computed(() => getUploadAction())

// 计算属性
const isEdit = computed(() => !!route.params.id)
const readonly = computed(() => route.query.readonly === 'true')

// 表单数据
const form = reactive({
  title: '',
  description: '',
  topCategoryId: '', // 一级分类ID
  categoryId: '', // 二级分类ID
  iframeUrl: '',
  imageUrl: ''
})

// 表单验证规则
const rules = {
  title: [
    { required: true, message: '请输入模板标题', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  topCategoryId: [
    { required: true, message: '请选择一级分类', trigger: 'change' }
  ],
  categoryId: [
    { required: true, message: '请选择二级分类', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入模板描述', trigger: 'blur' }
  ],
  iframeUrl: [
    { required: true, message: '请输入iframe链接', trigger: 'blur' }
  ],
  imageUrl: [
    { required: true, message: '请上传图片', trigger: 'change' }
  ]
}

// 获取一级分类列表
const fetchTopCategories = async () => {
  try {
    const response = await categoryAPI.getCategories({ level: 1 })
    topCategories.value = response?.data?.categories || response?.categories || []
  } catch (error) {
    console.error('获取一级分类失败:', error)
  }
}

// 获取所有二级分类列表
const fetchCategories = async () => {
  try {
    const response = await categoryAPI.getCategories({ level: 2 })
    categories.value = response?.data?.categories || response?.categories || []
    filteredCategories.value = categories.value
  } catch (error) {
    console.error('获取分类失败:', error)
  }
}

// 处理一级分类变化
const handleTopCategoryChange = (topCategoryId) => {
  // 清空二级分类选择
  form.categoryId = ''
  
  if (topCategoryId) {
    // 筛选该一级分类下的二级分类
    filteredCategories.value = categories.value.filter(cat => cat.parentId === topCategoryId)
  } else {
    // 显示所有二级分类
    filteredCategories.value = categories.value
  }
}

// 获取数据模板详情
const fetchDataTemplate = async (id) => {
  try {
    const response = await dataTemplateAPI.getTemplate(id)
    const template = response.data.template
    
    // 获取分类信息以设置一级分类
    const category = categories.value.find(cat => cat.id === template.categoryId)
    const topCategoryId = category?.parentId || ''
    
    // 如果有一级分类，筛选二级分类
    if (topCategoryId) {
      filteredCategories.value = categories.value.filter(cat => cat.parentId === topCategoryId)
    }
    
    Object.assign(form, {
      title: template.title || '',
      description: template.description || '',
      topCategoryId: topCategoryId,
      categoryId: template.categoryId || '',
      iframeUrl: template.iframeUrl || '',
      imageUrl: template.imageUrl || ''
    })
  } catch (error) {
    console.error('获取数据模板失败:', error)
    ElMessage.error('获取数据模板失败')
  }
}

// 上传前验证
const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLtMaxSize = file.size < UPLOAD.MAX_SIZE

  if (!isImage) {
    ElMessage.error('只能上传图片文件！')
    return false
  }
  if (!isLtMaxSize) {
    ElMessage.error(`图片大小不能超过 ${UPLOAD.MAX_SIZE / 1024 / 1024}MB！`)
    return false
  }
  return true
}

// 上传成功
const handleUploadSuccess = (response) => {
  if (response.success) {
    form.imageUrl = response.data.imageUrl
    ElMessage.success('图片上传成功')
  } else {
    ElMessage.error(response.error || '上传失败')
  }
}

// 上传失败
const handleUploadError = (error) => {
  console.error('上传失败:', error)
  ElMessage.error('图片上传失败')
}

// 处理iframe预览
const handlePreviewIframe = () => {
  if (!form.iframeUrl || !form.iframeUrl.trim()) {
    ElMessage.warning('请先输入iframe链接')
    return
  }
  
  previewUrl.value = form.iframeUrl.trim()
  previewDialogVisible.value = true
}

// 保存
const handleSave = async () => {
  try {
    await formRef.value.validate()
    
    // 检查模板标题重复（仅在新建时检查）
    if (!isEdit.value && form.title) {
      try {
        await checkTemplateDuplicate(form.title, '这将创建重复的数据模板。')
      } catch (error) {
        if (error === 'cancel') {
          return // 用户取消
        }
        // 检查失败，继续执行
      }
    }
    
    saving.value = true
    
    if (isEdit.value) {
      await dataTemplateAPI.updateTemplate(route.params.id, form)
      ElMessage.success('更新成功')
    } else {
      await dataTemplateAPI.createTemplate(form)
      ElMessage.success('创建成功')
    }
    
    router.push({ name: 'DataTemplates' })
  } catch (error) {
    if (error !== false) { // 验证失败会返回false
      console.error('保存失败:', error)
      ElMessage.error('保存失败')
    }
  } finally {
    saving.value = false
  }
}

// 重置表单
const handleReset = async () => {
  if (resetting.value) return // 防止重复点击
  
  resetting.value = true
  
  try {
    if (isEdit.value) {
      await fetchDataTemplate(route.params.id)
    } else {
      Object.assign(form, {
        title: '',
        description: '',
        topCategoryId: '',
        categoryId: '',
        iframeUrl: '',
        imageUrl: ''
      })
      filteredCategories.value = categories.value
    }
    ElMessage.success('重置成功')
  } catch (error) {
    console.error('重置失败:', error)
    ElMessage.error('重置失败')
  } finally {
    resetting.value = false
  }
}

// 返回
const handleGoBack = () => {
  navigatingBack.value = true
  
  setTimeout(() => {
    router.push({ name: 'DataTemplates' })
    navigatingBack.value = false
  }, 200)
}

// 页面加载时获取数据
onMounted(async () => {
  try {
    loading.value = true
    await fetchTopCategories()
    await fetchCategories()
    if (isEdit.value) {
      await fetchDataTemplate(route.params.id)
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
.data-template-edit-page {
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

.form-card {
  margin-bottom: 20px;
}

.form-section {
  margin-bottom: 40px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.form-section h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #303133;
  border-bottom: 2px solid #409eff;
  padding-bottom: 8px;
}

.field-note {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 上传组件样式 */
.image-uploader {
  width: 100%;
}

.image-uploader :deep(.el-upload) {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
  width: 100%;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-uploader :deep(.el-upload:hover) {
  border-color: #409eff;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #8c939d;
}

.upload-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.upload-text {
  font-size: 14px;
}

.uploaded-image {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.uploaded-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
  color: white;
}

.uploaded-image:hover .image-overlay {
  opacity: 1;
}

.iframe-input-group {
  display: flex;
  align-items: center;
  width: 100%;
}

.preview-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.preview-container {
  width: 100%;
  height: 70vh;
  position: relative;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.no-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  font-size: 16px;
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
  
  .data-template-edit-page {
    padding: 12px;
  }
}
</style>