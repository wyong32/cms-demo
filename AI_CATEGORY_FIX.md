# AI生成项目数据分类丢失问题修复

## 🐛 问题描述

**用户反馈**：项目数据中添加数据后，再次编辑数据分类没有了。AI生成的时候选择了分类，但编辑时分类项没有获取到。

**根本原因**：
1. AI生成项目数据时，没有将用户选择的`categoryId`保存到数据库
2. 编辑时无法获取到分类信息，因为数据库中`categoryId`字段为空

## 🔧 修复内容

### 1. 修复AI生成项目数据时的分类保存

**修改文件**：`cms-api/routes/ai.js`

**修改前**：
```javascript
createdItem = await prisma.cMSProjectData.create({
  data: {
    projectId,
    // 缺少 categoryId
    data: {
      title: aiGeneratedData.title,
      // ... 其他数据
    },
    isCompleted: false,
    createdBy: req.user.id
  },
  include: {
    project: { /* ... */ },
    creator: { /* ... */ }
    // 缺少 category 信息
  }
});
```

**修改后**：
```javascript
createdItem = await prisma.cMSProjectData.create({
  data: {
    projectId,
    categoryId: categoryId || null, // 添加分类ID
    data: {
      title: aiGeneratedData.title,
      // ... 其他数据
    },
    isCompleted: false,
    createdBy: req.user.id
  },
  include: {
    project: { /* ... */ },
    category: { // 添加分类信息
      select: {
        id: true,
        name: true,
        type: true
      }
    },
    creator: { /* ... */ }
  }
});
```

### 2. 增强前端调试信息

**修改文件**：`cms-demo/src/views/ProjectDataEdit.vue`

**添加调试日志**：
```javascript
if (import.meta.env.DEV) {
  console.log('🔍 加载的项目数据详情:', {
    id: projectData.id,
    categoryId: projectData.categoryId,
    category: projectData.category,
    data: projectData.data
  });
  console.log('🔍 设置分类ID:', projectData.categoryId || '');
  console.log('🔍 填充后的表单数据:', form.data);
}
```

## 🎯 修复效果

### 修复前的问题
- ❌ AI生成时选择的分类没有保存到数据库
- ❌ 编辑项目数据时分类字段为空
- ❌ 用户需要重新选择分类
- ❌ 数据一致性问题

### 修复后的效果
- ✅ AI生成时正确保存用户选择的分类
- ✅ 编辑时能正确显示和编辑分类
- ✅ 数据一致性得到保证
- ✅ 用户体验改善

## 🧪 测试场景

### 测试步骤
1. **AI生成项目数据**：
   - 选择项目
   - 选择分类
   - 填写基本信息
   - 点击AI生成
   - 保存数据

2. **编辑项目数据**：
   - 进入项目数据列表
   - 点击编辑刚创建的数据
   - 检查分类字段是否正确显示

### 预期结果
- AI生成的数据保存时包含正确的分类ID
- 编辑时分类字段显示为AI生成时选择的分类
- 用户可以修改分类或保持原分类

## 📊 技术细节

### 数据库字段
```sql
-- CMSProjectData 表
CREATE TABLE cms_project_data (
  id VARCHAR PRIMARY KEY,
  projectId VARCHAR NOT NULL,
  categoryId VARCHAR, -- 分类ID字段
  data JSON NOT NULL,
  isCompleted BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  createdBy VARCHAR NOT NULL
);
```

### API参数传递
```javascript
// AI生成请求
POST /api/ai/generate
{
  "type": "project",
  "projectId": "project_id",
  "categoryId": "category_id", // 用户选择的分类
  "title": "标题",
  "description": "描述"
}
```

### 数据返回结构
```javascript
// 创建后的项目数据返回
{
  "projectData": {
    "id": "data_id",
    "projectId": "project_id",
    "categoryId": "category_id", // 保存的分类ID
    "data": { /* 项目数据 */ },
    "category": { // 分类详细信息
      "id": "category_id",
      "name": "分类名称",
      "type": "分类类型"
    },
    "project": { /* 项目信息 */ },
    "creator": { /* 创建者信息 */ }
  }
}
```

## 🚀 部署说明

1. **后端部署**：更新 `cms-api` 应用
2. **前端部署**：更新 `cms-demo` 应用（调试信息）
3. **测试验证**：按照测试场景验证修复效果
4. **数据迁移**：现有数据需要手动更新分类（如需要）

## ✅ 验证清单

- [x] 修复AI生成时的分类保存
- [x] 添加分类信息到返回数据
- [x] 增强前端调试信息
- [x] 文档更新完成

---

**修复日期**：2025年1月
**修复人员**：AI Assistant
**影响范围**：AI生成项目数据功能
**优先级**：高（数据一致性问题）


