# PDF 文本提取修复 - 完整解决方案

## 问题诊断

### ✅ 好消息
- **pdf-parse 1.1.1 完全工作正常**
- 独立测试成功：提取了 13,390 个字符
- Node.js 环境下无需 worker，开箱即用

### ❅ 问题所在
- **Next.js 开发服务器缓存问题**
- 服务器仍在使用旧的编译代码
- 新的 `pdf-extractor-simple.ts` 未被编译

---

## 立即解决方案

### 方案 1：重启开发服务器（推荐）

```bash
# 1. 停止当前开发服务器（Ctrl+C 或关闭终端）

# 2. 重新启动
npm run dev

# 3. 访问上传页面
# http://localhost:3002/upload

# 4. 上传 PDF 文件测试
```

### 方案 2：清除缓存后访问

```bash
# 删除 .next 缓存已完成
# 触发完整编译（而不是增量编译）
curl http://localhost:3002/api/papers/upload
```

---

## 验证修复

上传 PDF 后，查看服务器日志应该显示：

```
[PDF Extractor] Starting extraction for: uploads/...
[PDF Extractor] ✅ Success:
  - Pages: X
  - Characters: XXXX
  - Method: pdf-parse
```

而不是：
```
[Extractor] pdfjs failed, using OCR fallback
```

---

## 代码变更摘要

### 已修改的文件：
1. **src/lib/pdf-extractor-simple.ts** - 新的可靠提取器
2. **src/app/api/papers/upload/route.ts** - 使用新提取器
3. **package.json** - 降级到 pdf-parse@1.1.1

### 核心代码：
```typescript
// pdf-parse 1.1.1 直接使用
const pdfParse = require('pdf-parse');
const dataBuffer = fs.readFileSync(filePath);
const data = await pdfParse(dataBuffer); // 返回 Promise
const text = data.text; // 提取的文本
```

---

## 下次上传后的预期结果

1. **上传立即返回** paperId
2. **后台异步提取** 文本
3. **提取成功后**：
   - `extractedText` 包含完整文本
   - `totalPages` 显示页数
   - `extractionMethod` 显示 "pdf-parse"
4. **AI 对话和摘要功能** 可以访问文本

---

## 故障排查

如果重启后仍然失败：

### 检查 1：确认 pdf-parse 版本
```bash
npm list pdf-parse
# 应该显示 pdf-parse@1.1.1
```

### 检查 2：独立测试
```bash
node test-pdf-parse.js "uploads/your-file.pdf"
# 应该成功提取文本
```

### 检查 3：查看服务器日志
- 找到 `[PDF Extractor]` 开头的日志
- 确认显示 `✅ Success` 而不是 `❌ Failed`

---

## 为什么之前失败了？

1. **pdfjs-dist** 需要 worker 文件
   - Next.js Webpack 环境下无法找到 worker 文件
   - 错误：`Cannot find module './pdf.worker.js'`

2. **pdf-parse 2.4.5** API 完全不同
   - 新版本使用 ESM 和不同的 API
   - 与旧代码不兼容

3. **解决方案**
   - 降级到 pdf-parse@1.1.1
   - 使用 `require('pdf-parse')` 直接调用
   - 无需 worker，无需配置

---

## 当前状态

- ✅ pdf-parse@1.1.1 已安装
- ✅ 代码已更新为使用 pdf-parse
- ⏳ 等待 Next.js 重新编译
- 🔄 需要重启服务器或等待完整编译

---

**下一步：重启开发服务器，然后上传 PDF 测试。**

服务器地址: http://localhost:3002/upload
