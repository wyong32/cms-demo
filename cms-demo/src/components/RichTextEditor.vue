<template>
  <div class="rich-text-editor">
    <header class="rte-chrome">
      <div class="rte-chrome-left">
        <span class="rte-eyebrow">内容编辑</span>
        <p class="rte-chrome-desc">
          {{ viewMode === 'editor' ? '结构化正文 · 自动净化冗余属性' : '源码模式 · 样式原样保存' }}
        </p>
      </div>
      <div class="rte-mode-rail" role="tablist" aria-label="编辑模式">
        <button
          type="button"
          role="tab"
          class="rte-mode-pill"
          :class="{ 'is-active': viewMode === 'editor' }"
          :aria-selected="viewMode === 'editor'"
          @click="switchMode('editor')"
        >
          <el-icon class="rte-mode-icon"><Edit /></el-icon>
          <span>可视化</span>
        </button>
        <button
          type="button"
          role="tab"
          class="rte-mode-pill"
          :class="{ 'is-active': viewMode === 'html' }"
          :aria-selected="viewMode === 'html'"
          @click="switchMode('html')"
        >
          <el-icon class="rte-mode-icon"><Document /></el-icon>
          <span>HTML</span>
        </button>
      </div>
    </header>

    <div v-if="viewMode === 'editor'" class="rte-visual">
      <div class="rte-callout rte-callout--visual">
        <span class="rte-callout-dot" aria-hidden="true" />
        <p class="rte-callout-text">
          标题、段落、链接、图片、列表；保存为语义化 HTML。复杂样式请切到「HTML」。
        </p>
      </div>
      <div class="rte-canvas">
        <div ref="quillContainer" class="rte-quill-root" :style="{ minHeight: editorHeight }"></div>
      </div>
    </div>

    <div v-else class="rte-html-pane">
      <div class="rte-callout rte-callout--code">
        <span class="rte-callout-dot rte-callout-dot--code" aria-hidden="true" />
        <p class="rte-callout-text">
          此处修改的 class、style、data-* 等均原样写入数据。
        </p>
      </div>
      <div class="rte-code-shell">
        <div class="rte-code-label">SOURCE</div>
        <el-input
          v-model="htmlContent"
          type="textarea"
          :rows="20"
          placeholder="在此粘贴或编辑 HTML…"
          class="rte-code-input"
          @input="handleHtmlChange"
        />
      </div>
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
  --rte-ink: #1c2b36;
  --rte-ink-muted: #5c6f7d;
  --rte-border: color-mix(in srgb, var(--el-border-color) 85%, var(--rte-ink));
  --rte-surface: #fdfcfa;
  --rte-surface-2: #f4f1eb;
  --rte-accent: #2d6a5d;
  --rte-accent-soft: color-mix(in srgb, var(--rte-accent) 14%, white);
  --rte-shadow: 0 1px 2px rgb(28 43 54 / 0.06), 0 8px 24px rgb(28 43 54 / 0.06);
  border: 1px solid var(--rte-border);
  border-radius: 14px;
  overflow: hidden;
  background: var(--rte-surface);
  box-shadow: var(--rte-shadow);
}

.rte-chrome {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px 20px;
  padding: 14px 18px;
  background: linear-gradient(165deg, #faf9f6 0%, #f3f0ea 100%);
  border-bottom: 1px solid var(--rte-border);
}

.rte-chrome-left {
  min-width: 0;
}

.rte-eyebrow {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rte-accent);
  margin-bottom: 4px;
}

.rte-chrome-desc {
  margin: 0;
  font-size: 13px;
  color: var(--rte-ink-muted);
  line-height: 1.45;
  max-width: 36ch;
}

.rte-mode-rail {
  display: inline-flex;
  padding: 4px;
  gap: 2px;
  background: rgb(255 255 255 / 0.72);
  border: 1px solid var(--rte-border);
  border-radius: 12px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.9);
}

.rte-mode-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  color: var(--rte-ink-muted);
  background: transparent;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.rte-mode-pill:hover {
  color: var(--rte-ink);
  background: rgb(255 255 255 / 0.65);
}

.rte-mode-pill.is-active {
  color: #fff;
  background: var(--rte-accent);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--rte-accent) 35%, transparent);
}

.rte-mode-pill:focus-visible {
  outline: 2px solid var(--rte-accent);
  outline-offset: 2px;
}

.rte-mode-icon {
  font-size: 16px;
}

.rte-visual {
  padding: 0 14px 14px;
}

.rte-callout {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 12px 4px 10px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--rte-accent) 18%, transparent);
  background: var(--rte-accent-soft);
}

.rte-callout--code {
  border-color: color-mix(in srgb, #6b5c4c 22%, transparent);
  background: color-mix(in srgb, #6b5c4c 8%, white);
}

.rte-callout-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--rte-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--rte-accent) 22%, transparent);
}

.rte-callout-dot--code {
  background: #6b5c4c;
  box-shadow: 0 0 0 3px color-mix(in srgb, #6b5c4c 20%, transparent);
}

.rte-callout-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--rte-ink-muted);
}

.rte-canvas {
  border-radius: 12px;
  border: 1px solid var(--rte-border);
  background: #fff;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.8);
}

.rte-quill-root {
  position: relative;
}

.rte-quill-root :deep(.ql-toolbar.ql-snow) {
  border: none;
  border-bottom: 1px solid var(--rte-border);
  padding: 10px 12px 12px;
  background: linear-gradient(180deg, #fbfaf8 0%, #f5f3ef 100%);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 4px;
}

.rte-quill-root :deep(.ql-toolbar .ql-formats) {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 2px;
  margin: 0;
  padding: 4px 8px;
  background: rgb(255 255 255 / 0.85);
  border: 1px solid color-mix(in srgb, var(--rte-border) 70%, transparent);
  border-radius: 10px;
  box-shadow: 0 1px 0 rgb(255 255 255 / 0.9);
}

.rte-quill-root :deep(.ql-toolbar button) {
  width: 32px;
  height: 32px;
  margin: 0 1px;
  padding: 0;
  border-radius: 8px;
  transition:
    background 0.15s ease,
    transform 0.12s ease;
}

.rte-quill-root :deep(.ql-toolbar button:hover) {
  background: var(--rte-accent-soft);
}

.rte-quill-root :deep(.ql-toolbar button:active) {
  transform: scale(0.96);
}

.rte-quill-root :deep(.ql-toolbar button.ql-active) {
  background: color-mix(in srgb, var(--rte-accent) 22%, white);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rte-accent) 35%, transparent);
}

.rte-quill-root :deep(.ql-toolbar .ql-picker) {
  margin: 0 2px;
  border-radius: 8px;
  color: var(--rte-ink);
}

.rte-quill-root :deep(.ql-toolbar .ql-picker-label) {
  border-radius: 8px;
  padding: 4px 10px;
  transition: background 0.15s ease;
}

.rte-quill-root :deep(.ql-toolbar .ql-picker-label:hover) {
  background: var(--rte-accent-soft);
}

.rte-quill-root :deep(.ql-toolbar .ql-picker.ql-expanded .ql-picker-label) {
  background: var(--rte-accent-soft);
}

.rte-quill-root :deep(.ql-toolbar select) {
  height: 32px;
  min-width: 88px;
  margin: 0 2px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--rte-border) 80%, transparent);
  background: #fff;
  color: var(--rte-ink);
  font-size: 13px;
  cursor: pointer;
}

.rte-quill-root :deep(.ql-toolbar select:hover) {
  border-color: color-mix(in srgb, var(--rte-accent) 40%, var(--rte-border));
}

.rte-quill-root :deep(.ql-snow .ql-stroke) {
  stroke: var(--rte-ink-muted);
}

.rte-quill-root :deep(.ql-snow .ql-fill) {
  fill: var(--rte-ink-muted);
}

.rte-quill-root :deep(.ql-toolbar button:hover .ql-stroke),
.rte-quill-root :deep(.ql-toolbar button.ql-active .ql-stroke) {
  stroke: var(--rte-accent);
}

.rte-quill-root :deep(.ql-toolbar button:hover .ql-fill),
.rte-quill-root :deep(.ql-toolbar button.ql-active .ql-fill) {
  fill: var(--rte-accent);
}

.rte-quill-root :deep(.ql-container.ql-snow) {
  border: none;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.65;
  color: var(--rte-ink);
}

.rte-quill-root :deep(.ql-editor) {
  min-height: 300px;
  padding: 20px 22px 24px;
}

.rte-quill-root :deep(.ql-editor.ql-blank::before) {
  color: #a8b0b8;
  font-style: normal;
  left: 22px;
}

.rte-quill-root :deep(.ql-editor h1) {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0.6em 0 0.35em;
}

.rte-quill-root :deep(.ql-editor h2) {
  font-size: 1.4rem;
  font-weight: 650;
  margin: 0.55em 0 0.3em;
}

.rte-quill-root :deep(.ql-editor h3) {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0.5em 0 0.25em;
}

.rte-quill-root :deep(.ql-editor p) {
  margin: 0.4em 0;
}

.rte-quill-root :deep(.ql-editor a) {
  color: var(--rte-accent);
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}

.rte-html-pane {
  padding: 0 14px 14px;
}

.rte-code-shell {
  position: relative;
  border-radius: 12px;
  border: 1px solid var(--rte-border);
  background: #1e2428;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.04);
}

.rte-code-label {
  position: absolute;
  top: 10px;
  right: 14px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: rgb(255 255 255 / 0.28);
  pointer-events: none;
  z-index: 1;
}

.rte-code-input :deep(.el-textarea__inner) {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  font-size: 13px;
  line-height: 1.55;
  padding: 18px 16px 20px;
  color: #e8e4dc;
  background: transparent;
  border: none;
  box-shadow: none;
  resize: vertical;
  min-height: 320px;
}

.rte-code-input :deep(.el-textarea__inner):focus {
  box-shadow: none;
}

.rte-code-input :deep(.el-textarea) {
  --el-input-border-color: transparent;
}

.rte-code-input :deep(.el-textarea .el-input__wrapper) {
  background: transparent;
  box-shadow: none !important;
  padding: 0;
}

.rte-code-input :deep(.el-textarea__inner)::placeholder {
  color: rgb(232 228 220 / 0.35);
}

.image-uploader {
  width: 100%;
}

.image-uploader :deep(.el-upload) {
  border: 1px dashed color-mix(in srgb, var(--rte-accent) 35%, var(--rte-border));
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
  width: 100%;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--rte-surface-2);
}

.image-uploader :deep(.el-upload:hover) {
  border-color: var(--rte-accent);
  background: var(--rte-accent-soft);
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
  background: rgb(28 43 54 / 0.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.25s ease;
  color: white;
  font-size: 13px;
  font-weight: 500;
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
  color: var(--rte-ink-muted);
}

.upload-icon {
  font-size: 28px;
  margin-bottom: 8px;
  color: var(--rte-accent);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .rte-chrome {
    flex-direction: column;
    align-items: stretch;
  }

  .rte-mode-rail {
    width: 100%;
    justify-content: stretch;
  }

  .rte-mode-pill {
    flex: 1;
    justify-content: center;
  }

  .rte-chrome-desc {
    max-width: none;
  }

  .rte-quill-root :deep(.ql-editor) {
    min-height: 240px;
    padding: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rte-mode-pill,
  .rte-quill-root :deep(.ql-toolbar button),
  .image-uploader :deep(.el-upload),
  .image-overlay {
    transition: none;
  }
}
</style>
