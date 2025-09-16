<template>
  <div class="project-data-edit-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="handleGoBack" :icon="ArrowLeft">返回</el-button>
        <h2>{{ isEdit ? '编辑项目数据' : '添加项目数据' }}</h2>
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
            <el-col :span="24">
              <el-form-item label="项目" prop="projectName">
                <el-input :value="projectName" disabled />
              </el-form-item>
            </el-col>
          </el-row>
          
          <!-- 基本信息字段 -->
          <el-row :gutter="20">
            <template v-for="field in displayBasicInfoFields">
              <!-- 标题 -->
              <el-col :span="getColSpan(field)" v-if="field.fieldName === 'title'" :key="`title-${field.id}`">
                <el-form-item 
                  :label="getFieldLabel(field)" 
                  :prop="`data.${field.fieldName}`"
                  :required="field.isRequired"
                >
                  <el-input
                    v-model="form.data[field.fieldName]"
                    :placeholder="`请输入${getFieldLabel(field)}`"
                  />
                </el-form-item>
              </el-col>
              
              <!-- 描述 -->
              <el-col :span="24" v-else-if="field.fieldName === 'description'" :key="`description-${field.id}`">
                <el-form-item 
                  :label="getFieldLabel(field)" 
                  :prop="`data.${field.fieldName}`"
                  :required="field.isRequired"
                >
                  <el-input
                    v-model="form.data[field.fieldName]"
                    type="textarea"
                    :rows="3"
                    :placeholder="`请输入${getFieldLabel(field)}`"
                  />
                </el-form-item>
              </el-col>
              
              <!-- 发布日期 -->
              <el-col :span="getColSpan(field)" v-else-if="field.fieldName === 'publishDate'" :key="`publishDate-${field.id}`">
                <el-form-item 
                  :label="getFieldLabel(field)" 
                  :prop="`data.${field.fieldName}`"
                  :required="field.isRequired"
                >
                  <el-date-picker
                    v-model="form.data[field.fieldName]"
                    type="date"
                    placeholder="请选择发布日期"
                    style="width: 100%"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                  />
                </el-form-item>
              </el-col>
              
              <!-- 地址栏 -->
              <el-col :span="getColSpan(field)" v-else-if="field.fieldName === 'addressBar'" :key="`addressBar-${field.id}`">
                <el-form-item 
                  :label="getFieldLabel(field)" 
                  :prop="`data.${field.fieldName}`"
                  :required="field.isRequired"
                >
                  <el-input
                    v-model="form.data[field.fieldName]"
                    :placeholder="`请输入${getFieldLabel(field)}`"
                  />
                </el-form-item>
              </el-col>
              
              <!-- iframe链接 -->
              <el-col :span="24" v-else-if="field.fieldName === 'iframeUrl'" :key="`iframeUrl-${field.id}`">
                <el-form-item 
                  :label="getFieldLabel(field)" 
                  :prop="`data.${field.fieldName}`"
                  :required="field.isRequired"
                >
                  <div class="iframe-input-group">
                    <el-input
                      v-model="form.data[field.fieldName]"
                      :placeholder="`请输入${getFieldLabel(field)}`"
                      style="flex: 1; margin-right: 12px;"
                    />
                    <el-button 
                      type="primary" 
                      @click="handlePreviewIframe"
                      :disabled="!form.data[field.fieldName]"
                    >
                      预览
                    </el-button>
                  </div>
                </el-form-item>
              </el-col>
              
              <!-- 图片上传和图片描述放一行 -->
              <el-col :span="24" v-else-if="isImageField(field.fieldName)" :key="`image-${field.id}`">
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item 
                      :label="getFieldLabel(field)" 
                      :prop="`data.${field.fieldName}`"
                      :required="field.isRequired"
                    >
                      <el-upload
                        ref="uploadRef"
                        name="image"
                        :show-file-list="false"
                        :on-success="(response) => handleUploadSuccess(response, field.fieldName)"
                        :before-upload="beforeUpload"
                        :on-error="handleUploadError"
                        action="/api/upload/image"
                        :headers="uploadHeaders"
                        accept="image/*"
                        class="image-uploader"
                      >
                        <div v-if="form.data[field.fieldName]" class="uploaded-image">
                          <img :src="getImageUrl(form.data[field.fieldName])" :alt="getFieldLabel(field)" />
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
                  </el-col>
                  
                  <!-- 图片描述在同一行 -->
                  <el-col :span="12">
                    <template v-for="altField in basicInfoFields">
                      <el-form-item 
                        v-if="altField.fieldName === 'imageAlt'"
                        :key="`imageAlt-${altField.id}`"
                        :label="getFieldLabel(altField)" 
                        :prop="`data.${altField.fieldName}`"
                        :required="altField.isRequired"
                      >
                        <el-input
                          v-model="form.data[altField.fieldName]"
                          :placeholder="`请输入${getFieldLabel(altField)}`"
                        />
                      </el-form-item>
                    </template>
                  </el-col>
                </el-row>
              </el-col>
              
              <!-- 标签 -->
              <el-col :span="24" v-else-if="field.fieldName === 'tags' && field.fieldType === 'ARRAY'" :key="`tags-${field.id}`">
                <el-form-item 
                  :label="getFieldLabel(field)" 
                  :prop="`data.${field.fieldName}`"
                  :required="field.isRequired"
                >
                  <el-select
                    v-model="form.data[field.fieldName]"
                    multiple
                    filterable
                    allow-create
                    default-first-option
                    :placeholder="`请输入${getFieldLabel(field)}，按回车添加`"
                    style="width: 100%"
                  >
                  </el-select>
                </el-form-item>
              </el-col>
            </template>
          </el-row>
        </div>

        <!-- SEO配置 -->
        <div v-if="seoFields.length > 0" class="form-section">
          <h3>SEO配置</h3>
          <el-row :gutter="20">
            <template v-for="field in seoFields">
              <el-col :span="getColSpan(field)" v-if="!isTextareaField(field.fieldName)" :key="`seo-${field.id}`">
                <el-form-item 
                  :label="getFieldLabel(field)" 
                  :prop="`data.${field.fieldName}`"
                  :required="field.isRequired"
                >
                  <el-input
                    v-model="form.data[field.fieldName]"
                    :placeholder="`请输入${getFieldLabel(field)}`"
                  />
                </el-form-item>
              </el-col>
              
              <el-col :span="24" v-else :key="`seo-textarea-${field.id}`">
                <el-form-item 
                  :label="getFieldLabel(field)" 
                  :prop="`data.${field.fieldName}`"
                  :required="field.isRequired"
                >
                  <el-input
                    v-model="form.data[field.fieldName]"
                    type="textarea"
                    :rows="3"
                    :placeholder="`请输入${getFieldLabel(field)}`"
                  />
                </el-form-item>
              </el-col>
            </template>
          </el-row>
        </div>
        
        <!-- 详细内容 -->
        <div v-if="contentFields.length > 0" class="form-section">
          <h3>详细内容</h3>
          <el-row :gutter="20">
            <div v-for="field in contentFields" :key="`content-${field.id}`">
              <el-col :span="24">
                <el-form-item 
                  :label="getFieldLabel(field)" 
                  :prop="`data.${field.fieldName}`"
                  :required="field.isRequired"
                >
                  <RichTextEditor
                    v-model="form.data[field.fieldName]"
                    :placeholder="`请输入${getFieldLabel(field)}`"
                    height="400px"
                    :disabled="readonly"
                  />
                  <!-- 原始HTML预览（调试用） -->
                  <el-form-item label="原始HTML预览（调试用）" v-if="form.data[field.fieldName]">
                    <div class="html-preview" v-html="form.data[field.fieldName]" style="border: 1px solid #ddd; padding: 10px; max-height: 200px; overflow-y: auto;"></div>
                    <el-text type="info" size="small">长度: {{ form.data[field.fieldName]?.length || 0 }} 字符</el-text>
                  </el-form-item>
                </el-form-item>
              </el-col>
            </div>
          </el-row>
        </div>
        
        <!-- 其他信息（只显示管理员添加的字段） -->
        <div v-if="otherFields.length > 0" class="form-section">
          <h3>其他信息</h3>
          <el-row :gutter="20">
            <template v-for="field in otherFields">
              <!-- 字符串类型字段 -->
              <el-col :span="getColSpan(field)" v-if="field.fieldType === 'STRING'" :key="`other-string-${field.id}`">
                <el-form-item 
                  :label="getFieldLabel(field)" 
                  :prop="`data.${field.fieldName}`"
                  :required="field.isRequired"
                >
                  <!-- 文本域字段 -->
                  <el-input
                    v-if="isTextareaField(field.fieldName)"
                    v-model="form.data[field.fieldName]"
                    type="textarea"
                    :rows="getTextareaRows(field.fieldName)"
                    :placeholder="`请输入${getFieldLabel(field)}`"
                  />
                  
                  <!-- 普通输入框 -->
                  <el-input
                    v-else
                    v-model="form.data[field.fieldName]"
                    :placeholder="`请输入${getFieldLabel(field)}`"
                  />
                </el-form-item>
              </el-col>
              
              <!-- 数组类型字段 -->
              <el-col :span="24" v-else-if="field.fieldType === 'ARRAY'" :key="`other-array-${field.id}`">
                <el-form-item 
                  :label="getFieldLabel(field)" 
                  :prop="`data.${field.fieldName}`"
                  :required="field.isRequired"
                >
                  <el-select
                    v-model="form.data[field.fieldName]"
                    multiple
                    filterable
                    allow-create
                    default-first-option
                    :placeholder="`请输入${getFieldLabel(field)}，按回车添加`"
                    style="width: 100%"
                  >
                  </el-select>
                </el-form-item>
              </el-col>
            </template>
          </el-row>
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
import { projectDataAPI, projectAPI, templateAPI } from '../api'
import { useAuthStore } from '../stores/counter'
import RichTextEditor from '../components/RichTextEditor.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref()
const uploadRef = ref()
const saving = ref(false)
const loading = ref(true)
const projectFields = ref([])
const previewDialogVisible = ref(false)
const previewUrl = ref('')

// 上传请求头
const uploadHeaders = computed(() => ({
  'Authorization': `Bearer ${authStore.token}`
}))

// 计算属性
const isEdit = computed(() => !!route.params.id)
const readonly = computed(() => route.query.readonly === 'true')
const projectId = computed(() => route.params.projectId)
const projectName = computed(() => route.query.projectName || '未知项目')
const templateId = computed(() => route.query.templateId)
const templateCategoryId = computed(() => route.query.categoryId)

// 表单数据
const form = reactive({
  data: {}
})

// 基本信息字段（不包含分类）
const basicInfoFields = computed(() => {
  return projectFields.value.filter(field => 
    ['title', 'description', 'publishDate', 'addressBar', 'iframeUrl', 'imageUrl', 'imageAlt', 'tags'].includes(field.fieldName)
  )
})

// 用于显示的基本信息字段（排除imageAlt，因为它会与图片上传在同一行显示）
const displayBasicInfoFields = computed(() => {
  return basicInfoFields.value.filter(field => field.fieldName !== 'imageAlt')
})

// SEO字段
const seoFields = computed(() => {
  return projectFields.value.filter(field => 
    field.fieldName.startsWith('seo') || ['seo_title', 'seo_description', 'seo_keywords'].includes(field.fieldName)
  )
})

// 详细内容字段
const contentFields = computed(() => {
  return projectFields.value.filter(field => 
    ['detailsHtml'].includes(field.fieldName)
  )
})

// 其他信息字段（只显示管理员添加的字段，排除categories字段）
const otherFields = computed(() => {
  const usedFieldNames = [
    ...basicInfoFields.value.map(f => f.fieldName),
    ...seoFields.value.map(f => f.fieldName),
    ...contentFields.value.map(f => f.fieldName),
    'categories' // 明确排除categories字段
  ]
  return projectFields.value.filter(field => 
    !usedFieldNames.includes(field.fieldName)
  )
})

// 动态生成验证规则
const rules = computed(() => {
  const dynamicRules = {}
  
  projectFields.value.forEach(field => {
    if (field.isRequired) {
      dynamicRules[`data.${field.fieldName}`] = [
        { required: true, message: `请输入${getFieldLabel(field)}`, trigger: 'blur' }
      ]
    }
  })
  
  return dynamicRules
})

// 获列宽度
const getColSpan = (field) => {
  if (field.fieldType === 'ARRAY') return 24
  if (isTextareaField(field.fieldName)) return 24
  if (field.fieldName === 'title') return 24
  if (field.fieldName === 'description') return 24
  if (field.fieldName === 'tags') return 24
  return 12
}

// 获取字段标签
const getFieldLabel = (field) => {
  const labelMap = {
    title: '标题',
    iframeUrl: 'iframe链接',
    description: '描述',
    tags: '标签',
    publishDate: '发布日期',
    imageUrl: '图片上传',
    imageAlt: '图片描述',
    seo_title: 'SEO标题',
    seo_description: 'SEO描述',
    seo_keywords: 'SEO关键词',
    seoTitle: 'SEO标题',
    seoDescription: 'SEO描述',
    seoKeywords: 'SEO关键词',
    addressBar: '地址栏',
    detailsHtml: '详细内容HTML'
  }
  
  return labelMap[field.fieldName] || field.fieldName
}

// 判断是否为文本域字段
const isTextareaField = (fieldName) => {
  return ['description', 'detailsHtml', 'seo_description'].includes(fieldName)
}

// 判断是否为图片字段
const isImageField = (fieldName) => {
  return ['imageUrl', 'image', 'picture', 'photo'].includes(fieldName)
}

// 获取文本域行数
const getTextareaRows = (fieldName) => {
  if (fieldName === 'detailsHtml') return 8
  if (fieldName === 'seo_description') return 3
  return 4
}

// 图片相关方法
const getImageUrl = (url) => {
  if (!url) return ''
  // 如果是完整URL（http或https开头），直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  // 如果是相对路径（以/api/开头），由于前端代理配置，直接返回
  if (url.startsWith('/api/')) {
    return url
  }
  // 其他情况，假设是文件名，添加前缀
  return `/api/uploads/${url}`
}

const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB!')
    return false
  }
  return true
}

const handleUploadSuccess = (response, fieldName) => {
  if (response.success) {
    form.data[fieldName] = response.data.imageUrl || response.data.filename
    ElMessage.success('图片上传成功')
  } else {
    ElMessage.error('图片上传失败')
  }
}

const handleUploadError = () => {
  ElMessage.error('图片上传失败')
}

// 处理iframe预览
const handlePreviewIframe = () => {
  const iframeUrl = form.data['iframeUrl']
  if (!iframeUrl || !iframeUrl.trim()) {
    ElMessage.warning('请先输入iframe链接')
    return
  }
  
  previewUrl.value = iframeUrl.trim()
  previewDialogVisible.value = true
}

// 获取项目信息
const fetchProject = async () => {
  try {
    if (import.meta.env.DEV) {
      console.log('开始获取项目信息，projectId:', projectId.value)
    }
    const response = await projectAPI.getProject(projectId.value)
    const project = response.data.project
    projectFields.value = project.fields || []
    if (import.meta.env.DEV) {
      console.log('项目字段:', projectFields.value)
    }
    
    // 初始化表单数据
    project.fields.forEach(field => {
      if (field.fieldType === 'ARRAY') {
        form.data[field.fieldName] = []
      } else {
        form.data[field.fieldName] = ''
      }
    })
    
    if (import.meta.env.DEV) {
      console.log('初始化后的表单数据:', form.data)
    }
    
    // 如果是从模板创建，预填充模板数据
    if (templateId.value && !isEdit.value) {
      if (import.meta.env.DEV) {
        console.log('检测到模板ID，开始获取模板数据')
      }
      await fetchTemplateData()
    }
  } catch (error) {
    console.error('获取项目信息失败:', error)
    ElMessage.error('获取项目信息失败')
  }
}

// 获取模板数据
const fetchTemplateData = async () => {
  try {
    if (import.meta.env.DEV) {
      console.log('开始获取模板数据，templateId:', templateId.value)
    }
    const response = await templateAPI.getTemplate(templateId.value)
    const template = response.data.template
    if (import.meta.env.DEV) {
      console.log('获取到的模板数据:', template)
    }
    
    // 直接映射模板的字段到项目数据字段
    const templateToProjectMapping = {
      title: 'title',
      description: 'description', 
      publishDate: 'publishDate',
      addressBar: 'addressBar',
      iframeUrl: 'iframeUrl',
      imageUrl: 'imageUrl',
      imageAlt: 'imageAlt',
      seoTitle: 'seo_title',
      seoDescription: 'seo_description',
      seoKeywords: 'seo_keywords',
      tags: 'tags',
      detailsHtml: 'detailsHtml'
    }
    
    // 预填充模板数据
    Object.keys(templateToProjectMapping).forEach(templateKey => {
      const projectKey = templateToProjectMapping[templateKey]
      const templateValue = template[templateKey]
      
      if (templateValue !== undefined && templateValue !== null) {
        if (import.meta.env.DEV) {
          console.log(`设置字段 ${projectKey} = ${templateValue}`)
        }
        form.data[projectKey] = templateValue
      }
    })
    
    if (import.meta.env.DEV) {
      console.log('预填充后的表单数据:', form.data)
    }
    ElMessage.success('模板数据预填充成功')
    
  } catch (error) {
    console.error('获取模板数据失败:', error)
    ElMessage.error('获取模板数据失败')
  }
}

// 获取项目数据详情
const fetchProjectData = async (id) => {
  try {
    const response = await projectDataAPI.getProjectDataById(id)
    const projectData = response.data.projectData
    
    form.data = { ...projectData.data }
  } catch (error) {
    console.error('获取项目数据失败:', error)
    ElMessage.error('获取项目数据失败')
  }
}

// 保存
const handleSave = async () => {
  try {
    await formRef.value.validate()
    
    saving.value = true
    
    const submitData = {
      projectId: projectId.value,
      data: form.data
    }
    
    if (isEdit.value) {
      await projectDataAPI.updateProjectData(route.params.id, submitData)
      ElMessage.success('更新成功')
    } else {
      await projectDataAPI.createProjectData(submitData)
      ElMessage.success('创建成功')
    }
    
    router.push({ 
      name: 'ProjectData',
      params: { projectId: projectId.value },
      query: { projectName: projectName.value }
    })
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
    fetchProjectData(route.params.id)
  } else {
    if (import.meta.env.DEV) {
      console.log('重置表单，当前模板ID:', templateId.value)
    }
    projectFields.value.forEach(field => {
      if (field.fieldType === 'ARRAY') {
        form.data[field.fieldName] = []
      } else {
        form.data[field.fieldName] = ''
      }
    })
    
    // 如果是从模板创建，重新加载模板数据
    if (templateId.value) {
      if (import.meta.env.DEV) {
        console.log('重新加载模板数据')
      }
      fetchTemplateData()
    }
  }
}

// 返回
const handleGoBack = () => {
  router.push({ 
    name: 'ProjectData',
    params: { projectId: projectId.value },
    query: { projectName: projectName.value }
  })
}

// 页面加载时获取数据
onMounted(async () => {
  try {
    loading.value = true
    
    if (import.meta.env.DEV) {
      console.log('页面加载，路由参数:', {
        projectId: projectId.value,
        templateId: templateId.value,
        isEdit: isEdit.value,
        routeParams: route.params,
        routeQuery: route.query
      })
    }
    
    await fetchProject()
    
    if (isEdit.value) {
      await fetchProjectData(route.params.id)
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
.project-data-edit-page {
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

/* 图片上传样式 */
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
  
  .project-data-edit-page {
    padding: 12px;
  }
}
</style>