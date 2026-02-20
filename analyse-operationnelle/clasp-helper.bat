@echo off
REM Helper script pour clasp - SDIS 66 Analyse Operationnelle
set CLASP_PATH=C:\Users\Brice\AppData\Roaming\npm\clasp.cmd
set DEPLOY_ID=AKfycbyik6jhOVdBWnQCsmuUn2E6FGyPFDlQC2mp5zGDWUIwKoNGNIbcGU6uhbVp6fza06F93Q

if "%1"=="" (
    echo Usage: clasp-helper [push^|pull^|status^|open^|login^|deploy]
    exit /b
)

cd /d "%~dp0"

if "%1"=="push" (
    "%CLASP_PATH%" push --force
) else if "%1"=="deploy" (
    "%CLASP_PATH%" push --force
    "%CLASP_PATH%" deploy -i %DEPLOY_ID% -d "stable"
) else (
    "%CLASP_PATH%" %*
)
