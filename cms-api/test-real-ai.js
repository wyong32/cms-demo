// 测试真实AI是否工作
import aiService from './utils/aiService.js';

async function testRealAI() {
  console.log('🧪 Testing Real AI Integration...');
  console.log('=================================');
  
  const testData = {
    title: 'Curve Rush IO',
    description: 'About Curve Rush IO\n\nThe addictive Curve Rush IO experience is back with a twist: now you can guide your ball through endless hills in thrilling multiplayer mode, instead of just playing solo as usual. Ready to join thrilling competitions against other players? Give it a try today and enjoy even more exciting runs.',
    imageUrl: 'https://example.com/image.jpg',
    iframeUrl: 'https://example.com/game',
    options: ['autoTags', 'autoSEO', 'autoContent', 'autoStructure']
  };
  
  try {
    console.log('📤 Input data:');
    console.log('Title:', testData.title);
    console.log('Description preview:', testData.description.substring(0, 100) + '...');
    console.log('Options:', testData.options);
    console.log('');
    
    const startTime = Date.now();
    const result = await aiService.generateContent(testData);
    const duration = Date.now() - startTime;
    
    console.log('');
    console.log('📥 AI Generated Result:');
    console.log('======================');
    console.log('🏷️  Title:', result.title);
    console.log('📝 Description:', result.description.substring(0, 150) + '...');
    console.log('🏷️  Tags:', result.tags);
    console.log('🖼️  Image Alt:', result.imageAlt);
    console.log('🔍 SEO Title:', result.seoTitle);
    console.log('🔍 SEO Description:', result.seoDescription?.substring(0, 100) + '...');
    console.log('🔍 SEO Keywords:', result.seoKeywords);
    console.log('🔗 Address Bar:', result.addressBar);
    console.log('📄 Has HTML Content:', !!result.detailsHtml);
    
    if (result.detailsHtml) {
      console.log('📄 HTML Preview:', result.detailsHtml.substring(0, 200) + '...');
    }
    
    console.log('');
    console.log(`⏱️  Generation time: ${duration}ms`);
    
    // 验证是否是真实AI结果还是模拟结果
    if (result.title.includes('Ultimate') && result.description.includes('fast-paced action')) {
      console.log('🎭 This appears to be MOCK data (contains typical mock patterns)');
    } else {
      console.log('🤖 This appears to be REAL AI generated content!');
    }
    
    console.log('');
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRealAI();