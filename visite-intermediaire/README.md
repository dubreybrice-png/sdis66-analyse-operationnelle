# Visite Intermédiaire - Google Apps Script

## 📋 Description
Application web Google Apps Script pour gérer les visites de prévention. Permet de :
- Créer et remplir un questionnaire de visite
- Enregistrer les données dans Google Sheets
- Consulter l'historique des visites
- Copier les conclusions dans le presse-papiers

## 🔧 Configuration

### IDs requis
- **Google Sheet ID**: `1JDH83x04Cc8AFDlTlGvExJIpKBSwVy-p92RpYBhs2fk`
- **Google Apps Script ID**: `1ekgQc0xuLhLRHD0Ns8bDGn4s_eHqDRJFnNZ3mLfi9LzH6ousIXOl58ds`

### Structure des fichiers
```
visite-intermediaire/
├── .clasp.json          # Configuration clasp
├── appsscript.json      # Configuration Apps Script
├── Code.gs              # Code backend (Google Apps Script)
├── Index.html           # Interface utilisateur
└── README.md            # Ce fichier
```

## 🚀 Déploiement avec clasp

### 1. Installation (première fois)
```bash
npm install -g @google/clasp
clasp login
```

### 2. Pousser les changements vers Google Apps Script
```bash
clasp push
```

### 3. Déployer comme Web App
```bash
clasp deploy
```

### 4. Récupérer les changements depuis Google Apps Script
```bash
clasp pull
```

## 📊 Structure Google Sheets

### Feuille "Visites"
| ID | Date Début | Matricule | Réponses JSON | Conclusion |
|----|-----------|-----------|---------------|-----------|
| VISITE_xxx | 04/02/2026 14:30:45 | MAT001 | {...} | ... |

### Feuille "Questions"
| Numéro | Question | Type |
|--------|----------|------|
| 1 | État général du site | text |
| 2 | Conformité de sécurité | radio |
| 3 | Observations et commentaires | textarea |

## 🎯 Utilisation

1. **Accueil**: Choisir entre "Faire une visite" ou "Consulter mes visites"
2. **Faire une visite**: 
   - Entrer le matricule
   - Remplir le questionnaire
   - Cliquer "Envoyer la visite"
3. **Consulter**: 
   - Voir la liste des visites enregistrées
   - Cliquer sur une visite pour voir les détails
   - Copier la conclusion si présente

## 🔐 Permissions Google
Le script nécessite:
- `https://www.googleapis.com/auth/spreadsheets` - Accès au Google Sheets
- `https://www.googleapis.com/auth/script.container.ui` - Interface utilisateur

## 📝 Notes
- Les données sont horodatées automatiquement
- Les réponses sont stockées en JSON pour flexibilité
- L'accès est défini pour "ANYONE_ANONYMOUS" (modifier si besoin)

## 💡 Modifications futures possibles
- Ajouter des types de questions (dropdown, checkbox multiple)
- Intégrer des signatures
- Ajouter des pièces jointes
- Créer des rapports PDF
- Ajouter une authentification utilisateur
