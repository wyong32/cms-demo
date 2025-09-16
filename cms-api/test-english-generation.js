// Gemini AI英文内容生成测试脚本
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function testEnglishGeneration() {
  try {
    console.log('🧪 Testing Gemini AI English content generation...');
    
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY environment variable not found');
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `As a professional content creation assistant, please generate high-quality English content based on the following information:

Input Information:
- Title: Smart AI Assistant
- Description: A powerful AI assistant that can help users with various creative and analytical tasks

Requirements:
1. Optimize the title to make it more engaging
2. Expand the description with valuable information
3. Extract relevant keywords as tags
4. Generate appropriate image alt text
5. All content must be in English for international audience

Please return JSON format directly without any explanation text:
{
  "title": "Optimized English title",
  "description": "Detailed English description",
  "tags": ["english-tag1", "english-tag2"],
  "imageAlt": "English image description"
}`;
    
    console.log('📤 Sending request to Gemini...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('📥 Received response:');
    console.log(text);
    
    // 尝试解析JSON
    try {
      const jsonResponse = JSON.parse(text);
      console.log('✅ JSON parsed successfully:');
      console.log(JSON.stringify(jsonResponse, null, 2));
      
      // 验证是否为英文内容
      if (jsonResponse.title && /^[a-zA-Z\s0-9\-:!.,]+$/.test(jsonResponse.title)) {
        console.log('✅ Title is in English');
      } else {
        console.log('⚠️  Title might not be in English');
      }
      
    } catch (parseError) {
      console.log('⚠️  JSON parsing failed, but response received');
      console.log('Raw response:', text);
    }
    
    console.log('🎉 Gemini English generation test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// 运行测试
testEnglishGeneration();