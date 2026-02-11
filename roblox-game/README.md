# Monster Capture & Defense Game

## Description
Un jeu Roblox de capture de monstres avec défense de base et gestion d'économie, inspiré de Pokémon et des tower defense.

## Fonctionnalités actuelles

### ✅ Système de base
- **3 monstres de départ** : Flareo (Feu), Aquava (Eau), Zappit (Foudre)
- **20 monstres** au total avec 8 éléments
- **Système de combat** temps réel avec multiplicateurs d'éléments
- **Capture** de monstres sauvages (taux bas : 15% de base)
- **Village** avec Mine, Stockage, Tour de défense, Cristal
- **Économie** : génération d'or passive, upgrades
- **Spawn automatique** de monstres sauvages qui attaquent le cristal

### ⚔️ Combat joueur (NOUVEAU)
- **Attaque manuelle** : clique sur un monstre pour le frapper
- **Système de niveau** : gagne de l'XP en combattant (niveau 1-100)
- **4 métiers** débloqués au niveau 10 :
  - **Guerrier** : dégâts à l'épée (+30% dégâts)
  - **Archer** : attaque à distance (+portée, +20% dégâts)
  - **Magicien** : gèle/brûle/ralentit les ennemis
  - **Soigneur** : soigne les monstres alliés
- **Changement de métier** : uniquement en créant un nouveau personnage (payant)

### 🎯 Capture améliorée
- Taux de base : **15%** (au lieu de 50%)
- Bonus HP bas : +25% si monstre <30% HP
- **Amélioration payante** : achète des bonus de capture (+10% à +50%)
  - +10% = 500 or
  - +20% = 1500 or
  - +30% = 3500 or
  - +40% = 7500 or
  - +50% = 15000 or (max)

## Guide rapide

### Commandes
- **Clic gauche** : Attaquer un monstre sauvage (combat joueur)
- **E** : Tenter de capturer un monstre (si <30% HP et proche)

### Progression
1. Choisis un starter
2. Frappe les monstres sauvages pour gagner de l'XP et de l'or
3. Capture des monstres affaiblis
4. Monte de niveau jusqu'à 10
5. Choisis un métier (Guerrier/Archer/Magicien/Soigneur)
6. Améliore ton village et ton taux de capture

## Images de monstres

📖 **Consulte [GUIDE_PNG.md](GUIDE_PNG.md)** pour apprendre à :
- Générer ou télécharger des images de monstres
- Les importer dans Roblox Studio
- Les intégrer dans l'UI et sur les monstres 3D

## Prochaines étapes (v0.5)

- [ ] UI de sélection de métier (niveau 10)
- [ ] Système de vagues de défense programmées
- [ ] Craft d'items (Capture Sphere, Potions)
- [ ] 50 monstres au total
- [ ] Évolutions de monstres
- [ ] Shop d'amélioration de capture
- [ ] Personnages multiples (slots payants)

## Structure du projet

```
roblox-game/
├── default.project.json          # Configuration Rojo
├── GAME_DESIGN.md                # Document de design complet
├── README.md                     # Ce fichier
└── src/
    ├── ReplicatedStorage/
    │   ├── Modules/              # Modules partagés client/serveur
    │   │   ├── ElementsModule.lua
    │   │   ├── MonsterModule.lua
    │   │   ├── CombatModule.lua
    │   │   └── CaptureModule.lua
    │   └── Data/                 # Bases de données
    │       ├── MonsterDatabase.lua
    │       └── AbilityDatabase.lua
    ├── ServerScriptService/
    │   ├── ServerMain.lua        # Point d'entrée serveur
    │   ├── Services/
    │   │   └── PlayerDataService.lua
    │   └── Systems/
    │       ├── EconomySystem.lua
    │       └── SpawnSystem.lua
    └── StarterPlayer/
        └── StarterPlayerScripts/
            └── ClientMain.lua    # Point d'entrée client
```

## Développement avec Rojo

### Prérequis
- Rojo CLI installé (v7.6.1+)
- Plugin Rojo dans Roblox Studio
- Git (optionnel)

### Démarrer le serveur Rojo
```powershell
cd C:\Users\Brice\Desktop\Github\roblox-game
rojo serve
```

### Se connecter depuis Studio
1. Ouvre Roblox Studio
2. Crée ou ouvre une place
3. Va dans Plugins → Rojo → Connect
4. Le statut doit afficher "Connected"

### Workflow
1. Modifie les fichiers `.lua` dans `src/`
2. Rojo synchronise automatiquement dans Studio
3. Teste dans Studio (Play)
4. Commit les changements Git

## Prochaines étapes (v0.5)

- [ ] Système de vagues de défense
- [ ] UI pour sélection du starter
- [ ] UI de combat et capture
- [ ] Évolutions de monstres
- [ ] 50 monstres au total
- [ ] Craft d'items (Capture Sphere, Potions)

## Documentation

Consulte [GAME_DESIGN.md](GAME_DESIGN.md) pour le design complet du jeu.

## Contribuer

1. Fork le repo
2. Crée une branche (`git checkout -b feature/ma-feature`)
3. Commit (`git commit -m 'Add feature'`)
4. Push (`git push origin feature/ma-feature`)
5. Ouvre une Pull Request

---

**Version** : MVP  
**Auteur** : Brice  
**Date** : 11 février 2026
