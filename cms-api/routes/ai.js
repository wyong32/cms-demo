import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { authenticateToken, requireUser } from '../middleware/auth.js';
import aiService from '../utils/aiService.js';

const router = express.Router();

// AI智能生成接口
router.post('/generate', authenticateToken, requireUser, async (req, res) => {
  try {
    const {
      type, // 'template' 或 'project'
      title,
      description,
      imageUrl,
      iframeUrl,
      options = [],
      categoryId,
      projectId,
      saveAsTemplate, // 是否保存为模板（仅项目数据有效）
      customFields = {} // 自定义字段的值
    } = req.body;

    // 验证必需参数
    if (!type || !title || !description) {
      return res.status(400).json({ 
        error: '缺少必需参数: type, title, description' 
      });
    }

    if (type === 'template' && !categoryId) {
      return res.status(400).json({ 
        error: '创建数据模板需要指定分类ID' 
      });
    }

    if (type === 'project' && !projectId) {
      return res.status(400).json({ 
        error: '创建项目数据需要指定项目ID' 
      });
    }

    // 获取分类信息（如果有）
    let categoryInfo = null;
    if (type === 'template' && categoryId) {
      const category = await prisma.cMSCategory.findUnique({
        where: { id: categoryId }
      });
      if (category) {
        categoryInfo = {
          name: category.name,
          type: category.type,
          description: category.description
        };
      }
    }

    // 调用AI服务生成内容
    let aiGeneratedData;
    let quotaWarning = null;
    
    try {
      aiGeneratedData = await aiService.generateContent({
        title,
        description,
        imageUrl,
        iframeUrl,
        options,
        categoryInfo
      });
      
      // 检查是否包含配额警告（使用模拟数据）
      if (aiGeneratedData && aiGeneratedData._quotaWarning) {
        quotaWarning = aiGeneratedData._quotaWarning;
        // 移除警告标记，保留数据
        delete aiGeneratedData._quotaWarning;
      }
    } catch (aiError) {
      // 处理AI服务错误（非配额错误）
      if (aiError.code === 'INVALID_API_KEY') {
        return res.status(400).json({
          success: false,
          error: aiError.message,
          code: aiError.code,
          suggestion: '请检查环境变量GOOGLE_API_KEY是否正确配置'
        });
      }
      
      if (aiError.code === 'PERMISSION_DENIED') {
        return res.status(403).json({
          success: false,
          error: aiError.message,
          code: aiError.code,
          suggestion: '请检查API密钥权限设置'
        });
      }
      
      // 其他AI服务错误，使用模拟数据作为降级方案
      console.warn('AI服务调用失败，使用模拟数据:', aiError.message);
      aiGeneratedData = aiService.generateMockContent({
        title,
        description,
        imageUrl,
        iframeUrl,
        options,
        categoryInfo
      });
      quotaWarning = {
        code: 'AI_SERVICE_ERROR',
        message: 'AI服务调用失败，已使用模拟数据生成内容',
        suggestion: '请稍后重试或检查AI服务配置'
      };
    }

    let createdItem;

    if (type === 'template') {
      // 验证分类是否存在
      const category = await prisma.cMSCategory.findUnique({
        where: { id: categoryId }
      });

      if (!category) {
        return res.status(400).json({ error: '指定的分类不存在' });
      }

      // 创建数据模板
      createdItem = await prisma.cMSDataTemplate.create({
        data: {
          title: aiGeneratedData.title,
          categoryId,
          iframeUrl: iframeUrl || null,
          description: aiGeneratedData.description,
          tags: aiGeneratedData.tags,
          publishDate: new Date(),
          imageUrl: imageUrl || null,
          imageAlt: aiGeneratedData.imageAlt,
          seoTitle: aiGeneratedData.seoTitle,
          seoDescription: aiGeneratedData.seoDescription,
          seoKeywords: aiGeneratedData.seoKeywords,
          addressBar: aiGeneratedData.addressBar,
          detailsHtml: aiGeneratedData.detailsHtml,
          createdBy: req.user.id
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          creator: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });

      // 记录操作日志
      await prisma.cMSOperationLog.create({
        data: {
          userId: req.user.id,
          action: 'AI_CREATE',
          targetType: 'TEMPLATE',
          targetId: createdItem.id,
          description: `AI生成了数据模板: ${aiGeneratedData.title}`
        }
      });

    } else if (type === 'project') {
      // 验证项目是否存在
      const project = await prisma.cMSProject.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return res.status(400).json({ error: '指定的项目不存在' });
      }

      // 合并AI生成的数据和自定义字段
      const projectDataFields = {
        title: aiGeneratedData.title,
        description: aiGeneratedData.description,
        publishDate: new Date().toISOString().split('T')[0],
        imageUrl: imageUrl || null,
        imageAlt: aiGeneratedData.imageAlt,
        iframeUrl: iframeUrl || null,
        seo_title: aiGeneratedData.seoTitle,
        seo_description: aiGeneratedData.seoDescription,
        seo_keywords: aiGeneratedData.seoKeywords,
        addressBar: aiGeneratedData.addressBar,
        detailsHtml: aiGeneratedData.detailsHtml,
        tags: aiGeneratedData.tags,
        ...customFields // 合并自定义字段
      };
      
      createdItem = await prisma.cMSProjectData.create({
        data: {
          projectId,
          categoryId: categoryId || null, // 添加分类ID
          data: projectDataFields,
          isCompleted: false,
          createdBy: req.user.id
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          creator: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });

      // 记录操作日志
      await prisma.cMSOperationLog.create({
        data: {
          userId: req.user.id,
          action: 'AI_CREATE',
          targetType: 'PROJECT_DATA',
          targetId: createdItem.id,
          description: `AI生成了项目数据: ${aiGeneratedData.title}`
        }
      });

      // 如果有分类信息且用户勾选了"保存为模板"，则创建数据模板
      if (saveAsTemplate && categoryId) {
        try {
          // 检查模板标题是否重复
          const existingTemplate = await prisma.cMSDataTemplate.findFirst({
            where: {
              title: {
                equals: title.trim(),
                mode: 'insensitive'
              }
            }
          });
          
          if (!existingTemplate) {
            const newTemplate = await prisma.cMSDataTemplate.create({
              data: {
                title: title,
                categoryId,
                description: description,
                imageUrl: imageUrl || null,
                iframeUrl: iframeUrl || null,
                tags: [],
                publishDate: new Date(),
                createdBy: req.user.id
              }
            });
            
            // 记录模板创建日志
            await prisma.cMSOperationLog.create({
              data: {
                userId: req.user.id,
                action: 'AUTO_CREATE',
                targetType: 'DATA_TEMPLATE',
                targetId: newTemplate.id,
                description: `自动创建数据模板: ${title}`
              }
            });
          }
        } catch (templateError) {
          console.error('自动创建模板失败:', templateError);
          // 不影响主流程，只记录错误
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `AI生成${type === 'template' ? '数据模板' : '项目数据'}成功`,
      data: createdItem,
      ...(quotaWarning && { warning: quotaWarning })
    });

  } catch (error) {
    console.error('AI生成失败:', error);
    res.status(500).json({ 
      success: false,
      error: 'AI生成失败，请稍后重试' 
    });
  }
});

// 从模板AI生成接口
router.post('/generate-from-template', authenticateToken, requireUser, async (req, res) => {
  try {
    const {
      type, // 'template' 或 'project'
      title,
      description,
      imageUrl,
      iframeUrl,
      options = [],
      categoryId,
      projectId,
      templateId
    } = req.body;

    // 验证必需参数
    if (!type || !title || !description) {
      return res.status(400).json({ 
        error: '缺少必需参数: type, title, description' 
      });
    }

    if (type === 'project' && !projectId) {
      return res.status(400).json({ 
        error: '创建项目数据需要指定项目ID' 
      });
    }

    // 获取分类信息（如果有）
    let categoryInfo = null;
    if (categoryId) {
      const category = await prisma.cMSCategory.findUnique({
        where: { id: categoryId }
      });
      if (category) {
        categoryInfo = {
          name: category.name,
          type: category.type,
          description: category.description
        };
      }
    }

    // 调用AI服务生成内容
    let aiGeneratedData;
    let quotaWarning = null;
    
    try {
      aiGeneratedData = await aiService.generateContent({
        title,
        description,
        imageUrl,
        iframeUrl,
        options,
        categoryInfo
      });
      
      // 检查是否包含配额警告（使用模拟数据）
      if (aiGeneratedData && aiGeneratedData._quotaWarning) {
        quotaWarning = aiGeneratedData._quotaWarning;
        // 移除警告标记，保留数据
        delete aiGeneratedData._quotaWarning;
      }
    } catch (aiError) {
      // 处理AI服务错误（非配额错误）
      if (aiError.code === 'INVALID_API_KEY') {
        return res.status(400).json({
          success: false,
          error: aiError.message,
          code: aiError.code,
          suggestion: '请检查环境变量GOOGLE_API_KEY是否正确配置'
        });
      }
      
      if (aiError.code === 'PERMISSION_DENIED') {
        return res.status(403).json({
          success: false,
          error: aiError.message,
          code: aiError.code,
          suggestion: '请检查API密钥权限设置'
        });
      }
      
      // 其他AI服务错误，使用模拟数据作为降级方案
      console.warn('AI服务调用失败，使用模拟数据:', aiError.message);
      aiGeneratedData = aiService.generateMockContent({
        title,
        description,
        imageUrl,
        iframeUrl,
        options,
        categoryInfo
      });
      quotaWarning = {
        code: 'AI_SERVICE_ERROR',
        message: 'AI服务调用失败，已使用模拟数据生成内容',
        suggestion: '请稍后重试或检查AI服务配置'
      };
    }

    res.json({
      success: true,
      data: aiGeneratedData,
      ...(quotaWarning && { warning: quotaWarning })
    });

  } catch (error) {
    console.error('从模板AI生成失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '从模板AI生成失败' 
    });
  }
});

export default router;