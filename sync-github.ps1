# Script de synchronisation Google Apps Script <-> GitHub
# SDIS 66

# Configuration PATH
$nodeDir = "C:\Program Files\nodejs"
$npmDir = "$env:APPDATA\npm"
$gitDir = "C:\Program Files\Git\cmd"
$env:PATH = "$env:PATH;$nodeDir;$npmDir;$gitDir"

Write-Host "=== Synchronisation Google Apps Script -> GitHub ===" -ForegroundColor Cyan

# Vérifier que clasp est installé
$clasp = "$npmDir\clasp.cmd"
if (!(Test-Path $clasp)) {
    Write-Host "ERREUR: clasp.cmd introuvable à $clasp" -ForegroundColor Red
    exit 1
}

# Vérifier que .clasp.json existe
if (!(Test-Path ".clasp.json")) {
    Write-Host "ERREUR: .clasp.json manquant" -ForegroundColor Red
    exit 1
}

# 1. Récupérer les derniers changements depuis Google Apps Script
Write-Host "`n[1/4] Récupération depuis Google Apps Script..." -ForegroundColor Yellow
& $clasp pull --force
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR lors du pull clasp" -ForegroundColor Red
    exit 1
}
Write-Host "Pull clasp OK" -ForegroundColor Green

# 2. Vérifier si git est initialisé
if (!(Test-Path ".git")) {
    Write-Host "`n[2/4] Initialisation de Git..." -ForegroundColor Yellow
    git init
    git branch -M main
    Write-Host "Git initialisé" -ForegroundColor Green
} else {
    Write-Host "`n[2/4] Repository Git déjà initialisé" -ForegroundColor Green
}

# 3. Ajouter les fichiers
Write-Host "`n[3/4] Ajout des fichiers au commit..." -ForegroundColor Yellow
git add *.js *.html *.json
git add clasp-helper.bat configure-fixe.ps1 sync-github.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR lors du git add" -ForegroundColor Red
    exit 1
}
Write-Host "Fichiers ajoutés" -ForegroundColor Green

# 4. Commit et push
Write-Host "`n[4/4] Commit et push vers GitHub..." -ForegroundColor Yellow
$date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "Sync from Google Apps Script - $date"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Commit créé" -ForegroundColor Green
    
    # Demander si on doit pusher
    $response = Read-Host "`nVoulez-vous pusher vers GitHub? (o/n)"
    if ($response -eq "o" -or $response -eq "O") {
        git push
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`nSynchronisation terminée avec succès!" -ForegroundColor Green
        } else {
            Write-Host "`nERREUR lors du push. Configurez d'abord votre remote:" -ForegroundColor Yellow
            Write-Host "  git remote add origin <URL_DE_VOTRE_REPO>" -ForegroundColor Cyan
            Write-Host "  git push -u origin main" -ForegroundColor Cyan
        }
    } else {
        Write-Host "`nCommit local créé. Utilisez 'git push' pour envoyer vers GitHub" -ForegroundColor Yellow
    }
} else {
    Write-Host "Aucun changement à committer" -ForegroundColor Yellow
}
