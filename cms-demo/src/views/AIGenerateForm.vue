<template>
  <div class="ai-generate-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="handleGoBack" :icon="ArrowLeft">返回</el-button>
        <h2>AI智能生成{{ generateType === 'template' ? '数据模板' : '项目数据' }}</h2>
      </div>
      <div class="header-right">
        <el-button @click="handleReset">重置</el-button>
        <el-button type="primary" @click="handleGenerate" :loading="generating">
          <el-icon><MagicStick /></el-icon>
          {{ generating ? 'AI生成中...' : 'AI生成' }}
        </el-button>
      </div>
    </div>

    <el-card class="form-card" shadow="never">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
      >
        <!-- AI生成提示 -->
        <div class="ai-tips">
          <el-alert
            title="AI生成说明"
            type="info"
            :closable="false"
            show-icon
          >
            <template #default>
              <p>请填写以下信息，AI将根据您提供的内容自动生成完整的{{ generateType === 'template' ? '数据模板' : '项目数据' }}：</p>
              <ul>
                <li>标题：描述您想创建的内容主题</li>
                <li>图片：上传相关图片，AI将分析图片内容</li>
                <li>iframe链接：提供相关网页链接，AI将分析页面内容</li>
                <li>详细描述：详细描述您的需求和期望</li>
              </ul>
            </template>
          </el-alert>
        </div>

        <!-- 基本信息 -->
        <div class="form-section">
          <h3>基本信息</h3>
          
          <!-- 标题 -->
          <el-form-item label="标题" prop="title" required>
            <el-input
              v-model="form.title"
              placeholder="请输入内容主题，如：科技产品介绍、旅游景点推荐等"
              show-word-limit
              maxlength="100"
            />
          </el-form-item>

          <!-- 分类选择（仅数据模板需要） -->
          <el-form-item v-if="generateType === 'template'" label="分类" prop="categoryId" required>
            <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
              <el-option
                v-for="category in categories"
                :key="category.id"
                :label="category.name"
                :value="category.id"
              />
            </el-select>
          </el-form-item>

          <!-- 项目选择（仅项目数据需要） -->
          <el-form-item v-if="generateType === 'project'" label="目标项目" prop="projectId" required>
            <!-- 如果从项目页面进入，显示只读的项目信息 -->
            <div v-if="route.query.projectId" class="selected-project-info">
              <el-input 
                :value="route.query.projectName || `项目 ID: ${route.query.projectId}`" 
                readonly
                placeholder="已选定项目"
              >
                <template #prepend>
                  <el-icon><Folder /></el-icon>
                </template>
                <template #append>
                  <el-button 
                    type="text" 
                    @click="clearProjectSelection"
                    title="清除选择，手动选择其他项目"
                  >
                    <el-icon><Close /></el-icon>
                  </el-button>
                </template>
              </el-input>
              <div class="project-info-tip">
                <el-text type="info" size="small">
                  当前已自动选定此项目，无需重复选择。如需选择其他项目，请点击右侧清除按钮。
                </el-text>
              </div>
            </div>
            <!-- 手动选择项目 -->
            <el-select 
              v-else
              v-model="form.projectId" 
              placeholder="请选择项目" 
              style="width: 100%"
              filterable
            >
              <el-option
                v-for="project in projects"
                :key="project.id"
                :label="project.name"
                :value="project.id"
              />
            </el-select>
          </el-form-item>
        </div>

        <!-- 媒体内容 -->
        <div class="form-section">
          <h3>媒体内容</h3>
          
          <!-- 图片上传 -->
          <el-form-item label="上传图片" prop="imageUrl">
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
                <div class="upload-hint">AI将分析图片内容</div>
              </div>
            </el-upload>
          </el-form-item>

          <!-- iframe链接 -->
          <el-form-item label="iframe链接" prop="iframeUrl">
            <div class="iframe-input-group">
              <el-input 
                v-model="form.iframeUrl" 
                placeholder="请输入相关网页链接，AI将分析页面内容"
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
        </div>

        <!-- 详细描述 -->
        <div class="form-section">
          <h3>详细描述</h3>
          
          <el-form-item label="需求描述" prop="description" required>
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="6"
              placeholder="请详细描述您的需求和期望，例如：&#10;- 目标用户群体&#10;- 内容风格偏好&#10;- 重点突出的信息&#10;- 期望的展示效果&#10;- 其他特殊要求"
              show-word-limit
              maxlength="2000"
            />
          </el-form-item>

          <!-- AI生成选项 -->
          <el-form-item label="生成选项">
            <el-checkbox-group v-model="form.generateOptions">
              <el-checkbox label="autoTags">自动生成标签</el-checkbox>
              <el-checkbox label="autoSEO">自动生成SEO信息</el-checkbox>
              <el-checkbox label="autoContent">自动生成详细内容</el-checkbox>
              <el-checkbox label="autoStructure">智能优化结构</el-checkbox>
            </el-checkbox-group>
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
import { ArrowLeft, Plus, MagicStick, Folder, Close } from '@element-plus/icons-vue'
import { dataTemplateAPI, categoryAPI, projectAPI, uploadAPI, aiAPI } from '../api'

const router = useRouter()
const route = useRoute()

const formRef = ref()
const uploadRef = ref()
const generating = ref(false)
const categories = ref([])
const projects = ref([])
const previewDialogVisible = ref(false)
const previewUrl = ref('')

// 生成类型：template 或 project
const generateType = computed(() => route.params.type || 'template')

// 上传相关
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('cms_token')}`
}))

// 上传地址
const uploadAction = computed(() => {
  const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : 'https://cms-demo-api.vercel.app/api')
  return `${baseURL}/upload/image`
})

// 表单数据
const form = reactive({
  title: '',
  categoryId: '', // 仅模板需要
  projectId: '', // 仅项目数据需要
  imageUrl: '',
  iframeUrl: '',
  description: '',
  generateOptions: ['autoTags', 'autoSEO', 'autoContent', 'autoStructure'] // 默认选中所有选项
})

// 表单验证规则
const rules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { min: 2, max: 100, message: '标题长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  categoryId: generateType.value === 'template' ? [
    { required: true, message: '请选择分类', trigger: 'change' }
  ] : [],
  projectId: generateType.value === 'project' ? [
    { required: true, message: '请选择项目', trigger: 'change' }
  ] : [],
  description: [
    { required: true, message: '请输入需求描述', trigger: 'blur' },
    { min: 10, max: 2000, message: '描述长度在 10 到 2000 个字符', trigger: 'blur' }
  ]
}

// 获取分类列表
const fetchCategories = async () => {
  if (generateType.value !== 'template') return
  
  try {
    const response = await categoryAPI.getCategories()
    categories.value = response.data.categories || []
  } catch (error) {
    console.error('获取分类失败:', error)
  }
}

// 获取项目列表
const fetchProjects = async () => {
  if (generateType.value !== 'project') return
  
  try {
    const response = await projectAPI.getProjects({ limit: 1000 })
    projects.value = response.data.projects || []
  } catch (error) {
    console.error('获取项目列表失败:', error)
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

// 获取图片URL
const getImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  if (url.startsWith('/api/')) {
    return url
  }
  return `/api/uploads/${url}`
}

// AI生成处理
const handleGenerate = async () => {
  try {
    await formRef.value.validate()
    
    generating.value = true
    
    // 显示生成进度提示
    ElMessage({
      message: 'AI内容生成中，请耐心等待（可能需要30-60秒）...',
      type: 'info',
      duration: 3000
    })
    
    // 构建AI生成请求数据
    const generateData = {
      type: generateType.value,
      title: form.title,
      description: form.description,
      imageUrl: form.imageUrl,
      iframeUrl: form.iframeUrl,
      options: form.generateOptions,
      ...(generateType.value === 'template' && { categoryId: form.categoryId }),
      ...(generateType.value === 'project' && { projectId: form.projectId })
    }
    
    console.log('🚀 开始AI生成，数据:', generateData)
    
    // 调用AI生成API
    const response = await aiAPI.generate(generateData)
    
    if (response.data.success) {
      ElMessage.success('AI生成成功！正在跳转...')
      // 跳转到对应的列表页面
      if (generateType.value === 'template') {
        router.push({ name: 'DataTemplates' })
      } else {
        router.push({ 
          name: 'ProjectData',
          params: { projectId: form.projectId }
        })
      }
    } else {
      ElMessage.error(response.data.error || 'AI生成失败')
    }
    
  } catch (error) {
    console.error('AI生成失败:', error)
    
    // 根据错误类型提供不同的提示
    if (error.code === 'ECONNABORTED') {
      ElMessage.error('AI生成超时，请检查网络连接或稍后重试')
    } else if (error.response) {
      ElMessage.error(error.response.data?.error || 'AI生成失败，请稍后重试')
    } else {
      ElMessage.error('AI生成失败，请检查网络连接')
    }
  } finally {
    generating.value = false
  }
}

// 重置表单
const handleReset = () => {
  form.title = ''
  form.categoryId = ''
  form.projectId = ''
  form.imageUrl = ''
  form.iframeUrl = ''
  form.description = ''
  form.generateOptions = ['autoTags', 'autoSEO', 'autoContent', 'autoStructure']
}

// 清除项目选择
const clearProjectSelection = () => {
  form.projectId = ''
  // 清除路由查询参数
  router.replace({
    ...route,
    query: {
      ...route.query,
      projectId: undefined,
      projectName: undefined
    }
  })
}

// 返回
const handleGoBack = () => {
  if (generateType.value === 'template') {
    router.push({ name: 'DataTemplates' })
  } else {
    router.push({ name: 'Projects' })
  }
}

// 页面加载时获取数据并初始化表单
onMounted(() => {
  fetchCategories()
  fetchProjects()
  
  // 检查路由查询参数，自动设置项目ID（如果从项目页面进入）
  if (generateType.value === 'project' && route.query.projectId) {
    form.projectId = route.query.projectId
    console.log('🎯 自动设置项目ID:', route.query.projectId, '项目名称:', route.query.projectName)
  }
})
</script>

<style scoped>
.ai-generate-page {
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

.ai-tips {
  margin-bottom: 30px;
}

.ai-tips ul {
  margin: 10px 0 0 0;
  padding-left: 20px;
}

.ai-tips li {
  margin: 5px 0;
  color: #606266;
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
  height: 200px;
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
  font-size: 32px;
  margin-bottom: 12px;
}

.upload-text {
  font-size: 16px;
  margin-bottom: 4px;
}

.upload-hint {
  font-size: 12px;
  color: #c0c4cc;
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

/* 选定项目信息样式 */
.selected-project-info {
  width: 100%;
}

.project-info-tip {
  margin-top: 8px;
}

.project-info-tip :deep(.el-text) {
  line-height: 1.4;
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
  
  .ai-generate-page {
    padding: 12px;
  }
  
  .image-uploader :deep(.el-upload) {
    height: 150px;
  }
}
</style>