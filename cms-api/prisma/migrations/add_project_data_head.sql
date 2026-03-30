-- 项目数据表增加 head 字段（操作页生成代码用）
ALTER TABLE "cms_project_data" ADD COLUMN IF NOT EXISTS "head" TEXT;
