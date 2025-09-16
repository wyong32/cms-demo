<template>
  <div class="image-manager">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>图片管理</h2>
        <p>管理所有已使用的图片，按类型和项目分类</p>
      </div>
      <div class="header-right">
        <el-button @click="refreshImages" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 图片统计 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #409eff;">
              <el-icon size="24"><Picture /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">{{ stats.total || 0 }}</div>
              <div class="stats-label">总图片数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #67c23a;">
              <el-icon size="24"><Document /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">{{ stats.templates || 0 }}</div>
              <div class="stats-label">模板图片</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #e6a23c;">
              <el-icon size="24"><Folder /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">{{ stats.projects || 0 }}</div>
              <div class="stats-label">项目图片</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-item">
            <div class="stats-icon" style="background: #f56c6c;">
              <el-icon size="24"><Collection /></el-icon>
            </div>
            <div class="stats-content">
              <div class="stats-number">{{ Object.keys(stats.byCategory || {}).length }}</div>
              <div class="stats-label">分类数量</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 分类筛选器 -->
    <el-card class="filter-card" v-if="stats.byCategory && Object.keys(stats.byCategory).length > 0">
      <template #header>
        <span>分类筛选</span>
      </template>
      <div class="filter-tags">
        <el-tag 
          v-for="(count, category) in stats.byCategory" 
          :key="category"
          :type="selectedCategory === category ? 'primary' : undefined"
          :effect="selectedCategory === category ? 'dark' : 'plain'"
          @click="selectCategory(category)"
          class="filter-tag"
        >
          {{ category }} ({{ count }})
        </el-tag>
        <el-tag 
          v-if="selectedCategory"
          type="info"
          effect="plain"
          @click="clearCategory"
          class="filter-tag clear-tag"
        >
          清除筛选
        </el-tag>
      </div>
    </el-card>

    <!-- 图片列表 -->
    <el-card class="images-card">
      <template #header>
        <div class="card-header">
          <span>图片列表</span>
          <div class="header-actions">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索图片标题..."
              style="width: 200px; margin-right: 10px;"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select v-model="selectedType" placeholder="类型筛选" style="width: 120px; margin-right: 10px;" clearable>
              <el-option label="全部" value="" />
              <el-option label="模板" value="template" />
              <el-option label="项目" value="project" />
            </el-select>
            <el-select v-model="selectedProject" placeholder="项目筛选" style="width: 150px; margin-right: 10px;" clearable>
              <el-option label="全部项目" value="" />
              <el-option 
                v-for="(count, project) in stats.byProject" 
                :key="project"
                :label="`${project} (${count})`" 
                :value="project" 
              />
            </el-select>
          </div>
        </div>
      </template>

      <!-- 图片网格 -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="4" animated />
      </div>

      <div v-else-if="filteredImages.length === 0" class="empty-state">
        <el-empty description="暂无图片" />
      </div>

      <div v-else class="images-grid">
        <div
          v-for="image in paginatedImages"
          :key="image.id"
          class="image-item"
          @click="selectImage(image)"
        >
          <div class="image-container">
            <img :src="getImageUrl(image.imageUrl)" :alt="image.imageAlt || image.title" />
            <div class="image-overlay">
              <div class="image-actions">
                <el-button size="small" @click.stop="previewImage(image)">
                  <el-icon><View /></el-icon>
                </el-button>
                <el-button size="small" type="primary" @click.stop="viewSource(image)">
                  <el-icon><Link /></el-icon>
                </el-button>
                <el-button size="small" type="danger" @click.stop="deleteImage(image)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="image-type-badge" :class="`type-${image.type}`">
              {{ image.type === 'template' ? '模板' : '项目' }}
            </div>
          </div>
          <div class="image-info">
            <div class="image-title">{{ image.title }}</div>
            <div class="image-source">{{ image.source }}</div>
            <div class="image-details">
              <span class="category-tag">{{ image.categoryName }}</span>
              <span v-if="image.projectName" class="project-tag">{{ image.projectName }}</span>
            </div>
            <div class="image-date">{{ formatDate(image.createdAt) }}</div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[12, 24, 48, 96]"
          :total="filteredImages.length"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 图片预览对话框 -->
    <el-dialog
      v-model="previewVisible"
      title="图片预览"
      width="80%"
      :before-close="handlePreviewClose"
    >
      <div v-if="selectedImage" class="preview-container">
        <img :src="getImageUrl(selectedImage.imageUrl)" :alt="selectedImage.imageAlt || selectedImage.title" class="preview-image" />
        <div class="preview-info">
          <h3>图片信息</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="标题">{{ selectedImage.title }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ selectedImage.type === 'template' ? '数据模板' : '项目数据' }}</el-descriptions-item>
            <el-descriptions-item label="来源">{{ selectedImage.source }}</el-descriptions-item>
            <el-descriptions-item label="分类">{{ selectedImage.categoryName }}</el-descriptions-item>
            <el-descriptions-item label="项目" v-if="selectedImage.projectName">{{ selectedImage.projectName }}</el-descriptions-item>
            <el-descriptions-item label="描述">{{ selectedImage.imageAlt || '无描述' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDate(selectedImage.createdAt) }}</el-descriptions-item>
            <el-descriptions-item label="图片链接">{{ selectedImage.imageUrl }}</el-descriptions-item>
          </el-descriptions>
          
          <div class="preview-actions">
            <el-button @click="copyImageUrl">复制链接</el-button>
            <el-button @click="downloadImage">下载图片</el-button>
            <el-button type="primary" @click="viewSource(selectedImage)">查看来源</el-button>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Picture, FolderOpened, Search, View, Delete, Refresh, Document, Collection, Folder, Link } from '@element-plus/icons-vue'
import { uploadAPI, templateAPI, projectDataAPI } from '../api'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const images = ref([])
const stats = ref({})
const searchKeyword = ref('')
const selectedType = ref('')
const selectedCategory = ref('')
const selectedProject = ref('')
const currentPage = ref(1)
const pageSize = ref(24)
const previewVisible = ref(false)
const selectedImage = ref(null)

// 计算属性
const filteredImages = computed(() => {
  let filtered = images.value

  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(image => 
      image.title.toLowerCase().includes(keyword) ||
      image.imageAlt?.toLowerCase().includes(keyword)
    )
  }

  // 按类型筛选
  if (selectedType.value) {
    filtered = filtered.filter(image => 
      image.type === selectedType.value
    )
  }

  // 按分类筛选
  if (selectedCategory.value) {
    filtered = filtered.filter(image => 
      image.categoryName === selectedCategory.value
    )
  }

  // 按项目筛选
  if (selectedProject.value) {
    filtered = filtered.filter(image => 
      image.projectName === selectedProject.value
    )
  }

  return filtered
})

const paginatedImages = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredImages.value.slice(start, end)
})

// 方法
const fetchImages = async () => {
  try {
    loading.value = true
    const response = await uploadAPI.getUsedImages()
    
    if (response.data.success) {
      images.value = response.data.data.images || []
      stats.value = response.data.data.stats || {}
      console.log('📊 获取图片数据:', {
        total: images.value.length,
        stats: stats.value
      })
    } else {
      ElMessage.error('获取图片列表失败')
    }
  } catch (error) {
    console.error('获取图片列表失败:', error)
    ElMessage.error('获取图片列表失败')
  } finally {
    loading.value = false
  }
}

const refreshImages = () => {
  fetchImages()
}

const selectImage = (image) => {
  selectedImage.value = image
  previewVisible.value = true
}

const previewImage = (image) => {
  selectImage(image)
}

// 分类筛选
const selectCategory = (category) => {
  selectedCategory.value = category
  currentPage.value = 1
}

const clearCategory = () => {
  selectedCategory.value = ''
  currentPage.value = 1
}

// 查看来源
const viewSource = (image) => {
  if (image.type === 'template') {
    router.push(`/data-templates/edit/${image.id}`)
  } else {
    router.push(`/project/${image.projectId}/data/edit/${image.id}`)
  }
}

// 获取图片URL
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

// 复制图片URL
const copyImageUrl = async () => {
  if (selectedImage.value) {
    try {
      await navigator.clipboard.writeText(selectedImage.value.imageUrl)
      ElMessage.success('图片链接已复制到剪贴板')
    } catch (error) {
      ElMessage.error('复制失败')
    }
  }
}

// 下载图片
const downloadImage = () => {
  if (selectedImage.value) {
    const link = document.createElement('a')
    link.href = getImageUrl(selectedImage.value.imageUrl)
    link.download = selectedImage.value.title || 'image'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

const handlePreviewClose = () => {
  previewVisible.value = false
  selectedImage.value = null
}

// 删除图片
const deleteImage = async (image) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除图片 "${image.title}" 吗？此操作将同时删除相关的数据模板或项目数据。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 根据图片类型删除对应的数据
    if (image.type === 'template') {
      // 删除数据模板
      await templateAPI.deleteTemplate(image.sourceId)
    } else if (image.type === 'project') {
      // 删除项目数据
      await projectDataAPI.deleteProjectData(image.sourceId)
    }

    ElMessage.success('删除成功')
    
    // 刷新图片列表
    await fetchImages()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除图片失败:', error)
      ElMessage.error('删除失败，请稍后重试')
    }
  }
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val) => {
  currentPage.value = val
}

// 生命周期
onMounted(() => {
  fetchImages()
})
</script>

<style scoped>
.image-manager {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.header-left p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.stats-row {
  margin-bottom: 20px;
}

.stats-card {
  height: 100px;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-tag {
  cursor: pointer;
  transition: all 0.3s;
}

.filter-tag:hover {
  transform: translateY(-2px);
}

.clear-tag {
  margin-left: 12px;
}

.stats-item {
  display: flex;
  align-items: center;
  height: 100%;
}

.stats-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-right: 16px;
}

.stats-content {
  flex: 1;
}

.stats-number {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.stats-label {
  font-size: 14px;
  color: #909399;
}

.images-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
}

.loading-container {
  padding: 20px;
}

.empty-state {
  padding: 40px;
  text-align: center;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.image-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
}

.image-item:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.image-container {
  position: relative;
  width: 100%;
  height: 150px;
  overflow: hidden;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.image-item:hover .image-overlay {
  opacity: 1;
}

.image-actions {
  display: flex;
  gap: 8px;
}

.image-info {
  padding: 12px;
}

.image-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-source {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.image-details {
  display: flex;
  gap: 6px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.category-tag, .project-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #f0f9ff;
  color: #1890ff;
  border: 1px solid #d1ecf1;
}

.project-tag {
  background: #f6ffed;
  color: #52c41a;
  border-color: #d9f7be;
}

.image-date {
  font-size: 12px;
  color: #c0c4cc;
}

.image-type-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 12px;
  color: white;
  font-weight: 500;
}

.type-template {
  background: #67c23a;
}

.type-project {
  background: #e6a23c;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.preview-container {
  display: flex;
  gap: 20px;
}

.preview-image {
  max-width: 60%;
  max-height: 500px;
  object-fit: contain;
  border-radius: 8px;
}

.preview-info {
  flex: 1;
}

.preview-info h3 {
  margin: 0 0 16px 0;
  color: #303133;
}

.preview-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
}
</style>
