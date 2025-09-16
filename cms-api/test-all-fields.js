// 测试所有字段生成
import aiService from './utils/aiService.js';

async function testAllFields() {
  console.log('🧪 Testing all field generation...');
  
  const testData = {
    title: 'Curve Rush IO',
    description: 'About Curve Rush IO\n\nThe addictive Curve Rush IO experience is back with a twist: now you can guide your ball through endless hills in thrilling multiplayer mode, instead of just playing solo as usual. Ready to join thrilling competitions against other players? Give it a try today and enjoy even more exciting runs.',
    imageUrl: 'https://example.com/image.jpg',
    iframeUrl: 'https://example.com/game',
    options: ['autoTags', 'autoSEO', 'autoContent', 'autoStructure']
  };
  
  try {
    const result = await aiService.generateContent(testData);
    
    console.log('📋 Generated Fields:');
    console.log('===================');
    console.log('Title:', result.title);
    console.log('Description:', result.description);
    console.log('Tags:', result.tags);
    console.log('Image Alt:', result.imageAlt);
    console.log('SEO Title:', result.seoTitle);
    console.log('SEO Description:', result.seoDescription);
    console.log('SEO Keywords:', result.seoKeywords);
    console.log('Address Bar:', result.addressBar);
    console.log('Has HTML Content:', !!result.detailsHtml);
    
    if (result.detailsHtml) {
      console.log('HTML Content Preview:', result.detailsHtml.substring(0, 200) + '...');
    }
    
    // 验证所有必需字段
    const requiredFields = ['title', 'description', 'tags', 'seoTitle', 'seoDescription', 'seoKeywords', 'addressBar', 'detailsHtml'];
    const missingFields = requiredFields.filter(field => !result[field]);
    
    if (missingFields.length === 0) {
      console.log('✅ All fields generated successfully!');
    } else {
      console.log('❌ Missing fields:', missingFields);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAllFields();