#!/bin/bash

# AI PDF 智能解析系统 - 快速启动脚本

echo "🚀 AI PDF 智能解析系统 - 快速启动"
echo "======================================"
echo ""

# 检查Python
echo "📦 检查Python环境..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装，请先安装Python3"
    exit 1
fi
echo "✅ Python3 已安装: $(python3 --version)"

# 安装Python依赖
echo ""
echo "📦 安装Python依赖..."
pip3 install PyPDF2

# 创建数据目录
echo ""
echo "📁 创建数据目录..."
mkdir -p data
mkdir -p uploads

# 初始化数据库
echo ""
echo "🗄️  初始化数据库..."
node scripts/init-enhanced-db.js

# 检查.env.local
echo ""
echo "🔑 检查AI密钥配置..."
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local 文件不存在"
    echo "请创建 .env.local 文件并添加AI密钥："
    echo ""
    echo "OPENAI_API_KEY=sk-xxx..."
    echo "DEEPSEEK_API_KEY=sk-xxx..."
    echo "ZHIPU_API_KEY=xxx..."
    echo ""
else
    echo "✅ .env.local 文件存在"
fi

echo ""
echo "✨ 初始化完成！"
echo ""
echo "🚀 启动开发服务器："
echo "   npm run dev"
echo ""
echo "📖 访问增强上传页面："
echo "   http://localhost:3000/upload/enhanced"
echo ""
echo "📚 查看完整文档："
echo "   docs/ENHANCED_PDF_GUIDE.md"
echo ""
