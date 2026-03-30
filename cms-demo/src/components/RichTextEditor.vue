<template>
  <div class="rich-text-editor">
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
      </el-button-group>
    </div>

    <div v-if="viewMode === 'editor'" class="quill-editor-container">
      <div class="visual-editor-tip">
        <el-text type="info" size="small">
          仅支持标题、段落、链接、图片、有序/无序列表；保存为干净 HTML。若需复杂样式请在「HTML代码」中编辑（可视化会去掉多余 class/style/data-*）。
        </el-text>
      </div>
      <div ref="quillContainer" :style="{ height: editorHeight }"></div>
    </div>

    <div v-if="viewMode === 'html'" class="html-editor">
      <div class="html-editor-header">
        <el-text type="info" size="small">
          直接编辑 HTML；在此手动添加的 class、style、data-* 等会原样保存。可视化模式仅输出标题/段落/链接/图片/列表，不自动加样式。
        </el-text>
      </div>
      <el-input
        v-model="htmlContent"
        type="textarea"
        :rows="20"
        placeholder="HTML代码"
        class="html-textarea"
        @input="handleHtmlChange"
      />
    </div>

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
          <el-input v-model="imageForm.imageUrl" placeholder="或者直接输入图片链接" clearable />
        </el-form-item>

        <el-form-item label="图片描述" prop="imageAlt" required>
          <el-input
            v-model="imageForm.imageAlt"
            placeholder="请输入图片的 alt，用于无障碍与 SEO"
            clearable
          />
        </el-form-item>

        <el-form-item label="图片宽度" prop="imageWidth">
          <el-input v-model="imageForm.imageWidth" placeholder="可选，如：300px 或 50%" clearable />
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
import { Edit, Document, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getApiBaseURL } from '../utils/apiBase.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '请输入内容...' },
  disabled: { type: Boolean, default: false },
  height: { type: String, default: '400px' },
  projectInfo: { type: Object, default: () => null },
  templateInfo: { type: Object, default: () => null },
  categoryInfo: { type: Object, default: () => null }
})

const emit = defineEmits(['update:modelValue', 'change', 'imageInserted'])

const quillContainer = ref()
let quillInstance = null

const viewMode = ref('editor')
const htmlContent = ref(props.modelValue || '')
const editorHeight = ref(props.height)

const imageDialogVisible = ref(false)
const imageInserting = ref(false)
const imageFormRef = ref()
const imageForm = ref({ imageUrl: '', imageAlt: '', imageWidth: '' })

const imageRules = {
  imageUrl: [{ required: true, message: '请上传图片或输入图片链接', trigger: 'blur' }],
  imageAlt: [
    { required: true, message: '请输入图片描述', trigger: 'blur' },
    { min: 2, max: 200, message: '图片描述长度在 2 到 200 个字符', trigger: 'blur' }
  ]
}

const imageUploadAction = computed(() => `${getApiBaseURL()}/upload/image`)
const imageUploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('cms_token')}`
}))

const isUserEditing = ref(false)
const markUserEditing = () => {
  isUserEditing.value = true
  setTimeout(() => {
    isUserEditing.value = false
  }, 120)
}

let savedSelection = null

const ALLOWED_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'img', 'ul', 'ol', 'li', 'br'])

/**
 * 可视化模式产出：只保留语义标签；去掉 class、style、data-* 等（链接 href、图片 src/alt/width 除外）
 */
function sanitizeVisualHtml(html) {
  if (!html || !html.trim()) return ''
  const wrap = document.createElement('div')
  wrap.innerHTML = html

  wrap.querySelectorAll('*').forEach((el) => {
    const tag = el.tagName.toLowerCase()
    const keep = {}
    if (tag === 'a') {
      const href = el.getAttribute('href')
      if (href) keep.href = href
    }
    if (tag === 'img') {
      const src = el.getAttribute('src')
      if (src) keep.src = src
      const alt = el.getAttribute('alt')
      if (alt) keep.alt = alt
      let w = el.getAttribute('width')
      if (!w && el.style?.width) w = el.style.width
      if (w) keep.width = w
    }
    while (el.attributes.length > 0) {
      el.removeAttribute(el.attributes[0].name)
    }
    Object.entries(keep).forEach(([k, v]) => el.setAttribute(k, v))
  })

  let changed = true
  let guard = 0
  while (changed && guard < 50) {
    guard++
    changed = false
    wrap.querySelectorAll('*').forEach((el) => {
      const tag = el.tagName.toLowerCase()
      if (!ALLOWED_TAGS.has(tag)) {
        const parent = el.parentNode
        if (!parent) return
        while (el.firstChild) parent.insertBefore(el.firstChild, el)
        parent.removeChild(el)
        changed = true
      }
    })
  }

  wrap.querySelectorAll('p').forEach((p) => {
    if (!p.textContent.trim() && !p.querySelector('img') && !p.querySelector('br')) {
      p.remove()
    }
  })

  return wrap.innerHTML
}

/**
 * 块级标签前后换行，便于 HTML 模式阅读；入库/生成代码也会带换行
 */
function prettifyHtml(html) {
  if (!html || !html.trim()) return ''
  let s = html.trim()
  s = s.replace(/(<\/?(?:p|h[1-6]|ul|ol|li)(?:\s[^>]*)?>)/gi, '\n$1')
  s = s.replace(/<br\s*\/?>/gi, '<br>\n')
  s = s.replace(/^\s+/, '').replace(/\n{3,}/g, '\n\n')
  if (!s.endsWith('\n')) s += '\n'
  return s
}

function processVisualOutput(rawHtml) {
  return prettifyHtml(sanitizeVisualHtml(rawHtml))
}

const showImageDialog = () => {
  if (!quillInstance) return
  savedSelection = quillInstance.getSelection()
  imageForm.value = { imageUrl: '', imageAlt: '', imageWidth: '' }
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
  if (!imageFormRef.value || !quillInstance) return
  try {
    await imageFormRef.value.validate()
    imageInserting.value = true

    let insertIndex = 0
    if (savedSelection && savedSelection.index !== undefined) {
      insertIndex = savedSelection.index
    } else {
      const currentSelection = quillInstance.getSelection()
      insertIndex = currentSelection ? currentSelection.index : quillInstance.getLength()
    }

    quillInstance.focus()
    quillInstance.insertEmbed(insertIndex, 'image', imageForm.value.imageUrl)

    setTimeout(() => {
      const editor = quillInstance.root
      const images = editor.querySelectorAll('img')
      for (let i = images.length - 1; i >= 0; i--) {
        const img = images[i]
        if (img.src === imageForm.value.imageUrl) {
          img.alt = imageForm.value.imageAlt
          if (imageForm.value.imageWidth) {
            img.style.width = imageForm.value.imageWidth
            img.setAttribute('width', imageForm.value.imageWidth)
          }
          break
        }
      }
      quillInstance.setSelection(insertIndex + 1)

      emit('imageInserted', {
        imageUrl: imageForm.value.imageUrl,
        imageAlt: imageForm.value.imageAlt,
        projectInfo: props.projectInfo,
        templateInfo: props.templateInfo,
        categoryInfo: props.categoryInfo
      })
    }, 100)

    ElMessage.success('图片插入成功')
    imageDialogVisible.value = false
  } catch (e) {
    if (e !== false) console.error('插入图片失败:', e)
  } finally {
    imageInserting.value = false
  }
}

const quillOptions = {
  theme: 'snow',
  placeholder: props.placeholder,
  readOnly: props.disabled,
  formats: ['header', 'list', 'link', 'image'],
  modules: {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ['link', 'image'],
      [{ list: 'ordered' }, { list: 'bullet' }]
    ]
  }
}

const initQuill = async () => {
  if (!quillContainer.value || viewMode.value !== 'editor') return

  try {
    quillInstance = new Quill(quillContainer.value, quillOptions)
    const toolbar = quillInstance.getModule('toolbar')
    toolbar.addHandler('image', () => showImageDialog())

    const initial = htmlContent.value || ''
    if (initial.trim()) {
      try {
        quillInstance.clipboard.dangerouslyPasteHTML(initial)
      } catch {
        quillInstance.root.innerHTML = initial
      }
    }

    quillInstance.on('text-change', () => {
      const raw = quillInstance.root.innerHTML
      const out = processVisualOutput(raw)
      htmlContent.value = out
      markUserEditing()
      emit('update:modelValue', out)
      emit('change', out)
    })
  } catch (error) {
    console.error('Quill初始化失败:', error)
  }
}

const switchMode = (mode) => {
  if (mode === viewMode.value) return

  if (viewMode.value === 'editor' && quillInstance) {
    const raw = quillInstance.root.innerHTML
    htmlContent.value = processVisualOutput(raw)
    emit('update:modelValue', htmlContent.value)
    emit('change', htmlContent.value)
    quillInstance = null
  }

  viewMode.value = mode

  if (mode === 'editor') {
    nextTick(() => {
      initQuill()
    })
  }
}

const handleHtmlChange = (value) => {
  htmlContent.value = value
  markUserEditing()
  emit('update:modelValue', value)
  emit('change', value)
}

watch(
  () => props.disabled,
  (disabled) => {
    if (quillInstance) quillInstance.enable(!disabled)
  },
  { immediate: true }
)

watch(
  () => props.modelValue,
  (newValue) => {
    const v = newValue || ''
    if (v === htmlContent.value) return
    htmlContent.value = v
    if (quillInstance && viewMode.value === 'editor' && !isUserEditing.value) {
      try {
        const selection = quillInstance.getSelection()
        quillInstance.clipboard.dangerouslyPasteHTML(v)
        if (selection) {
          setTimeout(() => {
            try {
              quillInstance.setSelection(selection)
            } catch {
              /* ignore */
            }
          }, 10)
        }
      } catch {
        /* ignore */
      }
    }
  },
  { immediate: false }
)

onMounted(async () => {
  htmlContent.value = props.modelValue || ''
  await nextTick()
  if (viewMode.value === 'editor') initQuill()
})

onUnmounted(() => {
  quillInstance = null
  if (quillContainer.value) quillContainer.value.innerHTML = ''
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
  position: relative;
  overflow: hidden;
}

.visual-editor-tip {
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
}

.html-editor {
  padding: 12px;
  background: #f8f9fa;
}

.html-editor-header {
  margin-bottom: 8px;
  padding: 4px 0;
}

.html-textarea :deep(.el-textarea__inner) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  border: none;
  background: transparent;
}

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
  flex-shrink: 0;
}

:deep(.ql-toolbar select) {
  margin: 0 2px;
  height: 28px;
  min-width: 72px;
}

:deep(.ql-toolbar .ql-picker) {
  display: inline-block;
  vertical-align: top;
  margin: 0 2px;
}

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
  inset: 0;
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  :deep(.ql-editor) {
    min-height: 250px;
    padding: 12px;
  }
}
</style>
