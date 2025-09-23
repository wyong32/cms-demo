/**
 * 测试addressBar生成逻辑
 * 验证：生成的addressBar应该简洁，直接基于标题，不添加后缀
 */

import aiService from './utils/aiService.js';

async function testAddressBarGeneration() {
  console.log('🧪 开始测试addressBar生成逻辑...\n');

  const testCases = [
    { title: 'Escape Road', expected: 'escape-road' },
    { title: 'Super Mario Bros', expected: 'super-mario-bros' },
    { title: 'Call of Duty: Modern Warfare', expected: 'call-of-duty-modern-warfare' },
    { title: 'The Legend of Zelda', expected: 'the-legend-of-zelda' },
    { title: 'FIFA 2024', expected: 'fifa-2024' },
    { title: 'Among Us', expected: 'among-us' },
    { title: 'Minecraft', expected: 'minecraft' },
    { title: 'Fortnite Battle Royale', expected: 'fortnite-battle-royale' }
  ];

  console.log('📝 测试用例：');
  testCases.forEach((testCase, index) => {
    console.log(`${index + 1}. "${testCase.title}" → 期望: "${testCase.expected}"`);
  });

  console.log('\n🔧 测试generateAddressBar方法：');
  
  let passedTests = 0;
  let totalTests = testCases.length;

  testCases.forEach((testCase, index) => {
    const result = aiService.generateAddressBar(testCase.title);
    const passed = result === testCase.expected;
    
    console.log(`${index + 1}. "${testCase.title}"`);
    console.log(`   结果: "${result}"`);
    console.log(`   期望: "${testCase.expected}"`);
    console.log(`   状态: ${passed ? '✅ 通过' : '❌ 失败'}`);
    console.log('');
    
    if (passed) passedTests++;
  });

  console.log(`📊 测试结果: ${passedTests}/${totalTests} 通过`);

  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！addressBar生成逻辑正确。');
  } else {
    console.log('⚠️  部分测试失败，需要检查generateAddressBar方法。');
  }

  console.log('\n🤖 测试AI生成addressBar（Mock模式）：');
  
  try {
    const aiResult = await aiService.generateContent({
      title: 'Escape Road',
      description: 'A thrilling escape game',
      options: ['autoStructure']
    });
    
    console.log('AI生成的addressBar:', aiResult.addressBar);
    console.log('期望格式: escape-road');
    
    if (aiResult.addressBar && aiResult.addressBar.includes('escape-road')) {
      console.log('✅ AI生成的addressBar符合预期格式');
    } else {
      console.log('⚠️  AI生成的addressBar可能需要进一步优化');
    }
    
  } catch (error) {
    console.error('❌ AI生成测试失败:', error.message);
  }
}

// 运行测试
testAddressBarGeneration();

