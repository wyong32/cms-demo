# AI服务集成指南

## 🚀 快速开始

目前系统支持多种AI服务提供商，您可以根据需要选择合适的服务。

## 🤖 支持的AI服务

### 1. OpenAI GPT (推荐)
- **模型**: GPT-4, GPT-4o-mini, GPT-3.5-turbo
- **优势**: 功能强大，生态完善，中英文效果都很好
- **成本**: GPT-4o-mini约 $0.15/1M input tokens, $0.6/1M output tokens
- **申请地址**: https://platform.openai.com/

### 2. Anthropic Claude
- **模型**: Claude-3-haiku, Claude-3-sonnet, Claude-3-opus
- **优势**: 安全性高，长文本处理能力强
- **成本**: 与GPT类似
- **申请地址**: https://console.anthropic.com/

### 3. Google Gemini
- **模型**: Gemini Pro, Gemini Pro Vision
- **优势**: 多模态支持，免费额度较大
- **成本**: 有免费额度，收费相对便宜
- **申请地址**: https://makersuite.google.com/

### 4. 国内AI服务
- **百度文心一言**: 中文效果好，价格便宜
- **阿里通义千问**: 企业级服务，稳定性高
- **腾讯混元**: 集成方便

## 🛠️ 配置步骤

### 步骤1: 安装AI SDK依赖

```bash
cd cms-api
npm install openai @anthropic-ai/sdk @google/generative-ai
```

### 步骤2: 配置环境变量

复制`.env.example`为`.env`，并配置您的API密钥：

```bash
cp .env.example .env
```

编辑`.env`文件：

```env
# 选择AI服务提供商
AI_PROVIDER=openai  # 或 claude, gemini

# OpenAI配置
OPENAI_API_KEY=sk-your-openai-api-key
```

### 步骤3: 启用AI服务

编辑`utils/aiService.js`，取消对应AI服务的注释：

```javascript
// 取消这些行的注释
import OpenAI from 'openai';
// import Anthropic from '@anthropic-ai/sdk';
// import { GoogleGenerativeAI } from '@google/generative-ai';
```

### 步骤4: 重启服务器

```bash
npm start
```

## 🔧 具体配置示例

### OpenAI配置示例

1. **获取API密钥**:
   - 访问 https://platform.openai.com/
   - 注册并创建API密钥

2. **配置环境变量**:
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-xxxxxxxxxx
```

3. **取消代码注释**:
```javascript
// utils/aiService.js
import OpenAI from 'openai';

// constructor中
case 'openai':
  this.client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  break;

// generateWithOpenAI方法中
const completion = await this.client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  temperature: 0.7,
  max_tokens: 2000
});

const result = JSON.parse(completion.choices[0].message.content);
return this.formatAIResponse(result);
```

### Claude配置示例

```env
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxx
```

```javascript
// utils/aiService.js
import Anthropic from '@anthropic-ai/sdk';

case 'claude':
  this.client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  break;
```

### Gemini配置示例

```env
AI_PROVIDER=gemini
GOOGLE_API_KEY=your-google-api-key
```

## 💰 成本估算

### OpenAI GPT-4o-mini (推荐性价比)
- 输入: $0.15/1M tokens
- 输出: $0.6/1M tokens
- 每次AI生成约200-500 tokens，成本约 $0.0003-0.0008

### 免费方案
- **Gemini**: 每分钟15次请求，每天1500次请求免费
- **本地模型**: 可以考虑使用Ollama运行本地大模型

## 🔒 安全建议

1. **API密钥安全**:
   - 不要将API密钥提交到Git
   - 使用环境变量存储
   - 定期轮换密钥

2. **请求限制**:
   - 设置合理的超时时间
   - 实现重试机制
   - 监控API使用量

3. **内容过滤**:
   - 对用户输入进行验证
   - 对AI输出进行审核

## 🎯 自定义提示词

您可以根据业务需求自定义AI提示词，编辑`utils/aiService.js`中的`buildSystemPrompt`方法：

```javascript
buildSystemPrompt(options) {
  let prompt = `你是一个专业的[您的行业]内容创作专家。
  
请根据用户提供的信息生成高质量的内容，要求：
1. 内容原创且有价值
2. 符合[您的行业]特点
3. 优化SEO关键词
4. 语言专业且易懂

返回JSON格式：
{
  "title": "标题",
  "description": "描述",
  // ... 其他字段
}`;
  
  return prompt;
}
```

## 📊 监控和优化

1. **性能监控**:
   - 记录AI响应时间
   - 监控API调用成功率
   - 跟踪成本使用情况

2. **内容质量**:
   - 收集用户反馈
   - A/B测试不同提示词
   - 持续优化生成效果

## 🆘 常见问题

### Q: API调用失败怎么办？
A: 检查网络连接、API密钥有效性、余额是否充足

### Q: 生成内容质量不好？
A: 优化提示词、提供更多上下文信息、尝试不同的模型

### Q: 成本过高？
A: 使用更便宜的模型(如GPT-4o-mini)、优化提示词长度、设置使用限制

### Q: 需要支持图片分析？
A: 使用GPT-4V、Gemini Pro Vision等多模态模型

## 📞 技术支持

如果您在集成过程中遇到问题，可以：
1. 查看控制台错误日志
2. 检查API服务商的状态页面
3. 参考官方文档
4. 联系技术支持