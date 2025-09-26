// 测试AI使用情况监控
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testAIUsage() {
  try {
    console.log('🤖 测试AI使用情况监控...\n');
    
    // 1. 检查AI服务状态
    console.log('📊 1. AI服务状态检查:');
    console.log('- AI_PROVIDER:', process.env.AI_PROVIDER || 'undefined');
    console.log('- GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'configured' : 'undefined');
    console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'configured' : 'undefined');
    console.log('- ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'configured' : 'undefined');
    
    // 2. 统计AI生成次数
    console.log('\n📈 2. AI生成统计 (最近30天):');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [
      totalAiGenerated,
      aiTemplates,
      aiProjectData,
      recentAiActivities
    ] = await Promise.all([
      // 总AI生成次数
      prisma.cMSOperationLog.count({
        where: {
          action: 'CREATE',
          description: { contains: 'AI生成' },
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      
      // AI生成的数据模板
      prisma.cMSOperationLog.count({
        where: {
          action: 'CREATE',
          targetType: 'TEMPLATE',
          description: { contains: 'AI生成' },
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      
      // AI生成的项目数据
      prisma.cMSOperationLog.count({
        where: {
          action: 'CREATE',
          targetType: 'PROJECT_DATA',
          description: { contains: 'AI生成' },
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      
      // 最近AI活动
      prisma.cMSOperationLog.findMany({
        where: {
          description: { contains: 'AI生成' },
          createdAt: { gte: thirtyDaysAgo }
        },
        include: {
          user: {
            select: {
              username: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      })
    ]);
    
    console.log(`- 总AI生成次数: ${totalAiGenerated}`);
    console.log(`- AI生成数据模板: ${aiTemplates}`);
    console.log(`- AI生成项目数据: ${aiProjectData}`);
    
    // 3. 每日AI使用统计
    console.log('\n📅 3. 每日AI使用统计 (最近7天):');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const dailyUsage = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*) as count
      FROM "cms_operation_logs" 
      WHERE "createdAt" >= ${sevenDaysAgo}
        AND "description" LIKE '%AI生成%'
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
      LIMIT 7
    `;
    
    dailyUsage.forEach(day => {
      console.log(`- ${day.date}: ${Number(day.count)} 次AI生成`);
    });
    
    // 4. 按用户统计AI使用
    console.log('\n👥 4. 按用户统计AI使用:');
    const usageByUser = await prisma.cMSOperationLog.groupBy({
      by: ['userId'],
      where: {
        description: { contains: 'AI生成' },
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    });
    
    for (const usage of usageByUser) {
      const user = await prisma.cMSUser.findUnique({
        where: { id: usage.userId },
        select: { username: true, role: true }
      });
      console.log(`- ${user?.username || '未知用户'} (${user?.role || 'USER'}): ${usage._count.id} 次`);
    }
    
    // 5. 最近AI活动
    console.log('\n🕒 5. 最近AI活动:');
    recentAiActivities.forEach((activity, index) => {
      const timeAgo = Math.floor((Date.now() - new Date(activity.createdAt)) / (1000 * 60));
      console.log(`${index + 1}. ${activity.user.username} - ${activity.description} (${timeAgo}分钟前)`);
    });
    
    // 6. 系统总体统计
    console.log('\n📊 6. 系统总体统计:');
    const [
      totalTemplates,
      totalProjectData,
      totalUsers
    ] = await Promise.all([
      prisma.cMSDataTemplate.count(),
      prisma.cMSProjectData.count(),
      prisma.cMSUser.count()
    ]);
    
    console.log(`- 总数据模板: ${totalTemplates}`);
    console.log(`- 总项目数据: ${totalProjectData}`);
    console.log(`- 总用户数: ${totalUsers}`);
    console.log(`- AI生成比例: ${totalAiGenerated > 0 ? ((totalAiGenerated / (totalTemplates + totalProjectData)) * 100).toFixed(2) : 0}%`);
    
    console.log('\n✅ AI使用情况监控测试完成！');
    
  } catch (error) {
    console.error('❌ AI使用情况监控测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行测试
testAIUsage();
