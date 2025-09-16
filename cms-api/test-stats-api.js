// 测试统计API
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testStatsAPI() {
  try {
    console.log('🧪 测试统计API数据获取...');
    
    // 测试各个统计查询
    const [
      totalTemplates,
      totalCategories,
      totalProjects,
      totalProjectData,
      totalUsers
    ] = await Promise.all([
      prisma.cMSDataTemplate.count(),
      prisma.cMSCategory.count(),
      prisma.cMSProject.count(),
      prisma.cMSProjectData.count(),
      prisma.cMSUser.count()
    ]);
    
    console.log('📊 数据库统计结果:');
    console.log(`  数据模板: ${totalTemplates}`);
    console.log(`  分类: ${totalCategories}`);
    console.log(`  项目: ${totalProjects}`);
    console.log(`  项目数据: ${totalProjectData}`);
    console.log(`  用户: ${totalUsers}`);
    
    // 测试操作日志查询
    const recentLogs = await prisma.cMSOperationLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { username: true, role: true }
        }
      }
    });
    
    console.log('\n📝 最近5条操作日志:');
    recentLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log.user.username} - ${log.action} ${log.targetType} - ${log.description}`);
    });
    
    console.log('\n✅ 统计API测试完成，数据获取正常！');
    
  } catch (error) {
    console.error('❌ 统计API测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testStatsAPI();
