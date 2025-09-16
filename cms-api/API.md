# CMS API 文档

## 基础信息
- 基础URL: `http://localhost:3001/api`
- 所有需要认证的接口都需要在Header中添加: `Authorization: Bearer <token>`

## 认证相关 (/api/auth)

### 登录
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "wanghuan1235789"
}
```

### 获取当前用户信息
```
GET /api/auth/me
Authorization: Bearer <token>
```

### 注册新用户（管理员功能）
```
POST /api/auth/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "testuser",
  "password": "TestUser123!",
  "email": "test@example.com",
  "role": "USER"
}
```

### 获取所有用户（管理员功能）
```
GET /api/auth/users?page=1&limit=10&search=admin
Authorization: Bearer <token>
```

## 分类管理 (/api/categories)

### 获取所有分类
```
GET /api/categories?page=1&limit=20&search=游戏
Authorization: Bearer <token>
```

### 创建分类
```
POST /api/categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "游戏",
  "type": "游戏类型",
  "description": "游戏项目分类"
}
```

### 更新分类
```
PUT /api/categories/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "更新后的分类名",
  "type": "更新后的类型",
  "description": "更新后的描述"
}
```

### 删除分类
```
DELETE /api/categories/:id
Authorization: Bearer <token>
```

## 数据模板管理 (/api/templates)

### 获取所有数据模板
```
GET /api/templates?page=1&limit=20&categoryId=xxx&search=游戏
Authorization: Bearer <token>
```

### 创建数据模板
```
POST /api/templates
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "示例游戏",
  "categoryId": "分类ID",
  "iframeUrl": "https://example.com",
  "description": "这是一个示例游戏",
  "tags": ["动作", "冒险"],
  "imageUrl": "https://example.com/image.jpg",
  "imageAlt": "游戏截图",
  "seoTitle": "SEO标题",
  "seoDescription": "SEO描述",
  "seoKeywords": "游戏,动作,冒险",
  "addressBar": "https://example.com/game",
  "detailsHtml": "<p>游戏详细介绍</p>"
}
```

## 项目管理 (/api/projects)

### 获取所有项目
```
GET /api/projects?page=1&limit=20&search=项目名
Authorization: Bearer <token>
```

### 创建项目（管理员功能）
```
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "我的项目",
  "description": "项目描述",
  "fields": [
    {
      "fieldName": "customField1",
      "fieldType": "STRING",
      "isRequired": true
    },
    {
      "fieldName": "customArray",
      "fieldType": "ARRAY",
      "isRequired": false
    }
  ]
}
```

### 获取项目简化列表
```
GET /api/projects/simple/list
Authorization: Bearer <token>
```

## 项目数据管理 (/api/project-data)

### 获取项目数据列表
```
GET /api/project-data?projectId=xxx&isCompleted=false&page=1&limit=20
Authorization: Bearer <token>
```

### 创建项目数据
```
POST /api/project-data
Authorization: Bearer <token>
Content-Type: application/json

{
  "projectId": "项目ID",
  "categoryId": "分类ID（可选）",
  "data": {
    "title": "数据标题",
    "description": "数据描述",
    "tags": ["标签1", "标签2"]
  }
}
```

### 从模板创建项目数据
```
POST /api/project-data/from-template
Authorization: Bearer <token>
Content-Type: application/json

{
  "projectId": "项目ID",
  "templateId": "模板ID",
  "categoryId": "分类ID（可选）"
}
```

### 标记为已完成
```
PUT /api/project-data/:id/complete
Authorization: Bearer <token>
```

### 生成JS代码片段
```
GET /api/project-data/:id/generate-code
Authorization: Bearer <token>
```

## 日志管理 (/api/logs)

### 获取操作日志
```
GET /api/logs?page=1&limit=50&action=CREATE&targetType=PROJECT
Authorization: Bearer <token>
```

### 获取统计概览
```
GET /api/logs/stats/overview
Authorization: Bearer <token>
```

### 获取最近活动
```
GET /api/logs/recent/activities?limit=10
Authorization: Bearer <token>
```

## 常用状态码
- 200: 成功
- 201: 创建成功
- 400: 请求参数错误
- 401: 未授权
- 403: 权限不足
- 404: 资源不存在
- 500: 服务器内部错误

## 默认管理员账户
- 用户名: admin
- 密码: Admin123!

## 注意事项
1. 所有需要认证的接口都需要在Header中添加JWT token
2. 管理员可以创建项目和用户，普通用户只能操作数据
3. 删除操作会检查关联关系，有关联数据的资源无法删除
4. 所有操作都会记录在操作日志中