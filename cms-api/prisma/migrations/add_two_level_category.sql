-- 添加二层分类支持
-- 此文件用于手动执行SQL迁移，因为Prisma自动迁移可能不支持某些操作

-- 1. 添加新字段
ALTER TABLE cms_categories 
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS parent_id TEXT,
ADD COLUMN IF NOT EXISTS order_num INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. 添加索引
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON cms_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_level ON cms_categories(level);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON cms_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_order ON cms_categories(order_num);

-- 3. 添加外键约束（延迟到数据迁移完成后）
-- ALTER TABLE cms_categories 
-- ADD CONSTRAINT fk_categories_parent 
-- FOREIGN KEY (parent_id) REFERENCES cms_categories(id) ON DELETE CASCADE;

-- 4. 更新现有数据
-- 将所有现有分类标记为二级分类
UPDATE cms_categories 
SET level = 2, is_active = true, order_num = 0
WHERE level IS NULL;

-- 5. 创建一级分类（在数据迁移脚本中执行）
-- INSERT INTO cms_categories (id, name, type, description, level, parent_id, order_num, is_active, created_by, created_at, updated_at)
-- VALUES 
--   ('game_cat_' || extract(epoch from now())::text, '游戏', '游戏', '各种类型的游戏分类', 1, NULL, 1, true, 'system-migration', now(), now()),
--   ('movie_cat_' || extract(epoch from now())::text, '电影', '电影', '电影和视频内容', 1, NULL, 2, true, 'system-migration', now(), now()),
--   ('video_cat_' || extract(epoch from now())::text, '视频', '视频', '短视频和教程内容', 1, NULL, 3, true, 'system-migration', now(), now());

-- 注意：实际的一级分类创建和数据关联需要在迁移脚本中执行
-- 因为需要动态获取创建的一级分类ID


