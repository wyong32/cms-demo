import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/auth.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const prisma = new PrismaClient();

async function initializeAdmin() {
  console.log('🚀 开始初始化CMS系统...');
  
  try {
    // 检查数据库连接
    await prisma.$connect();
    console.log('✅ 数据库连接成功');
    // 检查是否已存在管理员账户
    const existingAdmin = await prisma.cMSUser.findFirst({
      where: { role: 'ADMIN' }
    });

    if (existingAdmin) {
      console.log('✅ 管理员账户已存在:', existingAdmin.username);
      return;
    }

    // 创建默认管理员账户
    const adminPassword = 'wanghuan1235789';
    const hashedPassword = await hashPassword(adminPassword);

    const admin = await prisma.cMSUser.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        email: 'admin@cms.com',
        role: 'ADMIN'
      }
    });

    console.log('🎉 默认管理员账户创建成功！');
    console.log('📧 用户名: admin');
    console.log('🔑 密码: wanghuan1235789');
    console.log('⚠️  请在首次登录后立即更改密码！');

    // 创建一些默认分类
    await prisma.cMSCategory.createMany({
      data: [
        {
          name: '网站',
          type: '网站类型',
          description: '网站项目分类',
          createdBy: admin.id
        },
        {
          name: '应用',
          type: '应用类型',
          description: '应用程序分类',
          createdBy: admin.id
        },
        {
          name: '游戏',
          type: '游戏类型',
          description: '游戏项目分类',
          createdBy: admin.id
        }
      ]
    });

    console.log('📁 默认分类创建成功');

  } catch (error) {
    console.error('❌ 初始化失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeAdmin();
}

export { initializeAdmin };