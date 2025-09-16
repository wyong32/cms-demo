import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🚀 开始创建管理员账户...');
    
    // 检查是否已存在管理员
    const existingAdmin = await prisma.cMSUser.findFirst({
      where: { role: 'ADMIN' }
    });

    if (existingAdmin) {
      console.log('✅ 管理员账户已存在:', existingAdmin.username);
      return;
    }

    // 创建管理员
    const hashedPassword = await bcrypt.hash('wanghuan1235789', 12);
    
    const admin = await prisma.cMSUser.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        email: 'admin@cms.com',
        role: 'ADMIN'
      }
    });

    console.log('🎉 管理员账户创建成功！');
    console.log('📧 用户名: admin');
    console.log('🔑 密码: wanghuan1235789');
    
    // 创建默认分类
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
    console.error('❌ 创建失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();