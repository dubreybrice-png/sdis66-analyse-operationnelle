# Monster Capture & Defense — Game Design Document

## Vision
Un jeu de collecte de monstres à la Pokémon avec une composante **tower defense** et **gestion de village**. Les joueurs capturent des monstres, défendent leur cristal contre des vagues sauvages, gèrent leur économie (mine, upgrades) et peuvent rejoindre des dojos pour des raids PvP.

---

## 1. Piliers de gameplay
1. **Collecte stratégique** : capture, élevage, évolution de monstres avec système d'éléments
2. **Défense active** : protéger le cristal contre les vagues sauvages
3. **Gestion d'économie** : optimiser mine, stockage, défense, dojo
4. **Social & rivalité** : dojo, attaques PvP, score mondial

---

## 2. Systèmes clés

### 2.1 Éléments & résistances
- **12 éléments** :  
  Feu, Eau, Foudre, Terre, Air, Glace, Nature, Ombre, Lumière, Métal, Poison, Psy
- **Matrice de puissance** :
  - Super efficace : ×1.5
  - Résistant : ×0.67
  - Neutre : ×1.0
- **Exemples** :
  - Feu > Nature, Glace, Métal  
  - Eau > Feu, Terre  
  - Foudre > Eau, Air  
  - Terre > Foudre, Poison, Feu  
  - Nature > Eau, Terre  
  - Glace > Nature, Air, Terre  
  - Lumière > Ombre  
  - Ombre > Psy, Lumière  
  - Psy > Poison  
  - Poison > Nature  
  - Métal > Glace, Psy  
  - Air > Nature, Poison

### 2.2 Monstres
- **150 monstres** au total
- **3 raretés** : Commun (50%), Rare (35%), Légendaire (15%)
- **Stats de base** :
  - HP (points de vie)
  - ATK (attaque physique)
  - DEF (défense)
  - SPD (vitesse / initiative)
  - ELEM (élément principal)
- **Niveau max** : 100
- **Évolution** :
  - Par niveau (ex: niveau 16, 36)
  - Par pierre élémentaire
  - Par condition spéciale (exploit, combat, biome)
- **Attaques** :
  - 4 attaques max par monstre
  - Débloquées à paliers (niv. 1, 10, 25, 50)
  - Cooldown (5–30s)
  - Type : physique, spéciale, buff, debuff
- **Rôles** :
  - Tank (HP/DEF élevés)
  - DPS (ATK élevé)
  - Support (buffs, soins)
  - Contrôle (stun, slow)

### 2.3 Combat
- **Temps réel** : les monstres auto-attaquent + attaques spéciales manuelles
- **Mécanique** :
  - Ciblage automatique (ennemi le plus proche / HP le plus bas)
  - Dégâts = (ATK × multiplicateur élément) - DEF
  - Critiques (5% base, ×1.5)
  - Esquive (SPD bonus)
- **Vagues de défense** :
  - Spawn régulier de monstres sauvages
  - Objectif : détruire le cristal du joueur
  - Vagues progressives (difficulté +, boss toutes les 10 vagues)

### 2.4 Capture
- **Condition** : monstre affaibli (<30% HP)
- **Mécanisme** :
  - Utiliser une Capture Sphere (item consommable)
  - Taux de réussite : `base (50%) + bonus rareté + bonus état (stun, burn, etc.)`
  - Animation de capture (shake 3×, succès/échec)
- **Limite de stockage** : capacité du village (upgradable)

### 2.5 Village & Dojo
#### Bâtiments
| Bâtiment        | Fonction                                      | Niveau max |
|-----------------|----------------------------------------------|------------|
| **Cristal**     | Cœur du village (HP = perte si détruit)      | 5          |
| **Mine**        | Génère de l'or passif (+X/min)               | 10         |
| **Stockage**    | Capacité de monstres (+5 par niveau)         | 10         |
| **Tour de défense** | Slots de monstres défenseurs (+1/niv)    | 8          |
| **Dojo**        | Active mode coopératif, slots partagés       | 5          |
| **Armurerie**   | Craft d'armes joueur (DPS bonus)             | 5          |
| **Laboratoire** | Recherche d'upgrades (XP boost, capture%)    | 5          |

#### Dojo
- **Création** : 10 000 or
- **Membres max** : 5 (+5 par niveau)
- **Défense partagée** : cristal commun, pool de monstres
- **Coffre de guilde** : contributions or
- **Upgrades de dojo** :
  - Slots défense/mine supplémentaires
  - Bonus XP/or
  - Déblocage de raids

### 2.6 Économie
- **Sources d'or** :
  - Mine (passif)
  - Victoire défense (+bonus vague)
  - Raids (vol partiel)
  - Vente d'objets/monstres
- **Dépenses** :
  - Upgrade de monstres (100 × niveau)
  - Upgrade de bâtiments (coût exponentiel)
  - Achat d'items (Capture Sphere, Potions, Pierres d'évolution)
  - Craft d'armes

### 2.7 Raids PvP
- **Condition** : posséder un **Raid Token** (30 000 or)
- **Mécanisme** :
  - Attaquant choisit un dojo cible
  - Bataille : monstres attaquants vs défenseurs + cristal
  - Durée max : 5 minutes
- **Récompenses** :
  - **Victoire attaquant** : choisir 1 monstre adverse + 20% de l'or
  - **Victoire défenseur** : 50% de l'or de l'attaquant + points de prestige
- **Cooldown** : 24h par dojo

---

## 3. Boucle de jeu

### Session type (30 min)
1. **Exploration** : chercher monstres sauvages (spawn aléatoire)
2. **Combat & capture** : affaiblir, capturer
3. **Défense** : assigner monstres aux tours, repousser vagues
4. **Gestion** : envoyer monstres en mine, améliorer village
5. **Progression** : level up monstres, craft, débloquer évolutions
6. **Social** : rejoindre dojo, participer raids

### Objectifs long terme
- Compléter le Pokédex (150 monstres)
- Atteindre niveau 100 sur équipe principale
- Dominer le classement de dojo
- Débloquer tous les biomes

---

## 4. Fonctionnalités bonus

### 4.1 Événements saisonniers
- Boss mondiaux (coopération serveur entier)
- Monstres exclusifs temporaires
- Récompenses limitées

### 4.2 Biomes
- **Forêt** : Nature, Poison
- **Désert** : Feu, Terre
- **Montagne** : Métal, Air
- **Océan** : Eau, Glace
- **Crypte** : Ombre, Psy
- **Sanctuaire** : Lumière, Psy

### 4.3 Élevage
- Fusionner 2 monstres de même espèce → traits hérités (stats bonus)
- Chance d'obtenir un variant shiny (cosmétique rare)

### 4.4 Talent Tree
- Arbre de spécialisation par monstre (3 branches : Offense / Défense / Utilité)
- Points de talents gagnés par niveau (1 tous les 5 niveaux)

### 4.5 Artefacts
- Objets équipables (1 par monstre)
- Exemples : Amulette de Feu (+10% ATK Feu), Bouclier du Gardien (+15% DEF)

### 4.6 Affinité
- Loyauté du monstre (0–100%)
- Augmente avec combats, soins, victoires
- Bonus : +5% stats à 100%

### 4.7 Marché
- Vente/achat de monstres entre joueurs
- Enchères pour monstres rares
- Tax de 10% (or sink)

---

## 5. Roadmap de développement

### MVP (2–4 semaines)
- [ ] 3 monstres de départ (Feu, Eau, Foudre)
- [ ] 8 éléments
- [ ] 20 monstres
- [ ] Combat temps réel basique
- [ ] Système de capture
- [ ] Mine + Stockage + Tour de défense (1 niveau chacun)
- [ ] Map basique (flat terrain + spawn zones)
- [ ] UI : HP, or, inventaire, stats monstres

### v0.5 (4–6 semaines)
- [ ] 50 monstres
- [ ] Évolutions simples (par niveau)
- [ ] 4 attaques par monstre + cooldowns
- [ ] Vagues de défense (10 vagues, 1 boss)
- [ ] Upgrade de bâtiments (niveau 5 max)
- [ ] Craft basique (Capture Sphere, Potions)

### v1.0 (8–12 semaines)
- [ ] 150 monstres
- [ ] 12 éléments
- [ ] Dojo (création, membres, défense partagée)
- [ ] Raids PvP
- [ ] Armurerie + armes joueur
- [ ] Biomes (3 zones)
- [ ] Événements saisonniers (1 par mois)
- [ ] Marché joueur
- [ ] Leaderboard

### v2.0+ (long terme)
- [ ] Élevage + variants shiny
- [ ] Talent Tree
- [ ] Artefacts
- [ ] 6 biomes
- [ ] Boss mondiaux
- [ ] Système de quêtes
- [ ] PvP arène 1v1

---

## 6. Références & inspirations
- **Pokémon** : capture, évolution, éléments
- **Tower Defense** : vagues, placement stratégique
- **Clash of Clans** : village, raids, dojos
- **Summoners War** : runes, PvP, guildes

---

## 7. Métriques de succès
- **Rétention J1** : >40%
- **Session moyenne** : 25–35 min
- **Conversion dojo** : >60% des joueurs actifs
- **Raids hebdomadaires** : >2 par dojo actif
- **Complétion Pokédex** : >10% à 3 mois

---

**Version** : 1.0  
**Auteur** : Brice  
**Date** : 11 février 2026
