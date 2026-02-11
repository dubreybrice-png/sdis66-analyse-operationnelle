--[[
	BuildingDatabase V20 - Tous les batiments du jeu
	Chaque batiment a un cout, un niveau max par ere, des effets
	Certains commencent "en ruine" et doivent etre repares
]]

local BuildingDatabase = {}

-- ===============================
-- BATIMENTS
-- ===============================
-- era = ere minimum pour debloquer
-- repairCost = cout pour reparer (nil = pas besoin, achetable directement)
-- baseCost = cout initial pour construire
-- upgradeCostBase = cout de base pour upgrade (x2 par level)
-- maxLevelPerEra = niveau max par ere (table indexee par ere)
-- effects = description des effets par niveau

BuildingDatabase.BUILDINGS = {
	-- ====== STOCKAGE (Premier batiment!) ======
	monster_storage = {
		name = "Centre de Stockage",
		desc = "Stocke tes monstres captures. Assigne-les a la defense, mine ou repos.",
		icon = "📦",
		era = 1,
		repairCost = nil,
		baseCost = 50,
		upgradeCostBase = 80,
		maxLevelPerEra = {5, 10, 15, 20, 25, 30},
		effects = {
			slotsBase = 5,
			slotsPerLevel = 3,
		},
		position = Vector3.new(70, 0, -50),
		unlockOrder = 1,
	},

	-- ====== MINE D'OR ======
	gold_mine = {
		name = "Mine d'Or",
		desc = "Envoie tes monstres miner de l'or. Type roche qui entre dans le sol.",
		icon = "⛏️",
		era = 1,
		repairCost = nil,
		baseCost = 150,
		upgradeCostBase = 120,
		maxLevelPerEra = {5, 10, 15, 20, 25, 30},
		effects = {
			slotsBase = 1,
			slotsPerLevel = 1,
			goldPerMinBase = 5,
			goldPerMinPerLevel = 3,
		},
		position = Vector3.new(-75, 0, -45),
		unlockOrder = 2,
	},

	-- ====== HALL DES CLASSES ======
	class_hall = {
		name = "Hall des Classes",
		desc = "Choisis ta classe au niveau 10. Guerrier, Archer, Mage, Acolyte.",
		icon = "🏛️",
		era = 1,
		repairCost = nil,
		baseCost = 100,
		upgradeCostBase = 500,
		maxLevelPerEra = {1, 2, 3, 4, 5, 6},
		effects = {
			advancedClassLevel = 2,
		},
		position = Vector3.new(85, 0, 25),
		unlockOrder = 3,
	},

	-- ====== BUREAU DES DEFENSES ======
	defense_bureau = {
		name = "Bureau des Defenses",
		desc = "Augmente HP cristal, regen, et slots de defense monstres.",
		icon = "🛡️",
		era = 1,
		repairCost = 200,
		baseCost = 0,
		upgradeCostBase = 150,
		maxLevelPerEra = {3, 7, 12, 17, 22, 28},
		effects = {
			defenseSlotsBase = 2,
			defenseSlotsPerLevel = 1,
			crystalHPBonus = 200,
			crystalRegenBonus = 0.002,
		},
		position = Vector3.new(-80, 0, 35),
		unlockOrder = 4,
	},

	-- ====== BANQUE ======
	bank = {
		name = "Banque",
		desc = "Protege ton or dans un coffre. Or de banque jamais perdu.",
		icon = "🏦",
		era = 1,
		repairCost = nil,
		baseCost = 200,
		upgradeCostBase = 180,
		maxLevelPerEra = {5, 10, 15, 20, 25, 30},
		effects = {
			maxProtectedBase = 500,
			maxProtectedPerLevel = 500,
		},
		position = Vector3.new(55, 0, 75),
		unlockOrder = 5,
	},

	-- ====== ARMURERIE ======
	armory = {
		name = "Armurerie",
		desc = "Contient la Forge et l'Autel des Lasers. Reparer pour debloquer.",
		icon = "⚔️",
		era = 1,
		repairCost = 300,
		baseCost = 0,
		upgradeCostBase = 200,
		maxLevelPerEra = {3, 7, 12, 17, 22, 28},
		effects = {
			forgeUnlock = 1,
			laserAltarUnlock = 2,
			forgeTierPerLevel = 1,
			laserSpeedBonus = 0.10,
			laserChanceBonus = 0.02,
			laserRetryChance = 0.03,
		},
		position = Vector3.new(-60, 0, 70),
		unlockOrder = 6,
	},

	-- ====== ECOLE DES MONSTRES ======
	monster_school = {
		name = "Ecole des Monstres",
		desc = "Debloque les skills de tes monstres contre de l'or.",
		icon = "📚",
		era = 1,
		repairCost = 400,
		baseCost = 0,
		upgradeCostBase = 250,
		maxLevelPerEra = {3, 6, 10, 15, 20, 25},
		effects = {
			maxSkillTier = 1,
			skillCostReduction = 0.05,
		},
		position = Vector3.new(80, 0, -30),
		unlockOrder = 7,
	},

	-- ====== CENTRE D'ENTRAINEMENT ======
	training_center = {
		name = "Centre d'Entrainement",
		desc = "Sac de frappe (XP passive) et Ecole Quantique (evolution).",
		icon = "🥊",
		era = 2,
		repairCost = nil,
		baseCost = 500,
		upgradeCostBase = 300,
		maxLevelPerEra = {0, 5, 10, 15, 20, 25},
		effects = {
			trainingSlotsBase = 1,
			trainingSlotsPerLevel = 1,
			trainingXPBonus = 0.10,
			evolutionUnlock = 3,
		},
		position = Vector3.new(-70, 0, -75),
		unlockOrder = 8,
	},

	-- ====== INFIRMERIE ======
	infirmary = {
		name = "Infirmerie",
		desc = "Accelere la recuperation de fatigue et regen HP monstres.",
		icon = "🏥",
		era = 2,
		repairCost = 600,
		baseCost = 0,
		upgradeCostBase = 350,
		maxLevelPerEra = {0, 5, 10, 15, 20, 25},
		effects = {
			fatigueRegenBonus = 5,     -- +5 fatigue/min recup par level
			healAfterWave = true,
			healPercent = 0.10,        -- +10% heal par level
		},
		position = Vector3.new(100, 0, -60),
	},

	-- ====== TOUR DE GUET ======
	watchtower = {
		name = "Tour de Guet",
		desc = "Augmente les chances d'apparition de monstres rares.",
		icon = "🗼",
		era = 2,
		repairCost = 800,
		baseCost = 0,
		upgradeCostBase = 400,
		maxLevelPerEra = {0, 3, 6, 10, 15, 20},
		effects = {
			rareSpawnBonus = 0.05,     -- +5% chance rare par level
		},
		position = Vector3.new(-100, 0, 55),
	},

	-- ====== LABORATOIRE D'ESSENCES ======
	essence_lab = {
		name = "Laboratoire d'Essences",
		desc = "Transforme les essences elementaires en runes et items.",
		icon = "🧪",
		era = 3,
		repairCost = 1500,
		baseCost = 0,
		upgradeCostBase = 600,
		maxLevelPerEra = {0, 0, 5, 10, 15, 20},
		effects = {
			recipeTier = 1,
			efficiencyBonus = 0.10,
		},
		position = Vector3.new(95, 0, 70),
	},

	-- ====== SANCTUAIRE D'EVOLUTION ======
	evolution_sanctuary = {
		name = "Sanctuaire d'Evolution",
		desc = "Permet l'Ascension (rebirth) des monstres. Reduit cout evolutions.",
		icon = "⭐",
		era = 3,
		repairCost = 2000,
		baseCost = 0,
		upgradeCostBase = 800,
		maxLevelPerEra = {0, 0, 3, 7, 12, 18},
		effects = {
			evolutionCostReduction = 0.05,
			traitRarityBonus = 0.02,
		},
		position = Vector3.new(-95, 0, -20),
	},

	-- ====== ENTREPOT ======
	warehouse = {
		name = "Entrepot",
		desc = "Augmente le stockage monstres et ressources.",
		icon = "🏭",
		era = 2,
		repairCost = nil,
		baseCost = 400,
		upgradeCostBase = 250,
		maxLevelPerEra = {0, 5, 10, 15, 20, 25},
		effects = {
			extraMonsterSlots = 5,     -- par level
			extraResourceSlots = 10,
		},
		position = Vector3.new(-50, 0, -95),
	},

	-- ====== MARCHE ======
	market = {
		name = "Marche",
		desc = "Achat/vente de ressources avec des PNJ marchands.",
		icon = "🏪",
		era = 2,
		repairCost = nil,
		baseCost = 350,
		upgradeCostBase = 200,
		maxLevelPerEra = {0, 3, 7, 12, 18, 25},
		effects = {
			tradeCategories = 1,       -- par level
			priceBonus = 0.05,         -- meilleur taux par level
		},
		position = Vector3.new(60, 0, 95),
	},

	-- ====== CENTRE DE COMMANDEMENT ======
	command_center = {
		name = "Centre de Commandement",
		desc = "Augmente slots defense, range defenseurs, bonus aura.",
		icon = "🎖️",
		era = 3,
		repairCost = 2500,
		baseCost = 0,
		upgradeCostBase = 1000,
		maxLevelPerEra = {0, 0, 3, 7, 12, 18},
		effects = {
			extraDefenseSlots = 1,
			defenderRangeBonus = 2,    -- studs par level
			auraBonus = 0.03,          -- +3% stats defenseurs par level
		},
		position = Vector3.new(-95, 0, -60),
	},

	-- ====== MUR D'ENCEINTE ======
	wall = {
		name = "Mur d'Enceinte",
		desc = "Ajoute HP barriere avant le cristal. Regen entre vagues.",
		icon = "🧱",
		era = 2,
		repairCost = nil,
		baseCost = 300,
		upgradeCostBase = 250,
		maxLevelPerEra = {0, 5, 10, 15, 20, 25},
		effects = {
			barrierHP = 100,           -- par level
			barrierRegenPerWave = 0.20, -- % regen entre vagues
		},
		position = Vector3.new(30, 0, 100),
	},

	-- ====== TECHNIQUES DE GUERRE ======
	war_tactics = {
		name = "Techniques de Guerre",
		desc = "Debloque des tactiques: focus proche, fort, faible, protect cristal.",
		icon = "📋",
		era = 2,
		repairCost = 500,
		baseCost = 0,
		upgradeCostBase = 300,
		maxLevelPerEra = {0, 3, 6, 10, 15, 20},
		effects = {
			tacticSlots = 1,           -- par level
		},
		position = Vector3.new(-45, 0, 95),
	},

	-- ====== BUREAU DES CONTRATS ======
	contract_bureau = {
		name = "Bureau des Contrats",
		desc = "Quetes quotidiennes/hebdo avec recompenses.",
		icon = "📜",
		era = 3,
		repairCost = 1200,
		baseCost = 0,
		upgradeCostBase = 500,
		maxLevelPerEra = {0, 0, 3, 7, 12, 18},
		effects = {
			dailyQuests = 1,           -- par level
			weeklyQuests = 0,          -- 1 a partir level 3
			rerollsPerDay = 0,
		},
		position = Vector3.new(90, 0, -85),
	},

	-- ====== HALL DES TROPHEES ======
	trophy_hall = {
		name = "Hall des Trophees",
		desc = "Affiche exploits. Bonus passif selon trophees collectes.",
		icon = "🏆",
		era = 3,
		repairCost = nil,
		baseCost = 800,
		upgradeCostBase = 400,
		maxLevelPerEra = {0, 0, 3, 7, 12, 18},
		effects = {
			activeTrophySlots = 2,     -- par level
		},
		position = Vector3.new(-105, 0, 15),
	},

	-- ====== PORTAIL EXPEDITION ======
	expedition_portal = {
		name = "Portail d'Expedition",
		desc = "Attaque des villages PNJ (glacier, volcan, desert). Loot special.",
		icon = "🌀",
		era = 4,
		repairCost = 5000,
		baseCost = 0,
		upgradeCostBase = 2000,
		maxLevelPerEra = {0, 0, 0, 3, 7, 12},
		effects = {
			expeditionTypes = 1,       -- par level
			cooldownReduction = 0.10,
		},
		position = Vector3.new(0, 0, -110),
	},

	-- ====== DOJO DE VILLE ======
	dojo = {
		name = "Dojo",
		desc = "Cree ou rejoins un dojo de guilde. PvP et raids.",
		icon = "⛩️",
		era = 2,
		repairCost = nil,
		baseCost = 1000,
		upgradeCostBase = 800,
		maxLevelPerEra = {0, 3, 6, 10, 15, 20},
		effects = {
			dojoGuildLevel = 1,        -- prerequis pour level dojo guilde
		},
		position = Vector3.new(110, 0, -15),
	},

	-- ====== ARENE D'ENTRAINEMENT ======
	training_arena = {
		name = "Arene d'Entrainement",
		desc = "Duel PvE contre hologrammes. Test tes builds.",
		icon = "🏟️",
		era = 3,
		repairCost = 1500,
		baseCost = 0,
		upgradeCostBase = 700,
		maxLevelPerEra = {0, 0, 3, 7, 12, 18},
		effects = {
			arenaModesUnlocked = 1,    -- par level
		},
		position = Vector3.new(-110, 0, -40),
	},
}

-- ===============================
-- FONCTIONS UTILITAIRES
-- ===============================

function BuildingDatabase:Get(buildingId)
	return self.BUILDINGS[buildingId]
end

-- Ordre de construction sequentiel
function BuildingDatabase:GetUnlockOrder()
	local ordered = {}
	for id, building in pairs(self.BUILDINGS) do
		if building.unlockOrder then
			table.insert(ordered, {id = id, order = building.unlockOrder, data = building})
		end
	end
	table.sort(ordered, function(a, b) return a.order < b.order end)
	return ordered
end

-- Prochain batiment a construire pour un joueur
function BuildingDatabase:GetNextToBuild(playerBuildings)
	local ordered = self:GetUnlockOrder()
	for _, entry in ipairs(ordered) do
		if not playerBuildings[entry.id] then
			return entry.id, entry.data
		end
	end
	return nil, nil  -- tous construits
end

-- Verifier si un batiment est deverrouille (tous les precedents sont construits)
function BuildingDatabase:IsBuildingUnlocked(buildingId, playerBuildings)
	local bData = self.BUILDINGS[buildingId]
	if not bData or not bData.unlockOrder then return true end
	
	-- Verifier que tous les batiments avec un unlockOrder inferieur sont construits
	for id, building in pairs(self.BUILDINGS) do
		if building.unlockOrder and building.unlockOrder < bData.unlockOrder then
			if not playerBuildings[id] then
				return false
			end
		end
	end
	return true
end

-- Cout d'upgrade pour un batiment a un certain level
function BuildingDatabase:GetUpgradeCost(buildingId, currentLevel)
	local building = self.BUILDINGS[buildingId]
	if not building then return 999999 end
	return math.floor(building.upgradeCostBase * math.pow(2, currentLevel - 1))
end

-- Niveau max pour une ere donnee
function BuildingDatabase:GetMaxLevel(buildingId, era)
	local building = self.BUILDINGS[buildingId]
	if not building then return 0 end
	era = math.clamp(era, 1, #building.maxLevelPerEra)
	return building.maxLevelPerEra[era] or 0
end

-- Liste des batiments disponibles pour une ere
function BuildingDatabase:GetAvailableBuildings(era)
	local result = {}
	for id, building in pairs(self.BUILDINGS) do
		if building.era <= era then
			table.insert(result, {id = id, data = building})
		end
	end
	return result
end

return BuildingDatabase
