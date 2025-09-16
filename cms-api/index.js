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
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['https://cms-demo-self.vercel.app']
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

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
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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

app.get('/api/test', (req, res) => {
  res.json({ message: 'CMS API服务运行正常！', timestamp: new Date().toISOString() });
});

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
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('正在关闭服务器...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('正在关闭服务器...');
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };