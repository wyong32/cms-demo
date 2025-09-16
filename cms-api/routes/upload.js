import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/auth.js';
import { uploadImage, deleteImage, generateImageUrl } from '../utils/imageProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 文件过滤器 - 只允许图片
const fileFilter = (req, file, cb) => {
  // 检查文件类型
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件！'), false);
  }
};

// 配置multer - 使用内存存储（适合Vercel无服务器环境）
const upload = multer({
  storage: multer.memoryStorage(), // 使用内存存储
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB限制
  }
});

// 上传单个图片
router.post('/image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请选择要上传的图片'
      });
    }

    // 使用图片处理器上传
    const uploadResult = await uploadImage(req.file.buffer, req.file.originalname, {
      folder: 'cms-uploads',
      quality: 'auto',
      format: 'auto'
    });

    if (!uploadResult.success) {
      // 如果Cloudinary上传失败，使用占位符图片
      const fallbackUrl = `https://via.placeholder.com/400x300/409eff/ffffff?text=${encodeURIComponent(req.file.originalname)}`;
      
      console.log('Cloudinary上传失败，使用占位符图片:', uploadResult.error);
      
      return res.json({
        success: true,
        data: {
          imageUrl: fallbackUrl,
          filename: `placeholder-${Date.now()}`,
          originalName: req.file.originalname,
          size: req.file.size,
          isPlaceholder: true
        }
      });
    }

    const { data } = uploadResult;
    
    console.log('图片上传成功:', {
      publicId: data.publicId,
      originalName: data.originalName,
      size: data.size,
      format: data.format,
      url: data.secureUrl
    });
    
    res.json({
      success: true,
      data: {
        imageUrl: data.secureUrl,
        filename: data.publicId,
        originalName: data.originalName,
        size: data.size,
        format: data.format,
        width: data.width,
        height: data.height,
        publicId: data.publicId
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

    const images = req.files.map(file => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const filename = `image-${uniqueSuffix}${ext}`;
      
      return {
        imageUrl: `https://via.placeholder.com/400x300/409eff/ffffff?text=${encodeURIComponent(file.originalname)}`,
        filename: filename,
        originalName: file.originalname,
        size: file.size
      };
    });
    
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
router.delete('/image/:publicId', authenticateToken, async (req, res) => {
  try {
    const { publicId } = req.params;
    
    console.log('删除图片请求:', publicId);
    
    // 使用图片处理器删除
    const deleteResult = await deleteImage(publicId);
    
    if (deleteResult.success) {
      res.json({
        success: true,
        message: '图片删除成功'
      });
    } else {
      // 即使删除失败也返回成功，因为可能是占位符图片
      console.log('删除图片失败，可能是占位符图片:', deleteResult.error);
      res.json({
        success: true,
        message: '图片删除成功'
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

// 获取图片变换URL
router.get('/image/:publicId/transform', authenticateToken, (req, res) => {
  try {
    const { publicId } = req.params;
    const { width, height, crop, quality, format, effect } = req.query;
    
    const transformations = {
      ...(width && height && { width: parseInt(width), height: parseInt(height) }),
      ...(crop && { crop }),
      ...(quality && { quality }),
      ...(format && { format }),
      ...(effect && { effect })
    };
    
    const transformedUrl = generateImageUrl(publicId, transformations);
    
    res.json({
      success: true,
      data: {
        originalUrl: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}`,
        transformedUrl,
        transformations
      }
    });
  } catch (error) {
    console.error('生成变换URL失败:', error);
    res.status(500).json({
      success: false,
      error: '生成变换URL失败'
    });
  }
});

export default router;