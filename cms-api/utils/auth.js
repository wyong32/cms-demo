import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// JWT工具函数
export const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '24h' // 24小时过期
  });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Token无效或已过期');
  }
};

// 密码工具函数
export const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// 验证密码强度
export const validatePassword = (password) => {
  if (password.length < 8) {
    return { valid: false, message: '密码长度至少8位' };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return { 
      valid: false, 
      message: '密码必须包含大写字母、小写字母和数字' 
    };
  }
  
  return { valid: true, message: '密码符合要求' };
};

// 生成随机密码
export const generateRandomPassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};