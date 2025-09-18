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
      projectId
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
    console.log('🤖 AI服务调用开始，选项:', options);
    const aiGeneratedData = await aiService.generateContent({
      title,
      description,
      imageUrl,
      iframeUrl,
      options,
      categoryInfo
    });
    console.log('✅ AI服务返回数据:', {
      title: aiGeneratedData.title,
      descriptionLength: aiGeneratedData.description?.length || 0,
      hasDetilsHtml: !!aiGeneratedData.detailsHtml,
      detailsHtmlLength: aiGeneratedData.detailsHtml?.length || 0,
      tags: aiGeneratedData.tags?.length || 0,
      hasSeoTitle: !!aiGeneratedData.seoTitle,
      hasSeoDescription: !!aiGeneratedData.seoDescription,
      hasSeoKeywords: !!aiGeneratedData.seoKeywords,
      hasAddressBar: !!aiGeneratedData.addressBar
    });

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

      // 创建项目数据
      console.log('💾 准备保存项目数据，包含字段:', {
        title: aiGeneratedData.title,
        description: aiGeneratedData.description,
        detailsHtml: aiGeneratedData.detailsHtml ? '已生成' : '未生成',
        detailsHtmlLength: aiGeneratedData.detailsHtml?.length || 0
      });
      
      createdItem = await prisma.cMSProjectData.create({
        data: {
          projectId,
          data: {
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
            tags: aiGeneratedData.tags
          },
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

      // 如果有分类信息，自动创建数据模板
      if (categoryId) {
        try {
          console.log('🔄 自动创建数据模板...');
          
          // 检查模板标题是否重复
          const existingTemplate = await prisma.cMSDataTemplate.findFirst({
            where: {
              title: {
                equals: title.trim(), // 使用用户原始标题检查重复
                mode: 'insensitive'
              }
            }
          });
          
          if (!existingTemplate) {
            const newTemplate = await prisma.cMSDataTemplate.create({
              data: {
                title: title, // 使用用户原始标题
                categoryId, // 使用用户选择的分类
                description: description, // 使用用户原始描述
                imageUrl: imageUrl || null, // 使用用户上传的图片
                iframeUrl: iframeUrl || null, // 使用用户提供的iframe链接
                tags: [], // 模板不使用AI生成的标签，保持空数组
                publishDate: new Date(),
                createdBy: req.user.id
              }
            });
            
            console.log('✅ 数据模板创建成功:', newTemplate.id);
            
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
          } else {
            console.log('⚠️ 模板标题已存在，跳过模板创建');
          }
        } catch (templateError) {
          console.error('❌ 自动创建模板失败:', templateError);
          // 不影响主流程，只记录错误
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `AI生成${type === 'template' ? '数据模板' : '项目数据'}成功`,
      data: createdItem
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
    console.log('🤖 从模板AI服务调用开始，选项:', options);
    const aiGeneratedData = await aiService.generateContent({
      title,
      description,
      imageUrl,
      iframeUrl,
      options,
      categoryInfo
    });

    console.log('✅ AI生成完成，返回数据:', {
      title: aiGeneratedData.title,
      hasDescription: !!aiGeneratedData.description,
      hasSEO: !!aiGeneratedData.seoTitle,
      hasHTML: !!aiGeneratedData.detailsHtml,
      hasAddressBar: !!aiGeneratedData.addressBar
    });

    res.json({
      success: true,
      data: aiGeneratedData
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