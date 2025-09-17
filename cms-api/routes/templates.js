import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { authenticateToken, requireUser, validateRequired } from '../middleware/auth.js';

const router = express.Router();

// 获取所有数据模板
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, categoryId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let where = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ];
    }
    
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [templates, total] = await Promise.all([
      prisma.cMSDataTemplate.findMany({
        where,
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
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.cMSDataTemplate.count({ where })
    ]);

    res.json({
      templates,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取数据模板列表失败:', error);
    res.status(500).json({ error: '获取数据模板列表失败' });
  }
});

// 获取单个数据模板
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.cMSDataTemplate.findUnique({
      where: { id },
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

    if (!template) {
      return res.status(404).json({ error: '数据模板不存在' });
    }
    
    // 调试信息：查看HTML内容情况
    console.log('📊 模板详情查询:', {
      id: template.id,
      title: template.title,
      hasDetilsHtml: !!template.detailsHtml,
      detailsHtmlLength: template.detailsHtml?.length || 0,
      detailsHtmlPreview: template.detailsHtml ? template.detailsHtml.substring(0, 200) + '...' : '无内容'
    });

    res.json({ template });
  } catch (error) {
    console.error('获取数据模板失败:', error);
    res.status(500).json({ error: '获取数据模板失败' });
  }
});

// 创建数据模板
router.post('/', authenticateToken, requireUser, validateRequired(['title', 'categoryId']), async (req, res) => {
  try {
    const {
      title,
      categoryId,
      iframeUrl,
      description,
      tags = [],
      publishDate,
      imageUrl,
      imageAlt,
      seoTitle,
      seoDescription,
      seoKeywords,
      addressBar,
      detailsHtml
    } = req.body;

    // 验证分类是否存在
    const category = await prisma.cMSCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return res.status(400).json({ error: '指定的分类不存在' });
    }

    // 处理标签数组
    const processedTags = Array.isArray(tags) ? tags.filter(tag => tag && tag.trim()) : [];
    
    // 调试信息：查看创建数据
    console.log('📤 创建模板数据:', {
      title: title?.trim(),
      hasDetilsHtml: !!detailsHtml,
      detailsHtmlLength: detailsHtml?.length || 0,
      detailsHtmlPreview: detailsHtml ? detailsHtml.substring(0, 100) + '...' : '无内容'
    });

    const template = await prisma.cMSDataTemplate.create({
      data: {
        title: title.trim(),
        categoryId,
        iframeUrl: iframeUrl?.trim() || null,
        description: description?.trim() || null,
        tags: processedTags,
        publishDate: publishDate ? new Date(publishDate) : new Date(),
        imageUrl: imageUrl?.trim() || null,
        imageAlt: imageAlt?.trim() || null,
        seoTitle: seoTitle?.trim() || null,
        seoDescription: seoDescription?.trim() || null,
        seoKeywords: seoKeywords?.trim() || null,
        addressBar: addressBar?.trim() || null,
        detailsHtml: detailsHtml?.trim() || null,
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
        action: 'CREATE',
        targetType: 'TEMPLATE',
        targetId: template.id,
        description: `创建了数据模板: ${title}`
      }
    });

    res.status(201).json({
      message: '数据模板创建成功',
      template
    });
  } catch (error) {
    console.error('创建数据模板失败:', error);
    res.status(500).json({ error: '创建数据模板失败' });
  }
});

// 更新数据模板
router.put('/:id', authenticateToken, requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      categoryId,
      iframeUrl,
      description,
      tags,
      publishDate,
      imageUrl,
      imageAlt,
      seoTitle,
      seoDescription,
      seoKeywords,
      addressBar,
      detailsHtml
    } = req.body;

    // 检查模板是否存在
    const existingTemplate = await prisma.cMSDataTemplate.findUnique({
      where: { id }
    });

    if (!existingTemplate) {
      return res.status(404).json({ error: '数据模板不存在' });
    }

    // 如果更新分类，验证分类是否存在
    if (categoryId && categoryId !== existingTemplate.categoryId) {
      const category = await prisma.cMSCategory.findUnique({
        where: { id: categoryId }
      });

      if (!category) {
        return res.status(400).json({ error: '指定的分类不存在' });
      }
    }

    const updateData = {};
    if (title) updateData.title = title.trim();
    if (categoryId) updateData.categoryId = categoryId;
    if (iframeUrl !== undefined) updateData.iframeUrl = iframeUrl?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (Array.isArray(tags)) updateData.tags = tags.filter(tag => tag && tag.trim());
    if (publishDate) updateData.publishDate = new Date(publishDate);
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl?.trim() || null;
    if (imageAlt !== undefined) updateData.imageAlt = imageAlt?.trim() || null;
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle?.trim() || null;
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription?.trim() || null;
    if (seoKeywords !== undefined) updateData.seoKeywords = seoKeywords?.trim() || null;
    if (addressBar !== undefined) updateData.addressBar = addressBar?.trim() || null;
    if (detailsHtml !== undefined) updateData.detailsHtml = detailsHtml?.trim() || null;

    const updatedTemplate = await prisma.cMSDataTemplate.update({
      where: { id },
      data: updateData,
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
        action: 'UPDATE',
        targetType: 'TEMPLATE',
        targetId: id,
        description: `更新了数据模板: ${updatedTemplate.title}`
      }
    });

    res.json({
      message: '数据模板更新成功',
      template: updatedTemplate
    });
  } catch (error) {
    console.error('更新数据模板失败:', error);
    res.status(500).json({ error: '更新数据模板失败' });
  }
});

// 删除数据模板
router.delete('/:id', authenticateToken, requireUser, async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.cMSDataTemplate.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        imageUrl: true
      }
    });

    if (!template) {
      return res.status(404).json({ error: '数据模板不存在' });
    }

    // 删除数据模板
    await prisma.cMSDataTemplate.delete({
      where: { id }
    });

    // 记录操作日志
    await prisma.cMSOperationLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE',
        targetType: 'TEMPLATE',
        targetId: id,
        description: `删除了数据模板: ${template.title}`
      }
    });

    res.json({ message: '数据模板删除成功' });
  } catch (error) {
    console.error('删除数据模板失败:', error);
    res.status(500).json({ error: '删除数据模板失败' });
  }
});

// 批量获取模板（用于项目数据选择模板）
router.get('/bulk/for-project', authenticateToken, async (req, res) => {
  try {
    const { categoryId, search } = req.query;

    let where = {};
    
    if (categoryId) {
      where.categoryId = categoryId;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const templates = await prisma.cMSDataTemplate.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        iframeUrl: true,
        imageUrl: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        tags: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // 限制返回数量
    });

    res.json({ templates });
  } catch (error) {
    console.error('获取模板列表失败:', error);
    res.status(500).json({ error: '获取模板列表失败' });
  }
});

export default router;