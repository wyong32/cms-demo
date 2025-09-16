// AI服务集成模块
// 支持多种AI服务提供商

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
  async generateContent({ title, description, imageUrl, iframeUrl, options = [] }) {
    console.log(`🚀 AI Generation Started - Provider: ${this.provider.toUpperCase()}`);
    
    switch (this.provider) {
      case 'openai':
        console.log('🎭 ROUTING to OpenAI (will use mock data)');
        return this.generateWithOpenAI({ title, description, imageUrl, iframeUrl, options });
      case 'claude':
        console.log('🎭 ROUTING to Claude (will use mock data)');
        return this.generateWithClaude({ title, description, imageUrl, iframeUrl, options });
      case 'gemini':
        console.log('🤖 ROUTING to Gemini API');
        return this.generateWithGemini({ title, description, imageUrl, iframeUrl, options });
      default:
        console.log('🎭 ROUTING to MOCK mode - simulated content');
        return this.generateMockContent({ title, description, imageUrl, iframeUrl, options });
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
  async generateWithGemini({ title, description, imageUrl, iframeUrl, options }) {
    try {
      if (!this.client) {
        console.log('🎭 模拟模式: Gemini客户端未初始化，使用模拟数据');
        return this.generateMockContent({ title, description, imageUrl, iframeUrl, options });
      }

      const model = this.client.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = this.buildGeminiPrompt({ title, description, imageUrl, iframeUrl, options });

      console.log('🤖 真实AI: 正在调用Gemini API...');
      console.log('📝 生成选项:', options);
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('✅ 成功: 收到Gemini API响应');
      
      // 尝试解析JSON响应
      try {
        const content = JSON.parse(text);
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

    if (options.includes('autoSEO')) {
      prompt += `
  "seoTitle": "SEO English title",
  "seoDescription": "SEO English description",
  "seoKeywords": "english keywords",`;
    }

    if (options.includes('autoContent')) {
      prompt += `
  "detailsHtml": "Detailed English HTML content",`;
    }

    if (options.includes('autoStructure')) {
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
  buildGeminiPrompt({ title, description, imageUrl, iframeUrl, options }) {
    // 提取标题中的主要关键词
    const titleKeywords = title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 3); // 取前3个主要关键词
    
    let prompt = `作为专业内容创作助手，请基于以下信息生成高质量的英文内容：

输入信息：
- 标题：${title}
- 描述：${description}
- 目标关键词：${titleKeywords.join(', ')}

关键词密度要求：
- 在HTML内容中，目标关键词的密度应达到约5%
- 关键词应自然分布在标题、段落、列表等各个部分
- 避免关键词堆砌，保持内容自然流畅`;

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
1. 优化标题使其更具吸引力，包含目标关键词
2. 创建简要描述（最多400字符）用于表单显示
3. 提取相关关键词作为标签
4. 生成合适的图片alt文本，包含目标关键词
5. 所有内容必须使用英文，面向国际用户`;

    if (options.includes('autoSEO')) {
      prompt += `
6. 生成SEO优化内容（标题、描述、关键词），确保目标关键词出现`;
    }

    if (options.includes('autoContent')) {
      prompt += `
7. 创建详细HTML内容（与简要描述分开），严格控制关键词密度：
   - 目标关键词在HTML内容中出现频率应达到约5%
   - 关键词应自然融入内容，避免重复堆砌
   - 使用多种HTML标签：h2, h3, p, ul, li, strong, em等
   - 确保内容结构清晰，信息丰富`;
    }

    if (options.includes('autoStructure')) {
      prompt += `
8. 生成URL友好的地址栏，包含目标关键词`;
    }

    prompt += `

重要说明：
- "description"字段应为简要描述（最多400字符）用于表单显示
- "detailsHtml"字段应包含详细HTML内容，严格控制关键词密度
- HTML内容请使用简洁的样式，避免复杂的内联样式和背景色
- 优先使用语义化HTML标签和简单的文本样式
- 避免使用gradient、复杂背景色等样式
- 关键词密度计算：目标关键词出现次数 ÷ 总词数 × 100% ≈ 5%

请直接返回JSON格式，不要任何解释文字：
{
  "title": "优化的英文标题（包含目标关键词）",
  "description": "简要英文描述（最多400字符）",
  "tags": ["english-tag1", "english-tag2"],
  "imageAlt": "英文图片描述（包含目标关键词）"`;

    if (options.includes('autoSEO')) {
      prompt += `,
  "seoTitle": "SEO英文标题（包含目标关键词）",
  "seoDescription": "SEO英文描述（包含目标关键词）",
  "seoKeywords": "英文关键词（包含目标关键词）"`;
    }

    if (options.includes('autoContent')) {
      prompt += `,
  "detailsHtml": "<div><h2>标题（包含目标关键词）</h2><p>详细的英文HTML内容，目标关键词密度约5%，使用简洁样式和语义化标签</p></div>"`;
    }

    if (options.includes('autoStructure')) {
      prompt += `,
  "addressBar": "url-friendly-english-address"`;
    }

    prompt += `
}`;

    return prompt;
  }

  // 格式化AI响应
  formatAIResponse(response) {
    return {
      title: response.title || '',
      description: response.description || '',
      tags: response.tags || [],
      imageAlt: response.imageAlt || null,
      seoTitle: response.seoTitle || null,
      seoDescription: response.seoDescription || null,
      seoKeywords: response.seoKeywords || null,
      addressBar: response.addressBar || null,
      detailsHtml: response.detailsHtml || null
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
    if (options.includes('autoSEO')) {
      baseData.seoTitle = `${optimizedTitle} - Play Free Online | Gaming Experience`;
      baseData.seoDescription = shortDescription.length > 150 ? 
        shortDescription.substring(0, 147) + '...' : 
        shortDescription;
      baseData.seoKeywords = baseData.tags.join(', ');
    }

    // 确保HTML内容总是生成（详细内容，用于HTML内容区域）
    if (options.includes('autoContent')) {
      console.log('📄 开始生成HTML详细内容（备用模式）...');
      baseData.detailsHtml = this.generateDetailedContentFromAI(optimizedTitle, description, cleanText);
      console.log('✅ HTML内容生成成功，长度:', baseData.detailsHtml?.length || 0);
    } else {
      console.log('⚠️  警告: autoContent选项未选中，跳过HTML内容生成（备用模式）');
    }

    // 确保地址栏总是生成
    if (options.includes('autoStructure')) {
      baseData.addressBar = this.generateAddressBar(optimizedTitle);
    }

    return baseData;
  }

  // 基于AI返回内容生成详细HTML
  generateDetailedContentFromAI(title, originalDescription, aiText) {
    const paragraphs = aiText.split('\n').filter(p => p.trim().length > 10);
    const titleKeywords = this.extractTitleKeywords(title);
    const primaryKeyword = titleKeywords[0] || 'content';
    const secondaryKeyword = titleKeywords[1] || 'experience';
    
    let html = `<div>
        <h2>${title} - Comprehensive Guide</h2>
        <div>
          <p><strong>Overview:</strong> ${originalDescription}</p>
          <p>Discover everything you need to know about ${primaryKeyword} and unlock the full potential of this amazing ${secondaryKeyword}.</p>
        </div>
        <h3>${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)} Analysis Results</h3>
        <div>`;
    
    paragraphs.forEach((paragraph, index) => {
      const enhancedParagraph = this.enhanceParagraphWithKeywords(paragraph, primaryKeyword, secondaryKeyword, index);
      html += `<p>${enhancedParagraph}</p>`;
    });
    
    html += `</div>
        <h3>Key ${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)} Highlights</h3>
        <ul>
          <li>🚀 AI-powered ${primaryKeyword} analysis and optimization</li>
          <li>💡 Personalized ${secondaryKeyword} customization</li>
          <li>🎯 Advanced ${primaryKeyword} features and capabilities</li>
          <li>🌟 Enhanced ${secondaryKeyword} performance and results</li>
        </ul>
        <div>
          <h3>Why Choose This ${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)}?</h3>
          <p>This ${primaryKeyword} solution offers unparalleled ${secondaryKeyword} quality and performance. With cutting-edge technology and innovative ${primaryKeyword} features, you'll experience the best ${secondaryKeyword} available today.</p>
        </div></div>`;
    
    return html;
  }

  // 增强段落内容的关键词密度
  enhanceParagraphWithKeywords(paragraph, primaryKeyword, secondaryKeyword, index) {
    const words = paragraph.split(' ');
    const enhancedWords = words.map(word => {
      // 随机选择一些位置插入关键词，保持自然
      if (Math.random() < 0.1 && word.length > 3) {
        return word.includes(primaryKeyword) ? word : `${word} ${primaryKeyword}`;
      }
      return word;
    });
    
    let enhancedParagraph = enhancedWords.join(' ');
    
    // 在段落末尾添加关键词相关的句子
    if (index % 3 === 0) {
      enhancedParagraph += ` This ${primaryKeyword} feature enhances your overall ${secondaryKeyword}.`;
    }
    
    return enhancedParagraph;
  }

  // 模拟AI生成（用于测试和演示）
  generateMockContent({ title, description, imageUrl, iframeUrl, options }) {
    console.log('🎭 模拟模式: 正在生成AI模拟内容');
    console.log('📝 输入参数:', { title, description: description.substring(0, 50) + '...', options });
    
    // 优化标题，移除AI前缀，让标题更自然
    const optimizedTitle = this.optimizeTitle(title);
    // 生成简要描述（400字符以内）
    const shortDescription = this.optimizeDescription(title, description);
    
    const baseData = {
      title: optimizedTitle,
      description: shortDescription, // 简要描述，用于表单上方
      tags: this.extractEnglishKeywords(description + ' ' + title),
      imageAlt: imageUrl ? `Professional screenshot of ${title} gameplay` : `Professional image showcasing ${optimizedTitle}`
    };

    // 确保SEO字段总是生成
    if (options.includes('autoSEO')) {
      baseData.seoTitle = `${optimizedTitle} - Play Free Online | Best Gaming Experience`;
      baseData.seoDescription = shortDescription.length > 150 ? 
        shortDescription.substring(0, 147) + '...' : 
        shortDescription;
      baseData.seoKeywords = baseData.tags.join(', ');
    }

    // 确保HTML内容总是生成（详细内容，用于HTML内容区域）
    if (options.includes('autoContent')) {
      console.log('📄 开始生成HTML详细内容...');
      baseData.detailsHtml = this.generateGameDetailContent(optimizedTitle, description, shortDescription);
      console.log('✅ HTML内容生成成功，长度:', baseData.detailsHtml?.length || 0);
    } else {
      console.log('⚠️  警告: autoContent选项未选中，跳过HTML内容生成');
    }

    // 确保地址栏总是生成
    if (options.includes('autoStructure')) {
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
    if (options.includes('autoContent') && !baseData.detailsHtml) {
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
  generateDetailedContent(title, description) {
    return `
      <div>
        <h2>${title}</h2>
        <div>
          <p>${description}</p>
        </div>
        
        <h3>Core Features</h3>
        <ul>
          <li>🚀 Efficient and convenient solutions</li>
          <li>💡 Innovative technology applications</li>
          <li>🎯 Precisely meets user needs</li>
          <li>🔧 Customizable configuration</li>
        </ul>

        <h3>Advantages</h3>
        <div>
          <p>Through AI intelligent analysis and optimization, we provide professional-grade content presentation. This not only improves content quality but also ensures the best balance between SEO friendliness and user experience.</p>
        </div>

        <h3>Use Cases</h3>
        <div>
          <p>Suitable for various business scenarios, including but not limited to:</p>
          <ul>
            <li>Corporate website content display</li>
            <li>Product introduction and description</li>
            <li>Service process presentation</li>
            <li>Brand story narration</li>
          </ul>
        </div>
      </div>
    `;
  }

  // 优化标题
  optimizeTitle(title) {
    // 移除常见的前缀和后缀，让标题更简洁
    let optimized = title.replace(/^(AI Enhanced:|About)\s*/i, '');
    
    // 如果是游戏，添加吸引人的形容词
    if (title.toLowerCase().includes('game') || title.toLowerCase().includes('io') || 
        title.toLowerCase().includes('rush') || title.toLowerCase().includes('ball')) {
      if (!optimized.toLowerCase().includes('ultimate') && !optimized.toLowerCase().includes('epic')) {
        optimized = `Ultimate ${optimized}`;
      }
    }
    
    return optimized.trim();
  }

  // 优化描述（简要描述，400字符以内）
  optimizeDescription(title, description) {
    // 移除重复的标题信息
    let optimized = description.replace(new RegExp(`About ${title}\\s*`, 'gi'), '');
    
    // 如果是游戏描述，添加更多吸引人的内容
    if (title.toLowerCase().includes('io') || optimized.toLowerCase().includes('multiplayer')) {
      // 检查是否已经有结尾号召
      if (!optimized.includes('Try it now') && !optimized.includes('Play now')) {
        optimized += ' Experience fast-paced action, compete with players worldwide, and climb the leaderboards!';
      }
    }
    
    // 确保简要描述不超过400个字符
    if (optimized.length > 400) {
      optimized = optimized.substring(0, 397) + '...';
    }
    
    return optimized.trim();
  }

  // 生成游戏专用详细内容
  generateGameDetailContent(title, originalDescription, shortDescription) {
    // 提取标题中的主要关键词
    const titleKeywords = this.extractTitleKeywords(title);
    const primaryKeyword = titleKeywords[0] || 'game';
    const secondaryKeyword = titleKeywords[1] || 'play';
    
    // 使用原始描述和短描述来生成更丰富的HTML内容
    const fullDescription = originalDescription || shortDescription;
    
    // 构建包含关键词密度的内容
    const content = `
      <div>
        <h2>${title} - Ultimate Gaming Experience</h2>
        
        <div>
          <p><strong>Game Introduction:</strong> ${fullDescription}</p>
          <p>Experience the thrill of ${primaryKeyword} gameplay like never before. This exciting ${primaryKeyword} adventure offers endless entertainment and competitive ${secondaryKeyword} action.</p>
        </div>
        
        <div>
          <div>
            <h3>🎮 ${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)} Features</h3>
            <ul>
              <li>Smooth and responsive ${primaryKeyword} controls</li>
              <li>Multiplayer online ${secondaryKeyword} competition</li>
              <li>Real-time ${primaryKeyword} leaderboards</li>
              <li>Endless ${primaryKeyword} gameplay variety</li>
              <li>Advanced ${secondaryKeyword} mechanics</li>
            </ul>
          </div>
          
          <div>
            <h3>🏆 How to Play ${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)}</h3>
            <ol>
              <li>Use intuitive controls to master ${primaryKeyword} gameplay</li>
              <li>Navigate through challenging ${secondaryKeyword} terrain</li>
              <li>Compete against other ${primaryKeyword} players worldwide</li>
              <li>Climb the global ${primaryKeyword} rankings</li>
              <li>Unlock new ${secondaryKeyword} strategies and techniques</li>
            </ol>
          </div>
        </div>
        
        <div>
          <h3>💡 ${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)} Pro Tips</h3>
          <p>Master the ${primaryKeyword} controls for better performance, stay focused during intense ${secondaryKeyword} moments, and learn from other ${primaryKeyword} players' strategies to improve your ${primaryKeyword} gameplay experience. The key to success in ${primaryKeyword} is understanding the core ${secondaryKeyword} mechanics.</p>
        </div>
        
        <div>
          <h3>🌟 Why Choose This ${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)}?</h3>
          <p>This ${primaryKeyword} offers the perfect balance of challenge and fun. Whether you're a beginner or an expert ${secondaryKeyword} player, you'll find something to love about this ${primaryKeyword} experience. Join thousands of players who have already discovered the excitement of ${primaryKeyword} gaming.</p>
        </div>
        
        <div>
          <p><strong>🚀 Start Playing ${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)} Now - Free Online Game!</strong></p>
          <p>Don't miss out on the ultimate ${primaryKeyword} adventure. Click play and dive into the world of ${secondaryKeyword} excitement today!</p>
        </div>
      </div>
    `;
    
    return content;
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
    return title.toLowerCase()
      .replace(/[^\w\s-]/g, '') // 移除特殊字符
      .replace(/\s+/g, '-') // 空格替换为连字符
      .replace(/[^\x00-\x7F]/g, '') // 移除非ASCII字符
      .replace(/-+/g, '-') // 多个连字符合并为一个
      .replace(/^-|-$/g, '') // 移除开头和结尾的连字符
      .substring(0, 50); // 限制长度
  }
}

// 导出单例实例
export default new AIService();