@REM clasp-helper.bat - Analyse Opérationnelle SDIS 66
@echo off

REM Deployment ID fixe - ne change jamais, l'URL reste stable
set DEPLOY_ID=AKfycbyik6jhOVdBWnQCsmuUn2E6FGyPFDlQC2mp5zGDWUIwKoNGNIbcGU6uhbVp6fza06F93Q

REM Usage: clasp-helper.bat [push|deploy|pull|open|pushdeploy]

if "%1"=="push" (
    echo === Pushing to Google Apps Script ===
    cmd /c "clasp push --force"
    echo Done!
    goto :eof
)
if "%1"=="deploy" (
    echo === Deploying (same URL)... ===
    cmd /c "clasp deploy -i %DEPLOY_ID% -d stable"
    echo Done!
    goto :eof
)
if "%1"=="pull" (
    echo === Pulling from Google Apps Script ===
    cmd /c "clasp pull"
    echo Done!
    goto :eof
)
if "%1"=="pushdeploy" (
    echo === Push + Deploy (same URL) ===
    cmd /c "clasp push --force"
    cmd /c "clasp deploy -i %DEPLOY_ID% -d stable"
    echo Done!
    goto :eof
)
if "%1"=="open" (
    echo === Opening in browser ===
    cmd /c "clasp open"
    goto :eof
)

echo Analyse Operationnelle - Clasp Helper
echo =======================================
echo Usage: clasp-helper.bat [command]
echo   push        - Push vers Google Apps Script
echo   pull        - Pull depuis Google Apps Script
echo   deploy      - Deployer la webapp
echo   pushdeploy  - Push + Deploy (tout en un)
echo   open        - Ouvrir dans le navigateur
