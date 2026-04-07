@echo off
REM AI PDF 智能解析系统 - 快速启动脚本 (Windows)

echo ======================================
echo AI PDF 智能解析系统 - 快速启动
echo ======================================
echo.

REM 检查Python
echo [1/5] 检查Python环境...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python 未安装，请先安装Python
    pause
    exit /b 1
)
echo ✅ Python 已安装
python --version

REM 安装Python依赖
echo.
echo [2/5] 安装Python依赖...
pip install PyPDF2

REM 创建数据目录
echo.
echo [3/5] 创建数据目录...
if not exist "data" mkdir data
if not exist "uploads" mkdir uploads
echo ✅ 目录创建完成

REM 初始化数据库
echo.
echo [4/5] 初始化数据库...
node scripts/init-enhanced-db.js

REM 检查.env.local
echo.
echo [5/5] 检查AI密钥配置...
if not exist .env.local (
    echo ⚠️  .env.local 文件不存在
    echo 请创建 .env.local 文件并添加AI密钥：
    echo.
    echo OPENAI_API_KEY=sk-xxx...
    echo DEEPSEEK_API_KEY=sk-xxx...
    echo ZHIPU_API_KEY=xxx...
    echo.
) else (
    echo ✅ .env.local 文件存在
)

echo.
echo ======================================
echo ✨ 初始化完成！
echo ======================================
echo.
echo 🚀 启动开发服务器：
echo    npm run dev
echo.
echo 📖 访问增强上传页面：
echo    http://localhost:3000/upload/enhanced
echo.
echo 📚 查看完整文档：
echo    docs/ENHANCED_PDF_GUIDE.md
echo.
pause
