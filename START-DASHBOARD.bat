@echo off
title ExamGuard Dashboard
color 0B
echo.
echo  ==========================================
echo   ExamGuard - Starting Recruiter Dashboard
echo  ==========================================
echo.
echo Dashboard will be at: http://localhost:3000
echo Login: recruiter@examguard.com / password123
echo.
cd /d "%~dp0dashboard"
npm run dev -- -H 0.0.0.0
pause
