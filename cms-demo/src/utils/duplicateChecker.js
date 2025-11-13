/**
 * 重复检查工具
 * 统一处理标题重复检查逻辑
 */
import { ElMessageBox } from 'element-plus'
import { dataTemplateAPI, projectDataAPI } from '../api'

/**
 * 检查模板标题重复
 * @param {string} title - 要检查的标题
 * @param {string} context - 上下文信息（用于提示）
 * @returns {Promise<boolean>} 返回true表示用户确认继续，false表示无重复，抛出'cancel'表示用户取消
 */
export async function checkTemplateDuplicate(title, context = '') {
  try {
    const response = await dataTemplateAPI.checkDuplicate(title)
    if (response.data.isDuplicate) {
      const existingTemplate = response.data.existingTemplate
      const contextMessage = context ? `\n${context}\n` : ''
      
      await ElMessageBox.confirm(
        `标题"${title}"已存在于数据模板中！${contextMessage}\n` +
        `现有模板信息：\n` +
        `分类：${existingTemplate.categoryName}\n` +
        `创建时间：${new Date(existingTemplate.createdAt).toLocaleString()}\n\n` +
        `是否仍要继续？`,
        '模板标题重复',
        {
          confirmButtonText: '继续',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      return true // 用户确认继续
    }
    return false // 无重复
  } catch (error) {
    if (error === 'cancel') {
      throw error // 用户取消，向上抛出
    }
    console.error('检查模板重复失败:', error)
    return false // 检查失败，允许继续
  }
}

/**
 * 检查项目内标题重复
 * @param {string} projectId - 项目ID
 * @param {string} title - 要检查的标题
 * @param {string} context - 上下文信息（用于提示）
 * @returns {Promise<boolean>} 返回true表示用户确认继续，false表示无重复，抛出'cancel'表示用户取消
 */
export async function checkProjectDuplicate(projectId, title, context = '') {
  try {
    const response = await projectDataAPI.checkDuplicateInProject(projectId, title)
    if (response.data.isDuplicate) {
      const existingData = response.data.existingData
      const contextMessage = context ? `\n${context}\n` : ''
      
      await ElMessageBox.confirm(
        `标题"${title}"在当前项目中已存在！${contextMessage}\n` +
        `现有数据信息：\n` +
        `创建者：${existingData.creator}\n` +
        `创建时间：${new Date(existingData.createdAt).toLocaleString()}\n\n` +
        `是否仍要继续？`,
        '项目内标题重复',
        {
          confirmButtonText: '继续',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      return true
    }
    return false
  } catch (error) {
    if (error === 'cancel') {
      throw error
    }
    console.error('检查项目重复失败:', error)
    return false
  }
}

