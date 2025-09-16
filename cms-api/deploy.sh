#!/bin/bash

# CMS API 部署脚本

echo "🚀 开始部署 CMS API 到 Vercel..."

# 检查是否安装了 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ 请先安装 Vercel CLI: npm i -g vercel"
    exit 1
fi

# 检查是否已登录 Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 请先登录 Vercel: vercel login"
    exit 1
fi

# 生成 Prisma 客户端
echo "📦 生成 Prisma 客户端..."
npx prisma generate

# 推送数据库模式
echo "🗄️ 推送数据库模式..."
npx prisma db push

# 部署到 Vercel
echo "🚀 部署到 Vercel..."
vercel --prod

echo "✅ 部署完成！"
echo "🌐 API 地址: https://cms-demo-api.vercel.app"
