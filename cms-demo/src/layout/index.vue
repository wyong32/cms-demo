<template>
  <div class="layout-container">
    <!-- 顶部导航栏 -->
    <el-header class="layout-header">
      <div class="header-left">
        <el-button
          type="text"
          class="collapse-btn"
          @click="appStore.toggleSidebar()"
        >
          <el-icon size="20">
            <Fold v-if="!appStore.sidebarCollapsed" />
            <Expand v-else />
          </el-icon>
        </el-button>
        
        <h1 class="header-title">CMS 后台管理系统</h1>
      </div>
      
      <div class="header-right">
        <!-- 用户信息 -->
        <el-dropdown trigger="hover" @command="handleUserCommand">
          <div class="user-info">
            <el-avatar :size="32" class="user-avatar">
              <el-icon><User /></el-icon>
            </el-avatar>
            <span class="username">{{ authStore.username }}</span>
            <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item icon="User" command="profile">
                个人资料
              </el-dropdown-item>
              <el-dropdown-item icon="Setting" command="settings">
                系统设置
              </el-dropdown-item>
              <el-dropdown-item divided icon="SwitchButton" command="logout">
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>
    
    <el-container class="main-container">
      <!-- 左侧导航栏 -->
      <el-aside 
        :width="appStore.sidebarWidth" 
        class="layout-sidebar"
      >
        <div class="sidebar-content">
          <el-menu
            :default-active="currentRoute"
            class="sidebar-menu"
            :collapse="appStore.sidebarCollapsed"
            :unique-opened="true"
            router
          >
            <!-- 数据列表 -->
            <el-menu-item index="/data-templates">
              <el-icon><List /></el-icon>
              <template #title>数据模板</template>
            </el-menu-item>
            
            <!-- 数据分类列表 -->
            <el-menu-item index="/categories">
              <el-icon><FolderOpened /></el-icon>
              <template #title>数据分类列表</template>
            </el-menu-item>
            
            <!-- 项目列表 -->
            <el-sub-menu index="projects">
              <template #title>
                <el-icon><Folder /></el-icon>
                <span>项目列表</span>
              </template>
              <el-menu-item index="/projects">
                <el-icon><List /></el-icon>
                <template #title>所有项目</template>
              </el-menu-item>
              <el-menu-item 
                v-for="project in projectsList" 
                :key="project.id"
                :index="`/project/${project.id}/data`"
              >
                <el-icon><Document /></el-icon>
                <template #title>{{ project.name }}</template>
              </el-menu-item>
            </el-sub-menu>
            
            <!-- 日志 -->
            <el-menu-item index="/logs">
              <el-icon><Document /></el-icon>
              <template #title>日志</template>
            </el-menu-item>
            
            <!-- 操作 -->
            <el-menu-item index="/operations">
              <el-icon><Operation /></el-icon>
              <template #title>操作</template>
            </el-menu-item>
            
            <!-- 管理员功能 -->
            <el-sub-menu v-if="authStore.isAdmin" index="admin">
              <template #title>
                <el-icon><Setting /></el-icon>
                <span>管理员功能</span>
              </template>
              <el-menu-item index="/admin/projects">
                <el-icon><Plus /></el-icon>
                <template #title>添加项目</template>
              </el-menu-item>
              <el-menu-item index="/admin/users">
                <el-icon><UserFilled /></el-icon>
                <template #title>添加用户</template>
              </el-menu-item>
            </el-sub-menu>
          </el-menu>
        </div>
      </el-aside>
      
      <!-- 主内容区域 -->
      <el-main class="layout-main">
        <div class="main-content">
          <!-- 面包屑导航 -->
          <el-breadcrumb class="breadcrumb" separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item 
              v-for="crumb in breadcrumbs" 
              :key="crumb.path"
              :to="crumb.path"
            >
              {{ crumb.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
          
          <!-- 页面内容 -->
          <div class="page-content">
            <router-view v-slot="{ Component }">
              <transition name="fade" mode="out-in">
                <component :is="Component" />
              </transition>
            </router-view>
          </div>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/counter'
import { useAppStore } from '@/stores/app'
import { projectAPI } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

// 项目列表
const projectsList = ref([])

// 当前路由
const currentRoute = computed(() => route.path)

// 面包屑导航
const breadcrumbs = computed(() => {
  const crumbs = []
  
  // 排除404页面和隐藏的页面
  if (route.name === 'NotFound' || route.meta?.hideInBreadcrumb) {
    return crumbs
  }
  
  // 直接使用当前路由的meta信息
  if (route.meta?.title) {
    // 如果是编辑页面，添加父级页面
    if (route.name === 'DataTemplateEdit' || route.name === 'DataTemplateAdd') {
      crumbs.push({
        title: '数据模板',
        path: '/data-templates'
      })
    } else if (route.name === 'CategoryEdit' || route.name === 'CategoryAdd') {
      crumbs.push({
        title: '数据分类列表',
        path: '/categories'
      })
    } else if (route.name === 'ProjectData' || route.name === 'ProjectDataAdd' || route.name === 'ProjectDataEdit' || route.name === 'AIGenerateForm') {
      // 处理项目数据相关页面，添加项目列表
      crumbs.push({
        title: '项目列表',
        path: '/projects'
      })
    } else if (route.name === 'ProjectData' || route.name === 'ProjectDataAdd' || route.name === 'ProjectDataEdit' || route.name === 'AIGenerateForm') {
      // 处理项目数据相关页面，添加项目列表
      crumbs.push({
        title: '项目列表',
        path: '/projects'
      })
    }
    
    // 添加当前页面
    crumbs.push({
      title: route.meta.title,
      path: route.path
    })
  }
  
  return crumbs
})

// 获取项目列表
const fetchProjects = async () => {
  try {
    const response = await projectAPI.getSimpleProjects()
    projectsList.value = response.projects || []
  } catch (error) {
    console.error('获取项目列表失败:', error)
  }
}

// 处理用户菜单命令
const handleUserCommand = async (command) => {
  switch (command) {
    case 'profile':
      ElMessage.info('个人资料功能开发中')
      break
    case 'settings':
      ElMessage.info('系统设置功能开发中')
      break
    case 'logout':
      try {
        await ElMessageBox.confirm(
          '确定要退出登录吗？',
          '退出确认',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        authStore.logout()
        router.push({ name: 'Login' })
      } catch (error) {
        // 用户取消退出
      }
      break
  }
}

// 监听路由变化更新面包屑
watch(
  () => route.path,
  () => {
    appStore.setBreadcrumbs(breadcrumbs.value)
  },
  { immediate: true }
)

// 组件挂载时获取项目列表
onMounted(() => {
  fetchProjects()
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
  height: 60px !important;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  padding: 8px;
  border-radius: 6px;
  transition: all 0.3s;
}

.collapse-btn:hover {
  background-color: #f5f5f5;
}

.header-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.user-info:hover {
  background-color: #f5f5f5;
}

.username {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.dropdown-icon {
  color: #909399;
  font-size: 12px;
}

.main-container {
  flex: 1;
  overflow: hidden;
}

.layout-sidebar {
  background: #fff;
  border-right: 1px solid #e4e7ed;
  transition: width 0.3s;
  overflow: hidden;
}

.sidebar-content {
  height: 100%;
}

.sidebar-menu {
  border: none;
  height: 100%;
}

.layout-main {
  background: #f0f2f5;
  padding: 0;
  overflow: hidden;
}

.main-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.breadcrumb {
  background: #fff;
  padding: 16px 24px;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.page-content {
  flex: 1;
  padding: 24px;
  overflow: auto;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-title {
    font-size: 16px;
  }
  
  .username {
    display: none;
  }
  
  .page-content {
    padding: 16px;
  }
}
</style>