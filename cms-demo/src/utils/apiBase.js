/**
 * 与 request.js、uploadHelper 共用的 API 根路径
 * - 未设置 VITE_API_URL：本地开发/本地 preview 走 Vite 代理 /api → 线上 API，避免浏览器跨域
 * - 生产部署：直连线上 API（或由 VITE_API_URL 覆盖）
 */
export function getApiBaseURL() {
  const explicit = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
  if (explicit) return explicit

  if (import.meta.env.DEV) return '/api'

  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return '/api'
  }

  return 'https://cms-demo-api.vercel.app/api'
}
