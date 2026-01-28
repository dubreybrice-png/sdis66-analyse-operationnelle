$nodeDir = "C:\Program Files\nodejs"
$npmDir = "$env:APPDATA\npm"
$env:PATH = "$env:PATH;$nodeDir;$npmDir"

$clasp = "$npmDir\clasp.cmd"
if (!(Test-Path $clasp)) {
  Write-Host "clasp.cmd introuvable: $clasp" -ForegroundColor Red
  exit 1
}

if (!(Test-Path ".clasp.json")) {
  Write-Host ".clasp.json manquant dans $PWD" -ForegroundColor Yellow
} else {
  Write-Host ".clasp.json OK" -ForegroundColor Green
}

Write-Host "Configuration OK. Utilisez .\clasp-helper.bat login|pull|push" -ForegroundColor Green
