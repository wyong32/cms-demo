/**
 * 前端常量配置
 */

// 分页配置
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  PAGE_SIZES: [12, 24, 48, 96]
}

// 文件上传配置
export const UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
}

// API超时配置（毫秒）
export const API_TIMEOUT = {
  DEFAULT: 10000, // 10秒
  AI_GENERATE: 60000 // 60秒
}

// 延迟时间配置（毫秒）
export const DELAY = {
  CURSOR_RESTORE: 10, // 光标恢复延迟
  NAVIGATION: 200, // 导航延迟
  FORM_RESET: 300 // 表单重置延迟
}

// 表单验证配置
export const VALIDATION = {
  TITLE_MIN: 2,
  TITLE_MAX: 100,
  DESCRIPTION_MIN: 10,
  DESCRIPTION_MAX: 2000
}

