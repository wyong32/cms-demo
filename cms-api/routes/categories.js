import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { authenticateToken, requireUser, validateRequired } from '../middleware/auth.js';

const router = express.Router();

// 获取所有分类（支持层级查询）
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, level, parentId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let where = {};
    
    // 搜索条件
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // 层级过滤
    if (level) {
      where.level = parseInt(level);
    }

    // 父分类过滤
    if (parentId) {
      where.parentId = parentId;
    }

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
          parent: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          children: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
            include: {
              _count: {
                select: {
                  dataTemplates: true,
                  projectData: true
                }
              }
            }
          },
          _count: {
            select: {
              dataTemplates: true,
              projectData: true,
              children: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: [
          { level: 'asc' },
          { order: 'asc' },
          { createdAt: 'desc' }
        ]
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

// 获取分类树结构
router.get('/tree', authenticateToken, async (req, res) => {
  try {
    const categories = await prisma.cMSCategory.findMany({
      where: { level: 1 },
      include: {
        children: {
          include: {
            _count: {
              select: {
                dataTemplates: true,
                projectData: true
              }
            }
          }
        },
        _count: {
          select: {
            dataTemplates: true,
            projectData: true,
            children: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('获取分类树失败:', error);
    res.status(500).json({ error: '获取分类树失败' });
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

// 创建分类（支持一级和二级）
router.post('/', authenticateToken, requireUser, validateRequired(['name', 'type', 'level']), async (req, res) => {
  try {
    const { name, type, description, level, parentId, order } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 权限检查：只有管理员可以创建一级分类
    if (level === 1 && userRole !== 'ADMIN') {
      return res.status(403).json({ error: '只有管理员可以创建一级分类' });
    }

    // 如果是二级分类，验证父分类是否存在
    if (level === 2) {
      if (!parentId) {
        return res.status(400).json({ error: '二级分类必须指定父分类' });
      }

      const parent = await prisma.cMSCategory.findFirst({
        where: { id: parentId, level: 1, isActive: true }
      });

      if (!parent) {
        return res.status(400).json({ error: '父分类不存在或已被禁用' });
      }
    }

    // 检查名称是否重复（同级分类内）
    const existingCategory = await prisma.cMSCategory.findFirst({
      where: {
        name: name.trim(),
        level: level,
        parentId: level === 2 ? parentId : null
      }
    });

    if (existingCategory) {
      return res.status(400).json({ error: '同级分类中已存在相同名称' });
    }

    const category = await prisma.cMSCategory.create({
      data: {
        name: name.trim(),
        type: type.trim(),
        description: description?.trim() || null,
        level: level,
        parentId: level === 2 ? parentId : null,
        createdBy: userId
      },
      include: {
        parent: level === 2 ? {
          select: { id: true, name: true, type: true }
        } : undefined,
        creator: {
          select: { id: true, username: true }
        }
      }
    });

    // 记录操作日志
    await prisma.cMSOperationLog.create({
      data: {
        userId: userId,
        action: 'CREATE',
        targetType: 'CATEGORY',
        targetId: category.id,
        description: `创建了${level === 1 ? '一级' : '二级'}分类: ${name}`
      }
    });

    res.status(201).json({
      message: `${level === 1 ? '一级' : '二级'}分类创建成功`,
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
    const { name, type, description, level, parentId, order, isActive } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 检查分类是否存在
    const existingCategory = await prisma.cMSCategory.findUnique({
      where: { id },
      include: {
        children: true
      }
    });

    if (!existingCategory) {
      return res.status(404).json({ error: '分类不存在' });
    }

    // 权限检查：只有管理员可以修改一级分类
    if (existingCategory.level === 1 && userRole !== 'ADMIN') {
      return res.status(403).json({ error: '只有管理员可以修改一级分类' });
    }

    // 如果更新层级，需要验证权限
    if (level && level !== existingCategory.level) {
      if (level === 1 && userRole !== 'ADMIN') {
        return res.status(403).json({ error: '只有管理员可以将分类提升为一级分类' });
      }

      // 如果从一级降为二级，需要检查是否有子分类
      if (existingCategory.level === 1 && level === 2) {
        if (existingCategory.children.length > 0) {
          return res.status(400).json({ error: '该一级分类下还有子分类，无法降级' });
        }
      }
    }

    // 如果是二级分类，验证父分类
    const finalLevel = level || existingCategory.level;
    const finalParentId = parentId || existingCategory.parentId;

    if (finalLevel === 2) {
      if (!finalParentId) {
        return res.status(400).json({ error: '二级分类必须指定父分类' });
      }

      const parent = await prisma.cMSCategory.findFirst({
        where: { id: finalParentId, level: 1, isActive: true }
      });

      if (!parent) {
        return res.status(400).json({ error: '父分类不存在或已被禁用' });
      }

      // 防止循环引用
      if (finalParentId === id) {
        return res.status(400).json({ error: '不能将自己设为父分类' });
      }
    }

    // 检查名称是否重复（同级分类内）
    if (name && name !== existingCategory.name) {
      const duplicateName = await prisma.cMSCategory.findFirst({
        where: {
          name: name.trim(),
          level: finalLevel,
          parentId: finalLevel === 2 ? finalParentId : null,
          id: { not: id },
          isActive: true
        }
      });

      if (duplicateName) {
        return res.status(400).json({ error: '同级分类中已存在相同名称' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (type) updateData.type = type.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (level !== undefined) updateData.level = level;
    if (parentId !== undefined) updateData.parentId = finalLevel === 2 ? finalParentId : null;

    const updatedCategory = await prisma.cMSCategory.update({
      where: { id },
      data: updateData,
      include: {
        parent: {
          select: { id: true, name: true, type: true }
        },
        creator: {
          select: { id: true, username: true }
        }
      }
    });

    // 记录操作日志
    await prisma.cMSOperationLog.create({
      data: {
        userId: userId,
        action: 'UPDATE',
        targetType: 'CATEGORY',
        targetId: id,
        description: `更新了${finalLevel === 1 ? '一级' : '二级'}分类: ${updatedCategory.name}`
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
    const userId = req.user.id;
    const userRole = req.user.role;

    // 检查分类是否存在
    const category = await prisma.cMSCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            dataTemplates: true,
            projectData: true,
            children: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    // 权限检查：只有管理员可以删除一级分类
    if (category.level === 1 && userRole !== 'ADMIN') {
      return res.status(403).json({ error: '只有管理员可以删除一级分类' });
    }

    // 检查是否有关联数据
    if (category._count.dataTemplates > 0 || category._count.projectData > 0) {
      return res.status(400).json({ 
        error: '该分类下还有关联的模板或项目数据，无法删除' 
      });
    }

    // 检查是否有子分类（仅对一级分类）
    if (category.level === 1 && category._count.children > 0) {
      return res.status(400).json({ 
        error: '该一级分类下还有子分类，无法删除' 
      });
    }

    await prisma.cMSCategory.delete({
      where: { id }
    });

    // 记录操作日志
    await prisma.cMSOperationLog.create({
      data: {
        userId: userId,
        action: 'DELETE',
        targetType: 'CATEGORY',
        targetId: id,
        description: `删除了${category.level === 1 ? '一级' : '二级'}分类: ${category.name}`
      }
    });

    res.json({ message: '分类删除成功' });
  } catch (error) {
    console.error('删除分类失败:', error);
    res.status(500).json({ error: '删除分类失败' });
  }
});

// 批量删除分类（仅管理员）
router.delete('/batch', authenticateToken, requireUser, async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: '只有管理员可以批量删除分类' });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要删除的分类ID列表' });
    }

    // 检查分类是否存在且可以删除
    const categories = await prisma.cMSCategory.findMany({
      where: { id: { in: ids } },
      include: {
        _count: {
          select: {
            dataTemplates: true,
            projectData: true,
            children: true
          }
        }
      }
    });

    if (categories.length !== ids.length) {
      return res.status(400).json({ error: '部分分类不存在' });
    }

    // 检查是否有不能删除的分类
    const cannotDelete = categories.filter(cat => 
      cat._count.dataTemplates > 0 || 
      cat._count.projectData > 0 || 
      (cat.level === 1 && cat._count.children > 0)
    );

    if (cannotDelete.length > 0) {
      return res.status(400).json({ 
        error: `以下分类无法删除: ${cannotDelete.map(cat => cat.name).join(', ')}` 
      });
    }

    // 批量删除
    const deleteResult = await prisma.cMSCategory.deleteMany({
      where: { id: { in: ids } }
    });

    // 记录操作日志
    await prisma.cMSOperationLog.create({
      data: {
        userId: userId,
        action: 'DELETE',
        targetType: 'CATEGORY',
        targetId: ids.join(','),
        description: `批量删除了${deleteResult.count}个分类`
      }
    });

    res.json({ 
      message: `成功删除${deleteResult.count}个分类`,
      deletedCount: deleteResult.count
    });
  } catch (error) {
    console.error('批量删除分类失败:', error);
    res.status(500).json({ error: '批量删除分类失败' });
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