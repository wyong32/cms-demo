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
  // ===== 静态配置常量 =====
  static VARIATION_FACTORS = [
    '从用户体验角度',
    '从技术实现角度',
    '从市场趋势角度',
    '从创新设计角度',
    '从性能优化角度',
    '从用户需求角度',
    '从行业标准角度',
    '从未来发展方向角度'
  ];

  static CONTENT_STYLES = [
    '专业严谨的',
    '生动有趣的',
    '简洁明了的',
    '详细深入的',
    '创新独特的',
    '实用导向的',
    '用户友好的',
    '技术先进的'
  ];

  static HTML_STRUCTURE_TEMPLATE = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2>\${title}</h2>
  <p>[引言介绍 - 至少100字符，吸引读者，包含关键词]</p>
  
  <h3>About</h3>
  <p>[详细介绍 - 至少200字符，专业且全面，详细阐述主题内容]</p>
  
  <h3>Features</h3>
  <ul>
    <li>[特点1 - 详细描述功能和优势]</li>
    <li>[特点2 - 详细描述功能和优势]</li>
    <li>[特点3 - 详细描述功能和优势]</li>
    <li>[...更多特点，至少5-8个，总计至少300字符]</li>
  </ul>
  
  <h3>FAQ</h3>
  <ul>
    <li>
      <div class="faq-question">[问题1]</div>
      <div class="faq-answer">[详细答案1]</div>
    </li>
    <li>
      <div class="faq-question">[问题2]</div>
      <div class="faq-answer">[详细答案2]</div>
    </li>
    <li>[...更多FAQ，至少4-6个，总计至少300字符]</li>
  </ul>
  
  <p>[总结段落 - 至少100字符，有价值且完整，总结所有要点]</p>
</div>`;

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
        break;
      case 'claude':
        // this.client = new Anthropic({
        //   apiKey: process.env.ANTHROPIC_API_KEY
        // });
        break;
      case 'gemini':
        try {
          this.client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        } catch (error) {
          // Gemini初始化失败，回退到模拟模式
        }
        break;
      default:
        // 使用模拟环境
        break;
    }
  }

  // 主要的AI生成方法
  async generateContent({ title, description, imageUrl, iframeUrl, options = [], categoryInfo = null }) {
    switch (this.provider) {
      case 'openai':
        return this.generateWithOpenAI({ title, description, imageUrl, iframeUrl, options, categoryInfo });
      case 'claude':
        return this.generateWithClaude({ title, description, imageUrl, iframeUrl, options, categoryInfo });
      case 'gemini':
        return this.generateWithGemini({ title, description, imageUrl, iframeUrl, options, categoryInfo });
      default:
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

      return this.generateMockContent({ title, description, imageUrl, iframeUrl, options });
    } catch (error) {
      console.error('Claude API调用失败:', error);
      throw new Error('AI内容生成失败');
    }
  }

  // Gemini实现
  async generateWithGemini({ title, description, imageUrl, iframeUrl, options, categoryInfo }) {
    try {
      if (!this.client) {
        return this.generateMockContent({ title, description, imageUrl, iframeUrl, options, categoryInfo });
      }

      // 使用最新的模型
      const model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const prompt = this.buildGeminiPrompt({ title, description, imageUrl, iframeUrl, options, categoryInfo });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

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
        return this.formatAIResponse(content);
      } catch (parseError) {
        // 如果解析失败，返回基本内容
        return this.createFallbackResponse({ title, description, imageUrl, options, aiText: text });
      }
    } catch (error) {
      console.error('Gemini API调用失败:', error);
      // 如果API调用失败，返回模拟数据
      return this.generateMockContent({ title, description, imageUrl, iframeUrl, options });
    }
  }


  // ===== Gemini 提示词构建（重构版本 v2.0） =====
  /**
   * 构建 Gemini 提示词 - 主方法
   * @version 2.0 - 2025-01-15 重构：模块化提示词结构，提升可维护性
   */
  buildGeminiPrompt({ title, description, imageUrl, iframeUrl, options, categoryInfo }) {
    // 提取关键词
    const titleKeywords = this._extractTitleKeywords(title);

    // 随机化内容生成因子
    const randomFactor = AIService.VARIATION_FACTORS[
      Math.floor(Math.random() * AIService.VARIATION_FACTORS.length)
    ];
    const randomStyle = AIService.CONTENT_STYLES[
      Math.floor(Math.random() * AIService.CONTENT_STYLES.length)
    ];

    // 组合完整提示词
    return `${this._buildPromptHeader(randomStyle, randomFactor)}
${this._buildPromptInputs(title, description, titleKeywords, categoryInfo, imageUrl, iframeUrl)}
${this._buildPromptGuidelines()}
${this._buildPromptOutputFormat(title)}
`;
  }

  /**
   * 构建提示词头部：角色定位与基本要求
   */
  _buildPromptHeader(style, angle) {
    return `作为专业内容创作助手，请基于以下信息生成${style}英文内容。

【创作定位】
- 内容风格：${style}
- 创作角度：${angle}
- 目标语言：英文
- 目标受众：国际用户`;
  }

  /**
   * 构建提示词输入信息部分
   */
  _buildPromptInputs(title, description, keywords, categoryInfo, imageUrl, iframeUrl) {
    let inputs = `

【输入信息】
- 标题：${title}
- 用户描述：${description}
  （注意：仅作参考，不要直接复制，需要基于此进行创意扩展和重新组织）
- 目标关键词：${keywords.join(', ')}`;

    // 添加分类信息
    if (categoryInfo) {
      inputs += `
- 内容分类：${categoryInfo.name}
- 分类类型：${categoryInfo.type}`;
      if (categoryInfo.description) {
        inputs += `
- 分类描述：${categoryInfo.description}`;
      }
    }

    // 添加媒体资源
    if (imageUrl) {
      inputs += `
- 图片地址：${imageUrl}`;
    }
    if (iframeUrl) {
      inputs += `
- 相关链接：${iframeUrl}`;
    }

    return inputs;
  }

  /**
   * 构建内容生成指导原则
   */
  _buildPromptGuidelines() {
    return `

【内容生成指导原则】
1. 创意与原创性
   - 基于用户描述进行创意扩展和重新组织，绝对不要直接复制原文
   - 让AI根据分类和描述信息自由创作，不要使用固定模板
   - 每次生成都要有独特的角度和表达方式，充分发挥创造力
   - 避免使用模板化的开头和结尾，要根据内容类型创造独特的体验

2. 内容质量要求
   - 生成的简要描述和详细HTML内容要完全不同，各自服务不同用途
   - 根据分类信息（如果提供）来判断内容风格和写作方式
   - 根据内容类型（新闻、博客、视频、产品等）调整写作风格和结构
   - 内容要包含具体的数据、案例、引用或特色功能，增加可信度和独特性

3. SEO优化要求
   - 在HTML内容中，目标关键词的密度应达到约5%
   - 关键词应自然分布在标题、段落、列表等各个部分
   - 避免关键词堆砌，保持内容自然流畅
   - 关键词密度计算：目标关键词出现次数 ÷ 总词数 × 100% ≈ 5%

4. 技术规范
   - HTML内容请使用简洁的样式，避免复杂的内联样式和背景色
   - 优先使用语义化HTML标签和简单的文本样式
   - 避免使用gradient、复杂背景色等样式
   - HTML结构从H2开始，不要从H1开始`;
  }

  /**
   * 构建输出格式说明（核心部分）
   */
  _buildPromptOutputFormat(title) {
    return `

【返回格式说明】
必须返回完整的JSON对象，包含以下所有字段：

{
  "title": "字符串，标题（保持用户提供的标题不变）",
  
  "description": "字符串，简要描述（最多300字符）",
    // 用于列表展示和表单显示
    // 要求：基于用户描述重新组织创作，体现独特卖点，不要直接复制
  
  "tags": ["标签1", "标签2", "标签3"],
    // 数组，根据标题和内容生成3-5个相关英文标签
    // 示例：新闻类用时事词汇，技术类用专业术语，娱乐类用流行词汇
  
  "imageUrl": "字符串，用户提供的图片地址（直接使用，无需修改）",
  
  "imageAlt": "字符串，图片alt文本",
    // 用英文描述图片内容，需包含目标关键词
    // 要求：描述生动具体且符合内容类型
  
  "seoTitle": "字符串，SEO优化标题（40-80个字符）",
    // 基于原标题优化，添加吸引点击的词汇
    // 示例：原标题 + 特色描述（如 "- Play Free Online" / "- Complete Guide"）
  
  "seoDescription": "字符串，SEO描述（140-160字符）",
    // 用于搜索引擎展示，要吸引用户点击
    // 要求：包含核心关键词，描述清晰有吸引力
  
  "seoKeywords": "字符串，SEO关键词",
    // 用逗号分隔（80-100个字符）
    // 要求：包含核心关键词和相关词汇
  
  "addressBar": "字符串，URL友好的地址栏",
    // 直接基于标题生成，使用小写字母和连字符
    // 格式示例：escape-road, super-mario-game
    // 要求：不要添加 -game、-online 等后缀，不要以 / 开头
  
  "detailsHtml": "字符串，详细的HTML内容（不少于1000字符）"
    // 用于详情页面展示的完整HTML内容
    // 必须使用以下结构框架：
    ${AIService.HTML_STRUCTURE_TEMPLATE}
    
    // 重要要求：
    // - HTML内容总字符数必须不少于1000字符
    // - 替换模板中的所有占位符为具体、丰富的内容
    // - 不要直接复制用户描述，要进行创意扩展
    // - 根据分类信息调整内容风格
    // - 引言至少100字符，About至少200字符
    // - Features列表至少5-8个项目（总计至少300字符）
    // - FAQ至少4-6个问答（总计至少300字符）
    // - 总结段落至少100字符
    // - 每个部分都要有足够的内容深度和详细度
}

【字段生成要点】
- 所有文本内容必须使用英文
- title 字段：保持用户提供的标题不变
- description 是简要版本（300字符内），detailsHtml 是详细版本（1000字符以上）
- description 和 detailsHtml 的内容要完全不同，不要重复
- 每次生成都要创造独特的内容体验，避免重复使用相同的表达方式

【输出示例】
请直接返回JSON格式，不要任何解释文字：
{
  "title": "${title}",
  "description": "简要英文描述（最多300字符，基于用户描述创意重写）",
  "tags": ["keyword1", "keyword2", "keyword3"],
  "imageUrl": "用户提供的图片地址",
  "imageAlt": "英文图片描述（包含目标关键词）",
  "seoTitle": "基于原标题优化的SEO标题（40-80字符）",
  "seoDescription": "SEO英文描述（140-160字符，包含目标关键词）",
  "seoKeywords": "英文关键词1, 英文关键词2, 英文关键词3（80-100字符）",
  "addressBar": "url-friendly-address",
  "detailsHtml": "<div style=\\"font-family: Arial, sans-serif; line-height: 1.6; color: #333;\\"><h2>${title}</h2><p>引言内容...</p><h3>About</h3><p>详细介绍...</p><h3>Features</h3><ul><li>特点1...</li><li>特点2...</li></ul><h3>FAQ</h3><ul><li><div class=\\"faq-question\\">问题1</div><div class=\\"faq-answer\\">答案1</div></li></ul><p>总结内容...</p></div>"
}`;
  }

  /**
   * 提取标题关键词（辅助方法）
   */
  _extractTitleKeywords(title) {
    return title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 3);
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
      baseData.detailsHtml = this.generateDetailContent(optimizedTitle, description, shortDescription, null);
    }

    // 确保地址栏总是生成
    if (options.autoStructure) {
      baseData.addressBar = this.generateAddressBar(optimizedTitle);
    }

    return baseData;
  }


  // 模拟AI生成（用于测试和演示）
  generateMockContent({ title, description, imageUrl, iframeUrl, options, categoryInfo }) {

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
      baseData.detailsHtml = this.generateDetailContent(optimizedTitle, description, shortDescription, categoryInfo);
    }

    // 确保地址栏总是生成
    if (optionsObj.autoStructure) {
      baseData.addressBar = this.generateAddressBar(optimizedTitle);
    }

    // 最终验证：确保HTML内容存在
    if (optionsObj.autoContent && !baseData.detailsHtml) {
      // 强制生成基础HTML内容
      baseData.detailsHtml = `<div style="font-family: Arial, sans-serif; padding: 20px;"><h2>${baseData.title}</h2><p>${baseData.description}</p><p>基础内容已生成。</p></div>`;
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

  // ===== 备用方法区域（用于其他AI提供商）=====
  /**
   * 以下方法为 OpenAI 和 Claude 提供商预留
   * 当前系统主要使用 Gemini，这些方法暂未启用
   */

  /**
   * 构建系统提示词 - 用于 OpenAI
   */
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

  /**
   * 构建用户提示词 - 用于 OpenAI
   */
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

  /**
   * 构建 Claude 提示词
   */
  buildClaudePrompt({ title, description, imageUrl, iframeUrl, options }) {
    return `${this.buildSystemPrompt(options)}\n\n${this.buildUserPrompt({ title, description, imageUrl, iframeUrl })}`;
  }

}

// 导出单例实例
export default new AIService();