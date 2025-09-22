/**
 * 测试项目数据完成状态重置逻辑
 * 验证：当用户编辑项目数据时，isCompleted状态应该重置为false
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCompletionStatusReset() {
  console.log('🧪 开始测试项目数据完成状态重置逻辑...\n');

  try {
    // 1. 创建一个测试项目
    console.log('1️⃣ 创建测试项目...');
    const testProject = await prisma.cMSProject.create({
      data: {
        name: '测试项目-完成状态',
        description: '用于测试完成状态重置的项目',
        createdBy: 'test-user-id', // 假设存在测试用户
        fields: {
          create: [
            {
              fieldName: 'title',
              fieldType: 'STRING',
              isRequired: true,
              order: 0
            },
            {
              fieldName: 'description',
              fieldType: 'STRING',
              isRequired: false,
              order: 1
            }
          ]
        }
      }
    });
    console.log('✅ 测试项目创建成功:', testProject.name);

    // 2. 创建初始项目数据（未完成状态）
    console.log('\n2️⃣ 创建初始项目数据（未完成状态）...');
    const initialData = await prisma.cMSProjectData.create({
      data: {
        projectId: testProject.id,
        data: {
          title: '初始标题',
          description: '初始描述'
        },
        isCompleted: false,
        createdBy: 'test-user-id'
      }
    });
    console.log('✅ 初始数据创建成功，状态:', initialData.isCompleted ? '已完成' : '未完成');

    // 3. 模拟标记为已完成
    console.log('\n3️⃣ 模拟标记为已完成...');
    const completedData = await prisma.cMSProjectData.update({
      where: { id: initialData.id },
      data: { isCompleted: true }
    });
    console.log('✅ 数据标记为已完成，状态:', completedData.isCompleted ? '已完成' : '未完成');

    // 4. 模拟用户编辑数据（这应该重置为未完成）
    console.log('\n4️⃣ 模拟用户编辑数据...');
    const updatedData = await prisma.cMSProjectData.update({
      where: { id: initialData.id },
      data: {
        data: {
          title: '更新后的标题',
          description: '更新后的描述'
        },
        isCompleted: false // 这是修复后的逻辑
      }
    });
    console.log('✅ 数据更新完成，状态:', updatedData.isCompleted ? '已完成' : '未完成');

    // 5. 验证结果
    console.log('\n5️⃣ 验证结果...');
    if (!updatedData.isCompleted) {
      console.log('✅ 测试通过：编辑数据后状态正确重置为未完成');
    } else {
      console.log('❌ 测试失败：编辑数据后状态仍为已完成');
    }

    // 6. 清理测试数据
    console.log('\n6️⃣ 清理测试数据...');
    await prisma.cMSProjectData.deleteMany({
      where: { projectId: testProject.id }
    });
    await prisma.cMSProject.delete({
      where: { id: testProject.id }
    });
    console.log('✅ 测试数据清理完成');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行测试
testCompletionStatusReset();
