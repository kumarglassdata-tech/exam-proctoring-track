@echo off
title ExamGuard Candidate Desktop App
color 0A
echo ========================================================
echo   Launching ExamGuard Native Windows Desktop Application (.exe)
echo ========================================================
echo.

cd /d "%~dp0"

if exist "%~dp0ExamGuard-Candidate.exe" (
    echo Starting ExamGuard-Candidate.exe...
    start "" "%~dp0ExamGuard-Candidate.exe"
) else (
    echo Launching Tauri Desktop Dev App...
    cd /d "%~dp0examguard-client"
    set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
    npm run tauri dev
)

echo.
echo ExamGuard Candidate Desktop App launched successfully.
pause
