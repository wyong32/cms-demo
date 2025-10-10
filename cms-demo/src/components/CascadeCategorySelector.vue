<template>
  <div class="cascade-category-selector">
    <!-- 一级分类选择 -->
    <el-select 
      v-model="topCategoryId"
      :placeholder="topPlaceholder"
      :loading="loading"
      :disabled="disabled"
      :clearable="clearable"
      @change="handleTopCategoryChange"
      style="width: 100%"
    >
      <el-option
        v-for="topCategory in topCategories"
        :key="topCategory.id"
        :label="topCategory.name"
        :value="topCategory.id"
      />
    </el-select>

    <!-- 二级分类选择 -->
    <el-select 
      v-model="selectedValue"
      :placeholder="placeholder"
      :loading="loading"
      :disabled="disabled || !topCategoryId"
      :clearable="clearable"
      :filterable="filterable"
      style="width: 100%; margin-top: 8px;"
      @change="handleChange"
    >
      <el-option
        v-for="category in filteredCategories"
        :key="category.id"
        :label="category.name"
        :value="category.id"
      >
        <div class="category-option">
          <span>{{ category.name }}</span>
          <span v-if="showCount" class="count">
            ({{ category._count?.dataTemplates || 0 }})
          </span>
        </div>
      </el-option>

      <!-- 空状态 -->
      <template #empty>
        <el-empty description="该分类下暂无二级分类" :image-size="60" />
      </template>
    </el-select>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { categoriesAPI } from '../api/index.js'

// Props
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '请选择二级分类'
  },
  topPlaceholder: {
    type: String,
    default: '请选择一级分类'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  clearable: {
    type: Boolean,
    default: true
  },
  filterable: {
    type: Boolean,
    default: true
  },
  showCount: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'change', 'top-category-change'])

// 响应式数据
const selectedValue = ref(props.modelValue)
const topCategoryId = ref('')
const topCategories = ref([])
const allCategories = ref([])
const filteredCategories = ref([])
const loading = ref(false)

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
  selectedValue.value = newValue
  // 如果有值，自动设置一级分类
  if (newValue && allCategories.value.length > 0) {
    const category = allCategories.value.find(c => c.id === newValue)
    if (category && category.parentId) {
      topCategoryId.value = category.parentId
      // 只筛选二级分类，不清空selectedValue
      filteredCategories.value = allCategories.value.filter(c => c.parentId === category.parentId)
    }
  }
})

// 监听内部值变化
watch(selectedValue, (newValue) => {
  emit('update:modelValue', newValue)
})

// 处理一级分类变化
const handleTopCategoryChange = (topId) => {
  // 清空二级分类选择
  selectedValue.value = ''
  
  if (topId) {
    // 筛选该一级分类下的二级分类
    filteredCategories.value = allCategories.value.filter(c => c.parentId === topId)
    console.log('🔍 一级分类ID:', topId)
    console.log('📋 筛选出的二级分类:', filteredCategories.value.map(c => c.name))
  } else {
    filteredCategories.value = []
  }
  
  emit('top-category-change', topId)
}

// 处理二级分类变化
const handleChange = (value) => {
  console.log('✅ 选择了二级分类:', value)
  // 查找选中的分类信息
  const selectedCategory = filteredCategories.value.find(c => c.id === value)
  console.log('📋 选中的分类信息:', selectedCategory)
  
  emit('change', value, selectedCategory)
}

// 获取一级分类
const fetchTopCategories = async () => {
  loading.value = true
  try {
    const response = await categoriesAPI.getCategories({ level: 1 })
    topCategories.value = response?.data?.categories || response?.categories || []
    console.log('✅ 一级分类加载完成:', topCategories.value.map(c => c.name))
  } catch (error) {
    console.error('获取一级分类失败:', error)
    ElMessage.error('获取分类失败')
  } finally {
    loading.value = false
  }
}

// 获取所有二级分类
const fetchAllCategories = async () => {
  try {
    const response = await categoriesAPI.getCategories({ level: 2 })
    allCategories.value = response?.data?.categories || response?.categories || []
    console.log('✅ 二级分类加载完成，共', allCategories.value.length, '个')
    console.log('📋 二级分类列表:', allCategories.value.map(c => ({ name: c.name, parentId: c.parentId })))
  } catch (error) {
    console.error('获取二级分类失败:', error)
  }
}

// 暴露方法给父组件
defineExpose({
  refresh: async () => {
    await fetchTopCategories()
    await fetchAllCategories()
  }
})

// 生命周期
onMounted(async () => {
  await fetchTopCategories()
  await fetchAllCategories()
})
</script>

<style scoped>
.cascade-category-selector {
  width: 100%;
}

.category-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.count {
  color: #909399;
  font-size: 12px;
}
</style>
