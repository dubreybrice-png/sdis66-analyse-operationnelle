# Visite Intermédiaire v3.0 - Mise à jour majeure

## 🎉 Nouveautés version 3.0

### ✅ Problèmes corrigés
- **Bug affichage visites**: Correction de l'erreur JSON qui empêchait l'affichage des visites dans "Consulter mes visites"
- **Horodatage**: Le champ de date/heure est maintenant modifiable et positionné en haut du questionnaire
- **Label matricule**: Changé en "Matricule de l'agent" pour clarifier que c'est l'infirmière qui saisit

### 🆕 Nouvelles fonctionnalités

#### 1. Structure hiérarchique des questions
Les questions sont maintenant organisées en **3 niveaux**:
- **Parties** (sections principales)
- **Sous-parties** (sous-sections)
- **Questions** (au sein des sous-parties)

Cette structure rend le questionnaire plus clair et organisé.

#### 2. Interface d'administration complète
Accès via le bouton **⚙️ Admin** (mot de passe: **66000**)

**Fonctionnalités admin:**
- ➕ Ajouter des parties, sous-parties et questions
- ✏️ Modifier le titre et le contenu
- 🗑️ Supprimer des éléments
- 🔄 **Drag & Drop** pour réorganiser l'ordre
- 💾 Sauvegarde dans Google Sheets

**Types de questions supportés:**
- `text` - Champ texte simple
- `textarea` - Zone de texte multiligne
- `radio` - Choix unique (options configurables)

#### 3. Gestion améliorée des données
- Meilleure gestion des erreurs JSON
- Logs détaillés dans Google Apps Script
- Validation des données avant sauvegarde

## 📊 Structure Google Sheets (3 feuilles)

### Feuille "Visites"
| ID | Date Début | Matricule | Réponses JSON | Conclusion |
|----|-----------|-----------|---------------|-----------|
| VISITE_xxx | 04/02/2026 14:30:45 | MAT001 | {...} | ... |

### Feuille "Structure"
| ID | Type | Ordre | Titre | ParentID |
|----|------|-------|-------|----------|
| P1 | partie | 1 | Informations générales | |
| SP1 | souspartie | 1 | Informations agent | P1 |
| Q1 | question | 1 | État général du site | SP1 |

### Feuille "Questions"
| ID | Question | Type | Options |
|----|----------|------|---------|
| Q1 | État général du site | text | |
| Q2 | Conformité de sécurité | radio | Oui\|Non |

## 🎯 Guide d'utilisation Admin

### Accéder à l'admin
1. Cliquer sur le bouton **⚙️ Admin** en haut à droite
2. Entrer le mot de passe: **66000**

### Créer une structure
1. **Ajouter une partie**: Cliquer sur "+ Ajouter Partie"
2. **Ajouter une sous-partie**: Cliquer sur "+ SP" à côté d'une partie
3. **Ajouter une question**: Cliquer sur "+ Q" à côté d'une sous-partie
4. **Modifier**: Cliquer sur ✏️ pour éditer le titre, la question, le type, les options
5. **Supprimer**: Cliquer sur 🗑️
6. **Réorganiser**: Glisser-déposer les éléments du même niveau
7. **Sauvegarder**: Cliquer sur "💾 Enregistrer tout"

### Exemple de structure
```
📘 Partie 1: Informations générales
   📄 Sous-partie 1.1: Identification
      ❓ Question: Matricule agent
      ❓ Question: Date de visite
   📄 Sous-partie 1.2: Lieu
      ❓ Question: Site
      ❓ Question: Bâtiment

📘 Partie 2: État des lieux
   📄 Sous-partie 2.1: Sécurité
      ❓ Question: Conformité générale (radio: Oui/Non)
      ❓ Question: Observations (textarea)
```

## 🔧 API Fonctions (Code.gs)

### Fonctions principales
- `getStructure()` - Récupère la structure hiérarchique
- `getQuestions()` - Récupère toutes les questions
- `getVisites()` - Récupère toutes les visites (avec gestion JSON améliorée)
- `saveVisite(matricule, dateDebut, reponses, conclusion)` - Sauvegarde une visite

### Fonctions admin
- `saveStructure(structure)` - Sauvegarde la structure complète
- `saveQuestion(question)` - Sauvegarde/met à jour une question
- `deleteQuestion(questionId)` - Supprime une question

## 📱 URL de déploiement
```
https://script.google.com/macros/s/AKfycbwBk_32A0-pOqT5cQ3Gvc2vuLGA8c2P75XhGPWDGgQnA3xj3X7oUpV_cEha4wQBJ4mP5Q/exec
```

## 🔐 Sécurité
- Mot de passe admin: **66000** (à changer dans le code si besoin)
- Pas de stockage côté client (validation à chaque ouverture)
- Accès Google Sheets sécurisé via OAuth

## 🚀 Déploiement rapide
```bash
cd c:\Users\Brice\Desktop\Github\visite-intermediaire
clasp push --force
clasp deploy
```

## 💡 Prochaines améliorations possibles
- [ ] Authentification utilisateur Google
- [ ] Export PDF des visites
- [ ] Statistiques et rapports
- [ ] Signatures électroniques
- [ ] Pièces jointes (photos)
- [ ] Mode hors-ligne avec synchronisation
- [ ] Templates de questionnaires
- [ ] Historique des modifications

---
**Version 3.0** - Déployé le 04/02/2026
