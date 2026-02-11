# Version 4.0 - Changements majeurs

## 🎯 Objectif
Rendre le matricule et la date de début de visite configurables dans l'admin, et ajouter un menu d'administration structuré avec historique et possibilité de suppression.

## ✨ Nouveautés

### 1. **Matricule et Date comme champs configurables** 
Les champs "Matricule de l'agent" et "Date et heure de début de visite" sont maintenant des questions configurables dans l'admin :
- **ID**: `QMAT` (Matricule) et `QDATE` (Date)
- **Type**: `text` pour matricule, `datetime` pour la date
- Peuvent être déplacés, modifiés ou supprimés comme toute autre question
- Positionnés par défaut dans "Informations visite"

**Avantages**:
- Plus de flexibilité dans l'organisation du questionnaire
- Possibilité d'ajouter d'autres champs d'identification
- Ordre personnalisable via drag & drop

### 2. **Menu Admin restructuré**
Le menu Admin comprend maintenant 2 sous-sections :

#### 📝 Paramétrage
- Gestion complète de la structure du questionnaire
- Ajouter/Modifier/Supprimer parties, sous-parties et questions
- Drag & Drop pour réorganiser
- Sauvegarde de la structure

#### 📊 Historique  
- Affichage de toutes les visites enregistrées
- **Bouton "👁️ Voir"** : Afficher les détails de la visite
- **Bouton "🗑️ Supprimer"** : Supprimer une visite (avec confirmation)
- Rechargement automatique après suppression

### 3. **Nouveau type de question : `datetime`**
- Champ de saisie date/heure (`<input type="datetime-local">`)
- Pré-rempli automatiquement avec la date/heure actuelle
- Conversion automatique en format français lors de la sauvegarde
- Disponible dans l'admin pour créer de nouvelles questions temporelles

### 4. **Modifications backend (Code.gs)**

#### Nouvelle signature de fonction
```javascript
// AVANT (v3)
saveVisite(matricule, dateDebut, reponses, conclusion)

// MAINTENANT (v4)
saveVisite(reponses, conclusion)
```

Le matricule et la date sont extraits des réponses :
```javascript
const matricule = reponses.QMAT || "";
const dateDebut = reponses.QDATE || "";
```

#### Nouvelle fonction
```javascript
deleteVisite(visiteId)
```
Permet de supprimer une visite depuis l'admin.

### 5. **Améliorations UX**

**Header du questionnaire simplifié**:
- Suppression des champs fixes matricule et date
- Message d'instruction simple
- Plus d'espace pour les questions

**Navigation admin fluide**:
- Boutons de sous-menu mis en évidence (changement de couleur)
- Séparation claire entre Paramétrage et Historique
- Pas besoin de revenir au menu principal

**Gestion des réponses améliorée**:
- Type `datetime` géré dans `collectAnswers()`
- Conversion automatique en format français lisible
- Validation des champs obligatoires (QMAT et QDATE)

## 🔄 Migration depuis v3

### Données existantes
Les visites existantes continuent de fonctionner normalement. Si elles ont été créées avec l'ancienne version :
- Le matricule et la date sont déjà stockés dans les colonnes dédiées
- Elles s'affichent correctement dans l'historique

### Nouvelles visites
À partir de la v4 :
- Le matricule et la date sont extraits des réponses (champs QMAT et QDATE)
- Stockés également dans les colonnes dédiées pour compatibilité
- Affichage identique dans l'historique

### Structure par défaut
Si vous créez une nouvelle installation, la structure par défaut inclut :
```
📘 Partie 1: Informations générales
   📄 Sous-partie 1.1: Informations visite
      ❓ QMAT: Matricule de l'agent (text)
      ❓ QDATE: Date et heure de début de visite (datetime)
      ❓ Q1: État général du site (text)
      ❓ Q2: Conformité de sécurité (radio)
      ❓ Q3: Observations et commentaires (textarea)
```

## 📋 Checklist de test

- [ ] Créer une nouvelle visite avec matricule et date
- [ ] Vérifier que les données sont sauvegardées
- [ ] Consulter la visite dans "Mes visites"
- [ ] Accéder à l'Admin (mot de passe: 66000)
- [ ] Naviguer entre Paramétrage et Historique
- [ ] Voir les détails d'une visite dans l'historique admin
- [ ] Supprimer une visite test
- [ ] Modifier l'ordre des questions avec drag & drop
- [ ] Ajouter une nouvelle question de type `datetime`
- [ ] Tester la sauvegarde de la structure

## 🔗 Liens

**URL v4**: 
```
https://script.google.com/macros/s/AKfycbzdFBxdoz8wp6cyfuw_MGQi4lp1D2IKmm17DNDXtgZ4sr1iLD0NxsDU2kROW9khjDHP6w/exec
```

**Google Sheet**:
```
https://docs.google.com/spreadsheets/d/1JDH83x04Cc8AFDlTlGvExJIpKBSwVy-p92RpYBhs2fk/edit
```

## 🚀 Déploiement

```bash
cd c:\Users\Brice\Desktop\Github\visite-intermediaire
clasp push --force
clasp deploy
```

---
**Version 4.0** - Déployé le 04/02/2026 à 23:45
