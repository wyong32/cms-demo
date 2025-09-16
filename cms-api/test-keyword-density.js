// 测试关键词密度优化
import aiService from './utils/aiService.js';

// 计算关键词密度的辅助函数
function calculateKeywordDensity(content, keyword) {
  const words = content.toLowerCase()
    .replace(/<[^>]*>/g, ' ') // 移除HTML标签
    .replace(/[^\w\s]/g, ' ') // 移除标点符号
    .split(/\s+/)
    .filter(word => word.length > 0);
  
  const keywordCount = words.filter(word => word === keyword.toLowerCase()).length;
  const totalWords = words.length;
  const density = (keywordCount / totalWords) * 100;
  
  return {
    keyword,
    keywordCount,
    totalWords,
    density: Math.round(density * 100) / 100
  };
}

// 测试不同类型的标题
const testCases = [
  {
    title: 'Curve Rush IO',
    description: 'About Curve Rush IO\n\nThe addictive Curve Rush IO experience is back with a twist: now you can guide your ball through endless hills in thrilling multiplayer mode.',
    expectedKeywords: ['curve', 'rush', 'io']
  },
  {
    title: 'Ball Battle Arena',
    description: 'Experience the ultimate ball battle arena game with fast-paced action and competitive gameplay.',
    expectedKeywords: ['ball', 'battle', 'arena']
  },
  {
    title: 'Space Adventure Quest',
    description: 'Embark on an epic space adventure quest through the galaxy in this exciting exploration game.',
    expectedKeywords: ['space', 'adventure', 'quest']
  }
];

async function testKeywordDensity() {
  console.log('🧪 开始测试关键词密度优化...');
  console.log('=====================================');
  
  for (const testCase of testCases) {
    console.log(`\n📝 测试案例: ${testCase.title}`);
    console.log('-------------------------------------');
    
    try {
      const result = await aiService.generateContent({
        title: testCase.title,
        description: testCase.description,
        options: ['autoContent', 'autoSEO', 'autoStructure']
      });
      
      console.log('✅ AI生成成功');
      console.log('📊 生成结果:');
      console.log(`  标题: ${result.title}`);
      console.log(`  描述长度: ${result.description?.length || 0} 字符`);
      console.log(`  HTML内容长度: ${result.detailsHtml?.length || 0} 字符`);
      
      if (result.detailsHtml) {
        console.log('\n🔍 关键词密度分析:');
        
        for (const keyword of testCase.expectedKeywords) {
          const density = calculateKeywordDensity(result.detailsHtml, keyword);
          console.log(`  "${keyword}": ${density.keywordCount}次 / ${density.totalWords}词 = ${density.density}%`);
          
          // 检查是否达到目标密度
          if (density.density >= 3 && density.density <= 7) {
            console.log(`  ✅ 密度合适 (3-7%)`);
          } else if (density.density < 3) {
            console.log(`  ⚠️  密度偏低 (<3%)`);
          } else {
            console.log(`  ⚠️  密度偏高 (>7%)`);
          }
        }
        
        // 显示HTML内容预览
        console.log('\n📄 HTML内容预览 (前300字符):');
        console.log(result.detailsHtml.substring(0, 300) + '...');
      }
      
    } catch (error) {
      console.error('❌ 测试失败:', error.message);
    }
  }
  
  console.log('\n🎉 关键词密度测试完成！');
}

// 运行测试
testKeywordDensity();
