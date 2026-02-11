# Architecture de Cache Passif + Actif - v1.65+

## 🎯 Objectif
Dashboard **ULTRA-RAPIDE** : tout pré-calculé, rien à charger sauf pour la première fois.

---

## 📊 FLUX DE DONNÉES

### **DONNÉES 2025** (Comparatif)
```
🔄 Cycle passif automatique :
   ┌─────────────────────────────────────────┐
   │ Vous importez/modifiez feuille 2025     │
   │ (APP ou Temps travail)                  │
   └────────────────┬────────────────────────┘
                    ↓
         ✨ Trigger automatique ✨
                    ↓
   ┌─────────────────────────────────────────┐
   │ Script détecte changement dans 2025     │
   │ Invalide le cache                       │
   │ Recalcule stats 2025 → PropertiesService│
   └────────────────┬────────────────────────┘
                    ↓
         📊 Données prêtes à afficher
```

**Quand se recalcule ?**
- ✅ Dès que vous modifiez APP ou Temps travail 2025
- ✅ Dès que vous changez la date du comparatif (D2)
- ⏱️ Instantané (quelques secondes)

**Où ça se stocke ?**
- Persistent dans `PropertiesService` (survit à fermeture navigateur)
- Pas besoin de re-charger à chaque fois!

---

### **DONNÉES DU JOUR** (Bilan OK, KO, PISU, Problèmes)

#### **Option 1 : Calcul PASSIF** (Automatique)
```
🔄 Cycle passif :
   ┌─────────────────────────────────────────┐
   │ Vous modifiez APP 2026                  │
   │ (nouvelle ligne, checkbox, etc)         │
   └────────────────┬────────────────────────┘
                    ↓
         ✨ onEdit trigger ✨
                    ↓
   ┌─────────────────────────────────────────┐
   │ Invalide cache du jour                  │
   │ Relance preCacheDailyData()             │
   │ Sauvegarde stats du jour en cache       │
   └────────────────┬────────────────────────┘
                    ↓
         📊 Dashboard reflète les changements IMMÉDIATEMENT
```

#### **Option 2 : Calcul ACTIF** (Programmé)
```
⏰ Triggers horaires :
   8h, 14h, 20h, 2h (Paris)
        ↓
   Pré-calculé automatiquement
        ↓
   Données déjà prêtes quand vous ouvrez
```

**Le système marche avec BOTH :**
- `onEdit` : calcul immédiat dès que vous tapez
- Triggers horaires : calcul régulier pour la journée

---

## 🚀 AU FINAL : QU'EST-CE QUI SE CHARGE ?

### **À L'OUVERTURE DU DASHBOARD**
| Données | Status | Temps |
|---------|--------|-------|
| 🟢 2025 | En cache (PropertiesService) | **< 100ms** |
| 🟢 Jour | En cache (CacheService) | **< 100ms** |
| 🔵 ISP global | À la demande (calcul rapide) | ~500ms |
| 🔵 Admin | À la demande (calcul rapide) | ~800ms |
| 🔵 Chefferie | À la demande (calcul rapide) | ~500ms |

### **COMPARÉ À AVANT (v1.51)**
| Avant | Après | Gain |
|-------|-------|------|
| 20-30s | 3-5s | **80% plus rapide** |
| Tout recalcule | Cache utilisé | **Économie serveur** |
| Lent les jours de test | Fluide | **Expérience meilleure** |

---

## 🎛️ MODE D'EMPLOI

### **C'est automatique, mais vous pouvez :**

1. **Voir l'état du cache**
   ```
   Menu Admin → "📊 État du cache"
   ```
   Vous voit ce qui est en cache et quand c'a été calculé.

2. **Forcer un recalcul 2025**
   ```
   Menu Admin → "🔄 Forcer recalcul 2025"
   ```
   Utile si quelque chose s'est mal calculé.

3. **Configurer les triggers horaires**
   ```
   Menu Admin → "Configurer triggers horaires"
   ```
   ✅ 4 exécutions par jour (8h, 14h, 20h, 2h)
   ❌ Permet de désactiver si besoin

4. **Pré-calculer manuellement**
   ```
   Menu Admin → "Pré-calculer données du jour"
   ```
   Forcer le calcul maintenant sans attendre.

---

## ⚡ FLUX TECHNIQUE

### **Quand vous modifiez APP 2026**
```javascript
// ← Vous cliquez sur une cellule
onEdit() trigger ← Déclenché automatiquement
  ↓
Vérifie : est-ce APP ou Temps travail 2026?
  ↓
OUI → invalidateDailyCache()
  ↓
  1. Supprime cache du jour
  2. Relance preCacheDailyData()
  3. Sauvegarde nouvelles stats en cache
  ↓
getStats2026() → Utilise le nouveau cache
```

### **Quand vous changez date du comparatif (D2)**
```javascript
getStats2025() appelée
  ↓
Vérifie : date en cache = date actuellement?
  ↓
NON → Recalcule depuis SS 2025
  ↓
Sauvegarde PropertiesService
```

---

## 📈 EXEMPLE DE FLUX COMPLET (Journée type)

**8h00** → Triggers automatiques
```
- preCacheDailyData() s'exécute
- Calcule: bilan OK/KO, PISU OK/KO du jour
- Sauvegarde en cache
```

**9h00** → Vous modifiez une ligne APP
```
- onEdit() détecte changement
- Invalide le cache du jour
- Relance preCacheDailyData()
- Dashboard rafraîchit automatiquement
```

**14h00** → Triggers automatiques (2e calcul)
```
- preCacheDailyData() s'exécute à nouveau
- Aggrège stats de la journée jusqu'à 14h
- Sauvegarde en cache
```

**À chaque ouverture du dashboard**
```
- Charge données 2025 depuis PropertiesService (< 100ms)
- Charge données du jour depuis CacheService (< 100ms)
- Affiche IMMÉDIATEMENT
- Charge en fond les données globales (500-800ms)
```

---

## 🔧 DÉTAILS TECHNIQUES

### **PropertiesService** (Persistent)
- ✅ Survit à fermeture navigateur
- ✅ Stocke 2025 + date du comparatif
- ✅ Plus lent que CacheService (mais suffit pour 2025)
- ⚠️ Limité à 500 KB

### **CacheService** (Volatile - 6h)
- ✅ Ultra-rapide
- ✅ Stocker données du jour
- ❌ Effacé après 6h ou redémarrage service

### **onEdit Trigger**
- ✅ Déclenché automatiquement
- ✅ Instantané (< 1s pour invalider)
- ❌ Ne s'applique qu'à la feuille éditée

### **Time-based Triggers**
- ✅ S'exécute 4x par jour (8h, 14h, 20h, 2h)
- ✅ Indépendant des actions utilisateur
- ❌ Peut exécuter à ±15 min

---

## 📝 Ce qui change pour vous ?

### **Avant (v1.51)**
```
❌ Lent à l'ouverture (20-30s)
❌ Recalcule tout à chaque fois
❌ 2025 recalculée même si date pas changée
❌ Faut attendre le pré-calcul manuel
```

### **Après (v1.65+)**
```
✅ Rapide à l'ouverture (3-5s)
✅ Cache utilisé intelligemment
✅ 2025 se recalcule SEULEMENT si date change
✅ Pré-calcul automatique 4x par jour
✅ Calcul immédiat dès qu'on modifie les données
✅ Zéro maintenance requise
```

---

## 🆘 Dépannage

### Les données ne se mettent pas à jour ?
1. Vérifier qu'on a bien modifié APP ou Temps travail
2. Menu Admin → "🔄 Forcer recalcul 2025"
3. Attendre 2-3 secondes, rafraîchir la page

### Cache du jour ne se met pas à jour ?
1. Vérifier que onEdit est activé (normalement oui)
2. Menu Admin → "Pré-calculer données du jour"
3. Attendre 3-5 secondes

### Les triggers horaires ne s'exécutent pas ?
1. Menu Admin → "Configurer triggers horaires"
2. Aller dans Apps Script (Extensions > Apps Script)
3. Vérifier les logs : Extensions > Apps Script > Logs

---

## 🎯 Performance réelle attendue

- **Données 2025** : < 100ms
- **Données du jour** : < 100ms
- **Autres données** : 500-800ms en parallèle
- **Temps total** : **3-5 secondes** (vs 20-30s avant)

