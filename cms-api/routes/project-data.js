import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { authenticateToken, requireUser, validateRequired } from '../middleware/auth.js';

const router = express.Router();

// 获取项目数据列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      projectId,
      categoryId,
      isCompleted,
      search 
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let where = {};
    
    if (projectId) {
      where.projectId = projectId;
    }
    
    if (categoryId) {
      where.categoryId = categoryId;
    }
    
    if (isCompleted !== undefined) {
      where.isCompleted = isCompleted === 'true';
    }
    
    if (search) {
      // 在JSON数据中搜索标题
      where.OR = [
        {
          data: {
            path: ['title'],
            string_contains: search
          }
        }
      ];
    }

    const [projectData, total] = await Promise.all([
      prisma.cMSProjectData.findMany({
        where,
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
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.cMSProjectData.count({ where })
    ]);

    res.json({
      projectData,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取项目数据列表失败:', error);
    res.status(500).json({ error: '获取项目数据列表失败' });
  }
});

// 获取单个项目数据
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const projectData = await prisma.cMSProjectData.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            fields: {
              orderBy: { order: 'asc' }
            }
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

    if (!projectData) {
      return res.status(404).json({ error: '项目数据不存在' });
    }

    res.json({ projectData });
  } catch (error) {
    console.error('获取项目数据失败:', error);
    res.status(500).json({ error: '获取项目数据失败' });
  }
});

// 创建项目数据
router.post('/', authenticateToken, requireUser, validateRequired(['projectId', 'data']), async (req, res) => {
  try {
    const { projectId, categoryId, data } = req.body;

    // 验证项目是否存在
    const project = await prisma.cMSProject.findUnique({
      where: { id: projectId },
      include: {
        fields: true
      }
    });

    if (!project) {
      return res.status(400).json({ error: '指定的项目不存在' });
    }

    // 验证分类（如果提供）
    if (categoryId) {
      const category = await prisma.cMSCategory.findUnique({
        where: { id: categoryId }
      });

      if (!category) {
        return res.status(400).json({ error: '指定的分类不存在' });
      }
    }

    // 验证必填字段
    const requiredFields = project.fields.filter(field => field.isRequired);
    const missingFields = [];

    for (const field of requiredFields) {
      if (!data[field.fieldName] || 
          (typeof data[field.fieldName] === 'string' && data[field.fieldName].trim() === '')) {
        missingFields.push(field.fieldName);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `缺少必填字段: ${missingFields.join(', ')}` 
      });
    }

    // 验证和清理数据
    const cleanedData = {};
    for (const field of project.fields) {
      const value = data[field.fieldName];
      
      if (value !== undefined && value !== null) {
        if (field.fieldType === 'ARRAY') {
          cleanedData[field.fieldName] = Array.isArray(value) ? value : [value];
        } else {
          cleanedData[field.fieldName] = String(value).trim();
        }
      }
    }

    const projectData = await prisma.cMSProjectData.create({
      data: {
        projectId,
        categoryId: categoryId || null,
        data: cleanedData,
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
        action: 'CREATE',
        targetType: 'PROJECT_DATA',
        targetId: projectData.id,
        description: `在项目 "${project.name}" 中创建了新数据`
      }
    });

    res.status(201).json({
      message: '项目数据创建成功',
      projectData
    });
  } catch (error) {
    console.error('创建项目数据失败:', error);
    res.status(500).json({ error: '创建项目数据失败' });
  }
});

// 从模板创建项目数据
router.post('/from-template', authenticateToken, requireUser, validateRequired(['projectId', 'templateId']), async (req, res) => {
  try {
    const { projectId, templateId, categoryId } = req.body;

    // 获取项目信息
    const project = await prisma.cMSProject.findUnique({
      where: { id: projectId },
      include: {
        fields: true
      }
    });

    if (!project) {
      return res.status(400).json({ error: '指定的项目不存在' });
    }

    // 获取模板信息
    const template = await prisma.cMSDataTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return res.status(400).json({ error: '指定的模板不存在' });
    }

    // 将模板数据映射到项目字段
    const projectData = {};
    
    for (const field of project.fields) {
      const fieldName = field.fieldName;
      
      // 直接映射的字段
      if (template[fieldName] !== undefined && template[fieldName] !== null) {
        if (field.fieldType === 'ARRAY' && fieldName === 'tags') {
          projectData[fieldName] = template.tags || [];
        } else if (field.fieldType === 'STRING') {
          projectData[fieldName] = String(template[fieldName]);
        }
      }
    }

    // 处理特殊字段映射
    if (template.categoryId && !categoryId) {
      // 如果模板有分类且用户没有指定新分类，使用模板的分类
      const templateCategory = await prisma.cMSCategory.findUnique({
        where: { id: template.categoryId }
      });
      
      if (templateCategory) {
        projectData.categories = templateCategory.name;
      }
    }

    const newProjectData = await prisma.cMSProjectData.create({
      data: {
        projectId,
        categoryId: categoryId || template.categoryId,
        data: projectData,
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
        action: 'CREATE',
        targetType: 'PROJECT_DATA',
        targetId: newProjectData.id,
        description: `从模板 "${template.title}" 在项目 "${project.name}" 中创建了新数据`
      }
    });

    res.status(201).json({
      message: '从模板创建项目数据成功',
      projectData: newProjectData
    });
  } catch (error) {
    console.error('从模板创建项目数据失败:', error);
    res.status(500).json({ error: '从模板创建项目数据失败' });
  }
});

// 更新项目数据
router.put('/:id', authenticateToken, requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, data } = req.body;

    // 检查项目数据是否存在
    const existingData = await prisma.cMSProjectData.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            fields: true
          }
        }
      }
    });

    if (!existingData) {
      return res.status(404).json({ error: '项目数据不存在' });
    }

    const updateData = {};
    
    if (categoryId !== undefined) {
      if (categoryId) {
        const category = await prisma.cMSCategory.findUnique({
          where: { id: categoryId }
        });

        if (!category) {
          return res.status(400).json({ error: '指定的分类不存在' });
        }
      }
      updateData.categoryId = categoryId || null;
    }

    if (data) {
      // 验证必填字段
      const requiredFields = existingData.project.fields.filter(field => field.isRequired);
      const missingFields = [];

      for (const field of requiredFields) {
        if (!data[field.fieldName] || 
            (typeof data[field.fieldName] === 'string' && data[field.fieldName].trim() === '')) {
          missingFields.push(field.fieldName);
        }
      }

      if (missingFields.length > 0) {
        return res.status(400).json({ 
          error: `缺少必填字段: ${missingFields.join(', ')}` 
        });
      }

      // 验证和清理数据
      const cleanedData = {};
      for (const field of existingData.project.fields) {
        const value = data[field.fieldName];
        
        if (value !== undefined && value !== null) {
          if (field.fieldType === 'ARRAY') {
            cleanedData[field.fieldName] = Array.isArray(value) ? value : [value];
          } else {
            cleanedData[field.fieldName] = String(value).trim();
          }
        }
      }

      updateData.data = cleanedData;
    }

    const updatedProjectData = await prisma.cMSProjectData.update({
      where: { id },
      data: updateData,
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
        action: 'UPDATE',
        targetType: 'PROJECT_DATA',
        targetId: id,
        description: `更新了项目 "${existingData.project.name}" 中的数据`
      }
    });

    res.json({
      message: '项目数据更新成功',
      projectData: updatedProjectData
    });
  } catch (error) {
    console.error('更新项目数据失败:', error);
    res.status(500).json({ error: '更新项目数据失败' });
  }
});

// 标记项目数据为已完成
router.put('/:id/complete', authenticateToken, requireUser, async (req, res) => {
  try {
    const { id } = req.params;

    const projectData = await prisma.cMSProjectData.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!projectData) {
      return res.status(404).json({ error: '项目数据不存在' });
    }

    const updatedProjectData = await prisma.cMSProjectData.update({
      where: { id },
      data: { isCompleted: true },
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
        action: 'UPDATE',
        targetType: 'PROJECT_DATA',
        targetId: id,
        description: `标记项目 "${projectData.project.name}" 中的数据为已完成`
      }
    });

    res.json({
      message: '项目数据标记为已完成',
      projectData: updatedProjectData
    });
  } catch (error) {
    console.error('标记项目数据为已完成失败:', error);
    res.status(500).json({ error: '标记项目数据为已完成失败' });
  }
});

// 删除项目数据
router.delete('/:id', authenticateToken, requireUser, async (req, res) => {
  try {
    const { id } = req.params;

    const projectData = await prisma.cMSProjectData.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            name: true
          }
        }
      }
    });

    if (!projectData) {
      return res.status(404).json({ error: '项目数据不存在' });
    }

    await prisma.cMSProjectData.delete({
      where: { id }
    });

    // 记录操作日志
    await prisma.cMSOperationLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE',
        targetType: 'PROJECT_DATA',
        targetId: id,
        description: `删除了项目 "${projectData.project.name}" 中的数据`
      }
    });

    res.json({ message: '项目数据删除成功' });
  } catch (error) {
    console.error('删除项目数据失败:', error);
    res.status(500).json({ error: '删除项目数据失败' });
  }
});

// 生成JS对象代码片段
router.get('/:id/generate-code', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const projectData = await prisma.cMSProjectData.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            fields: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    if (!projectData) {
      return res.status(404).json({ error: '项目数据不存在' });
    }

    // 生成JS对象代码
    const data = projectData.data;
    let jsCode = '{\n';
    
    // 添加ID
    jsCode += `  id: "${projectData.id}",\n`;
    
    // 按字段顺序添加数据
    for (const field of projectData.project.fields) {
      const fieldName = field.fieldName;
      const value = data[fieldName];
      
      if (value !== undefined && value !== null) {
        if (field.fieldType === 'ARRAY') {
          const arrayValue = Array.isArray(value) ? value : [value];
          jsCode += `  ${fieldName}: ${JSON.stringify(arrayValue)},\n`;
        } else if (fieldName === 'detailsHtml') {
          // 特殊处理HTML内容，使用模板字符串
          jsCode += `  ${fieldName}: \`${String(value).replace(/`/g, '\\`')}\`,\n`;
        } else {
          jsCode += `  ${fieldName}: "${String(value).replace(/"/g, '\\"')}",\n`;
        }
      }
    }
    
    jsCode += '}';

    res.json({
      projectData,
      jsCode
    });
  } catch (error) {
    console.error('生成JS代码失败:', error);
    res.status(500).json({ error: '生成JS代码失败' });
  }
});

export default router;