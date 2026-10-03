@echo off
title ExamGuard Candidate App
color 0A
echo.
echo  ==========================================
echo   ExamGuard - Starting Candidate App...
echo  ==========================================
echo.

set WEBVIEW2_USER_DATA_FOLDER=C:\Temp\ExamGuardWV2
if not exist "C:\Temp\ExamGuardWV2" mkdir "C:\Temp\ExamGuardWV2"

set PATH=%USERPROFILE%\.cargo\bin;%PATH%

echo [1/2] Starting Vite dev server on port 5173...
start "Vite Dev Server" /min cmd /c "cd /d "%~dp0examguard-client" && npm run dev -- --host 0.0.0.0"

echo Waiting for Vite to be ready...
timeout /t 3 /nobreak >nul

if exist "%~dp0ExamGuard-Candidate.exe" (
    echo [2/2] Launching ExamGuard-Candidate.exe Desktop App...
    start "" "%~dp0ExamGuard-Candidate.exe"
) else (
    echo [2/2] Opening Candidate Web App at http://localhost:5173
    start http://localhost:5173
)

pause
