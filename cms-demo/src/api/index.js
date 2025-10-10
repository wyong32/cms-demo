import api from '../utils/request.js'

// 认证相关API
export const authAPI = {
  // 登录
  login: (data) => api.post('/auth/login', data),
  
  // 获取当前用户信息
  getCurrentUser: () => api.get('/auth/me'),
  
  // 注册用户（管理员功能）
  register: (data) => api.post('/auth/register', data),
  
  // 获取用户列表（管理员功能）
  getUsers: (params) => api.get('/auth/users', { params }),
  
  // 更新用户状态（管理员功能）
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  
  // 删除用户（管理员功能）
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
  
  // 更新个人资料
  updateProfile: (data) => api.put('/auth/profile', data)
}

// 分类相关API
export const categoriesAPI = {
  // 获取分类列表（支持层级查询）
  getCategories: (params) => api.get('/categories', { params }),
  
  // 获取分类树结构
  getCategoryTree: (params) => api.get('/categories/tree', { params }),
  
  // 获取单个分类
  getCategory: (id) => api.get(`/categories/${id}`),
  
  // 创建分类
  createCategory: (data) => api.post('/categories', data),
  
  // 更新分类
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  
  // 删除分类
  deleteCategory: (id) => api.delete(`/categories/${id}`),
  
  // 批量删除分类
  batchDeleteCategories: (ids) => api.delete('/categories/batch', { data: { ids } }),
  
  // 获取分类统计
  getCategoryStats: () => api.get('/categories/stats/overview')
}

// 保持向后兼容
export const categoryAPI = categoriesAPI

// 数据模板相关API
export const templateAPI = {
  // 获取模板列表
  getTemplates: (params) => api.get('/templates', { params }),
  
  // 获取单个模板
  getTemplate: (id) => api.get(`/templates/${id}`),
  
  // 创建模板
  createTemplate: (data) => api.post('/templates', data),
  
  // 更新模板
  updateTemplate: (id, data) => api.put(`/templates/${id}`, data),
  
  // 删除模板
  deleteTemplate: (id) => api.delete(`/templates/${id}`),
  
  // 获取用于项目选择的模板列表
  getTemplatesForProject: (params) => api.get('/templates/bulk/for-project', { params }),
  
  // 检查模板标题是否重复
  checkDuplicate: (title) => api.get(`/templates/check-duplicate/${encodeURIComponent(title)}`)
}

// 数据模板相关API（别名）
export const dataTemplateAPI = templateAPI

// 项目相关API
export const projectAPI = {
  // 获取项目列表
  getProjects: (params) => api.get('/projects', { params }),
  
  // 获取单个项目
  getProject: (id) => api.get(`/projects/${id}`),
  
  // 创建项目（管理员功能）
  createProject: (data) => api.post('/projects', data),
  
  // 更新项目（管理员功能）
  updateProject: (id, data) => api.put(`/projects/${id}`, data),
  
  // 删除项目（管理员功能）
  deleteProject: (id) => api.delete(`/projects/${id}`),
  
  // 获取项目简化列表
  getSimpleProjects: () => api.get('/projects/simple/list')
}

// 项目数据相关API
export const projectDataAPI = {
  // 获取项目数据列表
  getProjectData: (params) => api.get('/project-data', { params }),
  
  // 获取单个项目数据
  getProjectDataById: (id) => api.get(`/project-data/${id}`),
  
  // 创建项目数据
  createProjectData: (data) => api.post('/project-data', data),
  
  // 从模板创建项目数据
  createFromTemplate: (data) => api.post('/project-data/from-template', data),
  
  // 更新项目数据
  updateProjectData: (id, data) => api.put(`/project-data/${id}`, data),
  
  // 标记为已完成
  markAsCompleted: (id) => api.put(`/project-data/${id}/complete`),
  
  // 删除项目数据
  deleteProjectData: (id) => api.delete(`/project-data/${id}`),
  
  // 生成JS代码片段
  generateCode: (id) => api.get(`/project-data/${id}/generate-code`),
  
  // 检查项目内标题是否重复
  checkDuplicateInProject: (projectId, title) => api.get(`/project-data/check-duplicate/${projectId}/${encodeURIComponent(title)}`)
}

// 日志相关API
export const logAPI = {
  // 获取操作日志
  getLogs: (params) => api.get('/logs', { params }),
  
  // 获取单个日志
  getLog: (id) => api.get(`/logs/${id}`),
  
  // 获取统计概览
  getLogStats: (params) => api.get('/logs/stats/overview', { params }),
  
  // 获取最近活动
  getRecentActivities: (params) => api.get('/logs/recent/activities', { params }),
  
  // 获取用户操作历史
  getUserHistory: (params) => api.get('/logs/user/history', { params }),
  
  // 清理旧日志（管理员功能）
  cleanupLogs: (data) => api.delete('/logs/cleanup', { data })
}

// AI生成相关API
export const aiAPI = {
  // AI智能生成
  generate: (data) => api.post('/ai/generate', data),
  
  // 从模板AI生成
  generateFromTemplate: (data) => api.post('/ai/generate-from-template', data)
}

// 统计相关API
export const statsAPI = {
  // 获取系统统计概览
  getOverview: () => api.get('/stats/overview'),
  
  // 获取详细统计信息
  getDetailed: (params) => api.get('/stats/detailed', { params }),
  
  // 获取AI使用统计
  getAIUsage: (timeRange = '30d') => api.get('/stats/ai-usage', { params: { timeRange } }),
  
  // 获取AI服务状态
  getAIStatus: () => api.get('/stats/ai-status')
}

// 文件上传相关API
export const uploadAPI = {
  // 上传单个图片
  uploadImage: (file) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post('/upload/image', formData)
    // 不设置Content-Type，让浏览器自动设置multipart/form-data
  },
  
  // 上传多个图片
  uploadImages: (files) => {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('images', file)
    })
    return api.post('/upload/images', formData)
    // 不设置Content-Type，让浏览器自动设置multipart/form-data
  },
  
  // 删除图片
  deleteImage: (publicId) => api.delete(`/upload/image/${publicId}`),
  
  // 获取图片列表
  getImages: (params) => api.get('/upload/images', { params }),
  
  // 获取图片信息
  getImageInfo: (publicId) => api.get(`/upload/image/${publicId}/info`),
  
  // 获取图片变换URL
  getImageTransform: (publicId, params) => api.get(`/upload/image/${publicId}/transform`, { params }),
  
  // 获取所有已使用的图片（按类型分类）
  getUsedImages: () => api.get('/upload/images/used')
}

export default {
  authAPI,
  categoryAPI,
  templateAPI,
  dataTemplateAPI,
  projectAPI,
  projectDataAPI,
  logAPI,
  uploadAPI,
  aiAPI,
  statsAPI
}