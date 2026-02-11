@echo off
REM Helper script for Visite Intermediaire deployment
REM Usage: clasp-helper.bat [push|deploy|pull|open]

setlocal enabledelayedexpansion

set action=%1
if "%action%"=="" set action=help

if /i "%action%"=="push" (
    echo [*] Pushing code to Google Apps Script...
    cmd /c "clasp push --force"
    echo [+] Push completed!
    pause
) else if /i "%action%"=="deploy" (
    echo [*] Creating deployment...
    cmd /c "clasp deploy"
    echo [+] Deployment completed!
    pause
) else if /i "%action%"=="pull" (
    echo [*] Pulling code from Google Apps Script...
    cmd /c "clasp pull"
    echo [+] Pull completed!
    pause
) else if /i "%action%"=="push-deploy" (
    echo [*] Pushing code...
    cmd /c "clasp push --force"
    echo [+] Push completed!
    echo.
    echo [*] Creating new deployment...
    cmd /c "clasp deploy"
    echo [+] Deployment completed!
    pause
) else (
    echo Visite Intermediaire - Clasp Helper
    echo ====================================
    echo.
    echo Usage: clasp-helper.bat [command]
    echo.
    echo Commands:
    echo   push          - Push code to Google Apps Script
    echo   deploy        - Create new deployment
    echo   pull          - Pull code from Google Apps Script
    echo   push-deploy   - Push code and create deployment
    echo   help          - Show this help message
    echo.
    pause
)
