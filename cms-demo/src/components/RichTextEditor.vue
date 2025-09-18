<template>
  <div class="rich-text-editor">
    <!-- 工具栏模式切换 -->
    <div class="editor-mode-toolbar">
      <el-button-group>
        <el-button 
          :type="viewMode === 'editor' ? 'primary' : 'default'"
          size="small"
          @click="switchMode('editor')"
        >
          <el-icon><Edit /></el-icon>
          可视化编辑
        </el-button>
        <el-button 
          :type="viewMode === 'html' ? 'primary' : 'default'"
          size="small"
          @click="switchMode('html')"
        >
          <el-icon><Document /></el-icon>
          HTML代码
        </el-button>
        <el-button 
          :type="viewMode === 'text' ? 'primary' : 'default'"
          size="small"
          @click="switchMode('text')"
        >
          <el-icon><Memo /></el-icon>
          纯文本
        </el-button>
      </el-button-group>
    </div>
    
    <!-- Quill编辑器 -->
    <div v-if="viewMode === 'editor'" class="quill-editor-container">
      <div ref="quillContainer" :style="{ height: editorHeight }"></div>
    </div>
    
    <!-- HTML代码编辑模式 -->
    <div v-if="viewMode === 'html'" class="html-editor">
      <div class="html-editor-header">
        <el-text type="info" size="small">
          当前处于HTML代码编辑模式，适合编辑包含复杂样式的内容
        </el-text>
      </div>
      <el-input
        v-model="htmlContent"
        type="textarea"
        :rows="20"
        placeholder="HTML代码"
        @input="handleHtmlChange"
      />
    </div>
    
    <!-- 纯文本模式 -->
    <div v-if="viewMode === 'text'" class="text-editor">
      <el-input
        v-model="textContent"
        type="textarea"
        :rows="15"
        placeholder="纯文本内容"
        @input="handleTextChange"
      />
    </div>

    <!-- 图片插入对话框 -->
    <el-dialog
      v-model="imageDialogVisible"
      title="插入图片"
      width="500px"
      destroy-on-close
    >
      <el-form ref="imageFormRef" :model="imageForm" :rules="imageRules" label-width="80px">
        <el-form-item label="图片上传" prop="imageUrl">
          <el-upload
            ref="imageUploadRef"
            name="image"
            :show-file-list="false"
            :on-success="handleImageUploadSuccess"
            :before-upload="beforeImageUpload"
            :on-error="handleImageUploadError"
            :action="imageUploadAction"
            :headers="imageUploadHeaders"
            accept="image/*"
            class="image-uploader"
          >
            <div v-if="imageForm.imageUrl" class="uploaded-image">
              <img :src="imageForm.imageUrl" alt="预览图片" />
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

        <el-form-item label="图片链接" prop="imageUrl">
          <el-input
            v-model="imageForm.imageUrl"
            placeholder="或者直接输入图片链接"
            clearable
          />
        </el-form-item>

        <el-form-item label="图片描述" prop="imageAlt" required>
          <el-input
            v-model="imageForm.imageAlt"
            placeholder="请输入图片的alt描述，用于SEO和无障碍访问"
            clearable
          />
        </el-form-item>

        <el-form-item label="图片宽度" prop="imageWidth">
          <el-input
            v-model="imageForm.imageWidth"
            placeholder="可选，如：300px 或 50%"
            clearable
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="imageDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleInsertImage" :loading="imageInserting">
            插入图片
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import { Edit, Document, Memo, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { uploadAPI } from '../api'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '请输入内容...'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  height: {
    type: String,
    default: '400px'
  },
  // 项目信息，用于图片管理关联
  projectInfo: {
    type: Object,
    default: () => null
  },
  // 模板信息，用于图片管理关联  
  templateInfo: {
    type: Object,
    default: () => null
  },
  // 分类信息，用于图片管理关联
  categoryInfo: {
    type: Object,
    default: () => null
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'imageInserted'])

// 编辑器实例和DOM引用
const quillContainer = ref()
let quillInstance = null

// 根据初始内容智能选择编辑模式
const getInitialMode = () => {
  const content = props.modelValue || ''
  // 如果内容包含大量内联样式或复杂HTML，优先使用HTML模式
  if (content.includes('style=') && content.length > 500) {
    return 'html'
  }
  return 'editor'
}

const viewMode = ref(getInitialMode()) // 'editor', 'html', 'text'

// 内容管理
const htmlContent = ref(props.modelValue || '')
const textContent = ref('')
const editorHeight = ref(props.height)

// 图片插入相关状态
const imageDialogVisible = ref(false)
const imageInserting = ref(false)
const imageFormRef = ref()
const imageUploadRef = ref()
const imageForm = ref({
  imageUrl: '',
  imageAlt: '',
  imageWidth: ''
})

// 图片表单验证规则
const imageRules = {
  imageUrl: [
    { required: true, message: '请上传图片或输入图片链接', trigger: 'blur' }
  ],
  imageAlt: [
    { required: true, message: '请输入图片描述', trigger: 'blur' },
    { min: 2, max: 200, message: '图片描述长度在 2 到 200 个字符', trigger: 'blur' }
  ]
}

// 上传配置
const imageUploadAction = computed(() => {
  const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : 'https://cms-demo-api.vercel.app/api')
  return `${baseURL}/upload/image`
})

const imageUploadHeaders = computed(() => ({
  'Authorization': `Bearer ${localStorage.getItem('cms_token')}`
}))

// 标记是否为用户主动编辑
const isUserEditing = ref(false)

// 监听内容变化时设置用户编辑状态
const markUserEditing = () => {
  isUserEditing.value = true
  // 短暂延迟后重置标记，避免影响正常的外部更新
  setTimeout(() => {
    isUserEditing.value = false
  }, 100)
}

// 保存光标位置
let savedSelection = null

// 图片相关处理函数
const showImageDialog = () => {
  // 保存当前光标位置
  savedSelection = quillInstance.getSelection()
  
  // 重置表单
  imageForm.value = {
    imageUrl: '',
    imageAlt: '',
    imageWidth: ''
  }
  imageDialogVisible.value = true
}

const beforeImageUpload = (file) => {
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

const handleImageUploadSuccess = (response) => {
  if (response.success) {
    imageForm.value.imageUrl = response.data.imageUrl
    ElMessage.success('图片上传成功')
  } else {
    ElMessage.error(response.error || '图片上传失败')
  }
}

const handleImageUploadError = () => {
  ElMessage.error('图片上传失败')
}

const handleInsertImage = async () => {
  if (!imageFormRef.value) return
  
  try {
    await imageFormRef.value.validate()
    
    imageInserting.value = true
    
    // 使用保存的光标位置，如果没有则使用当前位置
    let insertIndex = 0
    if (savedSelection && savedSelection.index !== undefined) {
      insertIndex = savedSelection.index
    } else {
      // 获取当前光标位置作为备用
      const currentSelection = quillInstance.getSelection()
      insertIndex = currentSelection ? currentSelection.index : quillInstance.getLength()
    }
    
    // 确保编辑器获得焦点
    quillInstance.focus()
    
    // 使用Quill的insertEmbed方法插入图片
    quillInstance.insertEmbed(insertIndex, 'image', imageForm.value.imageUrl)
    
    // 立即设置图片属性
    setTimeout(() => {
      const editor = quillInstance.root
      const images = editor.querySelectorAll('img')
      
      // 找到刚插入的图片（最后一个匹配的图片）
      for (let i = images.length - 1; i >= 0; i--) {
        const img = images[i]
        if (img.src === imageForm.value.imageUrl) {
          // 设置alt属性
          img.alt = imageForm.value.imageAlt
          
          // 设置宽度（使用内联样式）
          if (imageForm.value.imageWidth) {
            img.style.width = imageForm.value.imageWidth
            // 同时设置width属性作为备用
            img.setAttribute('width', imageForm.value.imageWidth)
          }
          
          break
        }
      }
      
      // 移动光标到图片后面
      quillInstance.setSelection(insertIndex + 1)
      
      // 通知父组件有新图片插入，用于图片管理
      const imageEventData = {
        imageUrl: imageForm.value.imageUrl,
        imageAlt: imageForm.value.imageAlt,
        projectInfo: props.projectInfo,
        templateInfo: props.templateInfo,
        categoryInfo: props.categoryInfo
      }
      
      emit('imageInserted', imageEventData)
    }, 100)
    
    ElMessage.success('图片插入成功')
    imageDialogVisible.value = false
    
  } catch (error) {
    console.error('插入图片失败:', error)
    ElMessage.error('插入图片失败')
  } finally {
    imageInserting.value = false
  }
}

// 初始化Quill编辑器
const initQuill = async () => {
  if (!quillContainer.value || viewMode.value !== 'editor') {
    console.log('⚠️ 跳过Quill初始化:', { 
      hasContainer: !!quillContainer.value, 
      mode: viewMode.value 
    })
    return
  }
  
  console.log('🚀 开始初始化Quill编辑器')
  
  try {
    // 由于v-if确保了DOM是全新的，直接创建实例
    quillInstance = new Quill(quillContainer.value, quillOptions)
    console.log('✅ Quill实例创建成功')
    
    // 自定义图片处理器
    const toolbar = quillInstance.getModule('toolbar')
    toolbar.addHandler('image', () => {
      showImageDialog()
    })
    
    // 设置初始内容
    if (htmlContent.value) {
      console.log('📝 设置初始内容:', htmlContent.value.length, '字符')
      try {
        quillInstance.clipboard.dangerouslyPasteHTML(htmlContent.value)
        console.log('✅ 内容设置成功')
      } catch (pasteError) {
        console.warn('⚠️ 使用备用方法设置内容:', pasteError.message)
        quillInstance.root.innerHTML = htmlContent.value
      }
    }
    
    // 监听内容变化
    quillInstance.on('text-change', () => {
      const html = quillInstance.root.innerHTML
      htmlContent.value = html
      const inlineStyleHtml = convertClassesToInlineStyles(html)
      
      // 标记用户正在编辑，避免自动模式切换
      markUserEditing()
      
      emit('update:modelValue', inlineStyleHtml)
      emit('change', inlineStyleHtml)
    })
    
    // 监听禁用状态
    watch(() => props.disabled, (disabled) => {
      if (quillInstance) {
        quillInstance.enable(!disabled)
      }
    }, { immediate: true })
    
    console.log('✅ Quill编辑器初始化完成')
    
  } catch (error) {
    console.error('❌ Quill初始化失败:', error)
  }
}

// 切换编辑模式函数 - 提前定义确保可用性
const switchMode = (mode) => {
  console.log('🔄 切换编辑模式:', { from: viewMode.value, to: mode })
  
  // 在模式切换前保存内容
  if (viewMode.value === 'editor' && quillInstance) {
    htmlContent.value = quillInstance.root.innerHTML
    console.log('📝 保存编辑器内容:', htmlContent.value.length)
  } else if (viewMode.value === 'text') {
    // 将纯文本转换为HTML格式
    const htmlValue = textContent.value.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('')
    htmlContent.value = htmlValue
  }
  
  // 清理旧实例（由v-if自动处理DOM销毁）
  if (quillInstance) {
    console.log('🗑️ 清理Quill实例')
    quillInstance = null
  }
  
  // 更新模式（v-if会自动销毁/创建DOM）
  viewMode.value = mode
  
  // 如果切换到编辑器模式，在DOM创建后初始化
  if (mode === 'editor') {
    nextTick(() => {
      console.log('⏰ DOM重建完成，初始化Quill编辑器')
      initQuill()
    })
  } else if (mode === 'text') {
    // 提取纯文本内容
    textContent.value = htmlContent.value.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n')
  }
}

// 将CSS类转换为内联样式的函数（只用于最终输出）
const convertClassesToInlineStyles = (html) => {
  // 创建一个临时DOM元素来解析HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  
  // 定义类名到样式的映射
  const classToStyleMap = {
    // 对齐样式
    'ql-align-center': 'text-align: center;',
    'ql-align-right': 'text-align: right;',
    'ql-align-justify': 'text-align: justify;',
    
    // 缩进样式
    'ql-indent-1': 'padding-left: 3em;',
    'ql-indent-2': 'padding-left: 6em;',
    'ql-indent-3': 'padding-left: 9em;',
    'ql-indent-4': 'padding-left: 12em;',
    'ql-indent-5': 'padding-left: 15em;',
    'ql-indent-6': 'padding-left: 18em;',
    'ql-indent-7': 'padding-left: 21em;',
    'ql-indent-8': 'padding-left: 24em;',
    
    // 字体大小
    'ql-size-small': 'font-size: 0.75em;',
    'ql-size-large': 'font-size: 1.5em;',
    'ql-size-huge': 'font-size: 2.5em;',
    
    // 字体家族
    'ql-font-serif': 'font-family: Georgia, Times New Roman, serif;',
    'ql-font-monospace': 'font-family: Monaco, Courier New, monospace;'
  }
  
  // 遍历所有元素
  const elements = tempDiv.querySelectorAll('*')
  elements.forEach(element => {
    const classList = Array.from(element.classList)
    let newStyles = element.style.cssText
    
    // 处理每个class
    classList.forEach(className => {
      // 处理颜色类（如 ql-color-red）
      if (className.startsWith('ql-color-')) {
        const color = className.replace('ql-color-', '')
        // 处理常见颜色
        const colorMap = {
          'red': '#e60000',
          'orange': '#f90',
          'yellow': '#ff0',
          'green': '#008a00',
          'blue': '#06c',
          'purple': '#93f'
        }
        const colorValue = colorMap[color] || color
        newStyles += `color: ${colorValue};`
      }
      // 处理背景颜色类（如 ql-bg-yellow）
      else if (className.startsWith('ql-bg-')) {
        const bgColor = className.replace('ql-bg-', '')
        const colorMap = {
          'red': '#ffeaea',
          'orange': '#fed8b1',
          'yellow': '#fff2cc',
          'green': '#d1f2a5',
          'blue': '#d1ecf1',
          'purple': '#e1d5f0'
        }
        const bgColorValue = colorMap[bgColor] || bgColor
        newStyles += `background-color: ${bgColorValue};`
      }
      // 处理其他样式类
      else if (classToStyleMap[className]) {
        newStyles += classToStyleMap[className]
      }
    })
    
    // 应用内联样式并移除class属性
    if (newStyles) {
      element.style.cssText = newStyles
    }
    
    // 只移除ql-开头的类，保留其他可能的类
    Array.from(element.classList).forEach(cls => {
      if (cls.startsWith('ql-')) {
        element.classList.remove(cls)
      }
    })
    
    // 如果没有类了，移除class属性
    if (element.classList.length === 0) {
      element.removeAttribute('class')
    }
  })
  
  // 处理标题标签的默认样式
  const headers = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6')
  headers.forEach(header => {
    const tag = header.tagName.toLowerCase()
    const sizes = {
      'h1': '2em',
      'h2': '1.5em', 
      'h3': '1.17em',
      'h4': '1em',
      'h5': '0.83em',
      'h6': '0.67em'
    }
    
    const currentStyle = header.style.cssText
    if (!currentStyle.includes('font-size')) {
      header.style.cssText = `font-size: ${sizes[tag]}; font-weight: bold; ${currentStyle}`
    }
  })
  
  // 处理段落的默认边距（但不要添加到居中等特殊段落）
  const paragraphs = tempDiv.querySelectorAll('p')
  paragraphs.forEach(p => {
    const currentStyle = p.style.cssText
    // 只有当段落没有特殊样式时才添加默认边距
    if (!currentStyle.includes('margin') && !currentStyle.includes('text-align') && !currentStyle.includes('padding')) {
      p.style.cssText = `margin: 1em 0; ${currentStyle}`
    }
  })
  
  // 返回清理后的HTML
  return tempDiv.innerHTML
}

// Quill配置
const quillOptions = {
  theme: 'snow',
  placeholder: props.placeholder,
  readOnly: props.disabled,
  formats: [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'font', 'size',
    'list', 'indent', 'align',
    'link', 'image', 'code-block'
  ],
  modules: {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }, { 'size': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean'],
      ['code-block']
    ]
  }
}

// 清理HTML内容使其与Quill兼容
const cleanHtmlForQuill = (html) => {
  if (!html) return ''
  
  // 创建临时DOM元素进行清理
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  
  // 移除可能导致问题的属性和样式
  const allElements = tempDiv.querySelectorAll('*')
  allElements.forEach(element => {
    // 保留基本的内联样式，但移除可能冲突的样式
    const style = element.style
    if (style) {
      // 移除可能导致布局问题的样式
      style.removeProperty('position')
      style.removeProperty('z-index')
      style.removeProperty('transform')
      style.removeProperty('float')
      style.removeProperty('display') // Quill会自己管理display
    }
    
    // 移除可能导致问题的属性
    element.removeAttribute('contenteditable')
    element.removeAttribute('spellcheck')
  })
  
  return tempDiv.innerHTML
}

// HTML代码变化处理
const handleHtmlChange = (value) => {
  htmlContent.value = value
  
  // 标记用户正在编辑
  markUserEditing()
  
  emit('update:modelValue', convertClassesToInlineStyles(value))
  emit('change', convertClassesToInlineStyles(value))
  
  // 如果编辑器存在，同步内容（保留原始的类）
  if (quillInstance && viewMode.value === 'html') {
    try {
      quillInstance.root.innerHTML = value
    } catch (error) {
      console.warn('同步HTML内容到编辑器失败:', error)
    }
  }
}

// 纯文本变化处理
const handleTextChange = (value) => {
  textContent.value = value
  
  // 标记用户正在编辑
  markUserEditing()
  
  // 将纯文本转换为HTML格式
  const htmlValue = value.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('')
  htmlContent.value = htmlValue
  
  // 输出时转换为内联样式
  const inlineStyleHtml = convertClassesToInlineStyles(htmlValue)
  emit('update:modelValue', inlineStyleHtml)
  emit('change', inlineStyleHtml)
  
  // 如果编辑器存在，同步内容
  if (quillInstance && viewMode.value === 'text') {
    try {
      quillInstance.root.innerHTML = htmlValue
    } catch (error) {
      console.warn('同步文本内容到编辑器失败:', error)
    }
  }
}

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
  console.log('🔄 富文本编辑器接收到外部值变化:', {
    hasValue: !!newValue,
    valueLength: newValue?.length || 0,
    valuePreview: newValue ? newValue.substring(0, 100) + '...' : '无内容',
    currentMode: viewMode.value,
    isComplexHtml: newValue && newValue.includes('style=') && newValue.length > 500,
    isDifferent: newValue !== htmlContent.value,
    isUserEditing: isUserEditing.value
  })
  
  if (newValue !== htmlContent.value) {
    htmlContent.value = newValue || ''
    
    // 只在非用户编辑状态下才考虑自动切换模式
    // 这样可以避免用户在可视化模式编辑时被强制切换到HTML模式
    if (!isUserEditing.value && newValue && newValue.includes('style=') && newValue.length > 500 && viewMode.value === 'editor') {
      console.log('🔄 检测到复杂HTML内容（外部设置），建议切换到HTML模式')
      // 不自动切换，而是给用户提示（可选）
      // viewMode.value = 'html'
      // return
    }
    
    // 关键修复：只有在非用户编辑状态下才更新Quill编辑器内容
    // 这样可以避免用户输入时光标跳到开始位置
    if (quillInstance && viewMode.value === 'editor' && !isUserEditing.value) {
      try {
        // 保存当前光标位置
        const selection = quillInstance.getSelection()
        
        // 使用dangerouslyPasteHTML而不是innerHTML，避免内容被过度处理
        quillInstance.clipboard.dangerouslyPasteHTML(newValue || '')
        
        // 尝试恢复光标位置（如果有的话）
        if (selection) {
          setTimeout(() => {
            try {
              quillInstance.setSelection(selection)
            } catch (error) {
              console.warn('恢复光标位置失败:', error)
            }
          }, 10)
        }
        
        console.log('✅ 富文本编辑器已更新内容（外部触发）')
      } catch (error) {
        console.warn('同步外部内容到编辑器失败:', error)
      }
    }
  }
}, { immediate: true })


// 组件挂载时初始化编辑器
onMounted(async () => {
  await nextTick()
  initQuill()
})

// 组件卸载时清理
onUnmounted(() => {
  if (quillInstance) {
    console.log('🗑️ 组件卸载，清理Quill实例')
    quillInstance = null
  }
  // 清空容器
  if (quillContainer.value) {
    quillContainer.value.innerHTML = ''
  }
})
</script>

<style scoped>
.rich-text-editor {
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  overflow: hidden;
}

.editor-mode-toolbar {
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #d9d9d9;
  display: flex;
  justify-content: flex-start;
}

.quill-editor-container {
  background: #fff;
}

.html-editor,
.text-editor {
  padding: 12px;
  background: #f8f9fa;
}

.html-editor-header {
  margin-bottom: 8px;
  padding: 4px 0;
}

.html-editor :deep(.el-textarea__inner),
.text-editor :deep(.el-textarea__inner) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  border: none;
  background: transparent;
}

/* Quill编辑器样式定制 */
:deep(.ql-container) {
  font-size: 14px;
  line-height: 1.6;
}

:deep(.ql-editor) {
  min-height: 300px;
  padding: 16px;
}

:deep(.ql-toolbar.ql-snow) {
  border: none;
  border-bottom: 1px solid #e4e7ed;
  padding: 8px 12px;
  /* 修复工具栏样式 */
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  min-height: 42px;
}

:deep(.ql-container.ql-snow) {
  border: none;
}

:deep(.ql-editor.ql-blank::before) {
  color: #c0c4cc;
  font-style: normal;
}

/* 工具栏按钮样式 */
:deep(.ql-toolbar .ql-formats) {
  margin-right: 15px;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
}

:deep(.ql-toolbar button) {
  margin: 0 2px;
  height: 28px;
  width: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* 防止按钮变形 */
  flex-shrink: 0;
}

:deep(.ql-toolbar button:hover) {
  color: #409eff;
}

:deep(.ql-toolbar button.ql-active) {
  color: #409eff;
}

/* 下拉选择框样式 */
:deep(.ql-toolbar select) {
  margin: 0 2px;
  height: 28px;
  min-width: 60px;
}

/* 防止工具栏崩塔 */
:deep(.ql-toolbar .ql-picker) {
  display: inline-block;
  vertical-align: top;
  margin: 0 2px;
}

:deep(.ql-toolbar .ql-picker-label) {
  height: 28px;
  line-height: 28px;
  padding: 0 8px;
  min-width: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 确保工具栏不会被破坏 */
:deep(.ql-toolbar) {
  position: relative;
  z-index: 1;
}

/* 编辑器容器固定高度 */
.quill-editor-container {
  background: #fff;
  position: relative;
  /* 确保容器稳定 */
  overflow: hidden;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .editor-mode-toolbar {
    padding: 6px 8px;
  }
  
  :deep(.ql-editor) {
    min-height: 250px;
    padding: 12px;
  }
  
  :deep(.ql-toolbar.ql-snow) {
    padding: 6px 8px;
  }
}

/* 图片插入对话框样式 */
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>