// Gemini AI集成测试脚本
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function testGemini() {
  try {
    console.log('🧪 开始测试Gemini AI集成...');
    
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('未找到GOOGLE_API_KEY环境变量');
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `作为一个专业的内容创作助手，请根据以下信息生成高质量的内容：

输入信息：
- 标题：智能AI助手
- 描述：一个功能强大的AI助手，可以帮助用户进行各种创作和分析工作

要求：
1. 优化标题，使其更吸引人
2. 扩展描述，增加有价值的信息
3. 提取关键标签
4. 生成图片alt描述

请直接返回JSON格式，不要包含任何解释文字：
{
  "title": "优化后的标题",
  "description": "详细描述",
  "tags": ["标签1", "标签2"],
  "imageAlt": "图片描述"
}`;
    
    console.log('📤 发送请求到Gemini...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('📥 收到响应:');
    console.log(text);
    
    // 尝试解析JSON
    try {
      const jsonResponse = JSON.parse(text);
      console.log('✅ JSON解析成功:');
      console.log(JSON.stringify(jsonResponse, null, 2));
    } catch (parseError) {
      console.log('⚠️  JSON解析失败，但响应正常');
      console.log('原始响应:', text);
    }
    
    console.log('🎉 Gemini集成测试完成！');
    
  } catch (error) {
    console.error('❌ Gemini测试失败:', error.message);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('💡 请检查API密钥是否正确');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.log('💡 请检查API密钥权限设置');
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      console.log('💡 API配额已用完，请检查使用限制');
    }
  }
}

// 运行测试
testGemini();