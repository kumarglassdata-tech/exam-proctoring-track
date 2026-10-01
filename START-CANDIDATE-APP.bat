@echo off
title ExamGuard Candidate App
color 0A
echo.
echo  ==========================================
echo   ExamGuard - Starting Candidate App...
echo  ==========================================
echo.

:: Set fresh WebView2 data folder to avoid Edge conflicts
set WEBVIEW2_USER_DATA_FOLDER=C:\Temp\ExamGuardWV2
if not exist "C:\Temp\ExamGuardWV2" mkdir "C:\Temp\ExamGuardWV2"

:: Add cargo to PATH
set PATH=%USERPROFILE%\.cargo\bin;%PATH%

echo [1/2] Starting Vite dev server on port 5173...
start "Vite Dev Server" /min cmd /c "cd /d c:\Users\nchar\OneDrive\Desktop\exam_guard\examguard-client && npm run dev"

echo Waiting for Vite to be ready...
timeout /t 5 /nobreak >nul

echo [2/2] Launching ExamGuard native window...
cd /d c:\Users\nchar\OneDrive\Desktop\exam_guard\examguard-client
c:\Users\nchar\OneDrive\Desktop\exam_guard\examguard-client\src-tauri\target\debug\examguard-client.exe

pause
