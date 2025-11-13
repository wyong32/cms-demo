/**
 * 图片URL处理工具
 * 统一处理图片URL的格式转换
 */

/**
 * 获取完整的图片URL
 * @param {string} url - 图片URL（可能是相对路径、完整URL或文件名）
 * @returns {string} 处理后的完整图片URL
 */
export function getImageUrl(url) {
  if (!url) return ''
  
  // 如果是完整URL（http或https开头），直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // 如果是相对路径（以/api/开头），由于前端代理配置，直接返回
  if (url.startsWith('/api/')) {
    return url
  }
  
  // 其他情况，假设是文件名，添加前缀
  return `/api/uploads/${url}`
}

