import { v2 as cloudinary } from 'cloudinary';

// 配置Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * 上传图片到Cloudinary
 * @param {Buffer} imageBuffer - 图片缓冲区
 * @param {string} originalName - 原始文件名
 * @param {Object} options - 上传选项
 * @returns {Promise<Object>} 上传结果
 */
export const uploadImage = async (imageBuffer, originalName, options = {}) => {
  try {
    const {
      folder = 'cms-uploads',
      quality = 'auto',
      format = null, // 默认不转换格式，保留原始格式
      width,
      height,
      crop = 'fill'
    } = options;

    // 生成唯一文件名
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1E9);
    const ext = originalName.split('.').pop();
    const publicId = `cms-${timestamp}-${randomId}`;

    // 上传配置
    const uploadOptions = {
      folder,
      public_id: publicId,
      resource_type: 'auto',
      quality,
      ...(format && { fetch_format: format }), // 只有指定format时才添加
      ...(width && height && { width, height, crop })
    };

    // 转换为base64
    const base64Image = `data:image/${ext};base64,${imageBuffer.toString('base64')}`;

    // 上传到Cloudinary
    const result = await cloudinary.uploader.upload(base64Image, uploadOptions);

    return {
      success: true,
      data: {
        publicId: result.public_id,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        originalName
      }
    };
  } catch (error) {
    console.error('Cloudinary上传失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 生成图片变换URL
 * @param {string} publicId - Cloudinary公共ID
 * @param {Object} transformations - 变换参数
 * @returns {string} 变换后的图片URL
 */
export const generateImageUrl = (publicId, transformations = {}) => {
  const {
    width,
    height,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
    effect,
    color,
    brightness,
    contrast
  } = transformations;

  const options = {
    ...(width && height && { width, height, crop }),
    quality,
    fetch_format: format,
    ...(effect && { effect }),
    ...(color && { color }),
    ...(brightness && { brightness }),
    ...(contrast && { contrast })
  };

  return cloudinary.url(publicId, options);
};

/**
 * 删除Cloudinary中的图片
 * @param {string} publicId - 图片公共ID
 * @returns {Promise<Object>} 删除结果
 */
export const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      data: result
    };
  } catch (error) {
    console.error('删除图片失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 批量删除图片
 * @param {string[]} publicIds - 图片公共ID数组
 * @returns {Promise<Object>} 删除结果
 */
export const deleteImages = async (publicIds) => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('批量删除图片失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 获取图片信息
 * @param {string} publicId - 图片公共ID
 * @returns {Promise<Object>} 图片信息
 */
export const getImageInfo = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('获取图片信息失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 生成响应式图片URL
 * @param {string} publicId - 图片公共ID
 * @param {Object} options - 选项
 * @returns {Object} 不同尺寸的图片URL
 */
export const generateResponsiveImages = (publicId, options = {}) => {
  const sizes = options.sizes || [320, 640, 1024, 1920];
  const { quality = 'auto', format = 'auto' } = options;

  return sizes.map(width => ({
    width,
    url: generateImageUrl(publicId, {
      width,
      height: Math.round(width * 0.75), // 16:9比例
      crop: 'fill',
      quality,
      format
    })
  }));
};
