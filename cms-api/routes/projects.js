import express from 'express';
import { prisma } from '../index.js';
import { authenticateToken, requireUser, requireAdmin, validateRequired } from '../middleware/auth.js';

const router = express.Router();

// 获取所有项目
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 构建查询条件
    const where = {};
    
    // 处理搜索条件
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // 处理分类筛选
    if (category && category.trim()) {
      where.category = category.trim();
    }

    const [projects, total] = await Promise.all([
      prisma.cMSProject.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              username: true
            }
          },
          fields: {
            orderBy: { order: 'asc' }
          },
          _count: {
            select: {
              projectData: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.cMSProject.count({ where })
    ]);

    res.json({
      projects,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取项目列表失败:', error);
    res.status(500).json({ error: '获取项目列表失败' });
  }
});

// 获取单个项目详情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const project = await prisma.cMSProject.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true
          }
        },
        fields: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            projectData: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }

    res.json({ project });
  } catch (error) {
    console.error('获取项目详情失败:', error);
    res.status(500).json({ error: '获取项目详情失败' });
  }
});

// 创建项目（仅管理员）
router.post('/', authenticateToken, requireAdmin, validateRequired(['name']), async (req, res) => {
  try {
    const { name, description, fields = [] } = req.body;

    // 检查项目名是否已存在
    const existingProject = await prisma.cMSProject.findUnique({
      where: { name: name.trim() }
    });

    if (existingProject) {
      return res.status(400).json({ error: '项目名称已存在' });
    }

    // 定义默认字段（移除categories字段，基本字段设为必填）
    const defaultFields = [
      { fieldName: 'title', fieldType: 'STRING', isRequired: true, order: 1 },
      { fieldName: 'iframeUrl', fieldType: 'STRING', isRequired: true, order: 2 },
      { fieldName: 'description', fieldType: 'STRING', isRequired: true, order: 3 },
      { fieldName: 'tags', fieldType: 'ARRAY', isRequired: true, order: 4 },
      { fieldName: 'publishDate', fieldType: 'STRING', isRequired: true, order: 5 },
      { fieldName: 'imageUrl', fieldType: 'STRING', isRequired: true, order: 6 },
      { fieldName: 'imageAlt', fieldType: 'STRING', isRequired: true, order: 7 },
      { fieldName: 'seo_title', fieldType: 'STRING', isRequired: true, order: 8 },
      { fieldName: 'seo_description', fieldType: 'STRING', isRequired: true, order: 9 },
      { fieldName: 'seo_keywords', fieldType: 'STRING', isRequired: true, order: 10 },
      { fieldName: 'addressBar', fieldType: 'STRING', isRequired: true, order: 11 },
      { fieldName: 'detailsHtml', fieldType: 'STRING', isRequired: true, order: 12 }
    ];

    // 处理自定义字段
    const customFields = Array.isArray(fields) ? fields.map((field, index) => ({
      fieldName: field.fieldName?.trim(),
      fieldType: ['STRING', 'ARRAY'].includes(field.fieldType) ? field.fieldType : 'STRING',
      isRequired: Boolean(field.isRequired),
      order: defaultFields.length + index + 1
    })).filter(field => field.fieldName) : [];

    // 合并默认字段和自定义字段
    const allFields = [...defaultFields, ...customFields];

    // 创建项目和字段
    const project = await prisma.cMSProject.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        createdBy: req.user.id,
        fields: {
          create: allFields
        }
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true
          }
        },
        fields: {
          orderBy: { order: 'asc' }
        }
      }
    });

    // 记录操作日志
    await prisma.cMSOperationLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE',
        targetType: 'PROJECT',
        targetId: project.id,
        description: `创建了项目: ${name}`
      }
    });

    res.status(201).json({
      message: '项目创建成功',
      project
    });
  } catch (error) {
    console.error('创建项目失败:', error);
    res.status(500).json({ error: '创建项目失败' });
  }
});

// 更新项目（仅管理员）
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description, fields } = req.body;

    // 检查项目是否存在
    const existingProject = await prisma.cMSProject.findUnique({
      where: { id },
      include: { fields: true }
    });

    if (!existingProject) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // 如果更新名称，检查是否与其他项目重复
    if (name && name !== existingProject.name) {
      const duplicateName = await prisma.cMSProject.findFirst({
        where: {
          name: name.trim(),
          id: { not: id }
        }
      });

      if (duplicateName) {
        return res.status(400).json({ error: '项目名称已存在' });
      }
    }

    // 准备更新数据
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (category !== undefined) updateData.category = category?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;

    // 更新项目基本信息
    const updatedProject = await prisma.cMSProject.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            username: true
          }
        },
        fields: {
          orderBy: { order: 'asc' }
        }
      }
    });

    // 如果提供了字段更新
    if (Array.isArray(fields)) {
      // 删除所有自定义字段（保留默认字段）
      await prisma.cMSProjectField.deleteMany({
        where: {
          projectId: id,
          order: { gt: 12 } // 只删除order > 12的自定义字段
        }
      });

      // 创建新的自定义字段
      const customFields = fields.map((field, index) => ({
        projectId: id,
        fieldName: field.fieldName?.trim(),
        fieldType: ['STRING', 'ARRAY'].includes(field.fieldType) ? field.fieldType : 'STRING',
        isRequired: Boolean(field.isRequired),
        order: 13 + index // 从13开始
      })).filter(field => field.fieldName);

      if (customFields.length > 0) {
        await prisma.cMSProjectField.createMany({
          data: customFields
        });
      }
    }

    // 重新获取更新后的项目信息
    const finalProject = await prisma.cMSProject.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true
          }
        },
        fields: {
          orderBy: { order: 'asc' }
        }
      }
    });

    // 记录操作日志
    await prisma.cMSOperationLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        targetType: 'PROJECT',
        targetId: id,
        description: `更新了项目: ${finalProject.name}`
      }
    });

    res.json({
      message: '项目更新成功',
      project: finalProject
    });
  } catch (error) {
    console.error('更新项目失败:', error);
    res.status(500).json({ error: '更新项目失败' });
  }
});

// 删除项目（仅管理员）
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const project = await prisma.cMSProject.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            projectData: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // 检查是否有关联的项目数据
    if (project._count.projectData > 0) {
      return res.status(400).json({ 
        error: '该项目下还有相关数据，无法删除' 
      });
    }

    await prisma.cMSProject.delete({
      where: { id }
    });

    // 记录操作日志
    await prisma.cMSOperationLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE',
        targetType: 'PROJECT',
        targetId: id,
        description: `删除了项目: ${project.name}`
      }
    });

    res.json({ message: '项目删除成功' });
  } catch (error) {
    console.error('删除项目失败:', error);
    res.status(500).json({ error: '删除项目失败' });
  }
});

// 获取项目的简化列表（用于下拉选择）
router.get('/simple/list', authenticateToken, async (req, res) => {
  try {
    const projects = await prisma.cMSProject.findMany({
      select: {
        id: true,
        name: true,
        description: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({ projects });
  } catch (error) {
    console.error('获取项目简化列表失败:', error);
    res.status(500).json({ error: '获取项目简化列表失败' });
  }
});

export default router;