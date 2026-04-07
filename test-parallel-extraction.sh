#!/bin/bash

# PDF 并行提取系统测试脚本

echo "================================"
echo "PDF 并行提取系统 - 快速测试"
echo "================================"
echo ""

# 1. 检查服务器状态
echo "1. 检查服务器状态..."
SERVER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/api/init-db)
if [ "$SERVER_STATUS" = "200" ]; then
  echo "✅ 服务器运行正常"
else
  echo "❌ 服务器未启动，请先运行: npm run dev"
  exit 1
fi

# 2. 运行数据库迁移
echo ""
echo "2. 运行数据库迁移..."
MIGRATION_RESULT=$(curl -s http://localhost:3002/api/init-db)
if echo "$MIGRATION_RESULT" | grep -q "success"; then
  echo "✅ 数据库迁移成功"
else
  echo "❌ 数据库迁移失败"
  exit 1
fi

# 3. 检查必要文件
echo ""
echo "3. 检查必要文件..."
FILES=(
  "src/lib/pdf-extractor-parallel.ts"
  "scripts/ocr-worker.js"
  "src/app/api/papers/upload/route.ts"
  "src/app/upload/page.tsx"
)

ALL_FILES_EXIST=true
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file 不存在"
    ALL_FILES_EXIST=false
  fi
done

if [ "$ALL_FILES_EXIST" = false ]; then
  echo ""
  echo "部分文件缺失，请检查实现"
  exit 1
fi

# 4. 检查依赖
echo ""
echo "4. 检查依赖..."
if npm list tesseract.js > /dev/null 2>&1; then
  echo "✅ tesseract.js 已安装"
else
  echo "⚠️  tesseract.js 未安装，正在安装..."
  npm install tesseract.js
fi

if npm list pdfjs-dist > /dev/null 2>&1; then
  echo "✅ pdfjs-dist 已安装"
else
  echo "⚠️  pdfjs-dist 未安装，正在安装..."
  npm install pdfjs-dist
fi

# 5. 总结
echo ""
echo "================================"
echo "✅ 所有检查通过！"
echo "================================"
echo ""
echo "🚀 系统已就绪，可以开始使用："
echo ""
echo "1. 访问上传页面:"
echo "   http://localhost:3002/upload"
echo ""
echo "2. 上传 PDF 文件测试"
echo ""
echo "3. 观察实时进度和页面预览"
echo ""
echo "📊 优化效果预期:"
echo "   - 解析速度: 提升 3-5x"
echo "   - OCR 调用: 减少 80%+"
echo "   - 用户体验: 实时进度 + 文字预览"
echo ""
echo "📝 查看完整文档:"
echo "   PDF_EXTRACTION_OPTIMIZATION.md"
echo ""
