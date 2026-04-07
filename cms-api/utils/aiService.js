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
    /** 默认走 Gemini；不再静默回退 mock */
    this.provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
    /**
     * 默认 gemini-2.5-flash：相对 2.0 更聪明，比 Pro 便宜，适合长文案/结构化 JSON
     * 可用 GEMINI_MODEL 覆盖，例如 gemini-2.5-pro
     */
    this.geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.initializeProvider();
    console.log(
      `[AI] provider=${this.provider}` +
        (this.provider === 'gemini' ? ` model=${this.geminiModel}` : '')
    );
  }

  /** 前端传 checkbox 值为字符串数组（如 ['autoSEO','autoContent']），统一成对象 */
  normalizeGenerateOptions(options) {
    const o = {};
    if (Array.isArray(options)) {
      options.forEach((k) => {
        if (k) o[k] = true;
      });
    } else if (options && typeof options === 'object') {
      Object.assign(o, options);
    }
    return o;
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
      case 'gemini': {
        const key = process.env.GOOGLE_API_KEY;
        if (!key || !String(key).trim()) {
          console.error('[AI] AI_PROVIDER=gemini 但未配置 GOOGLE_API_KEY，生成请求将失败');
          this.client = null;
          break;
        }
        try {
          this.client = new GoogleGenerativeAI(String(key).trim());
        } catch (error) {
          console.error('[AI] Gemini SDK 初始化失败:', error);
          this.client = null;
        }
        break;
      }
      default:
        this.client = null;
        break;
    }
  }

  // 主要的AI生成方法（失败直接抛错，不回退 mock）
  async generateContent({ title, description, imageUrl, iframeUrl, options = [], categoryInfo = null }) {
    switch (this.provider) {
      case 'gemini':
        return this.generateWithGemini({ title, description, imageUrl, iframeUrl, options, categoryInfo });
      case 'openai':
        return this.generateWithOpenAI({ title, description, imageUrl, iframeUrl, options, categoryInfo });
      case 'claude':
        return this.generateWithClaude({ title, description, imageUrl, iframeUrl, options, categoryInfo });
      case 'mock': {
        const e = new Error('已关闭 mock：请使用 AI_PROVIDER=gemini 并在 .env 中配置 GOOGLE_API_KEY');
        e.code = 'MOCK_DISABLED';
        throw e;
      }
      default: {
        const e = new Error(`不支持的 AI_PROVIDER: ${this.provider}`);
        e.code = 'UNSUPPORTED_PROVIDER';
        throw e;
      }
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

      throw new Error('OpenAI 集成未启用：请在 aiService 中接入 SDK 或改用 AI_PROVIDER=gemini');
    } catch (error) {
      console.error('OpenAI API调用失败:', error);
      throw error;
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

      throw new Error('Claude 集成未启用：请在 aiService 中接入 SDK 或改用 AI_PROVIDER=gemini');
    } catch (error) {
      console.error('Claude API调用失败:', error);
      throw error;
    }
  }

  /** 去掉首尾 markdown 代码块（勿用非贪婪 ``` 正则，避免 detailsHtml 内反引号导致整段被截断） */
  _stripMarkdownFences(s) {
    let t = String(s || '').trim();
    t = t.replace(/^\s*```(?:json)?\s*\r?\n?/i, '');
    t = t.replace(/\r?\n```\s*$/,'');
    return t.trim();
  }

  /** 从首个 { 起扫描括号深度，截取完整顶层 JSON 对象（字符串内的 { } 不计入深度） */
  _extractBalancedJsonObject(s) {
    const start = s.indexOf('{');
    if (start === -1) return null;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < s.length; i++) {
      const c = s[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
      } else {
        if (c === '"') inStr = true;
        else if (c === '{') depth++;
        else if (c === '}') {
          depth--;
          if (depth === 0) return s.slice(start, i + 1);
        }
      }
    }
    return null;
  }

  /**
   * 解析 Gemini 文本输出为 JSON 对象
   */
  _parseGeminiJsonText(rawText) {
    const raw = String(rawText || '').trim();
    const work = this._stripMarkdownFences(raw);

    const tryParse = (str) => {
      try {
        const o = JSON.parse(str);
        return o && typeof o === 'object' ? o : null;
      } catch {
        return null;
      }
    };

    let parsed = tryParse(work);
    if (parsed) return parsed;

    const balanced = this._extractBalancedJsonObject(work);
    if (balanced) {
      parsed = tryParse(balanced);
      if (parsed) return parsed;
    }

    const start = work.indexOf('{');
    const end = work.lastIndexOf('}');
    if (start !== -1 && end > start) {
      parsed = tryParse(work.slice(start, end + 1));
      if (parsed) return parsed;
    }

    let lastErr = 'parse failed';
    try {
      JSON.parse(work);
    } catch (e) {
      lastErr = e.message || String(e);
    }

    const pe = new Error(`模型返回内容无法解析为 JSON：${lastErr}`);
    pe.code = 'AI_JSON_PARSE_ERROR';
    pe.details = {
      provider: 'gemini',
      model: this.geminiModel,
      responsePreview: raw.slice(0, 1500),
      hint:
        '常见于：① detailsHtml 内未转义的双引号/断行导致非法 JSON；② 输出过长被截断。已提高 maxOutputTokens；提示词中已要求合法 JSON 字符串。'
    };
    console.error('[AI] JSON 解析失败', pe.details);
    throw pe;
  }

  // Gemini实现（无 mock / 无静默降级）
  async generateWithGemini({ title, description, imageUrl, iframeUrl, options, categoryInfo }) {
    if (!this.client) {
      const e = new Error(
        '未配置 GOOGLE_API_KEY 或 Gemini 初始化失败。请在 cms-api/.env 中设置 GOOGLE_API_KEY，并确认 AI_PROVIDER=gemini'
      );
      e.code = 'GEMINI_NOT_CONFIGURED';
      e.details = { provider: 'gemini', model: this.geminiModel };
      console.error('[AI]', e.message);
      throw e;
    }

    try {
      const model = this.client.getGenerativeModel({
        model: this.geminiModel,
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.35,
        },
      });
      const prompt = this.buildGeminiPrompt({ title, description, imageUrl, iframeUrl, options, categoryInfo });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const content = this._parseGeminiJsonText(text);

      const formatted = this.formatAIResponse(content);
      // 标题、简要描述以用户/模板输入为准，不采用模型改写结果
      formatted.title = title !== undefined && title !== null ? String(title) : formatted.title;
      formatted.description =
        description !== undefined && description !== null ? String(description) : formatted.description;
      if (!formatted.detailsHtml || !String(formatted.detailsHtml).trim()) {
        const pe = new Error('模型返回的 JSON 中缺少有效的 detailsHtml');
        pe.code = 'AI_INCOMPLETE_RESPONSE';
        pe.details = { provider: 'gemini', model: this.geminiModel, keys: Object.keys(content || {}) };
        console.error('[AI]', pe.message, pe.details);
        throw pe;
      }
      return formatted;
    } catch (error) {
      if (error.code && String(error.code).startsWith('AI_')) throw error;
      if (error.code === 'GEMINI_NOT_CONFIGURED') throw error;

      console.error('Gemini API调用失败:', error);

      if (error.status === 429 || (error.message && error.message.includes('429'))) {
        const qe = new Error(error.message || 'Gemini API 配额已满或触发限流 (429)');
        qe.code = 'QUOTA_EXCEEDED';
        qe.status = 429;
        qe.details = {
          provider: 'gemini',
          model: this.geminiModel,
          helpUrl: 'https://ai.google.dev/gemini-api/docs/rate-limits'
        };
        throw qe;
      }

      if (error.message && (error.message.includes('API_KEY') || error.message.includes('API key'))) {
        const apiKeyError = new Error('Gemini API 密钥无效或未启用 Generative Language API');
        apiKeyError.code = 'INVALID_API_KEY';
        throw apiKeyError;
      }

      if (error.status === 403 || (error.message && error.message.includes('PERMISSION_DENIED'))) {
        const permissionError = new Error('Gemini API 权限被拒绝');
        permissionError.code = 'PERMISSION_DENIED';
        permissionError.status = 403;
        throw permissionError;
      }

      const msg =
        error.message ||
        (typeof error.toString === 'function' ? error.toString() : 'Gemini 调用失败');
      const genericError = new Error(msg);
      genericError.code = 'AI_SERVICE_ERROR';
      genericError.status = error.status;
      genericError.originalMessage = error.message;
      genericError.details = {
        provider: 'gemini',
        model: this.geminiModel,
        stack: error.stack
      };
      throw genericError;
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
${this._buildPromptGuidelines(categoryInfo)}
${this._buildPromptOutputFormat(title, categoryInfo)}
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
  （重要提示：
  1. 必须保留用户描述中的所有关键信息，包括：游戏模式、控制方式、功能特性、具体数字、选项列表等
  2. 可以在表达方式上进行创意扩展，使用生动的语言重新组织
  3. 但绝对不能遗漏或忽略用户描述中的具体信息点
  4. 如果用户描述中提到了具体的游戏模式、操作方式、功能列表、数字等信息，这些必须出现在生成的内容中）
- 目标关键词：${keywords.join(', ')}`;

    // 添加分类信息（非常重要，用于判断内容结构和风格）
    if (categoryInfo) {
      inputs += `
- 内容分类：${categoryInfo.name}（请仔细理解此分类的性质和特点）
- 分类类型：${categoryInfo.type}`;
      if (categoryInfo.description) {
        inputs += `
- 分类描述：${categoryInfo.description}（这有助于理解分类的特征和内容方向）`;
      }
      inputs += `
  （重要：分类信息是判断内容结构、写作风格和段落组织方式的关键依据）`;
    }

    // 添加媒体资源
    if (imageUrl) {
      inputs += `
- 图片地址：${imageUrl}（可用于理解内容主题，但不要插入图片标签）`;
    }
    if (iframeUrl) {
      inputs += `
- iframe / 嵌入链接：${iframeUrl}
  （仅作上下文参考；最终由系统保存用户填写值，JSON 中不要输出 iframe 字段，也不要编造其它 URL）`;
    }

    return inputs;
  }

  /**
   * 构建内容生成指导原则
   */
  _buildPromptGuidelines(categoryInfo) {
    let guidelines = `

【一、元数据与 SEO 字段（与「详细正文」分工）】
1. 标题 title、简要描述 description
   - JSON 中的 title、description 必须与【输入信息】里用户/模板提供的标题、简要描述完全一致（逐字逐句，禁止改写、缩写、扩写或翻译替换）。
   - 创意与扩写只允许出现在 detailsHtml（详细 HTML 正文）中，不得覆盖简短字段。

2. 图片与链接
   - imageUrl：若输入提供了图片地址，须在 JSON 中原样返回同一字符串；未提供则返回空字符串 ""。
   - iframe 链接由业务系统保存用户填写值，不要在 JSON 中新增 iframe 字段，也不要虚构 URL。

3. 标签 tags
   - 根据标题、简要描述与分类（若有）生成 3–5 个相关英文标签；使用领域常见用语，避免与正文无关的词。

4. 日期
   - 列表/详情展示日期由服务端写入为「当前日期」，你无需在 JSON 中输出日期字段；正文中若提及「上线/更新」等，可与「当前」语境自然一致即可。

5. 图片描述 imageAlt
   - 英文 alt 文本，准确概括主题，自然包含与标题相关的核心词，避免空洞套话。

6. 地址栏 addressBar
   - 生成 URL 友好 slug（小写、英文单词用连字符），语义尽量紧扣标题主题，便于识别与分享；不要前导 /，不要堆砌无意义后缀。

7. SEO TDK（重点，JSON 结构必须与导出代码一致）
   - 必须使用嵌套对象 seo（勿再使用顶层的 seoTitle / seoDescription / seoKeywords 三个平铺字段）：
     "seo": { "title": "...", "description": "...", "keywords": "..." }
   - seo.title：英文，约 40–80 字符；融入与原标题强相关的核心关键词，可读、吸引点击。
   - seo.description：英文 meta 描述，约 140–160 字符；含主关键词与补充词，与 seo.title 句式勿完全重复。
   - seo.keywords：英文逗号分隔，约 80–100 字符；覆盖标题衍生词、长尾词，与分类/主题一致，忌堆砌。
   - 三者互相关联且符合常见 Google SEO 规范（自然语言、避免堆砌）。

【二、详细正文 detailsHtml】
2.1 内容与信息源
   - 以【用户描述】与【标题】为骨架，撰写面向终端用户的英文深度文章；在 **不违背用户已给事实**（数字、列表、机制、键位等）的前提下，可 **广泛综合** 你知识库中与该主题相关的 **公开常见信息与类型化介绍**（相当于对互联网上常见说明、评测、百科类内容的 **归纳总结**；当前接口非实时联网，请勿声称刚抓取的网页）。
   - 用户描述中的要点必须在正文中有清晰展开；信息完整优先于修辞；不得编造与用户描述冲突的关键数据。

2.2 栏目式小标题（强制，须嵌入完整名称）
   - 正文须使用 **英文** 小标题，且 **必须包含【输入信息】中的完整标题文字**（与用户 title 一致，勿擅自缩短或改写名称），建议顺序如下（用 h2 或 h3 均可；全文从 h2 起，禁止使用 h1）：
     • **About [完整标题]** — 背景、类型、玩法概览等；在用户描述之外，可补充该题材下公认的常识性、公开信息总结。
     • **How to Play [完整标题]** — 操作方式、模式、流程、技巧与上手建议；用户描述中的控制说明、模式列表、数字等 **必须写入本节**。
     • **Why Play [完整标题]** — 亮点、乐趣点、适合人群、入坑理由；可结合同类内容的常见讨论角度做归纳，避免空泛口号。
   - 若内容不是游戏（如工具、应用），可将 “Play” 换为 **Use / Try / Experience** 等，但仍须保持 **About … / How to … / Why …** 三档结构，且三处都带 **同一完整名称**。
   - 在上述三节之外，可酌情增加 Features、Tips、Highlights 等 h3；**FAQ 仍为必填**（见下）。

2.3 结构与收录友好
   - 层级清晰：恰当使用 h2、h3、p、ul、ol、li、strong、em、blockquote 等。
   - 必须包含 **FAQ** 区块：4–6 个常见问题与答案；问题与答案须基于用户描述（可辅以常识），格式可用 <ol><li><strong>问题?</strong><br>答案...</li></ol>。

2.4 关键词密度
   - 正文英文词数层面，核心目标关键词（来自标题/描述）整体密度约 5%；通过小标题、段落、列表自然分布，严禁机械重复与堆砌。

2.5 样式
   - 禁止使用任何内联样式（禁止 style 属性）；仅使用语义化 HTML 标签，勿依赖 class 做排版。

2.6 格式化
   - HTML 必须排版整齐：标签分行、建议 2 空格缩进，禁止整段 HTML 挤成一行，便于人工与 diff 阅读。

2.7 媒体
   - 禁止插入 <img>、picture、svg 内嵌大图等；仅用文字描述；总篇幅不少于 1000 字符，主要段落每段宜充足展开。`;

    // 如果提供了分类信息，添加分类相关的指导
    if (categoryInfo) {
      const categoryName = categoryInfo.name || '';
      const categoryType = categoryInfo.type || '';
      const categoryDesc = categoryInfo.description || '';
      
      guidelines += `

【基于分类信息的内容指导】
   - 分类名称：${categoryName}
   - 分类类型：${categoryType}${categoryDesc ? `\n   - 分类描述：${categoryDesc}` : ''}
   - 请仔细理解该分类的性质和特点，生成符合该分类特征的内容
   - 根据分类信息判断合适的内容结构、写作风格和重点内容
   - 让生成的内容自然契合该分类，而不是生搬硬套固定模板`;
    }
    
    return guidelines;
  }

  /**
   * 构建输出格式说明（核心部分）
   */
  _buildPromptOutputFormat(title, categoryInfo) {
    // 根据分类信息提供动态的结构示例
    // 不固定特定类型，让AI根据分类信息自己判断合适的结构
    const categoryInfoText = categoryInfo 
      ? `（分类：${categoryInfo.name}，类型：${categoryInfo.type}${categoryInfo.description ? `，描述：${categoryInfo.description}` : ''}）`
      : '';
    
    const structureExample = `
<div>
  <h2>${title}</h2>
  <p>Opening hook that uses the full title naturally; lead into the sections below...</p>

  <h2>About ${title}</h2>
  <p>English encyclopedia-style intro: blend user facts with widely known public context; substantial paragraph...</p>

  <h2>How to Play ${title}</h2>
  <p>English: controls, modes, flow; must include every control/mode/list item from the user description...</p>
  <ul>
    <li>Concrete point from user description...</li>
    <li>Another mechanic or mode...</li>
  </ul>

  <h2>Why Play on ${title}</h2>
  <p>English: selling points, fun factor, who it is for; grounded synthesis, not empty hype...</p>

  <h3>Optional: Features or Tips</h3>
  <p>Extra bullet points if useful...</p>

  <h3>FAQ</h3>
  <ol>
    <li><strong>Question 1?</strong><br>Answer grounded in user description...</li>
    <li><strong>Question 2?</strong><br>...</li>
    <li><strong>Question 3?</strong><br>...</li>
    <li><strong>Question 4?</strong><br>...</li>
  </ol>

  <p>Closing paragraph, at least 100 characters of English...</p>
</div>`;
    
    return `

【返回格式说明】
必须返回完整的 JSON 对象，包含以下所有字段（英文内容为主；title/description 与输入语言保持一致且须原文一致）：

{
  "title": "字符串，必须与【输入信息】中的标题完全一致，禁止改写",
  
  "description": "字符串，必须与【输入信息】中的用户描述/简要描述完全一致，禁止改写、摘要或扩写",
  
  "tags": ["标签1", "标签2", "标签3"],
    // 3-5 个英文标签，与标题、描述、分类主题相关
  
  "imageUrl": "字符串，若输入提供了图片地址则原样返回；未提供则返回 \\"\\"",
  
  "imageAlt": "字符串，英文图片 alt，含与标题相关的关键词，具体不空洞",
  
  "seo": {
    "title": "英文 SEO 标题，约 40–80 字符，含标题核心关键词",
    "description": "英文 meta 描述，约 140–160 字符，含关键词与卖点",
    "keywords": "英文逗号分隔，约 80–100 字符，与标题/主题强相关"
  },
  
  "addressBar": "字符串，URL 友好 slug（小写、连字符），语义紧扣标题，无前导 /",
  
  "detailsHtml": "字符串，详细英文 HTML 正文（不少于 1000 字符）"
    // 须含 About [完整标题]、How to Play [完整标题]、Why Play [完整标题]（名称与输入 title 一致），并可归纳公开常见信息；另含 FAQ 等，见上文 2.2
    // 遵守【二、详细正文】全部条款（信息完整、约 5% 关键词密度、无 style、无 img、换行缩进等）
    // 不得与用户描述中的事实与数据相矛盾
    
    // 结构示例${categoryInfoText}（FAQ 必填；About/How/Why 三档为强制栏目）：
    ${structureExample}
}

【字段生成要点】
- title、description：与用户输入逐字一致；扩写仅出现在 detailsHtml。
- seo：必填嵌套对象，字段名为 title、description、keywords（与项目导出代码中 seo: { title, description, keywords } 一致）；勿输出顶层 seoTitle 等。
- imageUrl：有则原样复制，无则 ""。
- detailsHtml：全英文正文；须含 **About [title] / How to Play [title] / Why Play [title]**（title 与输入一致），并可归纳公开常见信息；description 为短字段，禁止整段复用敷衍。
- 列表日期字段由系统写入，JSON 中不必包含 publishDate。

【HTML 与 JSON 转义】
- detailsHtml 作为 JSON 字符串时：内部所有双引号 " 必须写成 \\"；反斜杠写成 \\\\；换行用 \\n。禁止在 JSON 里放未闭合的原始换行或未转义 "，否则整段无法解析。
- HTML 须分行缩进；在 JSON 中一律用 \\n 表示换行。
- 禁止 style 属性；禁止 <img>；正文中勿出现三个连续反引号（Markdown 代码块标记），以免干扰解析。

【输出示例】
请直接返回 JSON，不要 markdown 代码块外的解释文字。

示例（detailsHtml 用 \\n 换行）：
{
  "title": "${title}",
  "description": "（此处必须与输入中的用户描述完全一致）",
  "tags": ["related-tag-1", "related-tag-2", "related-tag-3"],
  "imageUrl": "",
  "imageAlt": "Concise English alt text with core keywords from the title",
  "seo": {
    "title": "English SEO title 40-80 chars with primary keywords",
    "description": "English meta description 140-160 chars, compelling and keyword-aware for Google SERP",
    "keywords": "primary keyword, secondary phrase, long-tail term, category terms"
  },
  "addressBar": "url-slug-from-title",
  "detailsHtml": "<div>\\n  <h2>...</h2>\\n  <p>...</p>\\n  ... FAQ ...\\n</div>"
}

请记住：分类信息（若有）用于判断段落重点与用语领域；title/description 一律不可改写。`;
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

  /**
   * 统一解析 SEO：优先嵌套 seo:{title,description,keywords}（与导出代码一致），兼容旧版顶层 seoTitle 等
   */
  _normalizeSeoFromResponse(response) {
    const n = response?.seo;
    const pick = (nestedKey, flatKey) => {
      if (n && typeof n === 'object' && !Array.isArray(n)) {
        const raw = n[nestedKey];
        if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
          return String(raw).trim();
        }
      }
      const flat = response?.[flatKey];
      if (flat !== undefined && flat !== null && String(flat).trim() !== '') {
        return String(flat).trim();
      }
      return '';
    };
    return {
      seoTitle: pick('title', 'seoTitle'),
      seoDescription: pick('description', 'seoDescription'),
      seoKeywords: pick('keywords', 'seoKeywords')
    };
  }

  // 格式化AI响应
  formatAIResponse(response) {
    // 为必填字段提供默认值，避免验证失败
    const title = response.title || '';
    const description = response.description || '';

    let tags = response.tags;
    if (!Array.isArray(tags)) {
      if (typeof tags === 'string') {
        tags = tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
      } else {
        tags = [];
      }
    }
    tags = tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 30);

    const seo = this._normalizeSeoFromResponse(response);
    
    // 处理detailsHtml，确保换行符正确
    let detailsHtml = response.detailsHtml || this.generateDetailContent(title, description, description);
    if (detailsHtml) {
      // 将JSON中的\n转义字符转换为真正的换行符
      detailsHtml = detailsHtml.replace(/\\n/g, '\n');
      // 移除内联样式（如果存在）
      detailsHtml = detailsHtml.replace(/\s+style\s*=\s*["'][^"']*["']/gi, '');
    }

    return {
      title: title,
      description: description,
      tags,
      imageAlt: response.imageAlt || null,
      seoTitle: seo.seoTitle || this.generateSeoTitle(title),
      seoDescription: seo.seoDescription || this.generateSeoDescription(description),
      seoKeywords: seo.seoKeywords || this.generateSeoKeywords(title, tags),
      addressBar: response.addressBar || this.generateAddressBar(title) || 'default-address',
      detailsHtml: detailsHtml
    };
  }

  // 创建备用响应（当AI返回的不是JSON格式时）
  createFallbackResponse({ title, description, imageUrl, iframeUrl, options, categoryInfo, aiText }) {
    const optionsObj = this.normalizeGenerateOptions(options);
    const raw = String(aiText || '');
    const cleanText = raw.replace(/[\*\#\`]/g, '').trim();
    const optimizedTitle = this.optimizeTitle(title);
    const shortDescription = this.optimizeDescription(title, description, categoryInfo);

    const baseData = {
      title: optimizedTitle,
      description: shortDescription,
      tags: this.extractEnglishKeywords(description + ' ' + cleanText),
      imageAlt: imageUrl ? `Professional screenshot of ${optimizedTitle}` : `Professional image showcasing ${optimizedTitle}`
    };

    if (optionsObj.autoSEO) {
      baseData.seoTitle = `${optimizedTitle} - Play Free Online | Gaming Experience`;
      baseData.seoDescription =
        shortDescription.length > 150 ? shortDescription.substring(0, 147) + '...' : shortDescription;
      baseData.seoKeywords = baseData.tags.join(', ');
    }

    if (optionsObj.autoContent) {
      baseData.detailsHtml = this.generateDetailContent(
        optimizedTitle,
        description,
        shortDescription,
        categoryInfo
      );
    }

    if (optionsObj.autoStructure) {
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
    const o = this.normalizeGenerateOptions(options);
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

    if (o.autoSEO) {
      prompt += `
  "seo": {
    "title": "SEO English title",
    "description": "SEO English description",
    "keywords": "english keywords"
  },`;
    }

    if (o.autoContent) {
      prompt += `
  "detailsHtml": "Detailed English HTML content",`;
    }

    if (o.autoStructure) {
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