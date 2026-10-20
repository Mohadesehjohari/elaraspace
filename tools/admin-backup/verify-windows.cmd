@echo off
setlocal
title Verify existing Elara encrypted backup
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not available. Please reinstall Node.js LTS.
  pause
  exit /b 1
)
if "%~1"=="" (
  echo Drag the .json.enc backup file onto verify-windows.cmd
  echo Do not drag your Firebase service-account key here.
  pause
  exit /b 1
)
echo.
echo Checking the existing encrypted backup OFFLINE.
echo No download, no Firebase login and no private account data will be uploaded.
echo.
node verify.mjs "%~1"
echo.
pause
