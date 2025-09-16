import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// 应用全局状态管理
export const useAppStore = defineStore('app', () => {
  // 状态
  const sidebarCollapsed = ref(false)
  const loading = ref(false)
  const activeMenu = ref('')
  
  // 面包屑导航
  const breadcrumbs = ref([])
  
  // 计算属性
  const sidebarWidth = computed(() => sidebarCollapsed.value ? '64px' : '240px')
  
  // 动作
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
  
  const setSidebarCollapsed = (collapsed) => {
    sidebarCollapsed.value = collapsed
  }
  
  const setLoading = (state) => {
    loading.value = state
  }
  
  const setActiveMenu = (menu) => {
    activeMenu.value = menu
  }
  
  const setBreadcrumbs = (crumbs) => {
    breadcrumbs.value = crumbs
  }
  
  const addBreadcrumb = (crumb) => {
    if (!breadcrumbs.value.find(item => item.path === crumb.path)) {
      breadcrumbs.value.push(crumb)
    }
  }
  
  const removeBreadcrumb = (path) => {
    const index = breadcrumbs.value.findIndex(item => item.path === path)
    if (index > -1) {
      breadcrumbs.value.splice(index, 1)
    }
  }
  
  const clearBreadcrumbs = () => {
    breadcrumbs.value = []
  }
  
  return {
    // 状态
    sidebarCollapsed,
    loading,
    activeMenu,
    breadcrumbs,
    
    // 计算属性
    sidebarWidth,
    
    // 动作
    toggleSidebar,
    setSidebarCollapsed,
    setLoading,
    setActiveMenu,
    setBreadcrumbs,
    addBreadcrumb,
    removeBreadcrumb,
    clearBreadcrumbs
  }
})