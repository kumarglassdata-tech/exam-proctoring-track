@echo off
title ExamGuard Candidate Desktop App
echo ========================================================
echo   Launching ExamGuard Native Windows Desktop Application
echo ========================================================
echo.
cd /d "c:\Users\nchar\OneDrive\Desktop\exam_guard\examguard-client"
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
npm run tauri dev
pause
