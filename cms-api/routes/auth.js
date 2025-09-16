import express from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword, generateToken, validatePassword } from '../utils/auth.js';
import { authenticateToken, requireAdmin, validateRequired } from '../middleware/auth.js';

const prisma = new PrismaClient();

const router = express.Router();

// 用户注册（管理员功能）
router.post('/register', authenticateToken, requireAdmin, validateRequired(['username', 'password']), async (req, res) => {
  try {
    const { username, password, email, role = 'USER' } = req.body;

    // 检查用户名是否已存在
    const existingUser = await prisma.cMSUser.findUnique({
      where: { username }
    });

    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 如果提供了email，检查是否已存在
    if (email) {
      const existingEmail = await prisma.cMSUser.findUnique({
        where: { email }
      });

      if (existingEmail) {
        return res.status(400).json({ error: '邮箱已存在' });
      }
    }

    // 创建用户
    const hashedPassword = await hashPassword(password);
    const user = await prisma.cMSUser.create({
      data: {
        username,
        password: hashedPassword,
        email: email || null,
        role: ['ADMIN', 'USER'].includes(role) ? role : 'USER'
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    // 记录操作日志
    await prisma.cMSOperationLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE',
        targetType: 'USER',
        targetId: user.id,
        description: `创建了新用户: ${username}`
      }
    });

    res.status(201).json({
      message: '用户创建成功',
      user
    });
  } catch (error) {
    console.error('用户注册失败:', error);
    res.status(500).json({ error: '用户注册失败' });
  }
});

// 用户登录
router.post('/login', validateRequired(['username', 'password']), async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查找用户
    const user = await prisma.cMSUser.findUnique({
      where: { username }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 验证密码
    const passwordValid = await comparePassword(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 生成JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    // 返回用户信息和token
    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('用户登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 获取当前用户信息
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.cMSUser.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    res.json({ user });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 更新用户信息
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;
    const updateData = {};

    // 如果要更新邮箱
    if (email !== undefined) {
      if (email && email !== req.user.email) {
        // 检查邮箱是否已被其他用户使用
        const existingEmail = await prisma.cMSUser.findFirst({
          where: {
            email,
            id: { not: req.user.id }
          }
        });

        if (existingEmail) {
          return res.status(400).json({ error: '邮箱已被其他用户使用' });
        }
      }
      updateData.email = email || null;
    }

    // 如果要更新密码
    if (newPassword) {
      if (!oldPassword) {
        return res.status(400).json({ error: '修改密码需要提供原密码' });
      }

      // 验证原密码
      const user = await prisma.cMSUser.findUnique({
        where: { id: req.user.id }
      });

      const passwordValid = await comparePassword(oldPassword, user.password);
      if (!passwordValid) {
        return res.status(400).json({ error: '原密码错误' });
      }

      // 验证新密码强度
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return res.status(400).json({ error: passwordValidation.message });
      }

      updateData.password = await hashPassword(newPassword);
    }

    // 更新用户信息
    const updatedUser = await prisma.cMSUser.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        updatedAt: true
      }
    });

    res.json({
      message: '用户信息更新成功',
      user: updatedUser
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ error: '更新用户信息失败' });
  }
});

// 获取所有用户（管理员功能）
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = search ? {
      OR: [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    const [users, total] = await Promise.all([
      prisma.cMSUser.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.cMSUser.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 更新用户状态（管理员功能）
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, role } = req.body;

    // 不能禁用自己
    if (id === req.user.id && isActive === false) {
      return res.status(400).json({ error: '不能禁用自己的账户' });
    }

    const updateData = {};
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }
    if (role && ['ADMIN', 'USER'].includes(role)) {
      updateData.role = role;
    }

    const updatedUser = await prisma.cMSUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    // 记录操作日志
    await prisma.cMSOperationLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        targetType: 'USER',
        targetId: id,
        description: `更新了用户 ${updatedUser.username} 的状态`
      }
    });

    res.json({
      message: '用户状态更新成功',
      user: updatedUser
    });
  } catch (error) {
    console.error('更新用户状态失败:', error);
    res.status(500).json({ error: '更新用户状态失败' });
  }
});

// 删除用户（管理员功能）
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 不能删除自己
    if (id === req.user.id) {
      return res.status(400).json({ error: '不能删除自己的账户' });
    }

    const user = await prisma.cMSUser.findUnique({
      where: { id },
      select: { username: true }
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    await prisma.cMSUser.delete({
      where: { id }
    });

    // 记录操作日志
    await prisma.cMSOperationLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE',
        targetType: 'USER',
        targetId: id,
        description: `删除了用户: ${user.username}`
      }
    });

    res.json({ message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

export default router;