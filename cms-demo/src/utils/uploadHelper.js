/**
 * 上传配置工具
 * 统一处理文件上传相关配置
 */

/**
 * 获取上传地址
 * @returns {string} 上传API地址
 */
export function getUploadAction() {
  const baseURL = import.meta.env.VITE_API_URL || 
    (import.meta.env.DEV 
      ? 'http://localhost:3001/api' 
      : 'https://cms-demo-api.vercel.app/api')
  return `${baseURL}/upload/image`
}

/**
 * 获取上传请求头
 * @returns {Object} 包含Authorization的请求头对象
 */
export function getUploadHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem('cms_token')}`
  }
}

