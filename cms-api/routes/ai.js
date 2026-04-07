import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { authenticateToken, requireUser } from '../middleware/auth.js';
import aiService from '../utils/aiService.js';

const router = express.Router();

function normalizeTagsForDb(tags) {
  if (Array.isArray(tags)) {
    return tags.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function asDetailsHtml(val) {
  if (val == null) return '';
  return typeof val === 'string' ? val : String(val);
}

/** AI 生成失败时统一 HTTP 状态与 JSON，便于前端与日志排查（不再回退 mock） */
function buildAiFailureResponse(err) {
  const body = {
    success: false,
    error: err.message || 'AI 服务失败',
    code: err.code || 'AI_SERVICE_ERROR'
  };
  if (err.details) body.details = err.details;
  if (process.env.NODE_ENV === 'development' && err.stack) {
    body.debug = { stack: err.stack };
  }

  let status = 502;
  switch (err.code) {
    case 'INVALID_API_KEY':
      status = 400;
      body.suggestion = '请检查 cms-api/.env 中的 GOOGLE_API_KEY';
      break;
    case 'PERMISSION_DENIED':
      status = 403;
      body.suggestion = '请检查 Google Cloud 中该密钥的 API 权限';
      break;
    case 'QUOTA_EXCEEDED':
      status = 429;
      body.suggestion = '配额或限流触发，请稍后重试或查看 Google AI 用量面板';
      break;
    case 'GEMINI_NOT_CONFIGURED':
      status = 503;
      body.suggestion = '在 cms-api/.env 中设置 GOOGLE_API_KEY，并确保 AI_PROVIDER=gemini';
      break;
    case 'MOCK_DISABLED':
    case 'UNSUPPORTED_PROVIDER':
      status = 500;
      break;
    case 'AI_JSON_PARSE_ERROR':
    case 'AI_INCOMPLETE_RESPONSE':
      status = 502;
      body.suggestion = '模型返回格式异常，可尝试调整 GEMINI_MODEL 或提示词';
      break;
    default:
      if (err.status === 429) status = 429;
      break;
  }
  return { status, body };
}

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

    let aiGeneratedData;
    try {
      aiGeneratedData = await aiService.generateContent({
        title,
        description,
        imageUrl,
        iframeUrl,
        options,
        categoryInfo
      });
    } catch (aiError) {
      console.error('[AI /generate] generateContent 失败:', aiError);
      const { status, body } = buildAiFailureResponse(aiError);
      return res.status(status).json(body);
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
          tags: normalizeTagsForDb(aiGeneratedData.tags),
          publishDate: new Date(),
          imageUrl: imageUrl || null,
          imageAlt: aiGeneratedData.imageAlt,
          seoTitle: aiGeneratedData.seoTitle,
          seoDescription: aiGeneratedData.seoDescription,
          seoKeywords: aiGeneratedData.seoKeywords,
          addressBar: aiGeneratedData.addressBar,
          detailsHtml: asDetailsHtml(aiGeneratedData.detailsHtml),
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
        detailsHtml: asDetailsHtml(aiGeneratedData.detailsHtml),
        tags: normalizeTagsForDb(aiGeneratedData.tags),
        ...customFields // 合并自定义字段
      };
      
      createdItem = await prisma.cMSProjectData.create({
        data: {
          projectId,
          categoryId: categoryId || null, // 添加分类ID
          head: null,
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
      data: createdItem
    });

  } catch (error) {
    console.error('AI生成失败:', error);
    const payload = {
      success: false,
      error: error.message || 'AI生成失败，请稍后重试',
      code: 'SERVER_ERROR'
    };
    if (process.env.NODE_ENV === 'development' && error.stack) {
      payload.debug = { stack: error.stack };
    }
    res.status(500).json(payload);
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

    let aiGeneratedData;
    try {
      aiGeneratedData = await aiService.generateContent({
        title,
        description,
        imageUrl,
        iframeUrl,
        options,
        categoryInfo
      });
    } catch (aiError) {
      console.error('[AI /generate-from-template] generateContent 失败:', aiError);
      const { status, body } = buildAiFailureResponse(aiError);
      return res.status(status).json(body);
    }

    res.json({
      success: true,
      data: aiGeneratedData
    });

  } catch (error) {
    console.error('从模板AI生成失败:', error);
    const payload = {
      success: false,
      error: error.message || '从模板AI生成失败',
      code: 'SERVER_ERROR'
    };
    if (process.env.NODE_ENV === 'development' && error.stack) {
      payload.debug = { stack: error.stack };
    }
    res.status(500).json(payload);
  }
});

export default router;