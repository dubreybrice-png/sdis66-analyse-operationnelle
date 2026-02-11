# 🎮 DÉMARRAGE RAPIDE

## ✅ CE QUI MARCHE MAINTENANT

### 1. **CHOIX DU STARTER**
- Fenêtre apparaît au démarrage
- **Clique sur une carte** OU **appuie sur 1/2/3** pour choisir
- Le dialogue NPC n'est pas nécessaire pour commencer!

### 2. **COMBAT JOUEUR**
- **CLIC GAUCHE** sur un monstre sauvage → tu l'attaques
- Tu gagnes de l'XP + or quand tu le tues
- Distance max: 18 studs (melee)

### 3. **CAPTURE**
- **Touche E** près d'un monstre faible
- Taux de capture: 15% base (augmente si HP bas)
- Les monstres capturés vont dans ton stockage

### 4. **GRANDE VILLE**
- **Place centrale** en 3 cercles autour du cristal (marbre blanc)
- Zones: Stockage, Mine/Banque, Magasins (ruines), Joueur 1/2, Dojo
- Lingot d'or géant dans la banque

## 🔧 FIX APPLIQUÉS

### Lumière qui clignote ✅
- SpawnLocation configuré pour ne plus respawn en boucle
- Si ça clignote encore: c'est normal pendant le premier spawn

### Dialogue NPC
- Path PlayerDataService corrigé
- **Workaround**: Touches 1/2/3 pour choisir sans NPC

### Grande place ✅
- 3 cercles (12 + 20 + 28 dalles)
- Rayon: 15 → 28 → 40 studs
- Matériaux: Marbre → Béton → Brique

## 📋 TESTER MAINTENANT

1. **Stop → Play**
2. Tu spawn au sud (entrée ville)
3. Fenêtre starter apparaît → **Appuie sur 1, 2 ou 3**
4. Explore la grande place centrale
5. **Clique** sur monstres sauvages pour attaquer
6. **E** pour capturer

## 🐛 SI PROBLÈME

### Pas de fenêtre starter
- Regarde Output: cherche `[ClientUI] Loaded`
- Vérifie que `ReplicatedStorage > Shared > Monsters` existe

### Monstres ne spawn pas
- Regarde Output: cherche `[WildSpawner] Started`
- Vérifie `Workspace > WildSpawnPoints` existe avec des Parts (SP1, SP2...)

### Cristal HP = 0
- Regarde Output: cherche `[CrystalDefense] Started`
- Vérifie `Workspace > Crystal` existe (Part ou Model nommé exactement "Crystal")

## 🎯 PROCHAINES ÉTAPES

Une fois le starter + combat de base OK:

1. **UI Stockage** - voir tes monstres capturés
2. **Assignation Défense** - tes monstres défendent auto
3. **Assignation Mine** - or passif
4. **Leveling + Évolutions**
5. **Bâtiments améliorables**

---

**Touches:**
- 1/2/3: Choisir starter
- CLIC: Attaquer monstre
- E: Capturer
- F: Parler NPC (si dialogue fonctionne)
