<template>
  <div class="data-template-edit-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="handleGoBack" :icon="ArrowLeft">返回</el-button>
        <h2>{{ isEdit ? '编辑数据模板' : '添加数据模板' }}</h2>
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
              <el-form-item label="分类" prop="categoryId" required>
                <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
                  <el-option
                    v-for="category in categories"
                    :key="category.id"
                    :label="category.name"
                    :value="category.id"
                  />
                </el-select>
              </el-form-item>
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
import { ElMessage } from 'element-plus'
import { ArrowLeft, Plus } from '@element-plus/icons-vue'
import { dataTemplateAPI, categoryAPI, uploadAPI } from '../api'

const router = useRouter()
const route = useRoute()

const formRef = ref()
const uploadRef = ref()
const saving = ref(false)
const loading = ref(true)
const categories = ref([])
const previewDialogVisible = ref(false)
const previewUrl = ref('')

// 上传相关
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('cms_token')}`
}))

// 上传地址
const uploadAction = computed(() => {
  const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : 'https://cms-demo-api.vercel.app/api')
  return `${baseURL}/upload/image`
})

// 计算属性
const isEdit = computed(() => !!route.params.id)
const readonly = computed(() => route.query.readonly === 'true')

// 表单数据
const form = reactive({
  title: '',
  description: '',
  categoryId: '',
  iframeUrl: '',
  imageUrl: ''
})

// 表单验证规则
const rules = {
  title: [
    { required: true, message: '请输入模板标题', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  categoryId: [
    { required: true, message: '请选择分类', trigger: 'change' }
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

// 获取分类列表
const fetchCategories = async () => {
  try {
    const response = await categoryAPI.getCategories()
    categories.value = response.data.categories || []
  } catch (error) {
    console.error('获取分类失败:', error)
  }
}

// 获取数据模板详情
const fetchDataTemplate = async (id) => {
  try {
    const response = await dataTemplateAPI.getTemplate(id)
    const template = response.data.template
    
    console.log('📊 模板详情加载:', {
      id: template.id,
      title: template.title,
      hasDetilsHtml: !!template.detailsHtml,
      detailsHtmlLength: template.detailsHtml?.length || 0
    })
    
    Object.assign(form, {
      title: template.title || '',
      description: template.description || '',
      categoryId: template.categoryId || '',
      iframeUrl: template.iframeUrl || '',
      imageUrl: template.imageUrl || ''
    })
    
    console.log('✅ 表单数据加载完成')
  } catch (error) {
    console.error('获取数据模板失败:', error)
    ElMessage.error('获取数据模板失败')
  }
}

// 上传前验证
const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('只能上传图片文件！')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB！')
    return false
  }
  return true
}

// 上传成功
const handleUploadSuccess = (response) => {
  console.log('📤 上传响应:', response)
  
  if (response.success) {
    form.imageUrl = response.data.imageUrl
    console.log('✅ 设置图片URL:', form.imageUrl)
    ElMessage.success('图片上传成功')
  } else {
    console.error('❌ 上传失败:', response.error)
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

// 获取图片URL
const getImageUrl = (url) => {
  if (!url) return ''
  
  console.log('🖼️ 处理图片URL:', url)
  
  // 如果是完整URL（http或https开头），直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('✅ 使用完整URL:', url)
    return url
  }
  
  // 如果是相对路径（以/api/开头），由于前端代理配置，直接返回
  if (url.startsWith('/api/')) {
    console.log('✅ 使用API路径:', url)
    return url
  }
  
  // 其他情况，假设是文件名，添加前缀
  const finalUrl = `/api/uploads/${url}`
  console.log('✅ 使用上传路径:', finalUrl)
  return finalUrl
}

// 保存
const handleSave = async () => {
  try {
    await formRef.value.validate()
    
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
const handleReset = () => {
  if (isEdit.value) {
    fetchDataTemplate(route.params.id)
  } else {
    Object.assign(form, {
      title: '',
      description: '',
      categoryId: '',
      iframeUrl: '',
      imageUrl: ''
    })
  }
}

// 返回
const handleGoBack = () => {
  router.push({ name: 'DataTemplates' })
}

// 页面加载时获取数据
onMounted(async () => {
  try {
    loading.value = true
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