# Script de synchronisation bidirectionnelle automatique
# Google Apps Script <-> Local <-> GitHub

# Configuration PATH
$nodeDir = "C:\Program Files\nodejs"
$npmDir = "$env:APPDATA\npm"
$gitDir = "C:\Program Files\Git\cmd"
$env:PATH = "$env:PATH;$nodeDir;$npmDir;$gitDir"

Write-Host "=== Push automatique vers Google Apps Script et GitHub ===" -ForegroundColor Cyan

$clasp = "$npmDir\clasp.cmd"

# Vérifications
if (!(Test-Path $clasp)) {
    Write-Host "ERREUR: clasp introuvable" -ForegroundColor Red
    exit 1
}

if (!(Test-Path ".clasp.json")) {
    Write-Host "ERREUR: .clasp.json manquant" -ForegroundColor Red
    exit 1
}

# 1. Push vers Google Apps Script
Write-Host "`n[1/2] Push vers Google Apps Script..." -ForegroundColor Yellow
& $clasp push --force
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Envoyé vers Google Apps Script" -ForegroundColor Green
} else {
    Write-Host "✗ Erreur lors du push clasp" -ForegroundColor Red
    exit 1
}

# 2. Commit et push vers GitHub
Write-Host "`n[2/2] Push vers GitHub..." -ForegroundColor Yellow

# Initialiser git si nécessaire
if (!(Test-Path ".git")) {
    git init
    git branch -M main
    Write-Host "Git initialisé" -ForegroundColor Green
}

# Ajouter tous les fichiers
git add -A

# Commit
$date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "Auto-sync - $date" 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Commit créé" -ForegroundColor Green
    
    # Push vers GitHub
    git push 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Envoyé vers GitHub" -ForegroundColor Green
        Write-Host "`n=== Synchronisation complète réussie! ===" -ForegroundColor Green
    } else {
        Write-Host "✗ Erreur push GitHub (configurez: git remote add origin URL)" -ForegroundColor Yellow
        Write-Host "Mais le code est envoyé vers Google Apps Script!" -ForegroundColor Green
    }
} else {
    Write-Host "Aucun changement à committer" -ForegroundColor Yellow
    Write-Host "Mais le code est à jour sur Google Apps Script!" -ForegroundColor Green
}
