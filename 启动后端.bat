@echo off
chcp 65001 >nul
cd /d "%~dp0backend"
echo ============================
echo   非遗知识库 RAG 后端服务
echo ============================
echo.
echo 正在启动...
echo 服务地址: http://localhost:8000
echo API 文档: http://localhost:8000/docs
echo.
echo 关闭此窗口即可停止服务
echo ============================
set OPENBLAS_NUM_THREADS=1
python main.py
pause
