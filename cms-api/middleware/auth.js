import { verifyToken } from '../utils/auth.js';
import { prisma } from '../index.js';

// JWT认证中间件
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: '访问令牌缺失' });
    }

    const decoded = verifyToken(token);
    
    // 验证用户是否仍然存在且活跃
    const user = await prisma.cMSUser.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: '用户不存在或已禁用' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token验证失败:', error);
    return res.status(403).json({ error: '访问令牌无效' });
  }
};

// 管理员权限验证中间件
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
};

// 用户权限验证中间件（包括管理员）
export const requireUser = (req, res, next) => {
  if (!['ADMIN', 'USER'].includes(req.user.role)) {
    return res.status(403).json({ error: '权限不足' });
  }
  next();
};

// 验证请求参数中间件
export const validateRequired = (fields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    fields.forEach(field => {
      if (!req.body[field] || (typeof req.body[field] === 'string' && req.body[field].trim() === '')) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `缺少必填字段: ${missingFields.join(', ')}` 
      });
    }

    next();
  };
};

// 请求体大小限制中间件
export const validateBodySize = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.get('content-length');
    
    if (contentLength && parseInt(contentLength) > parseInt(maxSize) * 1024 * 1024) {
      return res.status(413).json({ error: '请求体过大' });
    }
    
    next();
  };
};