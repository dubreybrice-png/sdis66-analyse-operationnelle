--[[
	MonsterManager V20 - Gestion des monstres assigns
	- XP passive: defense 2XP/30s, mine 1XP/min, training 3XP/30s
	- Or passif de mine
	- Fatigue accumulation
	- Cap XP passive (900/jour puis 10%)
	- Level up des monstres
]]

print("[MonsterManager V20] Loading...")

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local PlayerDataService = require(ServerScriptService.Services.PlayerDataService)
local GameConfig = require(ReplicatedStorage.Data.GameConfig)
local MonsterDB = require(ReplicatedStorage.Data.MonsterDatabase)

local remotes = ReplicatedStorage:WaitForChild("Remotes", 10)
local notifyRemote = remotes and remotes:FindFirstChild("NotifyPlayer")

local function notify(player, msg)
	if notifyRemote then
		notifyRemote:FireClient(player, msg)
	end
end

-- Tracking XP passive quotidienne par joueur
local dailyPassiveXP = {} -- {userId = totalXPToday}
local lastDayReset = os.time()

-- === FONCTIONS UTILITAIRES ===
local function getFatigueMalus(fatigue)
	local thresholds = GameConfig.FATIGUE.THRESHOLDS
	if fatigue >= thresholds[4] then return GameConfig.FATIGUE.MALUS[4] end
	if fatigue >= thresholds[3] then return GameConfig.FATIGUE.MALUS[3] end
	if fatigue >= thresholds[2] then return GameConfig.FATIGUE.MALUS[2] end
	if fatigue >= thresholds[1] then return GameConfig.FATIGUE.MALUS[1] end
	return 1.0 -- pas de malus
end

local function levelUpMonster(player, monster)
	if not monster then return end
	local level = monster.Level or 1
	local requiredXP = GameConfig.MONSTER_XP.LEVELUP_BASE * level
	
	while monster.XP >= requiredXP and level < GameConfig.MONSTER_XP.MAX_LEVEL do
		monster.XP = monster.XP - requiredXP
		level = level + 1
		monster.Level = level
		
		-- Augmenter stats
		monster.Stats.ATK = monster.Stats.ATK + GameConfig.MONSTER_XP.STATS_PER_LEVEL.ATK
		monster.Stats.Agility = monster.Stats.Agility + GameConfig.MONSTER_XP.STATS_PER_LEVEL.Agility
		monster.Stats.Vitality = monster.Stats.Vitality + GameConfig.MONSTER_XP.STATS_PER_LEVEL.Vitality
		
		-- Recalculer HP
		monster.MaxHP = monster.Stats.Vitality * 5
		monster.CurrentHP = monster.MaxHP
		
		notify(player, monster.Name .. " passe au niveau " .. level .. "!")
		
		-- Verifier evolution
		local species = MonsterDB:Get(monster.SpeciesID)
		if species and species.evolvesTo then
			local stage = monster.EvolutionStage or 1
			if stage < #species.evolvesTo + 1 then
				local evoLevel = species.evolveLevel and species.evolveLevel[stage] or (15 * stage)
				if level >= evoLevel then
					local newSpeciesId = species.evolvesTo[stage]
					local newSpecies = MonsterDB:Get(newSpeciesId)
					if newSpecies then
						monster.SpeciesID = newSpeciesId
						monster.Name = newSpecies.name
						monster.EvolutionStage = stage + 1
						notify(player, "EVOLUTION! " .. species.name .. " evolue en " .. newSpecies.name .. "!")
					end
				end
			end
		end
		
		requiredXP = GameConfig.MONSTER_XP.LEVELUP_BASE * level
	end
end

local function addPassiveXP(player, monster, baseXP)
	local userId = player.UserId
	dailyPassiveXP[userId] = dailyPassiveXP[userId] or 0
	
	-- Cap quotidien
	local cap = GameConfig.MONSTER_XP.PASSIVE_CAP
	local currentDaily = dailyPassiveXP[userId]
	
	local effectiveXP = baseXP
	if currentDaily >= cap then
		effectiveXP = math.floor(baseXP * 0.1) -- 10% apres le cap
	end
	
	-- Fatigue malus
	local fatigueMult = getFatigueMalus(monster.Fatigue or 0)
	effectiveXP = math.floor(effectiveXP * fatigueMult)
	
	-- Trait bonus
	if monster.TraitID == "malin" then
		effectiveXP = math.floor(effectiveXP * 1.1) -- +10% XP
	end
	
	monster.XP = (monster.XP or 0) + effectiveXP
	dailyPassiveXP[userId] = currentDaily + effectiveXP
	
	-- Level up
	levelUpMonster(player, monster)
end

-- === BOUCLE PRINCIPALE - toutes les 30 secondes ===
task.spawn(function()
	while true do
		task.wait(30) -- tick toutes les 30s
		
		-- Reset quotidien
		local now = os.time()
		local currentDay = math.floor(now / 86400)
		local lastDay = math.floor(lastDayReset / 86400)
		if currentDay > lastDay then
			dailyPassiveXP = {}
			lastDayReset = now
		end
		
		for _, player in ipairs(Players:GetPlayers()) do
			local data = PlayerDataService:GetData(player)
			if not data then continue end
			
			-- === DEFENSE: 2 XP par 30s si cristal attaque ===
			for _, defUID in ipairs(data.DefenseSlots or {}) do
				local monster = PlayerDataService:GetMonsterByUID(player, defUID)
				if monster then
					local xp = GameConfig.MONSTER_XP.DEFENSE_XP_PER_30S
					addPassiveXP(player, monster, xp)
					
					-- Fatigue defense: +1 par 30s
					monster.Fatigue = math.min(100, (monster.Fatigue or 0) + GameConfig.FATIGUE.DEFENSE_PER_30S)
				end
			end
			
			-- === MINE: 1 XP par minute (donc 0.5 par 30s) ===
			for _, mineUID in ipairs(data.MineSlots or {}) do
				local monster = PlayerDataService:GetMonsterByUID(player, mineUID)
				if monster then
					local xp = GameConfig.MONSTER_XP.MINE_XP_PER_MIN / 2 -- 30s = demi-minute
					addPassiveXP(player, monster, math.floor(xp))
					
					-- Or passif de mine
					local mineLevel = 1
					if data.Buildings and data.Buildings.gold_mine then
						mineLevel = data.Buildings.gold_mine.level or 1
					end
					local goldBase = GameConfig.GOLD.MINE_BASE_PER_MIN or 5
					local goldPerLevel = GameConfig.GOLD.MINE_PER_LEVEL_PER_MIN or 3
					local goldPerMonster = (goldBase + goldPerLevel * mineLevel) / 2 -- par 30s
					
					-- Fatigue reduit la production
					local fatigueMult = getFatigueMalus(monster.Fatigue or 0)
					goldPerMonster = math.floor(goldPerMonster * fatigueMult)
					
					-- Trait cupide: +20% or, mais deja applique via stats
					if monster.TraitID == "cupide" then
						goldPerMonster = math.floor(goldPerMonster * 1.2)
					end
					
					if goldPerMonster > 0 then
						PlayerDataService:AddGold(player, goldPerMonster)
					end
					
					-- Fatigue mine: +0.8 par 30s
					monster.Fatigue = math.min(100, (monster.Fatigue or 0) + GameConfig.FATIGUE.MINE_PER_30S)
				end
			end
			
			-- === TRAINING: 3 XP par 30s ===
			for _, trainUID in ipairs(data.TrainingSlots or {}) do
				local monster = PlayerDataService:GetMonsterByUID(player, trainUID)
				if monster then
					local xp = GameConfig.MONSTER_XP.TRAINING_XP_PER_30S
					addPassiveXP(player, monster, xp)
					
					-- Fatigue training: +1.5 par 30s
					monster.Fatigue = math.min(100, (monster.Fatigue or 0) + GameConfig.FATIGUE.TRAINING_PER_30S)
				end
			end
			
			-- === REPOS: Monstres non-assignes recuperent de la fatigue ===
			for _, monster in ipairs(data.Monsters or {}) do
				if monster.Assignment == "none" or monster.Assignment == nil then
					monster.Fatigue = math.max(0, (monster.Fatigue or 0) - GameConfig.FATIGUE.REST_RECOVERY_PER_30S)
				end
				
				-- Trait paresseux: -20% fatigue naturellement
				if monster.TraitID == "paresseux" then
					monster.Fatigue = math.max(0, (monster.Fatigue or 0) - 0.5)
				end
			end
			
			-- === ORBES DE CAPTURE: +1 toutes les 5 minutes (via tick count) ===
			data._captureOrbTimer = (data._captureOrbTimer or 0) + 30
			if data._captureOrbTimer >= 300 then -- 5 min
				data._captureOrbTimer = 0
				local maxOrbs = 10 + (data.VilleLevel or 1)
				if (data.CaptureOrbs or 0) < maxOrbs then
					data.CaptureOrbs = (data.CaptureOrbs or 0) + 1
				end
			end
		end
	end
end)

-- === INFIRMARY: Recuperation rapide de fatigue ===
-- Si le joueur a une infirmerie, les monstres au repos recuperent plus vite
task.spawn(function()
	while true do
		task.wait(60) -- check toutes les minutes
		
		for _, player in ipairs(Players:GetPlayers()) do
			local data = PlayerDataService:GetData(player)
			if not data then continue end
			
			local hasInfirmary = data.Buildings and data.Buildings.infirmary
			if hasInfirmary then
				local infLevel = data.Buildings.infirmary.level or 1
				for _, monster in ipairs(data.Monsters or {}) do
					if monster.Assignment == "none" then
						-- Bonus de recuperation de l'infirmerie
						monster.Fatigue = math.max(0, (monster.Fatigue or 0) - (infLevel * 1.5))
					end
				end
			end
		end
	end
end)

-- === SYNC MONSTER STORAGE UI ===
local updateStorageRemote = remotes and remotes:FindFirstChild("UpdateMonsterStorage")
if updateStorageRemote then
	-- Envoyer la liste des monstres regulierement
	task.spawn(function()
		while true do
			task.wait(5)
			for _, player in ipairs(Players:GetPlayers()) do
				local data = PlayerDataService:GetData(player)
				if data and data.Monsters then
					-- Envoyer un resume des monstres
					local summary = {}
					for _, monster in ipairs(data.Monsters) do
						table.insert(summary, {
							UID = monster.UID,
							Name = monster.Name,
							SpeciesID = monster.SpeciesID,
							Level = monster.Level,
							Rarity = monster.Rarity,
							TraitID = monster.TraitID,
							Element = monster.Element or "Neutre",
							Assignment = monster.Assignment or "none",
							Fatigue = monster.Fatigue or 0,
							XP = monster.XP or 0,
							Stats = monster.Stats,
							MaxHP = monster.MaxHP,
							CurrentHP = monster.CurrentHP,
							EvolutionStage = monster.EvolutionStage or 1,
						})
					end
					updateStorageRemote:FireClient(player, summary)
				end
			end
		end
	end)
end

-- === OPEN STORAGE UI (quand joueur clique sur le Centre de Stockage) ===
local openStorageRemote = remotes and remotes:FindFirstChild("OpenStorageUI")
if openStorageRemote then
	openStorageRemote.OnServerEvent:Connect(function(player)
		local data = PlayerDataService:GetData(player)
		if not data then return end
		
		if updateStorageRemote then
			local summary = {}
			for _, monster in ipairs(data.Monsters or {}) do
				table.insert(summary, {
					UID = monster.UID,
					Name = monster.Name,
					SpeciesID = monster.SpeciesID,
					Level = monster.Level,
					Rarity = monster.Rarity,
					TraitID = monster.TraitID,
					Element = monster.Element or "Neutre",
					Assignment = monster.Assignment or "none",
					Fatigue = monster.Fatigue or 0,
					XP = monster.XP or 0,
					Stats = monster.Stats,
					MaxHP = monster.MaxHP,
				})
			end
			updateStorageRemote:FireClient(player, summary)
		end
	end)
end

print("[MonsterManager V20] Ready! Passive XP/Gold/Fatigue system active.")
