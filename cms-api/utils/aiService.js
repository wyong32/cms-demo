// AI服务集成模块
// 支持多种AI服务提供商

// 确保环境变量被加载
import dotenv from 'dotenv';
dotenv.config();

// 如果要使用真实AI服务，请取消注释并安装对应依赖：
// npm install openai @anthropic-ai/sdk @google/generative-ai axios

// import OpenAI from 'openai';
// import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

class AIService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'mock'; // 'openai', 'claude', 'gemini', 'mock'
    this.initializeProvider();
  }

  initializeProvider() {
    switch (this.provider) {
      case 'openai':
        // this.client = new OpenAI({
        //   apiKey: process.env.OPENAI_API_KEY
        // });
        console.log('🤖 AI服务: OpenAI提供商已选择（当前使用模拟数据）');
        break;
      case 'claude':
        // this.client = new Anthropic({
        //   apiKey: process.env.ANTHROPIC_API_KEY
        // });
        console.log('🤖 AI服务: Claude提供商已选择（当前使用模拟数据）');
        break;
      case 'gemini':
        try {
          this.client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
          console.log('🤖 AI服务: Gemini提供商初始化成功，API密钥已配置');
        } catch (error) {
          console.log('🎭 AI服务: Gemini初始化失败，回退到模拟模式');
          console.log('💡 失败原因:', error.message);
        }
        break;
      default:
        console.log('🎭 AI服务: 使用模拟环境 - 所有内容将被模拟生成');
        console.log('💡 启用真实AI: 请在.env文件中设置AI_PROVIDER并安装对应SDK');
    }
  }

  // 主要的AI生成方法
  async generateContent({ title, description, imageUrl, iframeUrl, options = [], categoryInfo = null }) {
    console.log(`🚀 AI Generation Started - Provider: ${this.provider.toUpperCase()}`);
    
    switch (this.provider) {
      case 'openai':
        console.log('🎭 ROUTING to OpenAI (will use mock data)');
        return this.generateWithOpenAI({ title, description, imageUrl, iframeUrl, options, categoryInfo });
      case 'claude':
        console.log('🎭 ROUTING to Claude (will use mock data)');
        return this.generateWithClaude({ title, description, imageUrl, iframeUrl, options, categoryInfo });
      case 'gemini':
        console.log('🤖 ROUTING to Gemini API');
        return this.generateWithGemini({ title, description, imageUrl, iframeUrl, options, categoryInfo });
      default:
        console.log('🎭 ROUTING to MOCK mode - simulated content');
        return this.generateMockContent({ title, description, imageUrl, iframeUrl, options, categoryInfo });
    }
  }

  // OpenAI GPT实现
  async generateWithOpenAI({ title, description, imageUrl, iframeUrl, options }) {
    try {
      // 构建提示词
      const systemPrompt = this.buildSystemPrompt(options);
      const userPrompt = this.buildUserPrompt({ title, description, imageUrl, iframeUrl });

      // 调用OpenAI API
      // const completion = await this.client.chat.completions.create({
      //   model: 'gpt-4o-mini', // 或 gpt-4
      //   messages: [
      //     { role: 'system', content: systemPrompt },
      //     { role: 'user', content: userPrompt }
      //   ],
      //   temperature: 0.7,
      //   max_tokens: 2000
      // });

      // const result = JSON.parse(completion.choices[0].message.content);
      // return this.formatAIResponse(result);

      // 暂时返回模拟数据
      console.log('OpenAI提示词:', { systemPrompt, userPrompt });
      return this.generateMockContent({ title, description, imageUrl, iframeUrl, options });
    } catch (error) {
      console.error('OpenAI API调用失败:', error);
      throw new Error('AI内容生成失败');
    }
  }

  // Claude实现
  async generateWithClaude({ title, description, imageUrl, iframeUrl, options }) {
    try {
      const prompt = this.buildClaudePrompt({ title, description, imageUrl, iframeUrl, options });

      // const message = await this.client.messages.create({
      //   model: 'claude-3-haiku-20240307',
      //   max_tokens: 2000,
      //   messages: [{ role: 'user', content: prompt }]
      // });

      // const result = JSON.parse(message.content[0].text);
      // return this.formatAIResponse(result);

      console.log('Claude提示词:', prompt);
      return this.generateMockContent({ title, description, imageUrl, iframeUrl, options });
    } catch (error) {
      console.error('Claude API调用失败:', error);
      throw new Error('AI内容生成失败');
    }
  }

  // Gemini实现
  async generateWithGemini({ title, description, imageUrl, iframeUrl, options, categoryInfo }) {
    try {
      console.log('🔍 Gemini服务诊断:');
      console.log('   - Provider:', this.provider);
      console.log('   - Client exists:', !!this.client);
      console.log('   - API Key exists:', !!process.env.GOOGLE_API_KEY);
      console.log('   - API Key prefix:', process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.substring(0, 10) + '...' : 'N/A');
      
      if (!this.client) {
        console.log('❌ 关键问题: Gemini客户端未初始化，使用模拟数据');
        console.log('💡 解决方案: 检查环境变量AI_PROVIDER和GOOGLE_API_KEY是否正确设置');
        return this.generateMockContent({ title, description, imageUrl, iframeUrl, options, categoryInfo });
      }

      // 使用最新的模型
      const model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const prompt = this.buildGeminiPrompt({ title, description, imageUrl, iframeUrl, options, categoryInfo });

      console.log('🤖 真实AI: 正在调用Gemini API...');
      console.log('📝 生成选项:', options);
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('✅ 成功: 收到Gemini API响应');
      
      // 尝试解析JSON响应
      try {
        let jsonText = text;
        
        // 如果响应被包在代码块中，提取JSON部分
        if (text.includes('```json')) {
          const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonText = jsonMatch[1];
          }
        } else if (text.includes('```')) {
          const codeMatch = text.match(/```\s*([\s\S]*?)\s*```/);
          if (codeMatch) {
            jsonText = codeMatch[1];
          }
        }
        
        const content = JSON.parse(jsonText);
        console.log('✅ 成功: Gemini响应解析为JSON格式');
        console.log('📊 生成的字段:', {
          title: !!content.title,
          description: !!content.description,
          detailsHtml: !!content.detailsHtml,
          detailsHtmlLength: content.detailsHtml?.length || 0
        });
        return this.formatAIResponse(content);
      } catch (parseError) {
        // 如果解析失败，返回基本内容
        console.warn('⚠️  警告: Gemini响应不是有效JSON格式，使用备用处理方式');
        console.log('原始响应前200字符:', text.substring(0, 200) + '...');
        return this.createFallbackResponse({ title, description, imageUrl, options, aiText: text });
      }
    } catch (error) {
      console.error('❌ 错误: Gemini API调用失败:', error.message);
      console.error('❌ 错误详情:', error);
      console.log('🔍 错误类型分析:');
      
      if (error.message.includes('API_KEY_INVALID')) {
        console.log('   - 问题: API密钥无效');
        console.log('   - 解决方案: 检查GOOGLE_API_KEY是否正确');
      } else if (error.message.includes('PERMISSION_DENIED')) {
        console.log('   - 问题: API权限被拒绝');
        console.log('   - 解决方案: 检查API密钥权限设置');
      } else if (error.message.includes('QUOTA_EXCEEDED')) {
        console.log('   - 问题: API配额已用完');
        console.log('   - 解决方案: 检查API使用限制或升级账户');
      } else if (error.message.includes('models/gemini-1.5-flash')) {
        console.log('   - 问题: 模型不可用');
        console.log('   - 解决方案: 尝试使用其他模型如gemini-pro');
      } else {
        console.log('   - 问题: 未知错误');
        console.log('   - 建议: 检查网络连接和API服务状态');
      }
      
      console.log('🎭 备用方案: 切换到模拟模式处理此次请求');
      // 如果API调用失败，返回模拟数据
      return this.generateMockContent({ title, description, imageUrl, iframeUrl, options });
    }
  }

  // 构建系统提示词
  buildSystemPrompt(options) {
    let prompt = `You are a professional content creation AI assistant. Please generate high-quality English content based on the user's input.

Requirements:
1. Return standard JSON format
2. Content should be original, valuable, and SEO-friendly
3. Language should be natural and fluent English
4. Target international audience

Return format:
{
  "title": "Optimized English title",
  "description": "Detailed English description",
  "tags": ["english-tag1", "english-tag2"],
  "imageAlt": "English image description",`;

    if (options.autoSEO) {
      prompt += `
  "seoTitle": "SEO English title",
  "seoDescription": "SEO English description",
  "seoKeywords": "english keywords",`;
    }

    if (options.autoContent) {
      prompt += `
  "detailsHtml": "Detailed English HTML content",`;
    }

    if (options.autoStructure) {
      prompt += `
  "addressBar": "url-friendly-english-address",`;
    }

    prompt += `
}`;

    return prompt;
  }

  // 构建用户提示词
  buildUserPrompt({ title, description, imageUrl, iframeUrl }) {
    let prompt = `请为以下内容生成完整的数据：

标题：${title}
描述：${description}`;

    if (imageUrl) {
      prompt += `\n图片：${imageUrl}`;
    }

    if (iframeUrl) {
      prompt += `\n相关链接：${iframeUrl}`;
    }

    return prompt;
  }

  // 构建Claude提示词
  buildClaudePrompt({ title, description, imageUrl, iframeUrl, options }) {
    return `${this.buildSystemPrompt(options)}\n\n${this.buildUserPrompt({ title, description, imageUrl, iframeUrl })}`;
  }

  // 构建Gemini提示词
  buildGeminiPrompt({ title, description, imageUrl, iframeUrl, options, categoryInfo }) {
    // 提取标题中的主要关键词
    const titleKeywords = title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 3); // 取前3个主要关键词
    
    // 生成随机变化因子，增加内容多样性
    const variationFactors = [
      '从用户体验角度',
      '从技术实现角度', 
      '从市场趋势角度',
      '从创新设计角度',
      '从性能优化角度',
      '从用户需求角度',
      '从行业标准角度',
      '从未来发展方向角度'
    ];
    const randomFactor = variationFactors[Math.floor(Math.random() * variationFactors.length)];
    
    // 生成随机内容风格
    const contentStyles = [
      '专业严谨的',
      '生动有趣的',
      '简洁明了的',
      '详细深入的',
      '创新独特的',
      '实用导向的',
      '用户友好的',
      '技术先进的'
    ];
    const randomStyle = contentStyles[Math.floor(Math.random() * contentStyles.length)];
    
    let prompt = `作为专业内容创作助手，请基于以下信息生成${randomStyle}英文内容：

输入信息：
- 标题：${title}
- 用户描述：${description}（仅作参考，不要直接复制，需要基于此进行创意扩展和重新组织）
- 目标关键词：${titleKeywords.join(', ')}
- 创作角度：${randomFactor}`;

    // 如果有分类信息，添加到提示词中
    if (categoryInfo) {
      prompt += `
- 内容分类：${categoryInfo.name}
- 分类类型：${categoryInfo.type}`;
      if (categoryInfo.description) {
        prompt += `
- 分类描述：${categoryInfo.description}`;
      }
    }

    prompt += `

内容创作指导：
- 根据分类信息（如果提供）来判断内容风格和写作方式，让AI自由发挥创意
- 基于用户描述进行创意扩展和重新组织，绝对不要直接复制原文
- 生成的简要描述和详细HTML内容要完全不同，各自服务不同用途
- 让AI根据分类和描述信息自由创作，不要使用固定模板
- 在HTML内容中，目标关键词的密度应达到约5%
- 关键词应自然分布在标题、段落、列表等各个部分
- 避免关键词堆砌，保持内容自然流畅
- 每次生成都要有独特的角度和表达方式，充分发挥创造力`;

    if (imageUrl) {
      prompt += `
- 图片：${imageUrl}`;
    }

    if (iframeUrl) {
      prompt += `
- 相关链接：${iframeUrl}`;
    }

    prompt += `

要求：
1. 保持用户提供的标题不变，不要修改标题内容
2. 创建简要描述（最多300字符）用于表单显示，要基于用户描述进行重新组织和扩展，不要直接复制
3. 根据内容类型提取相关关键词作为标签（如：新闻类用时事词汇，技术类用专业术语，娱乐类用流行词汇）
4. 生成合适的图片alt文本，包含目标关键词，描述要生动具体且符合内容类型
5. 所有内容必须使用英文，面向国际用户
6. 确保每次生成的内容都有不同的表达方式和结构布局
7. 避免使用模板化的开头和结尾，要根据内容类型创造独特的体验`;

    if (options.autoSEO) {
      prompt += `
8. 生成SEO优化内容（标题、描述、关键词），确保目标关键词出现，避免使用重复的SEO模板`;
    }

    if (options.autoContent) {
      prompt += `
9. 创建详细HTML内容，使用以下结构框架，AI填充具体内容：
   HTML结构：
   <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
     <h2>${title}</h2>
     <p>[AI_CONTENT_INTRO] - 写一段引言介绍（至少100字符）</p>
     
     <h3>About</h3>
     <p>[AI_CONTENT_ABOUT] - 详细介绍内容（至少200字符）</p>
     
     <h3>Features</h3>
     <ul>
       [AI_FEATURES_LIST] - AI自由生成特点列表，至少5-8个<li>标签，每个li内容要详细（总计至少300字符）
     </ul>
     
     <h3>FAQ</h3>
     <ul>
       [AI_FAQ_LIST] - AI自由生成常见问题列表，至少4-6个<li>标签，每个li包含问题和答案两个div，格式：<li><div class="faq-question">问题</div><div class="faq-answer">答案</div></li>（总计至少300字符）
     </ul>
     
     <p>[AI_CONTENT_CONCLUSION] - 总结段落（至少100字符）</p>
   </div>
   
   **重要要求：**
   - HTML内容总字符数必须不少于1000字符
   - 替换所有[AI_xxx]占位符为具体内容
   - 不要直接复制用户描述，要创意扩展
   - 根据分类信息调整内容风格
   - 目标关键词密度约5%
   - 内容要原创且有价值
   - 每个部分都要有足够的内容深度和详细度`;
    }

    if (options.autoStructure) {
      prompt += `
10. 生成URL友好的地址栏，直接基于标题生成，格式如"escape-road"，不要添加-game等后缀，不要以/开头`;
    }

    prompt += `

重要说明：
- "description"字段应为简要描述（最多300字符）用于表单显示，要基于用户描述重新组织，体现独特卖点
- "detailsHtml"字段应包含详细HTML内容，与描述字段内容完全不同，进行创意扩展
- 不要直接复制用户提供的描述内容，要进行重新创作和深度扩展
- 根据内容类型（新闻、博客、视频、产品等）调整写作风格和结构
- HTML内容请使用简洁的样式，避免复杂的内联样式和背景色
- 优先使用语义化HTML标签和简单的文本样式
- 避免使用gradient、复杂背景色等样式
- 关键词密度计算：目标关键词出现次数 ÷ 总词数 × 100% ≈ 5%

**必须返回的JSON字段（所有字段都必须包含）：**
{
  "title": "标题（保持用户提供的标题不变）",
  "description": "简要描述（最多300字符）",
  "tags": ["标签1", "标签2", "标签3"],
  "imageAlt": "图片alt文本",
  "seoTitle": "SEO优化标题",
  "seoDescription": "SEO描述（150-160字符）",
  "seoKeywords": "SEO关键词（逗号分隔）",
  "addressBar": "URL友好的地址栏",
  "detailsHtml": "详细的HTML内容（不少于1000字符）"
}

**重要：必须返回完整的JSON对象，包含所有上述字段！**
- 每次生成都要创造独特的内容体验，避免重复使用相同的表达方式
- 标题要根据内容类型选择合适的词汇，避免千篇一律
- 内容要包含具体的数据、案例、引用或特色功能，增加可信度和独特性
- 地址栏URL可以重复，但必须包含目标关键词，确保SEO友好

请直接返回JSON格式，不要任何解释文字：
{
  "title": "${title}",
  "description": "简要英文描述（最多300字符）",
  "tags": ["english-tag1", "english-tag2"],
  "imageAlt": "英文图片描述（包含目标关键词）"`;

    if (options.autoSEO) {
      prompt += `,
  "seoTitle": "基于原标题'${title}'优化的SEO标题",
  "seoDescription": "SEO英文描述（包含目标关键词）",
  "seoKeywords": "英文关键词（包含目标关键词）"`;
    }

    if (options.autoContent) {
      prompt += `,
  "detailsHtml": "<div style=\\"font-family: Arial, sans-serif; line-height: 1.6; color: #333;\\"><h2>${title}</h2><p>详细的AI生成引言内容，至少100字符，要吸引人且有价值，包含关键词</p><h3>About</h3><p>深入详细的AI生成介绍，至少200字符，要专业且全面，详细阐述主题内容</p><h3>Features</h3><ul><li>详细的AI生成特点1，要具体描述功能和优势</li><li>详细的AI生成特点2，要具体描述功能和优势</li><li>详细的AI生成特点3，要具体描述功能和优势</li><li>更多详细的AI生成特点，至少5-8个</li></ul><h3>FAQ</h3><ul><li><div class=\\"faq-question\\">AI生成的问题1</div><div class=\\"faq-answer\\">AI生成的详细答案1</div></li><li><div class=\\"faq-question\\">AI生成的问题2</div><div class=\\"faq-answer\\">AI生成的详细答案2</div></li><li><div class=\\"faq-question\\">AI生成的问题3</div><div class=\\"faq-answer\\">AI生成的详细答案3</div></li><li>更多问答格式的FAQ，至少4-6个</li></ul><p>详细的AI生成总结内容，至少100字符，要有价值且完整，总结所有要点</p></div>（总字符数必须≥1000，标题必须使用'${title}'不变）"`;
    }

    if (options.autoStructure) {
      prompt += `,
  "addressBar": "基于标题'${title}'生成的简洁URL，如escape-road"`;
    }

    prompt += `
}`;

    return prompt;
  }

  // 格式化AI响应
  formatAIResponse(response) {
    // 为必填字段提供默认值，避免验证失败
    const title = response.title || '';
    const description = response.description || '';
    
    return {
      title: title,
      description: description,
      tags: response.tags || [],
      imageAlt: response.imageAlt || null,
      seoTitle: response.seoTitle || this.generateSeoTitle(title),
      seoDescription: response.seoDescription || this.generateSeoDescription(description),
      seoKeywords: response.seoKeywords || this.generateSeoKeywords(title, response.tags),
      addressBar: response.addressBar || this.generateAddressBar(title) || 'default-address',
      detailsHtml: response.detailsHtml || this.generateDetailContent(title, description, description)
    };
  }

  // 创建备用响应（当AI返回的不是JSON格式时）
  createFallbackResponse({ title, description, imageUrl, options, aiText }) {
    const cleanText = aiText.replace(/[\*\#\`]/g, '').trim();
    const optimizedTitle = this.optimizeTitle(title);
    // 生成简要描述（400字符以内）
    const shortDescription = this.optimizeDescription(title, description);
    
    const baseData = {
      title: optimizedTitle,
      description: shortDescription, // 简要描述，用于表单上方
      tags: this.extractEnglishKeywords(description + ' ' + cleanText),
      imageAlt: imageUrl ? `Professional screenshot of ${optimizedTitle}` : `Professional image showcasing ${optimizedTitle}`
    };

    // 确保SEO字段总是生成
    if (options.autoSEO) {
      baseData.seoTitle = `${optimizedTitle} - Play Free Online | Gaming Experience`;
      baseData.seoDescription = shortDescription.length > 150 ? 
        shortDescription.substring(0, 147) + '...' : 
        shortDescription;
      baseData.seoKeywords = baseData.tags.join(', ');
    }

    // 确保HTML内容总是生成（详细内容，用于HTML内容区域）
    if (options.autoContent) {
      console.log('📄 开始生成HTML详细内容（备用模式）...');
      baseData.detailsHtml = this.generateDetailContent(optimizedTitle, description, shortDescription, null);
      console.log('✅ HTML内容生成成功，长度:', baseData.detailsHtml?.length || 0);
    } else {
      console.log('⚠️  警告: autoContent选项未选中，跳过HTML内容生成（备用模式）');
    }

    // 确保地址栏总是生成
    if (options.autoStructure) {
      baseData.addressBar = this.generateAddressBar(optimizedTitle);
    }

    return baseData;
  }


  // 模拟AI生成（用于测试和演示）
  generateMockContent({ title, description, imageUrl, iframeUrl, options, categoryInfo }) {
    console.log('🎭 模拟模式: 正在生成AI模拟内容');
    console.log('📝 输入参数:', { title, description: description.substring(0, 50) + '...', options, categoryInfo });
    
    // 处理options格式：支持数组和对象两种格式
    const optionsObj = {};
    if (Array.isArray(options)) {
      options.forEach(option => {
        optionsObj[option] = true;
      });
    } else if (typeof options === 'object' && options !== null) {
      Object.assign(optionsObj, options);
    }
    
    // 优化标题，让AI自由发挥
    const optimizedTitle = this.optimizeTitle(title);
    // 生成简要描述，基于用户描述重新创作
    const shortDescription = this.optimizeDescription(title, description, categoryInfo);
    
    const baseData = {
      title: optimizedTitle,
      description: shortDescription, // 简要描述，用于表单上方
      tags: this.extractEnglishKeywords(description + ' ' + title),
      imageAlt: imageUrl ? `Professional image of ${optimizedTitle}` : `Professional image showcasing ${optimizedTitle}`
    };

    // 确保SEO字段总是生成
    if (optionsObj.autoSEO) {
      baseData.seoTitle = this.generateSeoTitle(optimizedTitle, categoryInfo);
      baseData.seoDescription = shortDescription.length > 150 ? 
        shortDescription.substring(0, 147) + '...' : 
        shortDescription;
      baseData.seoKeywords = baseData.tags.join(', ');
    }

    // 确保HTML内容总是生成（详细内容，用于HTML内容区域）
    if (optionsObj.autoContent) {
      console.log('📄 开始生成HTML详细内容...');
      baseData.detailsHtml = this.generateDetailContent(optimizedTitle, description, shortDescription, categoryInfo);
      console.log('✅ HTML内容生成成功，长度:', baseData.detailsHtml?.length || 0);
    } else {
      console.log('⚠️  警告: autoContent选项未选中，跳过HTML内容生成');
    }

    // 确保地址栏总是生成
    if (optionsObj.autoStructure) {
      baseData.addressBar = this.generateAddressBar(optimizedTitle);
    }

    console.log('✅ 模拟结果: 生成字段:', {
      title: baseData.title,
      descriptionLength: baseData.description?.length || 0,
      hasSEO: !!baseData.seoTitle,
      hasHTML: !!baseData.detailsHtml,
      htmlLength: baseData.detailsHtml?.length || 0,
      hasAddressBar: !!baseData.addressBar,
      tagCount: baseData.tags.length
    });
    
    // 最终验证：确保HTML内容存在
    if (optionsObj.autoContent && !baseData.detailsHtml) {
      console.error('❌ 严重错误: autoContent选项已选中但HTML内容为空！');
      // 强制生成基础HTML内容
      baseData.detailsHtml = `<div style="font-family: Arial, sans-serif; padding: 20px;"><h2>${baseData.title}</h2><p>${baseData.description}</p><p>基础内容已生成。</p></div>`;
      console.log('🔧 紧急修复: 已生成基础HTML内容，长度:', baseData.detailsHtml.length);
    }

    return baseData;
  }

  // 提取关键词
  extractKeywords(text) {
    const commonWords = ['的', '了', '是', '在', '和', '有', '这', '我', '你', '他', '她', '它', '们', '个', '一', '也', '都', '会', '能', '可以', '可能', '不', '没', '没有', '很', '更', '最', '都', '要', '想', '到', '从', '为', '与', '及', '或', '但', '然后', '因为', '所以'];
    const words = text.split(/[\s，。！？；：、\n\r]+/)
      .filter(word => word.length > 1 && !commonWords.includes(word))
      .slice(0, 5);
    return words;
  }

  // 提取英文关键词
  extractEnglishKeywords(text) {
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'];
    const words = text.toLowerCase().split(/[\s,.\!?;:\n\r]+/)
      .filter(word => word.length > 2 && !commonWords.includes(word))
      .slice(0, 5);
    return words;
  }

  // 生成详细内容

  // 优化标题
  optimizeTitle(title) {
    // 移除常见的前缀和后缀，让标题更简洁
    let optimized = title.replace(/^(AI Enhanced:|About)\s*/i, '');
    
    // 随机选择不同的形容词，增加变化性
    const adjectives = [
      'Advanced', 'Professional', 'Innovative', 'Dynamic', 'Interactive',
      'Enhanced', 'Premium', 'Elite', 'Pro', 'Smart', 'Intelligent',
      'Creative', 'Modern', 'Next-Gen', 'Revolutionary', 'Cutting-Edge'
    ];
    
    // 如果是游戏或应用，添加吸引人的形容词
    if (title.toLowerCase().includes('game') || title.toLowerCase().includes('io') || 
        title.toLowerCase().includes('rush') || title.toLowerCase().includes('ball') ||
        title.toLowerCase().includes('app') || title.toLowerCase().includes('tool')) {
      
      // 避免使用过度常见的词汇
      const commonWords = ['ultimate', 'best', 'amazing', 'incredible', 'fantastic'];
      const hasCommonWord = commonWords.some(word => optimized.toLowerCase().includes(word));
      
      if (!hasCommonWord) {
        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        optimized = `${randomAdjective} ${optimized}`;
      }
    }
    
    return optimized.trim();
  }

  // 优化描述（简要描述，300字符以内）
  optimizeDescription(title, description, categoryInfo = null) {
    // 移除重复的标题信息
    let optimized = description.replace(new RegExp(`About ${title}\\s*`, 'gi'), '');
    
    // 让AI完全自由生成描述，不添加任何固定结尾
    // 确保简要描述不超过400个字符
    if (optimized.length > 400) {
      optimized = optimized.substring(0, 397) + '...';
    }
    
    return optimized.trim();
  }


  // 提取标题关键词的辅助方法
  extractTitleKeywords(title) {
    return title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 3);
  }

  // 生成地址栏内容
  generateAddressBar(title) {
    if (!title) return 'default-address';
    
    // 将中文转换为拼音或使用英文替代
    let processedTitle = title;
    
    // 简单的中文标题处理：使用拼音或英文替代
    const chineseToEnglish = {
      '超级马里奥兄弟': 'super-mario-bros',
      '马里奥': 'mario',
      '游戏': 'game',
      '超级': 'super',
      '兄弟': 'bros',
      '冒险': 'adventure',
      '动作': 'action',
      '角色扮演': 'rpg',
      '策略': 'strategy',
      '射击': 'shooter',
      '体育': 'sports',
      '竞速': 'racing',
      '模拟': 'simulation',
      '益智': 'puzzle',
      '音乐': 'music',
      '舞蹈': 'dance'
    };
    
    // 替换常见中文词汇
    Object.keys(chineseToEnglish).forEach(chinese => {
      processedTitle = processedTitle.replace(new RegExp(chinese, 'g'), chineseToEnglish[chinese]);
    });
    
    return processedTitle.toLowerCase()
      .replace(/[^\w\s-]/g, '') // 移除特殊字符
      .replace(/\s+/g, '-') // 空格替换为连字符
      .replace(/[^\x00-\x7F]/g, '') // 移除非ASCII字符
      .replace(/-+/g, '-') // 多个连字符合并为一个
      .replace(/^-|-$/g, '') // 移除开头和结尾的连字符
      .substring(0, 50) || 'default-address'; // 限制长度，如果为空则返回默认值
  }


  // 生成SEO标题
  generateSeoTitle(title, categoryInfo) {
    // 根据分类信息动态生成SEO后缀
    let suffix = '- Complete Guide & Resources';
    
    if (categoryInfo && categoryInfo.name) {
      const categoryLower = categoryInfo.name.toLowerCase();
      if (categoryLower.includes('game') || categoryLower.includes('gaming')) {
        suffix = '- Play Free Online';
      } else if (categoryLower.includes('video') || categoryLower.includes('movie')) {
        suffix = '- Watch Online Content';
      } else if (categoryLower.includes('news') || categoryLower.includes('report')) {
        suffix = '- Latest News & Updates';
      } else if (categoryLower.includes('blog') || categoryLower.includes('article')) {
        suffix = '- Expert Insights & Analysis';
      } else if (categoryLower.includes('product') || categoryLower.includes('service')) {
        suffix = '- Professional Solution';
      } else if (categoryLower.includes('tech') || categoryLower.includes('technology')) {
        suffix = '- Technology & Innovation';
      } else {
        // 使用分类名称作为后缀
        suffix = `- ${categoryInfo.name} Resources`;
      }
    }
    
    return `${title} ${suffix}`;
  }

  // 生成SEO描述
  generateSeoDescription(description) {
    // 基于原始描述生成SEO友好的描述
    const baseDesc = description || 'Discover amazing content and resources';
    
    // 确保描述长度在150-160字符之间，适合SEO
    if (baseDesc.length <= 160) {
      return baseDesc;
    }
    
    // 截断并添加省略号
    return baseDesc.substring(0, 157) + '...';
  }

  // 生成SEO关键词
  generateSeoKeywords(title, tags = []) {
    // 从标题中提取关键词
    const titleKeywords = this.extractTitleKeywords(title);
    
    // 合并标题关键词和标签
    const allKeywords = [...titleKeywords, ...tags];
    
    // 去重并限制数量
    const uniqueKeywords = [...new Set(allKeywords.map(k => k.toLowerCase()))];
    
    // 返回前5个关键词，用逗号分隔
    return uniqueKeywords.slice(0, 5).join(', ');
  }

  // 生成基础HTML结构框架，Mock模式简单填充
  generateDetailContent(title, originalDescription, shortDescription, categoryInfo) {
    const titleKeywords = this.extractTitleKeywords(title);
    const primaryKeyword = titleKeywords[0] || 'content';
    const secondaryKeyword = titleKeywords[1] || 'experience';
    const categoryName = categoryInfo?.name || 'General';

    // Mock模式：提供最简单的基础结构，主要用于测试
    return `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2>${title}</h2>
      <p>Mock content for ${primaryKeyword} in ${categoryName} category.</p>
      
      <h3>About</h3>
      <p>Mock about section for ${primaryKeyword}.</p>
      
      <h3>Features</h3>
      <ul>
        <li>Mock feature 1</li>
        <li>Mock feature 2</li>
      </ul>
      
      <h3>FAQ</h3>
      <ul>
        <li>Mock FAQ 1</li>
        <li>Mock FAQ 2</li>
      </ul>
      
      <p>Mock conclusion.</p>
    </div>`;
  }

}

// 导出单例实例
export default new AIService();