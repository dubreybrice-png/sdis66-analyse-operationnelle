--[[
	MonsterDatabase V20 - Base de donnees complete des monstres
	33 monstres, 9 elements, 5 raretes, evolutions, skills
]]

local MonsterDatabase = {}

-- ===============================
-- TRAITS (aleatoire a la capture/spawn)
-- ===============================
MonsterDatabase.TRAITS = {
	{id = "none", name = "Normal", desc = "Aucun effet", modifiers = {}},
	{id = "violent", name = "Violent", desc = "+15% ATK, -10% Vitality", 
		modifiers = {ATK = 1.15, Vitality = 0.90}},
	{id = "greedy", name = "Cupide", desc = "+20% gold mine, -10% ATK, -5% Vitality",
		modifiers = {ATK = 0.90, Vitality = 0.95, GoldBonus = 1.20}},
	{id = "brave", name = "Courageux", desc = "+10% ATK, +5% Vitality, -10% Agility",
		modifiers = {ATK = 1.10, Vitality = 1.05, Agility = 0.90}},
	{id = "swift", name = "Agile", desc = "+15% Agility, -10% Vitality",
		modifiers = {Agility = 1.15, Vitality = 0.90}},
	{id = "hardy", name = "Robuste", desc = "+15% Vitality, -10% Agility",
		modifiers = {Vitality = 1.15, Agility = 0.90}},
	{id = "clever", name = "Malin", desc = "+10% XP gain, -5% ATK",
		modifiers = {ATK = 0.95, XPBonus = 1.10}},
	{id = "lazy", name = "Paresseux", desc = "-20% fatigue, -10% ATK",
		modifiers = {ATK = 0.90, FatigueReduction = 0.80}},
}

-- Poids des traits
MonsterDatabase.TRAIT_WEIGHTS = {
	none = 35, violent = 10, greedy = 10, brave = 10,
	swift = 10, hardy = 10, clever = 10, lazy = 5,
}

-- ===============================
-- RARETES
-- ===============================
MonsterDatabase.RARITIES = {"Commun", "Rare", "Exceptionnel", "Epique", "Legendaire"}

MonsterDatabase.RARITY_COLORS = {
	Commun = Color3.fromRGB(200, 200, 200),
	Rare = Color3.fromRGB(80, 180, 255),
	Exceptionnel = Color3.fromRGB(180, 80, 255),
	Epique = Color3.fromRGB(255, 160, 30),
	Legendaire = Color3.fromRGB(255, 215, 0),
}

-- ===============================
-- SKILLS (deblocables via Ecole des Monstres)
-- ===============================
MonsterDatabase.SKILLS = {
	-- Feu
	boule_feu = {name = "Boule de Feu", element = "Feu", dmgMult = 2.0, cooldown = 8, desc = "Lance une boule de feu"},
	eruption = {name = "Eruption", element = "Feu", dmgMult = 3.0, cooldown = 15, desc = "Explosion de zone"},
	flamme_vive = {name = "Flamme Vive", element = "Feu", dmgMult = 1.5, cooldown = 5, desc = "Attaque rapide de feu"},
	-- Eau
	jet_eau = {name = "Jet d'Eau", element = "Eau", dmgMult = 2.0, cooldown = 8, desc = "Jet d'eau puissant"},
	tsunami = {name = "Tsunami", element = "Eau", dmgMult = 3.0, cooldown = 15, desc = "Vague devastatrice"},
	brume = {name = "Brume", element = "Eau", dmgMult = 0, cooldown = 12, desc = "Reduit precision ennemie", buff = "evasion"},
	-- Plante
	liane = {name = "Liane", element = "Plante", dmgMult = 1.8, cooldown = 7, desc = "Fouette avec des lianes"},
	racines = {name = "Racines", element = "Plante", dmgMult = 0, cooldown = 15, desc = "Immobilise l'ennemi", debuff = "root"},
	photosynthese = {name = "Photosynthese", element = "Plante", dmgMult = 0, cooldown = 20, desc = "Regenere HP", heal = 0.20},
	-- Electrique
	eclair = {name = "Eclair", element = "Electrique", dmgMult = 2.2, cooldown = 8, desc = "Frappe eclaire"},
	surcharge = {name = "Surcharge", element = "Electrique", dmgMult = 3.5, cooldown = 18, desc = "Decharge massive"},
	champ_electrique = {name = "Champ Electrique", element = "Electrique", dmgMult = 1.0, cooldown = 10, desc = "Zone de degats", aoe = true},
	-- Vol
	bourrasque = {name = "Bourrasque", element = "Vol", dmgMult = 2.0, cooldown = 8, desc = "Souffle puissant"},
	pique = {name = "Pique", element = "Vol", dmgMult = 2.5, cooldown = 10, desc = "Attaque en pique"},
	-- Sol
	seisme = {name = "Seisme", element = "Sol", dmgMult = 2.5, cooldown = 12, desc = "Tremblement de terre", aoe = true},
	bouclier_terre = {name = "Bouclier de Terre", element = "Sol", dmgMult = 0, cooldown = 15, desc = "+30% defense", buff = "defense"},
	-- Ange
	lumiere = {name = "Lumiere Sacree", element = "Ange", dmgMult = 2.0, cooldown = 8, desc = "Rayon de lumiere"},
	benediction = {name = "Benediction", element = "Ange", dmgMult = 0, cooldown = 20, desc = "Soigne allie", heal = 0.25},
	-- Demon
	griffe_ombre = {name = "Griffe d'Ombre", element = "Demon", dmgMult = 2.2, cooldown = 7, desc = "Griffure demoniaque"},
	malediction = {name = "Malediction", element = "Demon", dmgMult = 0, cooldown = 15, desc = "Reduit ATK ennemi", debuff = "weaken"},
	-- Tenebres
	void = {name = "Frappe du Vide", element = "Tenebres", dmgMult = 2.5, cooldown = 10, desc = "Attaque du neant"},
	absorption = {name = "Absorption", element = "Tenebres", dmgMult = 1.5, cooldown = 12, desc = "Vole HP", lifesteal = 0.50},
}

-- ===============================
-- MONSTRES
-- ===============================
-- Stats = {ATK, Agility, Vitality} a niveau 1 (avant rarete/trait)
-- skills = {skill_id = level_requis}
-- evolvesTo = id du monstre evolue (nil si pas d'evolution)
-- evolvesFrom = id du stade precedent (nil si forme de base)
-- spawnWeight = poids de spawn (plus haut = plus frequent)
-- minVilleLevel = niveau ville minimum pour spawn

MonsterDatabase.MONSTERS = {
	-- ====== FEU ======
	flameguard = {
		name = "Flameguard", element = "Feu", starter = true,
		stats = {ATK = 10, Agility = 8, Vitality = 12},
		color = Color3.fromRGB(255, 100, 40), size = 2.5,
		skills = {flamme_vive = 5, boule_feu = 15, eruption = 30},
		evolvesTo = "flamewarden", evolvesFrom = nil,
		spawnWeight = 30, minVilleLevel = 1,
		desc = "Un gardien de flamme loyal et courageux.",
	},
	flamewarden = {
		name = "Flamewarden", element = "Feu",
		stats = {ATK = 18, Agility = 14, Vitality = 20},
		color = Color3.fromRGB(255, 60, 20), size = 3.2,
		skills = {flamme_vive = 1, boule_feu = 5, eruption = 20},
		evolvesTo = "infernoknight", evolvesFrom = "flameguard",
		spawnWeight = 0, minVilleLevel = 999,
		desc = "Evolution de Flameguard. Brule d'une flamme intense.",
	},
	infernoknight = {
		name = "Infernoknight", element = "Feu",
		stats = {ATK = 28, Agility = 20, Vitality = 30},
		color = Color3.fromRGB(200, 30, 0), size = 4.0,
		skills = {flamme_vive = 1, boule_feu = 1, eruption = 10},
		evolvesTo = nil, evolvesFrom = "flamewarden",
		spawnWeight = 0, minVilleLevel = 999,
		desc = "Forme finale. Un chevalier infernal devastateur.",
	},
	pyrofox = {
		name = "Pyrofox", element = "Feu",
		stats = {ATK = 12, Agility = 15, Vitality = 8},
		color = Color3.fromRGB(255, 140, 50), size = 2.0,
		skills = {flamme_vive = 5, boule_feu = 20},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 25, minVilleLevel = 1,
		desc = "Un renard de feu rapide et agile.",
	},
	magmacrab = {
		name = "Magmacrab", element = "Feu",
		stats = {ATK = 8, Agility = 5, Vitality = 20},
		color = Color3.fromRGB(180, 60, 20), size = 2.8,
		skills = {boule_feu = 8, eruption = 25},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 15, minVilleLevel = 3,
		desc = "Un crabe de magma lent mais tres resistant.",
	},
	blazephoenix = {
		name = "Blazephoenix", element = "Feu",
		stats = {ATK = 25, Agility = 22, Vitality = 18},
		color = Color3.fromRGB(255, 200, 50), size = 3.5,
		skills = {flamme_vive = 1, boule_feu = 1, eruption = 15},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 1, minVilleLevel = 15,
		desc = "Legendaire. Un phenix de flammes eternelles.",
	},

	-- ====== EAU ======
	aquashell = {
		name = "Aquashell", element = "Eau", starter = true,
		stats = {ATK = 8, Agility = 7, Vitality = 15},
		color = Color3.fromRGB(40, 140, 255), size = 2.5,
		skills = {jet_eau = 5, brume = 15, tsunami = 30},
		evolvesTo = "aquafortress", evolvesFrom = nil,
		spawnWeight = 30, minVilleLevel = 1,
		desc = "Une carapace d'eau protectrice et tenace.",
	},
	aquafortress = {
		name = "Aquafortress", element = "Eau",
		stats = {ATK = 14, Agility = 10, Vitality = 28},
		color = Color3.fromRGB(30, 100, 220), size = 3.5,
		skills = {jet_eau = 1, brume = 5, tsunami = 18},
		evolvesTo = "tidalguardian", evolvesFrom = "aquashell",
		spawnWeight = 0, minVilleLevel = 999,
		desc = "Evolution de Aquashell. Une forteresse vivante.",
	},
	tidalguardian = {
		name = "Tidalguardian", element = "Eau",
		stats = {ATK = 20, Agility = 15, Vitality = 40},
		color = Color3.fromRGB(20, 60, 180), size = 4.5,
		skills = {jet_eau = 1, brume = 1, tsunami = 8},
		evolvesTo = nil, evolvesFrom = "aquafortress",
		spawnWeight = 0, minVilleLevel = 999,
		desc = "Forme finale. Gardien des marees invincible.",
	},
	tidecrab = {
		name = "Tidecrab", element = "Eau",
		stats = {ATK = 10, Agility = 10, Vitality = 14},
		color = Color3.fromRGB(60, 160, 220), size = 2.2,
		skills = {jet_eau = 5, brume = 18},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 25, minVilleLevel = 1,
		desc = "Un crabe de maree polyvalent.",
	},
	tsunameel = {
		name = "Tsunameel", element = "Eau",
		stats = {ATK = 18, Agility = 16, Vitality = 12},
		color = Color3.fromRGB(20, 100, 200), size = 2.8,
		skills = {jet_eau = 5, tsunami = 15},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 10, minVilleLevel = 5,
		desc = "Une anguille dechainant des raz-de-maree.",
	},
	leviathan = {
		name = "Leviathan", element = "Eau",
		stats = {ATK = 22, Agility = 12, Vitality = 30},
		color = Color3.fromRGB(10, 50, 150), size = 4.0,
		skills = {jet_eau = 1, brume = 1, tsunami = 10},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 1, minVilleLevel = 15,
		desc = "Legendaire. Le maitre des abysses.",
	},

	-- ====== PLANTE ======
	thornsprout = {
		name = "Thornsprout", element = "Plante",
		stats = {ATK = 9, Agility = 10, Vitality = 11},
		color = Color3.fromRGB(80, 180, 50), size = 2.0,
		skills = {liane = 5, racines = 18},
		evolvesTo = "thornblade", evolvesFrom = nil,
		spawnWeight = 30, minVilleLevel = 1,
		desc = "Une pousse epineuse pleine de vitalite.",
	},
	thornblade = {
		name = "Thornblade", element = "Plante",
		stats = {ATK = 16, Agility = 15, Vitality = 18},
		color = Color3.fromRGB(40, 140, 30), size = 3.0,
		skills = {liane = 1, racines = 8, photosynthese = 20},
		evolvesTo = "naturewarden", evolvesFrom = "thornsprout",
		spawnWeight = 0, minVilleLevel = 999,
		desc = "Evolution de Thornsprout. Lames vegetales tranchantes.",
	},
	naturewarden = {
		name = "Naturewarden", element = "Plante",
		stats = {ATK = 24, Agility = 18, Vitality = 32},
		color = Color3.fromRGB(20, 100, 20), size = 4.0,
		skills = {liane = 1, racines = 1, photosynthese = 10},
		evolvesTo = nil, evolvesFrom = "thornblade",
		spawnWeight = 0, minVilleLevel = 999,
		desc = "Forme finale. Protecteur de la nature ancestral.",
	},
	vinelash = {
		name = "Vinelash", element = "Plante",
		stats = {ATK = 13, Agility = 14, Vitality = 9},
		color = Color3.fromRGB(100, 200, 60), size = 2.3,
		skills = {liane = 3, racines = 15},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 20, minVilleLevel = 2,
		desc = "Fouette avec des lianes a grande vitesse.",
	},
	mushguard = {
		name = "Mushguard", element = "Plante",
		stats = {ATK = 7, Agility = 6, Vitality = 22},
		color = Color3.fromRGB(150, 120, 80), size = 2.8,
		skills = {photosynthese = 8, racines = 20},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 12, minVilleLevel = 4,
		desc = "Un champignon gardien, lent mais increvable.",
	},
	floradragon = {
		name = "Floradragon", element = "Plante",
		stats = {ATK = 20, Agility = 18, Vitality = 24},
		color = Color3.fromRGB(30, 160, 50), size = 3.8,
		skills = {liane = 1, racines = 1, photosynthese = 12},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 1, minVilleLevel = 15,
		desc = "Legendaire. Dragon vegetal ancien.",
	},

	-- ====== ELECTRIQUE ======
	voltsprite = {
		name = "Voltsprite", element = "Electrique", starter = true,
		stats = {ATK = 11, Agility = 14, Vitality = 9},
		color = Color3.fromRGB(255, 220, 40), size = 2.0,
		skills = {eclair = 5, champ_electrique = 15, surcharge = 30},
		evolvesTo = "voltcaster", evolvesFrom = nil,
		spawnWeight = 30, minVilleLevel = 1,
		desc = "Un sprite electrique vif comme l'eclair.",
	},
	voltcaster = {
		name = "Voltcaster", element = "Electrique",
		stats = {ATK = 20, Agility = 22, Vitality = 14},
		color = Color3.fromRGB(255, 200, 0), size = 2.8,
		skills = {eclair = 1, champ_electrique = 5, surcharge = 18},
		evolvesTo = "thunderlord", evolvesFrom = "voltsprite",
		spawnWeight = 0, minVilleLevel = 999,
		desc = "Evolution de Voltsprite. Maitre de la foudre.",
	},
	thunderlord = {
		name = "Thunderlord", element = "Electrique",
		stats = {ATK = 30, Agility = 28, Vitality = 22},
		color = Color3.fromRGB(200, 180, 0), size = 3.8,
		skills = {eclair = 1, champ_electrique = 1, surcharge = 8},
		evolvesTo = nil, evolvesFrom = "voltcaster",
		spawnWeight = 0, minVilleLevel = 999,
		desc = "Forme finale. Seigneur du tonnerre absolu.",
	},
	shockrabbit = {
		name = "Shockrabbit", element = "Electrique",
		stats = {ATK = 9, Agility = 18, Vitality = 7},
		color = Color3.fromRGB(255, 255, 100), size = 1.8,
		skills = {eclair = 3, champ_electrique = 20},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 22, minVilleLevel = 2,
		desc = "Un lapin electrique ultra rapide.",
	},
	raijinbeast = {
		name = "Raijinbeast", element = "Electrique",
		stats = {ATK = 28, Agility = 20, Vitality = 20},
		color = Color3.fromRGB(180, 160, 0), size = 4.0,
		skills = {eclair = 1, champ_electrique = 1, surcharge = 10},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 1, minVilleLevel = 15,
		desc = "Legendaire. Bete divine du tonnerre.",
	},

	-- ====== VOL ======
	skyfin = {
		name = "Skyfin", element = "Vol",
		stats = {ATK = 10, Agility = 16, Vitality = 8},
		color = Color3.fromRGB(150, 210, 255), size = 2.2,
		skills = {bourrasque = 5, pique = 18},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 20, minVilleLevel = 3,
		desc = "Un aileron volant gracieux.",
	},
	windraptor = {
		name = "Windraptor", element = "Vol",
		stats = {ATK = 16, Agility = 20, Vitality = 10},
		color = Color3.fromRGB(120, 190, 240), size = 2.8,
		skills = {bourrasque = 3, pique = 12},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 10, minVilleLevel = 6,
		desc = "Un raptor des vents, chasseur aerien.",
	},
	cloudwyvern = {
		name = "Cloudwyvern", element = "Vol",
		stats = {ATK = 22, Agility = 24, Vitality = 16},
		color = Color3.fromRGB(80, 160, 220), size = 3.5,
		skills = {bourrasque = 1, pique = 5},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 4, minVilleLevel = 10,
		desc = "Un wyvern des nuages majestueux.",
	},
	tempestking = {
		name = "Tempestking", element = "Vol",
		stats = {ATK = 26, Agility = 28, Vitality = 18},
		color = Color3.fromRGB(60, 130, 200), size = 4.2,
		skills = {bourrasque = 1, pique = 1},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 1, minVilleLevel = 18,
		desc = "Legendaire. Roi des tempetes.",
	},

	-- ====== SOL ======
	rockpup = {
		name = "Rockpup", element = "Sol",
		stats = {ATK = 8, Agility = 6, Vitality = 16},
		color = Color3.fromRGB(160, 130, 80), size = 2.0,
		skills = {seisme = 8, bouclier_terre = 18},
		evolvesTo = "rockguard", evolvesFrom = nil,
		spawnWeight = 25, minVilleLevel = 2,
		desc = "Un chiot de roche solide.",
	},
	rockguard = {
		name = "Rockguard", element = "Sol",
		stats = {ATK = 14, Agility = 10, Vitality = 26},
		color = Color3.fromRGB(130, 100, 60), size = 3.0,
		skills = {seisme = 3, bouclier_terre = 10},
		evolvesTo = "terrasentinel", evolvesFrom = "rockpup",
		spawnWeight = 0, minVilleLevel = 999,
		desc = "Evolution de Rockpup. Gardien de pierre.",
	},
	terrasentinel = {
		name = "Terrasentinel", element = "Sol",
		stats = {ATK = 22, Agility = 14, Vitality = 40},
		color = Color3.fromRGB(100, 80, 40), size = 4.5,
		skills = {seisme = 1, bouclier_terre = 1},
		evolvesTo = nil, evolvesFrom = "rockguard",
		spawnWeight = 0, minVilleLevel = 999,
		desc = "Forme finale. Sentinelle terrestre indestructible.",
	},
	sandserpent = {
		name = "Sandserpent", element = "Sol",
		stats = {ATK = 14, Agility = 12, Vitality = 12},
		color = Color3.fromRGB(200, 170, 100), size = 2.5,
		skills = {seisme = 5},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 15, minVilleLevel = 4,
		desc = "Un serpent des sables furtif.",
	},
	terragolem = {
		name = "Terragolem", element = "Sol",
		stats = {ATK = 20, Agility = 8, Vitality = 35},
		color = Color3.fromRGB(100, 90, 50), size = 4.0,
		skills = {seisme = 1, bouclier_terre = 8},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 1, minVilleLevel = 15,
		desc = "Legendaire. Golem de terre primordial.",
	},

	-- ====== ANGE ======
	halopup = {
		name = "Halopup", element = "Ange",
		stats = {ATK = 9, Agility = 11, Vitality = 14},
		color = Color3.fromRGB(255, 255, 200), size = 2.0,
		skills = {lumiere = 5, benediction = 20},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 12, minVilleLevel = 8,
		desc = "Un petit ange radieux.",
	},
	seraphwing = {
		name = "Seraphwing", element = "Ange",
		stats = {ATK = 16, Agility = 18, Vitality = 18},
		color = Color3.fromRGB(255, 240, 150), size = 3.0,
		skills = {lumiere = 3, benediction = 12},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 5, minVilleLevel = 12,
		desc = "Un seraphim aux ailes dorees.",
	},
	celestialdragon = {
		name = "Celestialdragon", element = "Ange",
		stats = {ATK = 26, Agility = 22, Vitality = 26},
		color = Color3.fromRGB(255, 255, 180), size = 4.2,
		skills = {lumiere = 1, benediction = 8},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 1, minVilleLevel = 20,
		desc = "Legendaire. Dragon celeste divin.",
	},

	-- ====== DEMON ======
	impkin = {
		name = "Impkin", element = "Demon",
		stats = {ATK = 13, Agility = 12, Vitality = 8},
		color = Color3.fromRGB(200, 40, 40), size = 1.8,
		skills = {griffe_ombre = 5, malediction = 20},
		evolvesTo = "demonkin", evolvesFrom = nil,
		spawnWeight = 12, minVilleLevel = 8,
		desc = "Un petit demon espiegle.",
	},
	demonkin = {
		name = "Demonkin", element = "Demon",
		stats = {ATK = 22, Agility = 18, Vitality = 16},
		color = Color3.fromRGB(170, 20, 20), size = 3.0,
		skills = {griffe_ombre = 1, malediction = 10},
		evolvesTo = "demonlord", evolvesFrom = "impkin",
		spawnWeight = 0, minVilleLevel = 999,
		desc = "Evolution de Impkin. Demon furieux.",
	},
	demonlord = {
		name = "Demonlord", element = "Demon",
		stats = {ATK = 32, Agility = 22, Vitality = 24},
		color = Color3.fromRGB(140, 10, 10), size = 4.2,
		skills = {griffe_ombre = 1, malediction = 1},
		evolvesTo = nil, evolvesFrom = "demonkin",
		spawnWeight = 0, minVilleLevel = 999,
		desc = "Forme finale. Seigneur demon supreme.",
	},
	hellhound = {
		name = "Hellhound", element = "Demon",
		stats = {ATK = 18, Agility = 16, Vitality = 12},
		color = Color3.fromRGB(180, 50, 30), size = 2.8,
		skills = {griffe_ombre = 3, malediction = 15},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 6, minVilleLevel = 10,
		desc = "Un chien de l'enfer ferocien.",
	},
	abyssking = {
		name = "Abyssking", element = "Demon",
		stats = {ATK = 30, Agility = 20, Vitality = 22},
		color = Color3.fromRGB(120, 0, 0), size = 4.5,
		skills = {griffe_ombre = 1, malediction = 5},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 1, minVilleLevel = 20,
		desc = "Legendaire. Roi des abysses infernaux.",
	},

	-- ====== TENEBRES ======
	shadewisp = {
		name = "Shadewisp", element = "Tenebres",
		stats = {ATK = 11, Agility = 15, Vitality = 8},
		color = Color3.fromRGB(80, 40, 120), size = 1.8,
		skills = {void = 5, absorption = 20},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 12, minVilleLevel = 8,
		desc = "Un feu follet de l'ombre.",
	},
	nightstalker = {
		name = "Nightstalker", element = "Tenebres",
		stats = {ATK = 20, Agility = 22, Vitality = 10},
		color = Color3.fromRGB(60, 20, 100), size = 2.8,
		skills = {void = 3, absorption = 12},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 6, minVilleLevel = 10,
		desc = "Un predateur nocturne silencieux.",
	},
	voidreaper = {
		name = "Voidreaper", element = "Tenebres",
		stats = {ATK = 28, Agility = 24, Vitality = 14},
		color = Color3.fromRGB(40, 10, 80), size = 3.5,
		skills = {void = 1, absorption = 8},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 3, minVilleLevel = 12,
		desc = "Un faucheur du vide terrifiant.",
	},
	eclipsebeast = {
		name = "Eclipsebeast", element = "Tenebres",
		stats = {ATK = 30, Agility = 26, Vitality = 20},
		color = Color3.fromRGB(20, 0, 60), size = 4.5,
		skills = {void = 1, absorption = 1},
		evolvesTo = nil, evolvesFrom = nil,
		spawnWeight = 1, minVilleLevel = 20,
		desc = "Legendaire. Bete de l'eclipse totale.",
	},
}

-- ===============================
-- FONCTIONS UTILITAIRES
-- ===============================

-- Obtenir un monstre par ID
function MonsterDatabase:Get(id)
	return self.MONSTERS[id]
end

-- Obtenir tous les monstres spawnables pour un niveau de ville
function MonsterDatabase:GetSpawnableMonsters(villeLevel)
	local result = {}
	for id, monster in pairs(self.MONSTERS) do
		if monster.spawnWeight > 0 and monster.minVilleLevel <= villeLevel then
			table.insert(result, {id = id, data = monster})
		end
	end
	return result
end

-- Choisir un monstre aleatoire pondere (pour spawn)
function MonsterDatabase:GetRandomSpawn(villeLevel)
	local spawnable = self:GetSpawnableMonsters(villeLevel)
	if #spawnable == 0 then return nil end
	
	local totalWeight = 0
	for _, m in ipairs(spawnable) do
		totalWeight = totalWeight + m.data.spawnWeight
	end
	
	local roll = math.random() * totalWeight
	local cumulative = 0
	for _, m in ipairs(spawnable) do
		cumulative = cumulative + m.data.spawnWeight
		if roll <= cumulative then
			return m.id, m.data
		end
	end
	return spawnable[1].id, spawnable[1].data
end

-- Choisir une rarete aleatoire ponderee
function MonsterDatabase:GetRandomRarity(rarityWeights)
	local total = 0
	for _, w in pairs(rarityWeights) do total = total + w end
	
	local roll = math.random() * total
	local cumulative = 0
	for rarity, w in pairs(rarityWeights) do
		cumulative = cumulative + w
		if roll <= cumulative then
			return rarity
		end
	end
	return "Commun"
end

-- Choisir un trait aleatoire
function MonsterDatabase:GetRandomTrait()
	local total = 0
	for _, w in pairs(self.TRAIT_WEIGHTS) do total = total + w end
	
	local roll = math.random() * total
	local cumulative = 0
	for traitId, w in pairs(self.TRAIT_WEIGHTS) do
		cumulative = cumulative + w
		if roll <= cumulative then
			for _, t in ipairs(self.TRAITS) do
				if t.id == traitId then return t end
			end
		end
	end
	return self.TRAITS[1] -- "none"
end

-- Creer une instance de monstre (donnees sauvegardees dans PlayerData)
function MonsterDatabase:CreateInstance(speciesId, level, rarity, trait)
	local species = self.MONSTERS[speciesId]
	if not species then return nil end
	
	level = level or 1
	rarity = rarity or "Commun"
	trait = trait or self:GetRandomTrait()
	
	-- Calculer stats avec rarete et trait
	local rarityMult = {Commun=1.0, Rare=1.15, Exceptionnel=1.35, Epique=1.60, Legendaire=2.0}
	local rm = rarityMult[rarity] or 1.0
	
	local stats = {
		ATK = math.floor(species.stats.ATK * rm * (trait.modifiers and trait.modifiers.ATK or 1)),
		Agility = math.floor(species.stats.Agility * rm * (trait.modifiers and trait.modifiers.Agility or 1)),
		Vitality = math.floor(species.stats.Vitality * rm * (trait.modifiers and trait.modifiers.Vitality or 1)),
	}
	
	-- Appliquer level ups
	local xpConfig = require(script.Parent.GameConfig).MONSTER_XP
	for i = 2, level do
		stats.ATK = stats.ATK + math.floor(xpConfig.STATS_PER_LEVEL.ATK)
		stats.Agility = stats.Agility + math.floor(xpConfig.STATS_PER_LEVEL.Agility)
		stats.Vitality = stats.Vitality + math.floor(xpConfig.STATS_PER_LEVEL.Vitality)
	end
	
	local maxHP = 20 + stats.Vitality * 5
	
	return {
		UID = speciesId .. "_" .. tostring(math.random(100000, 999999)),
		SpeciesID = speciesId,
		Name = species.name,
		Element = species.element,
		Level = level,
		XP = 0,
		Rarity = rarity,
		Trait = trait,
		Stars = 0,          -- rebirths
		Transcendence = 0,  -- apres 5 etoiles
		Stats = stats,
		CurrentHP = maxHP,
		MaxHP = maxHP,
		Fatigue = 0,
		Assignment = "none", -- none/defense/mine/training
		UnlockedSkills = {},
		Runes = {},
		EvolutionStage = 1,
		DailyPassiveXP = 0, -- reset chaque jour
	}
end

return MonsterDatabase
