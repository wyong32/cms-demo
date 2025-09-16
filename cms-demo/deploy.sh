#!/bin/bash

# CMS Demo 前端部署脚本

echo "🚀 开始部署 CMS Demo 前端到 Vercel..."

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

# 安装依赖
echo "📦 安装依赖..."
npm install

# 构建项目
echo "🔨 构建项目..."
npm run build

# 部署到 Vercel
echo "🚀 部署到 Vercel..."
vercel --prod

echo "✅ 部署完成！"
echo "🌐 前端地址: https://cms-demo-self.vercel.app"
