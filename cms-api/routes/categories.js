import express from 'express';
import { prisma } from '../index.js';
import { authenticateToken, requireUser, validateRequired } from '../middleware/auth.js';

const router = express.Router();

// 获取所有分类
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    const [categories, total] = await Promise.all([
      prisma.cMSCategory.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              username: true
            }
          },
          _count: {
            select: {
              dataTemplates: true,
              projectData: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.cMSCategory.count({ where })
    ]);

    res.json({
      categories,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取分类列表失败:', error);
    res.status(500).json({ error: '获取分类列表失败' });
  }
});

// 获取单个分类
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.cMSCategory.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true
          }
        },
        _count: {
          select: {
            dataTemplates: true,
            projectData: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    res.json({ category });
  } catch (error) {
    console.error('获取分类失败:', error);
    res.status(500).json({ error: '获取分类失败' });
  }
});

// 创建分类
router.post('/', authenticateToken, requireUser, validateRequired(['name', 'type']), async (req, res) => {
  try {
    const { name, type, description } = req.body;

    // 检查分类名是否已存在
    const existingCategory = await prisma.cMSCategory.findUnique({
      where: { name }
    });

    if (existingCategory) {
      return res.status(400).json({ error: '分类名称已存在' });
    }

    const category = await prisma.cMSCategory.create({
      data: {
        name: name.trim(),
        type: type.trim(),
        description: description?.trim() || null,
        createdBy: req.user.id
      },
      include: {
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
        targetType: 'CATEGORY',
        targetId: category.id,
        description: `创建了分类: ${name}`
      }
    });

    res.status(201).json({
      message: '分类创建成功',
      category
    });
  } catch (error) {
    console.error('创建分类失败:', error);
    res.status(500).json({ error: '创建分类失败' });
  }
});

// 更新分类
router.put('/:id', authenticateToken, requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, description } = req.body;

    // 检查分类是否存在
    const existingCategory = await prisma.cMSCategory.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return res.status(404).json({ error: '分类不存在' });
    }

    // 如果更新名称，检查是否与其他分类重复
    if (name && name !== existingCategory.name) {
      const duplicateName = await prisma.cMSCategory.findFirst({
        where: {
          name,
          id: { not: id }
        }
      });

      if (duplicateName) {
        return res.status(400).json({ error: '分类名称已存在' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (type) updateData.type = type.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;

    const updatedCategory = await prisma.cMSCategory.update({
      where: { id },
      data: updateData,
      include: {
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
        targetType: 'CATEGORY',
        targetId: id,
        description: `更新了分类: ${updatedCategory.name}`
      }
    });

    res.json({
      message: '分类更新成功',
      category: updatedCategory
    });
  } catch (error) {
    console.error('更新分类失败:', error);
    res.status(500).json({ error: '更新分类失败' });
  }
});

// 删除分类
router.delete('/:id', authenticateToken, requireUser, async (req, res) => {
  try {
    const { id } = req.params;

    // 检查分类是否存在
    const category = await prisma.cMSCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            dataTemplates: true,
            projectData: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    // 检查是否有关联数据
    if (category._count.dataTemplates > 0 || category._count.projectData > 0) {
      return res.status(400).json({ 
        error: '该分类下还有关联的模板或项目数据，无法删除' 
      });
    }

    await prisma.cMSCategory.delete({
      where: { id }
    });

    // 记录操作日志
    await prisma.cMSOperationLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE',
        targetType: 'CATEGORY',
        targetId: id,
        description: `删除了分类: ${category.name}`
      }
    });

    res.json({ message: '分类删除成功' });
  } catch (error) {
    console.error('删除分类失败:', error);
    res.status(500).json({ error: '删除分类失败' });
  }
});

// 获取分类统计
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const stats = await prisma.cMSCategory.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        _count: {
          select: {
            dataTemplates: true,
            projectData: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ stats });
  } catch (error) {
    console.error('获取分类统计失败:', error);
    res.status(500).json({ error: '获取分类统计失败' });
  }
});

export default router;