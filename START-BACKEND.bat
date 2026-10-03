@echo off
title ExamGuard Backend API
color 0E
echo.
echo  ==========================================
echo   ExamGuard - Starting Backend API
echo  ==========================================
echo.
echo API running at: http://localhost:8000
echo API Docs at:    http://localhost:8000/docs
echo.
cd /d "%~dp0backend"
python -m uvicorn app.main:app --port 8000 --reload --host 0.0.0.0
pause
