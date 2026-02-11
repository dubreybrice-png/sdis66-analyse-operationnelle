--[[
	PlayerDataService V20 - Donnees joueur completes
	Gold wallet/bank, monstres, batiments, classes, skills, bestiaire
]]

local PlayerDataService = {}
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- Structure de donnees par defaut
local DEFAULT_DATA = {
	-- === OR (split wallet/bank) ===
	GoldWallet = 500,   -- or "sur toi" (risque)
	GoldBank = 0,       -- or protege (via batiment Banque)
	
	-- === JOUEUR ===
	HasStarter = false,
	StarterMonster = nil,   -- UID du monstre starter
	
	-- === CLASSE (niveaux par classe!) ===
	CurrentClass = "Novice",
	ClassLevels = {
		Novice = 1,
		Guerrier = 0,
		Archer = 0,
		Mage = 0,
		Acolyte = 0,
	},
	ClassXP = {
		Novice = 0,
		Guerrier = 0,
		Archer = 0,
		Mage = 0,
		Acolyte = 0,
	},
	
	-- === SKILL POINTS (par classe, distribue dans ATK/Agility/Vitality) ===
	SkillPointsAvailable = 0,
	SkillPoints = {
		ATK = 0,
		Agility = 0,
		Vitality = 0,
	},
	
	-- === REBIRTHS JOUEUR ===
	PlayerRebirths = 0,
	PlayerRebirthBonuses = {},  -- {id, name, desc}
	
	-- === MAITRISE ELEMENTAIRE (account-wide) ===
	ElementMastery = {
		Feu = 0, Eau = 0, Plante = 0,
		Electrique = 0, Vol = 0, Sol = 0,
		Ange = 0, Demon = 0, Tenebres = 0,
	},
	
	-- === MONSTRES ===
	Monsters = {},              -- Array d'instances de monstres (tables)
	
	-- === ASSIGNATIONS ===
	DefenseSlots = {},          -- UIDs des monstres en defense
	MineSlots = {},             -- UIDs des monstres en mine
	TrainingSlots = {},         -- UIDs des monstres en entrainement
	
	-- === VILLE ===
	VilleLevel = 1,
	VilleEra = 1,               -- Ere actuelle (1=Primitive, 2=Bronze, etc.)
	VillePower = 0,             -- Puissance totale (or investi)
	Buildings = {},             -- {buildingId = {level=X, repaired=bool, built=bool}}
	
	-- === EQUIPEMENT JOUEUR ===
	Equipment = {
		Weapon = nil,           -- {id, name, stats}
		Armor = nil,
		Gadget = nil,           -- dash, grappin, piege (futur)
		Relic = nil,            -- bonus passif
	},
	Hotbar = {"weapon", nil, nil, nil, nil},  -- 5 slots hotbar
	SelectedHotbar = 1,
	
	-- === INVENTAIRE ===
	Inventory = {},             -- items divers
	Essences = {
		Feu = 0, Eau = 0, Plante = 0,
		Electrique = 0, Vol = 0, Sol = 0,
		Ange = 0, Demon = 0, Tenebres = 0,
	},
	
	-- === CAPTURE ===
	CaptureOrbs = 5,
	HasCaptureLaser = false,
	LaserSpeed = 0,             -- bonus vitesse (niveaux)
	LaserChance = 0,            -- bonus chance (niveaux)
	LaserRetry = 0,             -- bonus retry (niveaux)
	
	-- === BESTIAIRE ===
	Bestiary = {},              -- {monsterSpeciesId = "seen"/"captured"}
	
	-- === VAGUES ===
	CurrentWave = 0,
	HighestWave = 0,
	BossesKilled = 0,
	
	-- === STATS GLOBALES ===
	TotalKills = 0,
	TotalCaptures = 0,
	TotalGoldEarned = 0,
	
	-- === METEO ACTUELLE ===
	CurrentWeather = nil,
	
	-- === CRYSTAL STATE ===
	CrystalDown = false,
	CrystalDownUntil = 0,
}

-- Cache des donnees joueurs
local PlayerData = {}

-- ===============================
-- FONCTIONS DE BASE
-- ===============================

function PlayerDataService:LoadData(player)
	-- Deep clone de DEFAULT_DATA
	local data = {}
	for k, v in pairs(DEFAULT_DATA) do
		if type(v) == "table" then
			data[k] = self:DeepClone(v)
		else
			data[k] = v
		end
	end
	
	PlayerData[player.UserId] = data
	print("[PlayerData] Loaded data for", player.Name)
	return data
end

function PlayerDataService:DeepClone(original)
	local clone = {}
	for k, v in pairs(original) do
		if type(v) == "table" then
			clone[k] = self:DeepClone(v)
		else
			clone[k] = v
		end
	end
	return clone
end

function PlayerDataService:GetData(player)
	return PlayerData[player.UserId]
end

-- ===============================
-- OR
-- ===============================

function PlayerDataService:AddGold(player, amount)
	local data = self:GetData(player)
	if not data then return 0 end
	data.GoldWallet = data.GoldWallet + amount
	data.TotalGoldEarned = data.TotalGoldEarned + amount
	return data.GoldWallet
end

function PlayerDataService:RemoveGold(player, amount)
	local data = self:GetData(player)
	if not data then return false end
	if data.GoldWallet < amount then return false end
	data.GoldWallet = data.GoldWallet - amount
	return true
end

function PlayerDataService:DepositToBank(player, amount)
	local data = self:GetData(player)
	if not data then return false end
	if data.GoldWallet < amount then return false end
	
	-- Verifier capacite banque
	local maxProtected = self:GetBankCapacity(player)
	local space = maxProtected - data.GoldBank
	amount = math.min(amount, space)
	if amount <= 0 then return false end
	
	data.GoldWallet = data.GoldWallet - amount
	data.GoldBank = data.GoldBank + amount
	return true
end

function PlayerDataService:GetBankCapacity(player)
	local data = self:GetData(player)
	if not data then return 500 end
	local bankBuilding = data.Buildings.bank
	local bankLevel = bankBuilding and bankBuilding.level or 0
	return 500 + bankLevel * 500
end

function PlayerDataService:GetTotalGold(player)
	local data = self:GetData(player)
	if not data then return 0 end
	return data.GoldWallet + data.GoldBank
end

-- ===============================
-- MONSTRES
-- ===============================

function PlayerDataService:GetMonsterStorageCapacity(player)
	local data = self:GetData(player)
	if not data then return 5 end
	local storageBuilding = data.Buildings.monster_storage
	local storageLevel = storageBuilding and storageBuilding.level or 0
	local warehouseBuilding = data.Buildings.warehouse
	local warehouseLevel = warehouseBuilding and warehouseBuilding.level or 0
	return 5 + storageLevel * 3 + warehouseLevel * 5
end

function PlayerDataService:AddMonster(player, monsterInstance)
	local data = self:GetData(player)
	if not data then return false, "No data" end
	
	local capacity = self:GetMonsterStorageCapacity(player)
	if #data.Monsters >= capacity then
		return false, "Storage full"
	end
	
	table.insert(data.Monsters, monsterInstance)
	
	-- Mettre a jour bestiaire
	data.Bestiary[monsterInstance.SpeciesID] = "captured"
	
	return true
end

function PlayerDataService:GetMonsterByUID(player, uid)
	local data = self:GetData(player)
	if not data then return nil end
	for _, monster in ipairs(data.Monsters) do
		if monster.UID == uid then
			return monster
		end
	end
	return nil
end

function PlayerDataService:GetDefenseSlotCount(player)
	local data = self:GetData(player)
	if not data then return 2 end
	local bureauBuilding = data.Buildings.defense_bureau
	local bureauLevel = bureauBuilding and bureauBuilding.level or 0
	local commandBuilding = data.Buildings.command_center
	local commandLevel = commandBuilding and commandBuilding.level or 0
	return 2 + bureauLevel * 1 + commandLevel * 1
end

function PlayerDataService:GetMineSlotCount(player)
	local data = self:GetData(player)
	if not data then return 1 end
	local mineBuilding = data.Buildings.gold_mine
	local mineLevel = mineBuilding and mineBuilding.level or 0
	return 1 + mineLevel * 1
end

function PlayerDataService:GetTrainingSlotCount(player)
	local data = self:GetData(player)
	if not data then return 0 end
	local trainingBuilding = data.Buildings.training_center
	local trainingLevel = trainingBuilding and trainingBuilding.level or 0
	return trainingLevel * 1
end

-- ===============================
-- XP & LEVEL JOUEUR
-- ===============================

function PlayerDataService:GetPlayerLevel(player)
	local data = self:GetData(player)
	if not data then return 1 end
	return data.ClassLevels[data.CurrentClass] or 1
end

function PlayerDataService:GetPlayerXP(player)
	local data = self:GetData(player)
	if not data then return 0 end
	return data.ClassXP[data.CurrentClass] or 0
end

function PlayerDataService:GetRequiredXP(level)
	return math.floor(100 * math.pow(1.15, level - 1))
end

function PlayerDataService:AddPlayerXP(player, amount)
	local data = self:GetData(player)
	if not data then return end
	
	local class = data.CurrentClass
	data.ClassXP[class] = (data.ClassXP[class] or 0) + amount
	
	local level = data.ClassLevels[class] or 1
	local required = self:GetRequiredXP(level)
	
	while data.ClassXP[class] >= required and level < 100 do
		data.ClassXP[class] = data.ClassXP[class] - required
		level = level + 1
		data.ClassLevels[class] = level
		data.SkillPointsAvailable = data.SkillPointsAvailable + 1
		print("[PlayerData] LEVEL UP!", player.Name, class, "-> Lv", level)
		required = self:GetRequiredXP(level)
	end
end

-- ===============================
-- CLASSES
-- ===============================

function PlayerDataService:ChangeClass(player, newClass)
	local data = self:GetData(player)
	if not data then return false end
	
	local validClasses = {"Novice", "Guerrier", "Archer", "Mage", "Acolyte"}
	local isValid = false
	for _, c in ipairs(validClasses) do
		if c == newClass then isValid = true break end
	end
	if not isValid then return false end
	
	-- Sauvegarder les skill points actuels (ils sont par classe... 
	-- en fait les skill points sont globaux dans cette version)
	data.CurrentClass = newClass
	
	-- Si premier passage dans cette classe, commencer au level 1
	if (data.ClassLevels[newClass] or 0) == 0 then
		data.ClassLevels[newClass] = 1
		data.ClassXP[newClass] = 0
	end
	
	print("[PlayerData]", player.Name, "changed class to", newClass, "Lv", data.ClassLevels[newClass])
	return true
end

-- ===============================
-- BUILDINGS
-- ===============================

function PlayerDataService:GetBuildingLevel(player, buildingId)
	local data = self:GetData(player)
	if not data then return 0 end
	local b = data.Buildings[buildingId]
	if not b or not b.built then return 0 end
	return b.level or 0
end

function PlayerDataService:BuildOrRepair(player, buildingId, cost)
	local data = self:GetData(player)
	if not data then return false end
	
	if not self:RemoveGold(player, cost) then
		return false, "Not enough gold"
	end
	
	if not data.Buildings[buildingId] then
		data.Buildings[buildingId] = {level = 1, built = true, repaired = true}
	else
		data.Buildings[buildingId].built = true
		data.Buildings[buildingId].repaired = true
		if data.Buildings[buildingId].level == 0 then
			data.Buildings[buildingId].level = 1
		end
	end
	
	data.VillePower = data.VillePower + cost
	return true
end

function PlayerDataService:UpgradeBuilding(player, buildingId, cost)
	local data = self:GetData(player)
	if not data then return false end
	
	local b = data.Buildings[buildingId]
	if not b or not b.built then return false, "Not built" end
	
	if not self:RemoveGold(player, cost) then
		return false, "Not enough gold"
	end
	
	b.level = b.level + 1
	data.VillePower = data.VillePower + cost
	return true
end

-- ===============================
-- ELEMENT MASTERY
-- ===============================

function PlayerDataService:AddElementMastery(player, element, amount)
	local data = self:GetData(player)
	if not data then return end
	if data.ElementMastery[element] then
		data.ElementMastery[element] = data.ElementMastery[element] + amount
	end
end

-- ===============================
-- GOLD LOSS (cristal detruit)
-- ===============================

function PlayerDataService:ApplyCrystalDestructionPenalty(player)
	local data = self:GetData(player)
	if not data then return 0 end
	
	local villeLevel = data.VilleLevel or 1
	local lossRate = math.min(0.20, 0.12 + 0.0008 * villeLevel)
	local loss = math.floor(data.GoldWallet * lossRate)
	data.GoldWallet = data.GoldWallet - loss
	
	print("[PlayerData] Crystal destroyed! Lost", loss, "gold from wallet")
	return loss
end

-- Cleanup quand un joueur part
Players.PlayerRemoving:Connect(function(player)
	PlayerData[player.UserId] = nil
end)

return PlayerDataService
