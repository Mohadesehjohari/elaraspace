@echo off
setlocal
title Elara Safe Firebase Backup
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed. Install official Node.js LTS from https://nodejs.org/
  echo Then reopen this file.
  pause
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo npm is missing. Install official Node.js LTS from https://nodejs.org/
  pause
  exit /b 1
)
if "%~1"=="" (
  echo.
  echo Put the Firebase service-account JSON key in a PRIVATE folder.
  echo Drag that JSON file ONTO this backup-windows.cmd file to launch the backup.
  echo Never send the key to anyone, ChatGPT or GitHub.
  pause
  exit /b 1
)
echo.
echo Installing local Firebase read-only backup dependencies...
call npm install --no-fund --no-audit --ignore-scripts
if errorlevel 1 (
  echo Could not install dependencies. Check internet or npm.
  pause
  exit /b 1
)
echo.
node backup.mjs "%~1"
if errorlevel 1 echo BACKUP FAILED - no data has been changed.
echo.
pause
