#!/bin/bash

# AI Provider System Test Script
# 无需浏览器，完全通过命令行测试

BASE_URL="http://localhost:3004"
LIT_ID=55

echo "======================================"
echo "AI Provider System 测试"
echo "======================================"
echo ""

# Test 1: 基本连接测试
echo "📡 测试 1: 服务器连接..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" --connect-timeout 5)
if [ "$response" = "200" ]; then
  echo "✅ 服务器正常运行 (HTTP $response)"
else
  echo "❌ 服务器无响应 (HTTP $response)"
  exit 1
fi
echo ""

# Test 2: 短摘要测试
echo "📝 测试 2: 生成短摘要..."
echo "GET /api/literature/$LIT_ID/summary?length_level=short"
result=$(curl -s -X POST "$BASE_URL/api/literature/$LIT_ID/summary" \
  -H "Content-Type: application/json" \
  -d '{"length_level":"short"}' \
  -w "\n---HTTP_CODE:%{http_code}---")
echo "$result" | grep -A 100 "HTTP_CODE"
echo ""

# Test 3: 中等摘要测试
echo "📄 测试 3: 生成中等摘要..."
echo "POST /api/literature/$LIT_ID/summary?length_level=medium"
result=$(curl -s -X POST "$BASE_URL/api/literature/$LIT_ID/summary" \
  -H "Content-Type: application/json" \
  -d '{"length_level":"medium"}' \
  -w "\n---HTTP_CODE:%{http_code}---")
echo "$result" | grep -A 100 "HTTP_CODE"
echo ""

# Test 4: 聊天功能测试
echo "💬 测试 4: 聊天功能..."
echo "POST /api/literature/$LIT_ID/chat"
result=$(curl -s -X POST "$BASE_URL/api/literature/$LIT_ID/chat" \
  -H "Content-Type: application/json" \
  -d '{"question":"What is the main contribution?"}' \
  -w "\n---HTTP_CODE:%{http_code}---")
echo "$result" | grep -A 100 "HTTP_CODE"
echo ""

# Test 5: 洞察提取测试
echo "🔍 测试 5: 提取洞察..."
echo "GET /api/literature/$LIT_ID/insights"
result=$(curl -s "$BASE_URL/api/literature/$LIT_ID/insights" \
  -w "\n---HTTP_CODE:%{http_code}---")
echo "$result" | grep -A 100 "HTTP_CODE"
echo ""

echo "======================================"
echo "✅ 测试完成！"
echo "======================================"
