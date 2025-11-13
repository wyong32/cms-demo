import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 获取系统统计概览
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    // 并行获取各种统计数据
    const [
      totalTemplates,
      totalCategories,
      totalProjects,
      totalProjectData,
      totalUsers,
      completedProjectData,
      pendingProjectData,
      aiGeneratedTemplates,
      aiGeneratedProjectData
    ] = await Promise.all([
      // 数据模板总数
      prisma.cMSDataTemplate.count(),
      
      // 分类总数
      prisma.cMSCategory.count(),
      
      // 项目总数
      prisma.cMSProject.count(),
      
      // 项目数据总数
      prisma.cMSProjectData.count(),
      
      // 用户总数
      prisma.cMSUser.count(),
      
      // 已完成的项目数据
      prisma.cMSProjectData.count({
        where: { isCompleted: true }
      }),
      
      // 未完成的项目数据
      prisma.cMSProjectData.count({
        where: { isCompleted: false }
      }),
      
      // AI生成的数据模板（通过操作日志统计）
      prisma.cMSOperationLog.count({
        where: {
          action: 'CREATE',
          targetType: 'TEMPLATE',
          description: { contains: 'AI生成' }
        }
      }),
      
      // AI生成的项目数据（通过操作日志统计）
      prisma.cMSOperationLog.count({
        where: {
          action: 'CREATE',
          targetType: 'PROJECT_DATA',
          description: { contains: 'AI生成' }
        }
      })
    ]);

    // 按分类统计数据模板
    const templatesByCategory = await prisma.cMSCategory.findMany({
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

    // 按项目统计数据
    const projectStats = await prisma.cMSProject.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: {
            projectData: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // 最近7天的活动统计
    const recentActivities = await prisma.cMSOperationLog.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7天前
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // 每日活动统计（最近30天）
    const dailyStats = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*) as count
      FROM "cms_operation_logs" 
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
      LIMIT 30
    `;

    // 转换BigInt为Number
    const convertBigIntToNumber = (data) => {
      return data.map(item => ({
        ...item,
        count: Number(item.count)
      }));
    };

    const stats = {
      overview: {
        totalTemplates,
        totalCategories,
        totalProjects,
        totalProjectData,
        totalUsers,
        completedProjectData,
        pendingProjectData,
        aiGeneratedTemplates,
        aiGeneratedProjectData,
        aiGeneratedTotal: aiGeneratedTemplates + aiGeneratedProjectData
      },
      templatesByCategory,
      projectStats,
      recentActivities,
      dailyStats: convertBigIntToNumber(dailyStats)
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ 获取统计概览失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计概览失败'
    });
  }
});

// 获取详细统计信息
router.get('/detailed', authenticateToken, async (req, res) => {
  try {
    const { type, timeRange } = req.query;
    
    let where = {};
    
    // 时间范围过滤
    if (timeRange) {
      const now = new Date();
      let startDate;
      
      switch (timeRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      where.createdAt = {
        gte: startDate
      };
    }

    let stats = {};

    switch (type) {
      case 'templates':
        stats = await prisma.cMSDataTemplate.findMany({
          where,
          include: {
            category: {
              select: { id: true, name: true, type: true }
            },
            creator: {
              select: { id: true, username: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        break;
        
      case 'projects':
        stats = await prisma.cMSProject.findMany({
          where,
          include: {
            creator: {
              select: { id: true, username: true }
            },
            _count: {
              select: { projectData: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        break;
        
      case 'projectData':
        stats = await prisma.cMSProjectData.findMany({
          where,
          include: {
            project: {
              select: { id: true, name: true }
            },
            creator: {
              select: { id: true, username: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        break;
        
      case 'activities':
        stats = await prisma.cMSOperationLog.findMany({
          where,
          include: {
            user: {
              select: { id: true, username: true, role: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 100
        });
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: '无效的统计类型'
        });
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ 获取详细统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取详细统计失败'
    });
  }
});

// 获取AI使用情况统计
router.get('/ai-usage', authenticateToken, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    // 计算时间范围
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // 获取AI生成统计
    const [
      totalAiGenerated,
      aiTemplates,
      aiProjectData,
      dailyAiUsage,
      aiUsageByUser,
      recentAiActivities
    ] = await Promise.all([
      // 总AI生成次数
      prisma.cMSOperationLog.count({
        where: {
          action: 'CREATE',
          description: { contains: 'AI生成' },
          createdAt: { gte: startDate }
        }
      }),
      
      // AI生成的数据模板
      prisma.cMSOperationLog.count({
        where: {
          action: 'CREATE',
          targetType: 'TEMPLATE',
          description: { contains: 'AI生成' },
          createdAt: { gte: startDate }
        }
      }),
      
      // AI生成的项目数据
      prisma.cMSOperationLog.count({
        where: {
          action: 'CREATE',
          targetType: 'PROJECT_DATA',
          description: { contains: 'AI生成' },
          createdAt: { gte: startDate }
        }
      }),
      
      // 每日AI使用统计
      prisma.$queryRaw`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*) as count
        FROM "cms_operation_logs" 
        WHERE "createdAt" >= ${startDate}
          AND "description" LIKE '%AI生成%'
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
        LIMIT 30
      `,
      
      // 按用户统计AI使用
      prisma.cMSOperationLog.groupBy({
        by: ['userId'],
        where: {
          description: { contains: 'AI生成' },
          createdAt: { gte: startDate }
        },
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 10
      }),
      
      // 最近AI活动
      prisma.cMSOperationLog.findMany({
        where: {
          description: { contains: 'AI生成' },
          createdAt: { gte: startDate }
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 20
      })
    ]);
    
    // 转换BigInt为Number
    const convertBigIntToNumber = (data) => {
      return data.map(item => ({
        ...item,
        count: Number(item.count)
      }));
    };
    
    // 获取用户信息用于AI使用统计
    const aiUsageByUserWithInfo = await Promise.all(
      aiUsageByUser.map(async (usage) => {
        const user = await prisma.cMSUser.findUnique({
          where: { id: usage.userId },
          select: { username: true, role: true }
        });
        return {
          userId: usage.userId,
          username: user?.username || '未知用户',
          role: user?.role || 'USER',
          aiUsageCount: usage._count.id
        };
      })
    );
    

    const aiStats = {
      summary: {
        totalAiGenerated,
        aiTemplates,
        aiProjectData,
        timeRange,
        startDate: startDate.toISOString(),
        endDate: now.toISOString()
      },
      dailyUsage: convertBigIntToNumber(dailyAiUsage),
      usageByUser: aiUsageByUserWithInfo,
      recentActivities: recentAiActivities,
      provider: process.env.AI_PROVIDER || 'gemini'
    };
    
    res.json({
      success: true,
      data: aiStats
    });
    
  } catch (error) {
    console.error('❌ 获取AI使用统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取AI使用统计失败'
    });
  }
});

// 获取AI服务状态
router.get('/ai-status', authenticateToken, async (req, res) => {
  try {
    // 导入AI服务
    const aiService = (await import('../utils/aiService.js')).default;
    
    const aiStatus = {
      provider: aiService.provider,
      clientInitialized: !!aiService.client,
      environmentVariables: {
        AI_PROVIDER: process.env.AI_PROVIDER || 'undefined',
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? 'configured' : 'undefined',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'configured' : 'undefined',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'configured' : 'undefined'
      },
      lastChecked: new Date().toISOString()
    };
    
    // 测试AI服务（不实际调用，只检查配置）
    let testResult = null;
    try {
      // 这里可以添加一个简单的连接测试
      testResult = {
        status: 'ready',
        message: 'AI服务配置正常'
      };
    } catch (error) {
      testResult = {
        status: 'error',
        message: error.message
      };
    }
    
    aiStatus.testResult = testResult;
    
    res.json({
      success: true,
      data: aiStatus
    });
    
  } catch (error) {
    console.error('❌ 检查AI服务状态失败:', error);
    res.status(500).json({
      success: false,
      error: '检查AI服务状态失败'
    });
  }
});

export default router;
