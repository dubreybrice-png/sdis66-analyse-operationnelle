@echo off
REM Helper script pour clasp - SDIS 66
set CLASP_PATH=C:\Users\Brice\AppData\Roaming\npm\clasp.cmd

if "%1"=="" (
    echo Usage: clasp-helper [push^|pull^|status^|open^|login]
    exit /b
)

cd /d "%~dp0"

if "%1"=="push" (
    "%CLASP_PATH%" push --force
) else (
    "%CLASP_PATH%" %*
)
