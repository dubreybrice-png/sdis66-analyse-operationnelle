# Google Apps Script - SDIS 66

Synchronisation automatique avec GitHub via clasp.

## Configuration initiale

1. Installer clasp (déjà fait) :
   ```bash
   npm install -g @google/clasp
   ```

2. Se connecter à Google :
   ```bash
   .\clasp-helper.bat login
   ```

3. Configurer Git avec votre repository GitHub :
   ```bash
   git remote add origin https://github.com/VOTRE_USERNAME/VOTRE_REPO.git
   git push -u origin main
   ```

## Utilisation

### 🚀 Push automatique (après chaque modification)

```powershell
.\push-all.ps1
```

Ce script pousse automatiquement :
1. Vers Google Apps Script (clasp push)
2. Vers GitHub (git commit + push)

**À utiliser après chaque modification de code!**

### 📥 Récupérer depuis Google Apps Script

```powershell
.\sync-github.ps1
```

Si quelqu'un a modifié le script directement dans Google, ce script récupère les changements.

### Commandes clasp disponibles

- Pull (récupérer depuis Google) : `.\clasp-helper.bat pull`
- Push (envoyer vers Google) : `.\clasp-helper.bat push`
- Ouvrir dans le navigateur : `.\clasp-helper.bat open`
- Voir le statut : `.\clasp-helper.bat status`

## Fichiers du projet

- `Code.js` : Code principal
- `App.html` : Interface webapp
- `Home.html` : Page d'accueil
- `appsscript.json` : Configuration Google Apps Script
- `.clasp.json` : Configuration clasp
