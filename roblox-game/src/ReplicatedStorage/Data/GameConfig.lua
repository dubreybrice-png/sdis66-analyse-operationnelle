--[[
	GameConfig V20 - Toutes les constantes du jeu centralisees
	Modifie ICI pour equilibrer le jeu entier
]]

local GameConfig = {}

-- ===============================
-- XP JOUEUR
-- ===============================
GameConfig.XP = {
	-- Formule level up joueur: BASE * GROWTH^(level-1)
	PLAYER_LEVELUP_BASE = 100,
	PLAYER_LEVELUP_GROWTH = 1.15,
	PLAYER_MAX_LEVEL = 100,
	
	-- XP gagnee par kill (actif)
	PLAYER_KILL_BASE = 10,
	PLAYER_KILL_PER_WILD_LEVEL = 2,
	
	-- XP capture reussie
	PLAYER_CAPTURE_BASE = 12,
	CAPTURE_BASE = 12,  -- alias
	
	-- Bonus rarete sur XP kill
	RARITY_XP_BONUS = {
		Commun = 0,
		Rare = 4,
		Exceptionnel = 10,
		Epique = 18,
		Legendaire = 30,
	},
}

-- ===============================
-- XP MONSTRES
-- ===============================
GameConfig.MONSTER_XP = {
	-- Formule level up monstre: BASE * level
	LEVELUP_BASE = 80,
	MAX_LEVEL = 100,
	
	-- XP par kill (monstre actif en defense)
	KILL_BASE = 14,
	KILL_PER_WILD_LEVEL = 3,
	
	-- XP capture (monstre actif)
	CAPTURE_BASE = 8,
	
	-- XP passive
	DEFENSE_XP_PER_30S = 2,     -- si cristal attaque dans les 60 dernieres secondes
	MINE_XP_PER_MINUTE = 1,
	TRAINING_XP_PER_30S = 3,    -- entre defense et mine mais sans gold
	
	-- Cap XP passif par monstre par jour
	PASSIVE_CAP_PER_DAY = 900,
	PASSIVE_CAP = 900,  -- alias
	PASSIVE_CAP_PENALTY = 0.10,
	
	-- Alias pour MonsterManager
	MINE_XP_PER_MIN = 1,
	
	-- Stats par level up monstre
	STATS_PER_LEVEL = {
		ATK = 1.2,
		Agility = 0.8,
		Vitality = 1.5,
	},
}

-- ===============================
-- SPAWN & VAGUES
-- ===============================
GameConfig.SPAWN = {
	BASE_INTERVAL = 10,           -- secondes entre spawns
	INTERVAL_REDUCTION = 0.05,    -- par VilleLevel
	MIN_INTERVAL = 6,             -- cap minimum
	
	MAX_ALIVE_BASE = 8,
	MAX_ALIVE_PER_10_LEVELS = 1,  -- +1 max par 10 niveaux ville
	MAX_ALIVE_CAP = 18,
	
	-- Pause entre vagues
	WAVE_PAUSE = 5,               -- secondes de pause entre vagues
	MONSTERS_PER_WAVE_BASE = 3,   -- monstres par vague au debut
	MONSTERS_PER_WAVE_GROWTH = 0.15, -- +15% par vague
	
	-- Boss
	BOSS_EVERY_N_WAVES = 25,      -- boss toutes les 25 vagues
	BOSS_HP_MULTIPLIER = 10,
	BOSS_ATK_MULTIPLIER = 3,
	BOSS_XP_MULTIPLIER = 5,
	BOSS_GOLD_MULTIPLIER = 8,
	
	-- Scaling monstres sauvages
	WILD_HP_BASE = 30,
	WILD_ATK_BASE = 8,
	WILD_AGILITY_BASE = 10,
	WILD_HP_SCALE = 0.12,         -- par WildLevel
	WILD_ATK_SCALE = 0.09,
	WILD_DEF_SCALE = 0.07,
	
	-- Knockout (pour capture)
	KNOCKOUT_DURATION = 5,        -- secondes "assomme" apres mort
}

-- ===============================
-- CRISTAL
-- ===============================
GameConfig.CRYSTAL = {
	BASE_HP = 500,
	HP_PER_BUILDING_LEVEL = 200,
	
	-- Regen
	REGEN_RATE = 0.006,           -- 0.6% HPMax / minute
	REGEN_COMBAT_COOLDOWN = 30,   -- pas de regen si attaque < 30s
	REGEN_UPGRADE_BONUS = 0.002,  -- +0.2% par level infirmerie
	
	-- Destruction (soft fail)
	DOWN_DURATION_BASE = 60,      -- secondes
	DOWN_DURATION_PER_LEVEL = 2,
	DOWN_DURATION_CAP = 180,
	RESPAWN_HP_PERCENT = 0.30,    -- respawn a 30% HP max
	
	-- Malus temporaire apres destruction
	GOLD_MALUS_DURATION = 120,    -- secondes de malus production
	GOLD_MALUS_PERCENT = 0.50,    -- -50% production
}

-- ===============================
-- OR & ECONOMIE
-- ===============================
GameConfig.GOLD = {
	-- Recompense kill
	KILL_BASE = 8,
	KILL_PER_WILD_LEVEL = 2,
	KILL_BOSS_MULTIPLIER = 8,
	
	-- Perte a la destruction cristal (wallet seulement)
	LOSS_BASE_RATE = 0.12,        -- 12%
	LOSS_PER_VILLE_LEVEL = 0.0008,
	LOSS_CAP = 0.20,              -- 20% max
	
	-- Mine
	MINE_BASE_GOLD_PER_MIN = 5,
	MINE_BASE_PER_MIN = 5,  -- alias
	MINE_PER_MONSTER_LEVEL = 0.5,
	MINE_PER_BUILDING_LEVEL = 3,
	MINE_PER_LEVEL_PER_MIN = 3,  -- alias
}

-- ===============================
-- CAPTURE
-- ===============================
GameConfig.CAPTURE = {
	-- Taux de base par rarete
	BASE_RATE = {
		Commun = 0.15,
		Rare = 0.08,
		Exceptionnel = 0.04,
		Epique = 0.02,
		Legendaire = 0.005,
	},
	
	-- Temps de canalisation du laser (secondes)
	CHANNEL_TIME = 4,
	CHANNEL_TIME_MIN = 1.5,       -- minimum apres upgrades
	
	-- Bonus Tech (par point de Tech)
	TECH_CAPTURE_BONUS = 0.005,   -- +0.5% par point
	
	-- Nombre d'orbes de depart
	STARTING_ORBS = 5,
}

-- ===============================
-- FATIGUE
-- ===============================
GameConfig.FATIGUE = {
	-- Gain de fatigue par MINUTE
	DEFENSE_PER_MINUTE = 2,
	MINE_PER_MINUTE = 1.5,
	TRAINING_PER_MINUTE = 1,
	
	-- Gain de fatigue par 30s (pour le tick du MonsterManager)
	DEFENSE_PER_30S = 1,
	MINE_PER_30S = 0.75,
	TRAINING_PER_30S = 0.5,
	
	-- Seuils de malus (tableaux pour iteration facile)
	THRESHOLDS = {30, 60, 85, 95},
	MALUS = {0.80, 0.50, 0.20, 0.10},
	
	-- Recuperation par 30s
	REST_RECOVERY_PER_30S = 2.5,
	
	-- Recuperation par minute
	REST_PER_MINUTE = 5,
	INFIRMARY_PER_MINUTE = 20,
	MAX_FATIGUE = 100,
}

-- ===============================
-- SKILL POINTS JOUEUR
-- ===============================
GameConfig.SKILLS = {
	POINTS_PER_LEVEL = 1,
	
	-- Bonus par point
	ATK_DMG_PER_POINT = 1.5,     -- +1.5 degat par point ATK
	AGILITY_SPEED_PER_POINT = 0.5, -- +0.5% vitesse attaque
	VITALITY_HP_PER_POINT = 5,   -- +5 HP par point
}

-- ===============================
-- RARETES (probabilites de spawn)
-- ===============================
GameConfig.RARITY_WEIGHTS = {
	Commun = 60,
	Rare = 25,
	Exceptionnel = 10,
	Epique = 4,
	Legendaire = 1,
}

-- Multiplicateurs de stats par rarete
GameConfig.RARITY_STAT_MULT = {
	Commun = 1.0,
	Rare = 1.15,
	Exceptionnel = 1.35,
	Epique = 1.60,
	Legendaire = 2.0,
}

-- ===============================
-- REBIRTH MONSTRE
-- ===============================
GameConfig.MONSTER_REBIRTH = {
	MAX_STARS = 5,
	STAT_BONUS_PER_STAR = 0.05,  -- +5% stats par etoile
	-- Apres 5 etoiles: "Transcendance" points infinis
	TRANSCEND_BONUS = 0.01,       -- +1% par transcendance
}

-- ===============================
-- REBIRTH JOUEUR
-- ===============================
GameConfig.PLAYER_REBIRTH = {
	REQUIRED_LEVEL = 100,
	-- Bonus aleatoires (5 proposes, en choisir 1)
	BONUS_POOL = {
		{id = "stat_flat", name = "Force Brute", desc = "+10 ATK permanent", rarity = "Commun"},
		{id = "xp_percent", name = "Sagesse", desc = "+5% XP joueur", rarity = "Commun"},
		{id = "monster_xp", name = "Mentor", desc = "+5% XP monstres", rarity = "Rare"},
		{id = "gold_percent", name = "Fortune", desc = "+8% or gagne", rarity = "Rare"},
		{id = "capture_bonus", name = "Maitre Capteur", desc = "+3% capture", rarity = "Exceptionnel"},
		{id = "crit_chance", name = "Oeil Critique", desc = "+2% coup critique", rarity = "Exceptionnel"},
		{id = "element_mastery", name = "Affinite", desc = "+10% maitrise element", rarity = "Epique"},
		{id = "all_stats", name = "Transcendance", desc = "+5 toutes stats", rarity = "Legendaire"},
	},
}

-- ===============================
-- REBIRTH VILLE (ERES)
-- ===============================
GameConfig.ERAS = {
	{name = "Ere Primitive", villeLevel = 1, maxBuildingLevel = 5, color = Color3.fromRGB(139, 119, 101)},
	{name = "Ere du Bronze", villeLevel = 8, maxBuildingLevel = 10, color = Color3.fromRGB(205, 127, 50)},
	{name = "Ere du Fer", villeLevel = 18, maxBuildingLevel = 15, color = Color3.fromRGB(160, 160, 170)},
	{name = "Ere Magique", villeLevel = 30, maxBuildingLevel = 20, color = Color3.fromRGB(148, 103, 189)},
	{name = "Ere Cristalline", villeLevel = 50, maxBuildingLevel = 25, color = Color3.fromRGB(0, 200, 255)},
	{name = "Ere Celeste", villeLevel = 80, maxBuildingLevel = 30, color = Color3.fromRGB(255, 215, 0)},
}

-- ===============================
-- WEATHER
-- ===============================
GameConfig.WEATHER = {
	MIN_INTERVAL = 180,           -- 3 min minimum entre events
	MAX_INTERVAL = 600,           -- 10 min max
	DURATION = 60,                -- 1 min de duree
	BONUS_PERCENT = 0.20,         -- +20% element favori
	MALUS_PERCENT = 0.15,         -- -15% element defavori
}

return GameConfig
