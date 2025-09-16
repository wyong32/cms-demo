<template>
  <div class="projects-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>项目列表</h2>
    </div>

    <!-- 搜索栏 -->
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
        <el-form-item label="项目分类">
          <el-select
            v-model="searchForm.category"
            placeholder="请选择项目分类"
            clearable
            style="width: 200px"
            @change="handleSearch"
          >
            <el-option
              v-for="category in projectCategories"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 项目列表 -->
    <el-card class="projects-grid" shadow="never">
      <el-row :gutter="20" v-loading="loading">
        <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="project in projects" :key="project.id">
          <div class="project-card" @click="handleProjectClick(project)">
            <div class="project-header">
              <h3 class="project-title">{{ project.name }}</h3>
              <div class="project-tags">
                <el-tag v-if="project.category" type="success" size="small">{{ project.category }}</el-tag>
                <el-tag type="info" size="small">{{ project._count?.projectData || 0 }} 条数据</el-tag>
              </div>
            </div>
            <div class="project-description">
              <p>{{ project.description || '暂无描述' }}</p>
            </div>
            <div class="project-meta">
              <div class="project-creator">
                <el-icon><User /></el-icon>
                <span>{{ project.creator?.username }}</span>
              </div>
              <div class="project-date">
                <el-icon><Calendar /></el-icon>
                <span>{{ formatDate(project.createdAt) }}</span>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>

      <!-- 空状态 -->
      <el-empty v-if="!loading && projects.length === 0" description="暂无项目数据" />

      <!-- 分页 -->
      <div v-if="projects.length > 0" class="pagination-wrapper">
        <el-pagination
          :current-page="pagination.page"
          :page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[12, 24, 48, 96]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Calendar } from '@element-plus/icons-vue'
import { projectAPI } from '../api'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const projects = ref([])
const projectCategories = ref([])

// 搜索表单
const searchForm = reactive({
  name: '',
  category: ''
})

// 分页信息
const pagination = reactive({
  page: 1,
  limit: 12,
  total: 0
})

// 格式化日期
const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD')
}

// 获取项目分类列表
const fetchProjectCategories = async () => {
  try {
    // 获取所有项目的分类（不分页）
    const response = await projectAPI.getProjects({ limit: 1000 })
    const allProjects = response.data.projects || []
    
    // 提取所有唯一的项目分类
    const allCategories = allProjects
      .map(p => p.category)
      .filter(c => c && c.trim())
    projectCategories.value = [...new Set(allCategories)]
  } catch (error) {
    console.error('获取项目分类失败:', error)
  }
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
    
    if (searchForm.category && searchForm.category.trim()) {
      params.category = searchForm.category.trim()
    }
    
    const response = await projectAPI.getProjects(params)
    projects.value = response.data.projects || []
    pagination.total = response.data.pagination?.total || 0
  } catch (error) {
    console.error('获取项目列表失败:', error)
    ElMessage.error('获取项目列表失败')
  } finally {
    loading.value = false
  }
}

// 处理项目点击
const handleProjectClick = (project) => {
  router.push({
    name: 'ProjectData',
    params: { projectId: project.id },
    query: { projectName: project.name }
  })
}

// 处理搜索
const handleSearch = () => {
  pagination.page = 1
  fetchProjects()
}

// 处理重置
const handleReset = () => {
  searchForm.name = ''
  searchForm.category = ''
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

// 页面加载时获取数据
onMounted(() => {
  fetchProjectCategories() // 先获取分类列表
  fetchProjects() // 再获取项目列表
})
</script>

<style scoped>
.projects-page {
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

.search-card {
  margin-bottom: 20px;
}

.projects-grid {
  margin-bottom: 20px;
}

.project-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s;
  height: 200px;
  display: flex;
  flex-direction: column;
}

.project-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.project-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  flex: 1;
  margin-right: 12px;
  line-height: 1.4;
}

.project-tags {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.project-description {
  flex: 1;
  margin-bottom: 16px;
}

.project-description p {
  margin: 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  display: -webkit-box;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;
  color: #909399;
}

.project-creator,
.project-date {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .projects-page {
    padding: 12px;
  }
  
  .project-card {
    height: auto;
    min-height: 160px;
  }
}
</style>