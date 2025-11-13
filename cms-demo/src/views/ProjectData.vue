<template>
  <div class="project-data-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="handleGoBack" :icon="ArrowLeft">返回</el-button>
        <h2>{{ projectInfo?.name || projectName || '项目数据管理' }}</h2>
      </div>
      <div class="header-right">
        <el-button 
          type="success" 
          @click="handleAIGenerate"
          :loading="navigatingToAI"
          :disabled="navigatingToAdd || aiGenerating || batchDeleting || batchCompleting"
        >
          <el-icon><MagicStick /></el-icon>
          AI生成
        </el-button>
        <el-button 
          type="primary" 
          @click="handleAdd"
          :loading="navigatingToAdd"
          :disabled="navigatingToAI || aiGenerating || batchDeleting || batchCompleting"
        >
          <el-icon><Plus /></el-icon>
          添加数据
        </el-button>
        <el-button 
          @click="handleAddFromTemplate"
          :disabled="navigatingToAI || navigatingToAdd || aiGenerating || batchDeleting || batchCompleting"
        >
          <el-icon><Document /></el-icon>
          从模板创建
        </el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="数据标题">
          <el-input
            v-model="searchForm.title"
            placeholder="请输入数据标题"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select 
            v-model="searchForm.isCompleted" 
            placeholder="请选择状态" 
            clearable 
            @change="handleSearch"
            style="width: 120px"
          >
            <el-option label="未完成" :value="false" />
            <el-option label="已完成" :value="true" />
          </el-select>
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
        <el-table-column label="标题" min-width="200">
          <template #default="{ row }">
            {{ row.data?.title || '无标题' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isCompleted ? 'success' : 'warning'">
              {{ row.isCompleted ? '已完成' : '未完成' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creator.username" label="创建者" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button 
              type="primary" 
              size="small" 
              @click="handleEdit(row)"
              :loading="editingIds.has(row.id)"
              :disabled="deletingIds.has(row.id) || batchDeleting || batchCompleting"
            >
              编辑
            </el-button>
            <el-button 
              type="danger" 
              size="small" 
              @click="handleDelete(row)"
              :loading="deletingIds.has(row.id)"
              :disabled="editingIds.has(row.id) || batchDeleting || batchCompleting"
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

    <!-- 批量操作 -->
    <div v-if="selectedRows.length > 0" class="batch-actions">
      <el-button 
        type="danger" 
        @click="handleBatchDelete"
        :loading="batchDeleting"
        :disabled="batchCompleting"
      >
        批量删除 ({{ selectedRows.length }})
      </el-button>
      <el-button 
        type="success" 
        @click="handleBatchComplete"
        :loading="batchCompleting"
        :disabled="batchDeleting"
      >
        批量完成 ({{ selectedRows.length }})
      </el-button>
    </div>

    <!-- 从模板创建对话框 -->
    <el-dialog
      v-model="templateDialogVisible"
      title="从模板创建数据"
      width="900px"
      destroy-on-close
      :close-on-click-modal="!aiGenerating"
      :close-on-press-escape="!aiGenerating"
      :show-close="!aiGenerating"
    >
      <div class="template-selector">
        <!-- 分类筛选区域 -->
        <div class="template-filter">
          <CascadeCategorySelector 
            v-model="selectedCategoryId"
            placeholder="请选择二级分类"
            top-placeholder="请选择一级分类"
            :show-count="true"
            @top-category-change="handleTopCategoryChange"
            @change="handleCategoryChange"
          />
          <el-text type="info" size="small" class="filter-tip">
            选择分类可快速筛选相关模板
          </el-text>
        </div>
        
        <div 
          v-loading="templatesLoading || aiGenerating" 
          :element-loading-text="aiGenerating ? 'AI生成中...' : '加载模板中...'"
          class="template-grid"
        >
          <div 
            v-for="template in templates" 
            :key="template.id"
            class="template-card"
            :class="{ 'selected': templateForm.templateId === template.id, 'disabled': aiGenerating }"
            @click="!aiGenerating && handleSelectTemplate(template)"
          >
            <div class="template-image">
              <img 
                v-if="template.imageUrl" 
                :src="getImageUrl(template.imageUrl)" 
                :alt="template.imageAlt || template.title"
                class="template-thumbnail"
              />
              <div v-else class="no-image">
                <el-icon><Picture /></el-icon>
              </div>
            </div>
            <div class="template-info">
              <h4 class="template-title">{{ template.title }}</h4>
              <el-tag size="small" type="primary" class="template-category">
                {{ template.category?.name || '未分类' }}
              </el-tag>
            </div>
          </div>
        </div>

        <el-empty v-if="!templatesLoading && !aiGenerating && templates.length === 0" description="暂无模板数据" />
        
        <!-- 模板分页 -->
        <div v-if="templatePagination.total > 0" class="template-pagination">
          <el-pagination
            :current-page="templatePagination.page"
            :page-size="templatePagination.limit"
            :total="templatePagination.total"
            :page-sizes="[12, 24, 48, 96]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleTemplateSizeChange"
            @current-change="handleTemplatePageChange"
            :disabled="aiGenerating"
          />
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-text type="info" v-if="templateForm.templateId">
            已选择模板，点击创建按钮继续
          </el-text>
          <el-button @click="templateDialogVisible = false" :disabled="aiGenerating">取消</el-button>
          <el-button 
            type="primary" 
            @click="handleCreateFromTemplate"
            :disabled="!templateForm.templateId || aiGenerating"
            :loading="aiGenerating"
          >
            <el-icon v-if="!aiGenerating"><MagicStick /></el-icon>
            {{ aiGenerating ? 'AI生成中...' : 'AI生成创建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus, Document, MagicStick, Picture } from '@element-plus/icons-vue'
import { projectDataAPI, dataTemplateAPI, aiAPI, categoryAPI, projectAPI } from '../api'
import CascadeCategorySelector from '../components/CascadeCategorySelector.vue'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const templatesLoading = ref(false)
const tableData = ref([])
const selectedRows = ref([])
const templates = ref([])

const templateDialogVisible = ref(false)
const aiGenerating = ref(false)
const selectedTemplate = ref(null)

// 分类相关状态
const categories = ref([])
const selectedCategoryId = ref('')
const selectedTopCategoryId = ref('') // 当前选择的一级分类ID
const categoriesLoading = ref(false)

// 模板分页信息
const templatePagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 各种操作的loading状态
const editingIds = ref(new Set()) // 正在编辑的数据ID
const deletingIds = ref(new Set()) // 正在删除的数据ID
const batchDeleting = ref(false) // 批量删除loading
const batchCompleting = ref(false) // 批量完成loading
const navigatingToAI = ref(false) // 跳转到AI生成loading
const navigatingToAdd = ref(false) // 跳转到添加数据loading

// 项目信息
const projectId = computed(() => route.params.projectId)
const projectName = computed(() => route.query.projectName)

// 项目详细信息（用于获取项目名称）
const projectInfo = ref(null)

// 搜索表单
const searchForm = reactive({
  title: '',
  isCompleted: ''
})

// 模板表单
const templateForm = reactive({
  templateId: ''
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

// 获取项目信息
const fetchProjectInfo = async () => {
  if (!projectId.value) {
    return
  }
  
  try {
    const response = await projectAPI.getProject(projectId.value)
    projectInfo.value = response.data.project
  } catch (error) {
    console.error('获取项目信息失败:', error)
  }
}

// 获取项目数据列表
const fetchProjectData = async () => {
  // 检查项目ID是否存在
  if (!projectId.value) {
    ElMessage.error('项目ID缺失，请重新选择项目')
    return
  }
  
  loading.value = true
  try {
    // 如果项目信息不存在，先获取项目信息
    if (!projectInfo.value) {
      await fetchProjectInfo()
    }
    
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      projectId: projectId.value
    }
    
    if (searchForm.title && searchForm.title.trim()) {
      params.search = searchForm.title.trim()
    }
    
    if (searchForm.isCompleted !== '') {
      params.isCompleted = searchForm.isCompleted
    }
    
    const response = await projectDataAPI.getProjectData(params)
    tableData.value = response.data.projectData || []
    pagination.total = response.data.pagination?.total || 0
  } catch (error) {
    console.error('获取项目数据失败:', error)
    ElMessage.error('获取项目数据失败')
  } finally {
    loading.value = false
  }
}

// 获取模板列表
const fetchTemplates = async (categoryId = '', resetPage = false) => {
  templatesLoading.value = true
  try {
    // 如果重置分页，则回到第一页
    if (resetPage) {
      templatePagination.page = 1
    }
    
    const params = {
      page: templatePagination.page,
      limit: templatePagination.limit
    }
    
    if (categoryId) {
      params.categoryId = categoryId
    }
    
    const response = await dataTemplateAPI.getTemplatesForProject(params)
    templates.value = response.data.templates || []
    
    // 更新分页信息
    if (response.data.pagination) {
      templatePagination.total = response.data.pagination.total || 0
      templatePagination.page = response.data.pagination.page || 1
      templatePagination.limit = response.data.pagination.limit || 20
    }
  } catch (error) {
    console.error('获取模板列表失败:', error)
    ElMessage.error('获取模板列表失败')
  } finally {
    templatesLoading.value = false
  }
}

// 获取分类列表
const fetchCategories = async () => {
  categoriesLoading.value = true
  try {
    const response = await categoryAPI.getCategories()
    categories.value = response.data.categories || []
  } catch (error) {
    console.error('获取分类列表失败:', error)
    ElMessage.error('获取分类列表失败')
  } finally {
    categoriesLoading.value = false
  }
}

// 处理返回
const handleGoBack = () => {
  router.push({ name: 'Projects' })
}

// 处理AI生成
const handleAIGenerate = () => {
  navigatingToAI.value = true
  
  setTimeout(() => {
    router.push({ 
      name: 'AIGenerateForm', 
      params: { type: 'project' },
      query: { projectId: projectId.value, projectName: projectName.value }
    })
    navigatingToAI.value = false
  }, 200)
}

// 处理添加
const handleAdd = () => {
  navigatingToAdd.value = true
  
  setTimeout(() => {
    router.push({ 
      name: 'ProjectDataAdd',
      params: { projectId: projectId.value },
      query: { projectName: projectName.value }
    })
    navigatingToAdd.value = false
  }, 200)
}

// 处理从模板创建
const handleAddFromTemplate = () => {
  templateDialogVisible.value = true
  selectedCategoryId.value = '' // 重置分类选择
  selectedTopCategoryId.value = '' // 重置一级分类选择
  // 重置分页
  templatePagination.page = 1
  templatePagination.total = 0
  fetchCategories() // 获取分类列表
  fetchTemplates('', true) // 获取模板列表，重置分页
}

// 处理一级分类变化
const handleTopCategoryChange = (topCategoryId) => {
  // 一级分类变化时，重新加载模板（重置分页）
  selectedTopCategoryId.value = topCategoryId || ''
  selectedCategoryId.value = '' // 清空二级分类选择
  if (topCategoryId) {
    // 使用一级分类ID来筛选模板
    fetchTemplatesByTopCategory(topCategoryId, true)
  } else {
    // 如果清空一级分类，显示所有模板
    fetchTemplates('', true)
  }
}

// 根据一级分类获取模板
const fetchTemplatesByTopCategory = async (topCategoryId, resetPage = false) => {
  templatesLoading.value = true
  try {
    // 如果重置分页，则回到第一页
    if (resetPage) {
      templatePagination.page = 1
    }
    
    const params = {
      page: templatePagination.page,
      limit: templatePagination.limit,
      topCategoryId: topCategoryId
    }
    
    const response = await dataTemplateAPI.getTemplatesForProject(params)
    templates.value = response.data.templates || []
    
    // 更新分页信息
    if (response.data.pagination) {
      templatePagination.total = response.data.pagination.total || 0
      templatePagination.page = response.data.pagination.page || 1
      templatePagination.limit = response.data.pagination.limit || 20
    }
  } catch (error) {
    console.error('获取模板列表失败:', error)
    ElMessage.error('获取模板列表失败')
  } finally {
    templatesLoading.value = false
  }
}

// 处理分类筛选变化
const handleCategoryChange = (categoryId) => {
  selectedCategoryId.value = categoryId
  selectedTopCategoryId.value = '' // 选择二级分类时，清空一级分类选择
  fetchTemplates(categoryId, true) // 重置分页
}

// 处理模板分页变化
const handleTemplatePageChange = (page) => {
  templatePagination.page = page
  // 根据当前筛选模式调用相应的函数
  if (selectedTopCategoryId.value) {
    fetchTemplatesByTopCategory(selectedTopCategoryId.value)
  } else {
    fetchTemplates(selectedCategoryId.value)
  }
}

// 处理模板页大小变化
const handleTemplateSizeChange = (size) => {
  templatePagination.limit = size
  templatePagination.page = 1
  // 根据当前筛选模式调用相应的函数
  if (selectedTopCategoryId.value) {
    fetchTemplatesByTopCategory(selectedTopCategoryId.value)
  } else {
    fetchTemplates(selectedCategoryId.value)
  }
}

// 处理编辑
const handleEdit = (row) => {
  editingIds.value.add(row.id)
  
  // 添加短暂延迟，让用户看到loading状态
  setTimeout(() => {
    router.push({ 
      name: 'ProjectDataEdit',
      params: { 
        projectId: projectId.value,
        id: row.id 
      },
      query: { projectName: projectName.value }
    })
    editingIds.value.delete(row.id)
  }, 200)
}


// 处理删除
const handleDelete = async (row) => {
  if (deletingIds.value.has(row.id)) return // 防止重复点击
  
  try {
    await ElMessageBox.confirm(
      `确定要删除这条数据吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    deletingIds.value.add(row.id)
    
    const loadingMessage = ElMessage({
      message: '正在删除数据...',
      type: 'info',
      duration: 0 // 不自动关闭
    })
    
    try {
      await projectDataAPI.deleteProjectData(row.id)
      loadingMessage.close()
      ElMessage.success('删除成功')
      fetchProjectData()
    } catch (deleteError) {
      loadingMessage.close()
      throw deleteError
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  } finally {
    deletingIds.value.delete(row.id)
  }
}

// 处理批量删除
const handleBatchDelete = async () => {
  if (batchDeleting.value) return // 防止重复点击
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 条数据吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    batchDeleting.value = true
    
    const loadingMessage = ElMessage({
      message: `正在删除 ${selectedRows.value.length} 条数据...`,
      type: 'info',
      duration: 0 // 不自动关闭
    })
    
    try {
      const promises = selectedRows.value.map(row => projectDataAPI.deleteProjectData(row.id))
      await Promise.all(promises)
      
      loadingMessage.close()
      ElMessage.success('批量删除成功')
      selectedRows.value = []
      fetchProjectData()
    } catch (deleteError) {
      loadingMessage.close()
      throw deleteError
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  } finally {
    batchDeleting.value = false
  }
}

// 处理批量完成
const handleBatchComplete = async () => {
  if (batchCompleting.value) return // 防止重复点击
  
  try {
    const incompleteRows = selectedRows.value.filter(row => !row.isCompleted)
    
    if (incompleteRows.length === 0) {
      ElMessage.info('所选数据均已完成')
      return
    }
    
    batchCompleting.value = true
    
    try {
      const promises = incompleteRows.map(row => projectDataAPI.markAsCompleted(row.id))
      await Promise.all(promises)
      
      ElMessage.success('批量标记完成成功')
      selectedRows.value = []
      fetchProjectData()
    } catch (completeError) {
      throw completeError
    }
  } catch (error) {
    console.error('批量完成失败:', error)
    ElMessage.error('批量完成失败')
  } finally {
    batchCompleting.value = false
  }
}

// 处理选择变化
const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

// 处理搜索
const handleSearch = () => {
  pagination.page = 1
  fetchProjectData()
}

// 处理重置
const handleReset = () => {
  searchForm.title = ''
  searchForm.isCompleted = ''
  pagination.page = 1
  fetchProjectData()
}

// 处理页码变化
const handlePageChange = (page) => {
  pagination.page = page
  fetchProjectData()
}

// 处理页大小变化
const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  fetchProjectData()
}

// 处理选择模板
const handleSelectTemplate = (template) => {
  templateForm.templateId = template.id
  selectedTemplate.value = template
}


// 获取图片URL
const getImageUrl = (url) => {
  if (!url) return ''
  // 如果是完整URL（http或https开头），直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  // 如果是相对路径（以/api/开头），直接返回
  if (url.startsWith('/api/')) {
    return url
  }
  // 其他情况，假设是文件名，添加前缀
  return `/api/uploads/${url}`
}

// 处理从模板创建
const handleCreateFromTemplate = async () => {
  if (!selectedTemplate.value) {
    ElMessage.warning('请先选择一个模板')
    return
  }

  try {
    aiGenerating.value = true

    // 验证模板数据
    if (!selectedTemplate.value?.iframeUrl) {
      ElMessage.error('选中的模板缺少iframe链接，无法创建项目数据')
      aiGenerating.value = false
      return
    }

    // 检测是否有自定义字段
    const standardFields = ['title', 'description', 'publishDate', 'addressBar', 'iframeUrl', 'imageUrl', 'imageAlt', 'tags', 'seo_title', 'seo_description', 'seo_keywords', 'seoTitle', 'seoDescription', 'seoKeywords', 'detailsHtml']
    const projectFields = projectInfo.value?.fields || []
    const customFields = projectFields.filter(field => !standardFields.includes(field.fieldName))
    
    // 如果有自定义字段，提示用户并跳转到AI生成页面
    if (customFields.length > 0) {
      aiGenerating.value = false
      
      const customFieldNames = customFields.map(f => f.fieldName).join('、')
      
      await ElMessageBox.confirm(
        `该项目包含 ${customFields.length} 个自定义字段：\n\n${customFieldNames}\n\n` +
        `将跳转到AI生成页面，您可以填写这些字段后重新生成内容。`,
        '检测到自定义字段',
        {
          confirmButtonText: '前往AI生成',
          cancelButtonText: '取消',
          type: 'info'
        }
      )
      
      // 关闭对话框
      templateDialogVisible.value = false
      
      // 跳转到AI生成页面，传递模板ID
      router.push({
        name: 'AIGenerateForm',
        params: { type: 'project' },
        query: {
          projectId: projectId.value,
          projectName: projectName.value,
          templateId: selectedTemplate.value.id,
          fromTemplate: 'true'
        }
      })
      return
    }

    // 检查项目内标题是否重复
    if (selectedTemplate.value?.title) {
      try {
        const projectDuplicateResponse = await projectDataAPI.checkDuplicateInProject(projectId.value, selectedTemplate.value.title)
        if (projectDuplicateResponse.data.isDuplicate) {
          const existingData = projectDuplicateResponse.data.existingData
          await ElMessageBox.confirm(
            `模板标题"${selectedTemplate.value.title}"在当前项目中已存在！\n\n` +
            `现有数据信息：\n` +
            `创建者：${existingData.creator}\n` +
            `创建时间：${new Date(existingData.createdAt).toLocaleString()}\n\n` +
            `是否仍要继续创建？这将创建重复的项目数据。`,
            '项目内标题重复',
            {
              confirmButtonText: '继续创建',
              cancelButtonText: '取消',
              type: 'warning'
            }
          )
        }
      } catch (duplicateError) {
        if (duplicateError === 'cancel') {
          aiGenerating.value = false
          return // 用户取消
        }
        console.error('检查重复失败:', duplicateError)
        // 继续执行，不阻断流程
      }
    }

    // 调用AI生成接口，基于选中的模板生成项目数据
    const aiResponse = await aiAPI.generateFromTemplate({
      type: 'project',
      projectId: projectId.value,
      templateId: templateForm.templateId,
      title: selectedTemplate.value.title,
      description: selectedTemplate.value.description,
      imageUrl: selectedTemplate.value.imageUrl,
      iframeUrl: selectedTemplate.value.iframeUrl,
      options: ['autoSEO', 'autoContent', 'autoStructure']
    })

    if (aiResponse.data.success) {
      // 创建项目数据
      const projectData = {
        projectId: projectId.value,
        categoryId: selectedTemplate.value.categoryId,
        data: {
          title: aiResponse.data.data.title,
          description: aiResponse.data.data.description,
          iframeUrl: selectedTemplate.value.iframeUrl,
          publishDate: new Date().toISOString().split('T')[0],
          imageUrl: selectedTemplate.value.imageUrl,
          imageAlt: aiResponse.data.data.imageAlt || selectedTemplate.value.title,
          addressBar: aiResponse.data.data.addressBar,
          tags: aiResponse.data.data.tags || [],
          seo_title: aiResponse.data.data.seoTitle,
          seo_description: aiResponse.data.data.seoDescription,
          seo_keywords: aiResponse.data.data.seoKeywords,
          detailsHtml: aiResponse.data.data.detailsHtml
        }
      }

      await projectDataAPI.createProjectData(projectData)
      ElMessage.success('基于模板AI生成项目数据成功')
      fetchProjectData()
      
      // 创建成功后关闭弹出框并重置状态
      templateDialogVisible.value = false
      templateForm.templateId = ''
      selectedTemplate.value = null
    } else {
      ElMessage.error('AI生成失败: ' + (aiResponse.data.error || '未知错误'))
    }
  } catch (error) {
    console.error('从模板创建失败:', error)
    ElMessage.error('从模板创建失败: ' + (error.response?.data?.error || error.message))
  } finally {
    aiGenerating.value = false
  }
}


// 页面加载时获取数据
onMounted(async () => {
  // 先获取项目信息，再获取项目数据
  await fetchProjectInfo()
  await fetchProjectData()
})

// 监听路由参数变化，重新获取数据
watch(
  () => [route.params.projectId, route.query.projectName],
  ([newProjectId, newProjectName], [oldProjectId, oldProjectName]) => {
    // 如果项目ID或项目名称发生变化，重新获取数据
    if (newProjectId !== oldProjectId || newProjectName !== oldProjectName) {
      // 重置项目信息，强制重新获取
      projectInfo.value = null
      fetchProjectData()
    }
  },
  { immediate: false }
)
</script>

<style scoped>
.project-data-page {
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

.template-selector {
  max-height: 500px;
  overflow-y: auto;
}

.template-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  margin-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.filter-tip {
  color: #909399;
  font-size: 12px;
}

.template-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.template-card:hover {
  border-color: #409eff;
}

.template-card.selected {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.template-header h4 {
  margin: 0;
  color: #303133;
}

.template-description {
  margin: 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}


/* 模板选择网格样式 */
.template-selector {
  max-height: 600px;
  overflow-y: auto;
}

.template-pagination {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  justify-content: center;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  padding: 16px 0;
}

.template-card {
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-height: 140px;
}

.template-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
  transform: translateY(-2px);
}

.template-card.selected {
  border-color: #409eff;
  background-color: #f0f9ff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.template-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.template-card.disabled:hover {
  border-color: #e4e7ed;
  box-shadow: none;
  transform: none;
}

.template-image {
  aspect-ratio: 1/1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  border-radius: 6px;
  overflow: hidden;
  background-color: #f5f7fa;
}

.template-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

.no-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #909399;
  font-size: 12px;
}

.no-image .el-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.template-info {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.template-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  line-height: 1.3;
  text-align: center;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 32px;
}

.template-category {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 响应式样式 */
@media (max-width: 1200px) {
  .template-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 900px) {
  .template-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

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
  
  .project-data-page {
    padding: 12px;
  }
  
  .template-filter {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 12px 0;
  }
  
  .template-filter .el-select {
    width: 100% !important;
  }
  
  .template-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .template-card {
    min-height: 120px;
    padding: 8px;
  }
  
  .template-image {
    height: 60px;
  }
  
  .template-title {
    font-size: 12px;
    min-height: 28px;
  }
  
  .template-category {
    font-size: 10px;
    padding: 1px 4px;
  }
}

@media (max-width: 480px) {
  .template-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .template-card {
    min-height: 100px;
    flex-direction: row;
    text-align: left;
    align-items: center;
  }
  
  .template-image {
    width: 60px;
    height: 60px;
    margin-right: 12px;
    margin-bottom: 0;
    flex-shrink: 0;
  }
  
  .template-info {
    align-items: flex-start;
    flex: 1;
  }
  
  .template-title {
    text-align: left;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    min-height: auto;
  }
}
</style>