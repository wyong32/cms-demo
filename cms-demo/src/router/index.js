import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/counter'
import { ElMessage } from 'element-plus'

// 路由配置
const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: {
      title: '登录',
      requiresAuth: false
    }
  },
  {
    path: '/',
    redirect: '/dashboard',
    component: () => import('@/layout/index.vue'),
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: {
          title: '仪表盘',
          icon: 'Dashboard'
        }
      },
      {
        path: 'data-templates',
        name: 'DataTemplates',
        component: () => import('@/views/DataTemplates.vue'),
        meta: {
          title: '数据模板',
          icon: 'List'
        }
      },
      {
        path: 'data-templates/add',
        name: 'DataTemplateAdd',
        component: () => import('@/views/DataTemplateEdit.vue'),
        meta: {
          title: '添加数据模板',
          hideInMenu: true,
          hideInBreadcrumb: false
        }
      },
      {
        path: 'data-templates/edit/:id',
        name: 'DataTemplateEdit',
        component: () => import('@/views/DataTemplateEdit.vue'),
        meta: {
          title: '编辑数据模板',
          hideInMenu: true,
          hideInBreadcrumb: false
        }
      },
      {
        path: 'ai-generate/:type',
        name: 'AIGenerateForm',
        component: () => import('@/views/AIGenerateForm.vue'),
        meta: {
          title: 'AI智能生成',
          hideInMenu: true,
          hideInBreadcrumb: false
        }
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('@/views/Categories.vue'),
        meta: {
          title: '数据分类列表',
          icon: 'FolderOpened'
        }
      },
      {
        path: 'categories/add',
        name: 'CategoryAdd',
        component: () => import('@/views/CategoryEdit.vue'),
        meta: {
          title: '添加分类',
          hideInMenu: true,
          hideInBreadcrumb: false
        }
      },
      {
        path: 'categories/edit/:id',
        name: 'CategoryEdit',
        component: () => import('@/views/CategoryEdit.vue'),
        meta: {
          title: '编辑分类',
          hideInMenu: true,
          hideInBreadcrumb: false
        }
      },
      {
        path: 'projects',
        name: 'Projects',
        component: () => import('@/views/Projects.vue'),
        meta: {
          title: '项目列表',
          icon: 'Folder'
        }
      },
      {
        path: 'project/:projectId/data',
        name: 'ProjectData',
        component: () => import('@/views/ProjectData.vue'),
        meta: {
          title: '项目数据',
          hideInMenu: true
        }
      },
      {
        path: 'project/:projectId/data/add',
        name: 'ProjectDataAdd',
        component: () => import('@/views/ProjectDataEdit.vue'),
        meta: {
          title: '添加项目数据',
          hideInMenu: true
        }
      },
      {
        path: 'project/:projectId/data/edit/:id',
        name: 'ProjectDataEdit',
        component: () => import('@/views/ProjectDataEdit.vue'),
        meta: {
          title: '编辑项目数据',
          hideInMenu: true
        }
      },
      {
        path: 'operations',
        name: 'Operations',
        component: () => import('@/views/Operations.vue'),
        meta: {
          title: '操作',
          icon: 'Operation'
        }
      },
      {
        path: 'logs',
        name: 'Logs',
        component: () => import('@/views/Logs.vue'),
        meta: {
          title: '日志',
          icon: 'Document'
        }
      },
      // 管理员功能
      {
        path: 'admin',
        name: 'Admin',
        meta: {
          title: '管理员功能',
          icon: 'Setting',
          requiresAdmin: true
        },
        children: [
          {
            path: 'projects',
            name: 'AdminProjects',
            component: () => import('@/views/admin/Projects.vue'),
            meta: {
              title: '项目管理',
              requiresAdmin: true
            }
          },
          {
            path: 'users',
            name: 'AdminUsers',
            component: () => import('@/views/admin/Users.vue'),
            meta: {
              title: '用户管理',
              requiresAdmin: true
            }
          }
        ]
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      title: '页面不存在'
    }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - CMS 后台管理系统`
  }
  
  // 检查是否需要认证
  if (to.meta.requiresAuth !== false) {
    // 检查是否有token
    if (!authStore.token) {
      console.log('🔒 没有令牌，跳转到登录页')
      ElMessage.warning('请先登录')
      next({ name: 'Login' })
      return
    }
    
    // 检查用户信息是否存在，如果不存在则尝试获取
    if (!authStore.user) {
      try {
        console.log('🔄 获取用户信息...')
        await authStore.getCurrentUser()
        console.log('✅ 用户信息获取成功')
      } catch (error) {
        console.error('❌ 获取用户信息失败:', error)
        ElMessage.error('登录已过期，请重新登录')
        next({ name: 'Login' })
        return
      }
    }
    
    // 验证登录状态
    if (!authStore.isLoggedIn) {
      console.log('🔒 登录状态无效，跳转到登录页')
      ElMessage.warning('登录状态无效，请重新登录')
      next({ name: 'Login' })
      return
    }
    
    // 检查是否需要管理员权限
    if (to.meta.requiresAdmin && !authStore.isAdmin) {
      console.log('🚫 需要管理员权限')
      ElMessage.error('需要管理员权限')
      next({ name: 'Dashboard' })
      return
    }
  }
  
  // 如果已登录用户访问登录页，重定向到首页
  if (to.name === 'Login' && authStore.isLoggedIn) {
    console.log('✅ 已登录用户访问登录页，重定向到首页')
    next({ name: 'Dashboard' })
    return
  }
  
  console.log('✅ 路由守卫检查通过，允许访问:', to.name)
  next()
})

// 路由错误处理
router.onError((error) => {
  console.error('路由错误:', error)
  // 可以在这里添加错误处理逻辑，例如跳转到错误页面
})

export default router