import express from 'express';
import { prisma } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 获取操作日志列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      userId,
      action,
      targetType,
      search,
      startDate,
      endDate
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let where = {};
    
    // 用户过滤
    if (userId) {
      where.userId = userId;
    }
    
    // 操作类型过滤
    if (action) {
      where.action = action;
    }
    
    // 目标类型过滤
    if (targetType) {
      where.targetType = targetType;
    }
    
    // 时间范围过滤
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }
    
    // 搜索过滤
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { user: { username: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.cMSOperationLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.cMSOperationLog.count({ where })
    ]);

    res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取操作日志失败:', error);
    res.status(500).json({ error: '获取操作日志失败' });
  }
});

// 获取单个操作日志
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const log = await prisma.cMSOperationLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true
          }
        }
      }
    });

    if (!log) {
      return res.status(404).json({ error: '操作日志不存在' });
    }

    res.json({ log });
  } catch (error) {
    console.error('获取操作日志失败:', error);
    res.status(500).json({ error: '获取操作日志失败' });
  }
});

// 获取操作统计
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let where = {};
    
    // 时间范围过滤
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // 获取各种统计数据
    const [
      totalLogs,
      actionStats,
      targetTypeStats,
      userStats,
      dailyStats
    ] = await Promise.all([
      // 总日志数
      prisma.cMSOperationLog.count({ where }),
      
      // 按操作类型统计
      prisma.cMSOperationLog.groupBy({
        by: ['action'],
        where,
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        }
      }),
      
      // 按目标类型统计
      prisma.cMSOperationLog.groupBy({
        by: ['targetType'],
        where,
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        }
      }),
      
      // 按用户统计
      prisma.cMSOperationLog.groupBy({
        by: ['userId'],
        where,
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 10 // 只取前10个最活跃用户
      }),
      
      // 每日统计（最近30天）
      prisma.$queryRaw`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*) as count
        FROM "cms_operation_logs" 
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
        LIMIT 30
      `
    ]);

    // 获取用户详细信息
    const userIds = userStats.map(stat => stat.userId);
    const users = await prisma.cMSUser.findMany({
      where: {
        id: { in: userIds }
      },
      select: {
        id: true,
        username: true,
        role: true
      }
    });

    // 组合用户统计数据
    const userStatsWithInfo = userStats.map(stat => {
      const user = users.find(u => u.id === stat.userId);
      return {
        ...stat,
        user
      };
    });

    // 转换BigInt为Number
    const convertBigIntToNumber = (data) => {
      return data.map(item => ({
        ...item,
        count: Number(item.count)
      }));
    };

    res.json({
      totalLogs,
      actionStats,
      targetTypeStats,
      userStats: userStatsWithInfo,
      dailyStats: convertBigIntToNumber(dailyStats)
    });
  } catch (error) {
    console.error('获取操作统计失败:', error);
    res.status(500).json({ error: '获取操作统计失败' });
  }
});

// 获取最近活动
router.get('/recent/activities', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recentLogs = await prisma.cMSOperationLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true
          }
        }
      },
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });

    res.json({ recentLogs });
  } catch (error) {
    console.error('获取最近活动失败:', error);
    res.status(500).json({ error: '获取最近活动失败' });
  }
});

// 获取当前用户的操作历史
router.get('/user/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      prisma.cMSOperationLog.findMany({
        where: {
          userId: req.user.id
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.cMSOperationLog.count({
        where: {
          userId: req.user.id
        }
      })
    ]);

    res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取用户操作历史失败:', error);
    res.status(500).json({ error: '获取用户操作历史失败' });
  }
});

// 清理旧日志（管理员功能）
router.delete('/cleanup', authenticateToken, async (req, res) => {
  try {
    // 只有管理员可以执行清理操作
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '需要管理员权限' });
    }

    const { days = 90 } = req.body; // 默认删除90天前的日志
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const deletedCount = await prisma.cMSOperationLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    // 记录清理操作
    await prisma.cMSOperationLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE',
        targetType: 'LOG',
        targetId: 'cleanup',
        description: `清理了 ${deletedCount.count} 条 ${days} 天前的操作日志`
      }
    });

    res.json({
      message: '日志清理成功',
      deletedCount: deletedCount.count,
      cutoffDate
    });
  } catch (error) {
    console.error('清理旧日志失败:', error);
    res.status(500).json({ error: '清理旧日志失败' });
  }
});

export default router;