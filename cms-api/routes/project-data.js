import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { authenticateToken, requireUser, validateRequired } from '../middleware/auth.js';

const router = express.Router();

function normalizeHead(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

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
              type: true,
              parent: {
                select: {
                  id: true,
                  name: true
                }
              }
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

// 以下具体路径必须注册在 /:id 之前，否则会被误匹配为 id（如 id=check-duplicate、含斜杠的路径）

// 检查项目内标题是否重复
router.get('/check-duplicate/:projectId/:title', authenticateToken, requireUser, async (req, res) => {
  try {
    const { projectId, title } = req.params;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: '标题不能为空' });
    }

    const existingProjectData = await prisma.cMSProjectData.findFirst({
      where: {
        projectId,
        data: {
          path: ['title'],
          equals: title.trim()
        }
      },
      select: {
        id: true,
        data: true,
        createdAt: true,
        creator: {
          select: {
            username: true
          }
        }
      }
    });

    if (existingProjectData) {
      return res.json({
        isDuplicate: true,
        existingData: {
          id: existingProjectData.id,
          title: existingProjectData.data.title,
          creator: existingProjectData.creator?.username || '未知',
          createdAt: existingProjectData.createdAt
        }
      });
    }

    res.json({ isDuplicate: false });
  } catch (error) {
    console.error('检查项目数据重复失败:', error);
    res.status(500).json({ error: '检查项目数据重复失败' });
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

    const data = projectData.data || {};
    let jsCode = '{\n';

    jsCode += `  id: "${projectData.id}",\n`;

    const headVal =
      projectData.head ??
      (typeof data === 'object' && data !== null ? data._cmsHead : null);
    if (headVal !== null && headVal !== undefined && String(headVal).trim() !== '') {
      jsCode += `  head: ${JSON.stringify(String(headVal))},\n`;
    }

    for (const field of projectData.project.fields) {
      const fieldName = field.fieldName;
      const value = data[fieldName];

      if (value !== undefined && value !== null) {
        if (field.fieldType === 'ARRAY') {
          const arrayValue = Array.isArray(value) ? value : [value];
          jsCode += `  ${fieldName}: ${JSON.stringify(arrayValue)},\n`;
        } else if (fieldName === 'detailsHtml') {
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
    const { projectId, categoryId, saveAsTemplate, data, head } = req.body;

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
    
    // 处理项目定义的字段
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
    
    // 保留特殊字段（如富文本图片信息）
    const specialFields = ['richTextImages', '_hasNewRichTextImages'];
    specialFields.forEach(fieldName => {
      if (data[fieldName] !== undefined) {
        cleanedData[fieldName] = data[fieldName];
      }
    });

    const headNorm = normalizeHead(head);
    if (headNorm !== null) {
      cleanedData._cmsHead = headNorm;
    }

    const projectData = await prisma.cMSProjectData.create({
      data: {
        projectId,
        categoryId: categoryId || null,
        head: headNorm,
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

    // 如果有分类信息且用户勾选了"保存为模板"，则创建数据模板
    if (saveAsTemplate && categoryId && cleanedData.title) {
      try {
        // 检查模板标题是否重复
        const existingTemplate = await prisma.cMSDataTemplate.findFirst({
          where: {
            title: {
              equals: cleanedData.title.trim(),
              mode: 'insensitive'
            }
          }
        });
        
        if (!existingTemplate) {
          const newTemplate = await prisma.cMSDataTemplate.create({
            data: {
              title: cleanedData.title,
              categoryId,
              description: cleanedData.description || null,
              imageUrl: cleanedData.imageUrl || null,
              iframeUrl: cleanedData.iframeUrl || null,
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
              description: `自动创建数据模板: ${cleanedData.title}`
            }
          });
        }
      } catch (templateError) {
        console.error('自动创建模板失败:', templateError);
        // 不影响主流程，只记录错误
      }
    }

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
        head: null,
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
    const { categoryId, data, head } = req.body;

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

    if (head !== undefined) {
      updateData.head = normalizeHead(head);
    }
    
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
      
      // 处理项目定义的字段
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
      
      // 保留特殊字段（如富文本图片信息）
      const specialFields = ['richTextImages', '_hasNewRichTextImages'];
      specialFields.forEach(fieldName => {
        if (data[fieldName] !== undefined) {
          cleanedData[fieldName] = data[fieldName];
        }
      });

      if (head !== undefined) {
        const hn = normalizeHead(head);
        if (hn === null) {
          delete cleanedData._cmsHead;
        } else {
          cleanedData._cmsHead = hn;
        }
      } else if (
        existingData.data &&
        typeof existingData.data === 'object' &&
        existingData.data !== null &&
        existingData.data._cmsHead !== undefined
      ) {
        cleanedData._cmsHead = existingData.data._cmsHead;
      }

      updateData.data = cleanedData;
      
      // 🔧 修复业务逻辑：用户编辑数据时，自动重置为未完成状态
      updateData.isCompleted = false;
    } else if (head !== undefined) {
      const prev =
        existingData.data && typeof existingData.data === 'object'
          ? { ...existingData.data }
          : {};
      const hn = normalizeHead(head);
      if (hn === null) {
        delete prev._cmsHead;
      } else {
        prev._cmsHead = hn;
      }
      updateData.data = prev;
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
        description: `更新了项目 "${existingData.project.name}" 中的数据${data ? '（状态重置为未完成）' : ''}`
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

    // 删除项目数据
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

export default router;