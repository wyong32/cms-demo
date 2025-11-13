/**
 * 后端常量配置
 */

// 分页配置
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
}

// 文件上传配置
export const UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
}

// AI配置
export const AI = {
  DEFAULT_PROVIDER: 'mock',
  PROVIDERS: ['openai', 'claude', 'gemini', 'mock']
}

