import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 获取系统统计概览
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    console.log('📊 获取系统统计概览...');
    
    // 并行获取各种统计数据
    const [
      totalTemplates,
      totalCategories,
      totalProjects,
      totalProjectData,
      totalUsers,
      completedProjectData,
      pendingProjectData
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
        pendingProjectData
      },
      templatesByCategory,
      projectStats,
      recentActivities,
      dailyStats: convertBigIntToNumber(dailyStats)
    };

    console.log('✅ 统计概览获取成功:', {
      totalTemplates,
      totalCategories,
      totalProjects,
      totalProjectData,
      totalUsers
    });

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

export default router;
