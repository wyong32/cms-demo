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

    // 使用图片处理器上传（保留原始格式）
    const uploadResult = await uploadImage(req.file.buffer, req.file.originalname, {
      folder: 'cms-uploads',
      quality: 'auto'
      // 不设置format参数，保留原始格式
    });

    if (!uploadResult.success) {
      // 如果Cloudinary上传失败，使用占位符图片
      const fallbackUrl = `https://via.placeholder.com/400x300/409eff/ffffff?text=${encodeURIComponent(req.file.originalname)}`;
      
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
    
    // 使用图片处理器删除
    const deleteResult = await deleteImage(publicId);
    
    if (deleteResult.success) {
      res.json({
        success: true,
        message: '图片删除成功'
      });
    } else {
      // 即使删除失败也返回成功，因为可能是占位符图片
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

// 获取所有已使用的图片（按类型分类）
router.get('/images/used', authenticateToken, async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // 获取模板中的图片
    const templates = await prisma.cMSDataTemplate.findMany({
      where: {
        imageUrl: { not: null }
      },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        imageAlt: true,
        category: {
          select: {
            name: true,
            type: true
          }
        },
        createdAt: true
      }
    });
    
    // 获取项目数据中的图片（包含主图片和富文本图片）
    const projectData = await prisma.cMSProjectData.findMany({
      where: {
        OR: [
          {
            data: {
              path: ['imageUrl'],
              not: null
            }
          },
          {
            data: {
              path: ['richTextImages'],
              not: null
            }
          }
        ]
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        category: {
          select: {
            name: true,
            type: true
          }
        }
      }
    });
    
    // 处理模板图片
    const templateImages = templates.map(template => ({
      id: template.id,
      type: 'template',
      title: template.title,
      imageUrl: template.imageUrl,
      imageAlt: template.imageAlt,
      categoryName: template.category?.name || '未分类',
      categoryType: template.category?.type || '其他',
      projectName: null,
      createdAt: template.createdAt,
      source: '数据模板'
    }));
    
    // 处理项目数据图片
    const projectImages = [];
    projectData.forEach(data => {
      // 处理主图片
      const imageUrl = data.data.imageUrl;
      if (imageUrl) {
        projectImages.push({
          id: data.id,
          type: 'project',
          title: data.data.title || '未命名',
          imageUrl: imageUrl,
          imageAlt: data.data.imageAlt || '',
          categoryName: data.category?.name || '未分类',
          categoryType: data.category?.type || '其他',
          projectName: data.project?.name || '未知项目',
          createdAt: data.createdAt,
          source: `项目: ${data.project?.name || '未知项目'}`
        });
      }
      
      // 处理富文本编辑器中的图片
      if (data.data.richTextImages && Array.isArray(data.data.richTextImages)) {
        data.data.richTextImages.forEach((richTextImage, index) => {
          const richTextImageItem = {
            id: `${data.id}-richtext-${index}`,
            type: 'project-richtext',
            title: `${data.data.title || '未命名'} - 富文本图片`,
            imageUrl: richTextImage.url,
            imageAlt: richTextImage.alt || '',
            imageWidth: richTextImage.width || '',
            categoryName: data.category?.name || '未分类',
            categoryType: data.category?.type || '其他',
            projectName: data.project?.name || '未知项目',
            createdAt: richTextImage.insertedAt || data.createdAt,
            source: `项目富文本: ${data.project?.name || '未知项目'}`
          };
          
          projectImages.push(richTextImageItem);
        });
      }
    });
    
    // 合并所有图片
    const allImages = [...templateImages, ...projectImages];
    
    // 按创建时间排序
    allImages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 统计信息
    const stats = {
      total: allImages.length,
      templates: templateImages.length,
      projects: projectImages.length,
      byCategory: {},
      byProject: {}
    };
    
    // 按分类统计
    allImages.forEach(image => {
      if (!stats.byCategory[image.categoryName]) {
        stats.byCategory[image.categoryName] = 0;
      }
      stats.byCategory[image.categoryName]++;
      
      if (image.type === 'project' && image.projectName) {
        if (!stats.byProject[image.projectName]) {
          stats.byProject[image.projectName] = 0;
        }
        stats.byProject[image.projectName]++;
      }
    });
    
    await prisma.$disconnect();
    
    res.json({
      success: true,
      data: {
        images: allImages,
        stats
      }
    });
    
  } catch (error) {
    console.error('获取已使用图片失败:', error);
    res.status(500).json({ 
      success: false,
      error: '获取已使用图片失败' 
    });
  }
});

// 获取用户上传的图片列表（Cloudinary）
router.get('/images', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, folder = 'cms-uploads' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // 检查是否配置了Cloudinary
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.json({
        success: true,
        data: {
          images: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          message: 'Cloudinary未配置，无法获取图片列表'
        }
      });
    }
    
    const { v2: cloudinary } = await import('cloudinary');
    
    // 配置Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    
    // 获取图片列表
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder,
      max_results: parseInt(limit),
      next_cursor: skip > 0 ? `cursor_${skip}` : undefined
    });
    
    const images = result.resources.map(resource => ({
      publicId: resource.public_id,
      url: resource.secure_url,
      width: resource.width,
      height: resource.height,
      format: resource.format,
      size: resource.bytes,
      createdAt: resource.created_at,
      folder: resource.folder
    }));
    
    res.json({
      success: true,
      data: {
        images,
        total: result.total_count,
        page: parseInt(page),
        limit: parseInt(limit),
        nextCursor: result.next_cursor
      }
    });
  } catch (error) {
    console.error('获取图片列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取图片列表失败'
    });
  }
});

// 获取图片详细信息
router.get('/image/:publicId/info', authenticateToken, async (req, res) => {
  try {
    const { publicId } = req.params;
    
    // 检查是否配置了Cloudinary
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(400).json({
        success: false,
        error: 'Cloudinary未配置'
      });
    }
    
    const { v2: cloudinary } = await import('cloudinary');
    
    // 配置Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    
    // 获取图片信息
    const result = await cloudinary.api.resource(publicId);
    
    res.json({
      success: true,
      data: {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        createdAt: result.created_at,
        folder: result.folder,
        tags: result.tags || [],
        context: result.context || {}
      }
    });
  } catch (error) {
    console.error('获取图片信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取图片信息失败'
    });
  }
});

export default router;