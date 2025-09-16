import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// 路由导入
import authRoutes from './routes/auth.js';
import categoriesRoutes from './routes/categories.js';
import templatesRoutes from './routes/templates.js';
import projectsRoutes from './routes/projects.js';
import projectDataRoutes from './routes/project-data.js';
import logsRoutes from './routes/logs.js';
import uploadRoutes from './routes/upload.js';
import aiRoutes from './routes/ai.js';
import statsRoutes from './routes/stats.js';

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();

// 检查环境变量
console.log('🔧 环境检查:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? '已设置' : '未设置');
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '已设置' : '未设置');
console.log('- PORT:', process.env.PORT || 3001);
console.log('- CORS_ORIGIN:', process.env.CORS_ORIGIN || '默认配置');

// 延迟创建 Prisma 客户端，避免启动时错误
let prisma;
try {
  prisma = new PrismaClient();
  console.log('✅ Prisma 客户端创建成功');
} catch (error) {
  console.error('❌ Prisma 客户端创建失败:', error);
  prisma = null;
}

const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(helmet());
// CORS配置
const corsOptions = {
  origin: function (origin, callback) {
    // 允许的源列表
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['https://cms-demo-self.vercel.app'])
      : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];
    
    // 允许没有origin的请求（如移动应用）
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP每15分钟最多100个请求
  message: '请求过于频繁，请稍后再试'
});
app.use('/api/', limiter);

// JSON解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 提供上传的图片访问
app.use('/api/uploads', express.static('uploads'));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: process.env.DATABASE_URL ? 'Connected' : 'Not configured'
  });
});

// 简单的测试端点
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'CMS API服务运行正常！', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/project-data', projectDataRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/stats', statsRoutes);


// 404处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' ? '服务器内部错误' : error.message 
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 CMS API服务已启动在端口 ${PORT}`);
  console.log(`💻 本地访问地址: http://localhost:${PORT}`);
  console.log(`🔍 API测试地址: http://localhost:${PORT}/api/test`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️ 数据库URL: ${process.env.DATABASE_URL ? '已配置' : '未配置'}`);
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('正在关闭服务器...');
  if (prisma) {
    await prisma.$disconnect();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('正在关闭服务器...');
  if (prisma) {
    await prisma.$disconnect();
  }
  process.exit(0);
});

// 注意：Prisma 客户端现在在各个路由文件中独立创建