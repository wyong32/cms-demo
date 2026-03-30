/**
 * 上传配置工具
 * 统一处理文件上传相关配置
 */

import { getApiBaseURL } from './apiBase.js'

/**
 * 获取上传地址
 * @returns {string} 上传API地址
 */
export function getUploadAction() {
  return `${getApiBaseURL()}/upload/image`
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

