import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳 + 随机数 + 原始扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// 文件过滤器 - 只允许图片
const fileFilter = (req, file, cb) => {
  // 检查文件类型
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件！'), false);
  }
};

// 配置multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB限制
  }
});

// 上传单个图片
router.post('/image', authenticateToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请选择要上传的图片'
      });
    }

    // 构建图片URL
    const imageUrl = `/api/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      data: {
        imageUrl: imageUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('图片上传失败:', error);
    res.status(500).json({
      success: false,
      error: '图片上传失败'
    });
  }
});

// 上传多个图片
router.post('/images', authenticateToken, upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请选择要上传的图片'
      });
    }

    const images = req.files.map(file => ({
      imageUrl: `/api/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size
    }));
    
    res.json({
      success: true,
      data: {
        images: images
      }
    });
  } catch (error) {
    console.error('图片上传失败:', error);
    res.status(500).json({
      success: false,
      error: '图片上传失败'
    });
  }
});

// 删除图片
router.delete('/image/:filename', authenticateToken, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    
    // 检查文件是否存在
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({
        success: true,
        message: '图片删除成功'
      });
    } else {
      res.status(404).json({
        success: false,
        error: '图片不存在'
      });
    }
  } catch (error) {
    console.error('删除图片失败:', error);
    res.status(500).json({
      success: false,
      error: '删除图片失败'
    });
  }
});

export default router;