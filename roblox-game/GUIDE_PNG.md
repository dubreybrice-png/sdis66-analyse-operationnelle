# 🎮 Guide d'intégration des PNG (Images de monstres)

## Où obtenir tes images

### Option 1 : Générer avec IA (Recommandé)
1. **Bing Image Creator** (gratuit) : https://www.bing.com/create
   - Prompt : "cute cartoon fire monster character, simple design, white background, game asset"
   - Remplace "fire" par water, electric, earth, etc.

2. **Leonardo.ai** (15 crédits gratuits/jour) : https://leonardo.ai
   - Style : "3D Render" ou "Anime"
   - Prompt similaire

### Option 2 : Assets gratuits
- **Itch.io** : https://itch.io/game-assets/free/tag-monsters
- **OpenGameArt** : https://opengameart.org
- **Kenney.nl** : https://kenney.nl/assets (style pixel art)

## Comment intégrer dans Roblox Studio

### Étape 1 : Préparer les images
1. Tes PNG doivent être **512x512** ou **1024x1024**
2. Fond transparent (optionnel mais mieux)
3. Nomme-les : `Flareo.png`, `Aquava.png`, `Zappit.png`, etc.

### Étape 2 : Importer dans Studio
1. **View** → **Asset Manager** (ou Ctrl+Alt+X)
2. Onglet **Images**
3. Clique **Import** (bouton en haut)
4. Sélectionne tes PNG
5. Attends la modération (quelques secondes à 1 minute)
6. Copie l'ID de chaque image (clic droit → Copy Asset ID)

### Étape 3 : Utiliser dans l'UI

#### Dans ClientUI.lua (ligne ~90)
Remplace cette partie :
```lua
-- Image placeholder (tu mettras ton PNG ici)
local img = Instance.new("Frame")
img.Parent = card
img.Size = UDim2.fromOffset(180, 120)
img.Position = UDim2.fromOffset(10, 10)
img.BackgroundColor3 = Color3.fromRGB(80, 80, 90)
img.ZIndex = 22

local imgLabel = Instance.new("TextLabel")
imgLabel.Parent = img
imgLabel.Size = UDim2.new(1, 0, 1, 0)
imgLabel.BackgroundTransparency = 1
imgLabel.TextSize = 48
imgLabel.Text = def.Element == "Fire" and "🔥" or (def.Element == "Water" and "💧" or "⚡")
imgLabel.ZIndex = 23
```

Par ça :
```lua
-- Table des IDs d'images (colle tes Asset IDs ici)
local MONSTER_IMAGES = {
	[1] = "rbxassetid://123456789", -- Flareo
	[2] = "rbxassetid://987654321", -- Aquava
	[3] = "rbxassetid://555555555"  -- Zappit
}

-- Image du monstre
local img = Instance.new("ImageLabel")
img.Parent = card
img.Size = UDim2.fromOffset(180, 120)
img.Position = UDim2.fromOffset(10, 10)
img.BackgroundTransparency = 1
img.Image = MONSTER_IMAGES[monsterId] or ""
img.ScaleType = Enum.ScaleType.Fit
img.ZIndex = 22
```

### Étape 4 : Ajouter aux monstres sauvages (3D)

#### Dans MonsterService.lua (fonction SpawnWildNPC)
Après la création du `head`, ajoute :
```lua
-- Decal sur la tête
local decal = Instance.new("Decal")
decal.Face = Enum.NormalId.Front
decal.Texture = MONSTER_IMAGES[monsterId] or ""
decal.Parent = head
```

## Liste des monstres à créer (images PNG)

### Starters (priorité haute)
1. **Flareo** (Feu) - monstre rouge/orange avec flammes
2. **Aquava** (Eau) - monstre bleu avec gouttes d'eau
3. **Zappit** (Foudre) - monstre jaune avec éclairs

### Sauvages communs
4. **Mossy** (Terre) - monstre brun/vert, aspect rocheux
5. **Frostle** (Givre) - monstre bleu clair/blanc, cristaux de glace

### Style recommandé
- **Mignon cartoon** (comme demandé)
- Formes arrondies
- Couleurs vives
- Yeux grands et expressifs
- Taille moyenne (pas trop détaillé)

## Exemple de prompts IA précis

### Flareo (Feu)
```
cute cartoon fire monster, round body, orange and red colors, 
small flames on head, happy expression, simple design, 
white background, game character asset, front view
```

### Aquava (Eau)
```
cute cartoon water monster, blue creature, water drop shape, 
friendly face, bubbles around, simple design, 
white background, game character asset, front view
```

### Zappit (Foudre)
```
cute cartoon electric monster, yellow and white colors, 
spiky fur, lightning bolt tail, energetic expression, 
simple design, white background, game character asset, front view
```

## Troubleshooting

**"Image not showing"** → Vérifie que l'Asset ID est correct (doit commencer par `rbxassetid://`)

**"Moderation pending"** → Attends quelques minutes, Roblox modère toutes les images

**"Image too big"** → Réduis à 1024x1024 max

**"Image blurry"** → Utilise PNG haute qualité (pas JPEG)

## Alternative : Utiliser des émojis (temporaire)

Si tu n'as pas encore les PNG, tu peux utiliser des émojis en attendant :
```lua
local EMOJI_ICONS = {
	Fire = "🔥",
	Water = "💧",
	Spark = "⚡",
	Earth = "🪨",
	Frost = "❄️",
	Wind = "💨"
}
```

---

**Une fois les images intégrées, ton jeu aura un vrai look professionnel !**
