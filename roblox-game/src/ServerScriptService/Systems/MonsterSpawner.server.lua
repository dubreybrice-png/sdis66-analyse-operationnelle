--[[
	MonsterSpawner V20 - Systeme de vagues complet
	- Vagues progressives avec compteur
	- Boss toutes les 25 vagues
	- Monstres assommes (knockout) pendant 5s pour capture
	- Raretes et elements varies
	- Monstres defenseurs automatiques
	- Scaling avec VilleLevel
]]

print("[MonsterSpawner V20] Loading...")

local Workspace = game.Workspace
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local PlayerDataService = require(ServerScriptService.Services.PlayerDataService)
local GameConfig = require(ReplicatedStorage.Data.GameConfig)
local MonsterDB = require(ReplicatedStorage.Data.MonsterDatabase)
local ElementSystem = require(ReplicatedStorage.Data.ElementSystem)

-- === STATE ===
local MONSTERS_ENABLED = false
local CRYSTAL_HP = GameConfig.CRYSTAL.BASE_HP
local CRYSTAL_MAX_HP = GameConfig.CRYSTAL.BASE_HP
local CRYSTAL_DOWN = false
local CRYSTAL_DOWN_UNTIL = 0
local CRYSTAL_LAST_HIT = 0
local CURRENT_WAVE = 0
local MONSTERS_IN_WAVE = 0
local MONSTERS_KILLED_IN_WAVE = 0
local TOTAL_SPAWNED_IN_WAVE = 0
local WAVE_ACTIVE = false
local MONSTER_COUNT = 0
local DEFENDER_MODELS = {} -- {playerUID = model}

-- Attendre le cristal
local crystal = Workspace:WaitForChild("Crystal", 10)
if not crystal then warn("[MonsterSpawner] Crystal not found!") return end

local function getCrystalPos()
	if crystal:IsA("Model") then
		if crystal.PrimaryPart then return crystal.PrimaryPart.Position end
		return crystal:GetPivot().Position
	end
	return crystal.Position
end

local spawnPoints = Workspace:WaitForChild("WildSpawnPoints", 10)
if not spawnPoints then warn("[MonsterSpawner] WildSpawnPoints not found!") return end

print("[MonsterSpawner] Crystal at", getCrystalPos())

-- Remotes
local remotes = ReplicatedStorage:WaitForChild("Remotes", 10)

-- === FONCTIONS UTILITAIRES ===
local function getAverageVilleLevel()
	local total = 0
	local count = 0
	for _, p in ipairs(Players:GetPlayers()) do
		local data = PlayerDataService:GetData(p)
		if data then
			total = total + (data.VilleLevel or 1)
			count = count + 1
		end
	end
	return count > 0 and math.floor(total / count) or 1
end

local function countAliveWild()
	local n = 0
	for _, m in ipairs(Workspace:GetChildren()) do
		if m:IsA("Model") and (m.Name:match("^Wild_") or m.Name:match("^Boss_")) then
			n = n + 1
		end
	end
	return n
end

local function pickRarity(villeLevel)
	-- Ajuster les poids avec le niveau de ville (+ de rares)
	local weights = {}
	for rarity, w in pairs(GameConfig.RARITY_WEIGHTS) do
		weights[rarity] = w
	end
	-- Bonus de rarete avec le niveau
	weights.Rare = weights.Rare + villeLevel * 0.5
	weights.Exceptionnel = weights.Exceptionnel + villeLevel * 0.2
	weights.Epique = weights.Epique + villeLevel * 0.05
	
	return MonsterDB:GetRandomRarity(weights)
end

-- === NOTIFIER LES JOUEURS ===
local function notifyAll(message)
	local notifyRemote = remotes and remotes:FindFirstChild("NotifyPlayer")
	if notifyRemote then
		for _, p in ipairs(Players:GetPlayers()) do
			notifyRemote:FireClient(p, message)
		end
	end
end

local function updateWaveForAll()
	local waveRemote = remotes and remotes:FindFirstChild("WaveUpdate")
	if waveRemote then
		for _, p in ipairs(Players:GetPlayers()) do
			waveRemote:FireClient(p, CURRENT_WAVE, countAliveWild(), MONSTERS_IN_WAVE - MONSTERS_KILLED_IN_WAVE)
		end
	end
end

-- === CREER UN MONSTRE SAUVAGE ===
local function createWildMonster(spawnPos, wildLevel, isBoss, speciesId, rarity)
	MONSTER_COUNT = MONSTER_COUNT + 1
	
	-- Choisir l'espece
	local villeLevel = getAverageVilleLevel()
	if not speciesId then
		speciesId = MonsterDB:GetRandomSpawn(villeLevel)
	end
	local species = MonsterDB:Get(speciesId)
	if not species then return nil end
	
	if not rarity then
		rarity = pickRarity(villeLevel)
	end
	
	local trait = MonsterDB:GetRandomTrait()
	
	-- Calculer stats
	local rarityMult = GameConfig.RARITY_STAT_MULT[rarity] or 1.0
	local levelMult = 1 + (wildLevel - 1) * GameConfig.SPAWN.WILD_HP_SCALE
	local bossMult = isBoss and GameConfig.SPAWN.BOSS_HP_MULTIPLIER or 1
	
	local hp = math.floor(species.stats.Vitality * 5 * rarityMult * levelMult * bossMult)
	local atk = math.floor(species.stats.ATK * rarityMult * (1 + (wildLevel-1) * GameConfig.SPAWN.WILD_ATK_SCALE) * (isBoss and GameConfig.SPAWN.BOSS_ATK_MULTIPLIER or 1))
	local speed = math.min(20, species.stats.Agility + wildLevel * 0.3)
	
	-- Creer le modele
	local prefix = isBoss and "Boss_" or "Wild_"
	local monster = Instance.new("Model")
	monster.Name = prefix .. species.name .. "_" .. MONSTER_COUNT
	
	local bodySize = species.size * (isBoss and 2 or 1)
	local body = Instance.new("Part")
	body.Name = "Body"
	body.Shape = Enum.PartType.Ball
	body.Size = Vector3.new(bodySize, bodySize, bodySize)
	body.Color = ElementSystem:GetColor(species.element)
	body.Material = isBoss and Enum.Material.ForceField or Enum.Material.SmoothPlastic
	body.CanCollide = true
	body.CFrame = CFrame.new(spawnPos + Vector3.new(0, bodySize, 0))
	body.Parent = monster
	monster.PrimaryPart = body
	
	-- Humanoid
	local humanoid = Instance.new("Humanoid")
	humanoid.MaxHealth = hp
	humanoid.Health = hp
	humanoid.Parent = monster
	
	-- Billboard
	local billboard = Instance.new("BillboardGui")
	billboard.Size = UDim2.new(0, 160, 0, 45)
	billboard.StudsOffset = Vector3.new(0, bodySize + 1, 0)
	billboard.AlwaysOnTop = true
	billboard.Parent = body
	
	local rarityColor = MonsterDB.RARITY_COLORS[rarity] or Color3.new(1,1,1)
	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.new(1, 0, 0, 14)
	nameLabel.BackgroundTransparency = 1
	nameLabel.TextColor3 = rarityColor
	nameLabel.TextSize = isBoss and 14 or 11
	nameLabel.Font = Enum.Font.GothamBold
	nameLabel.Text = (isBoss and "BOSS " or "") .. species.name .. " Nv." .. wildLevel .. " [" .. rarity .. "]"
	nameLabel.Parent = billboard
	
	local elementLabel = Instance.new("TextLabel")
	elementLabel.Size = UDim2.new(1, 0, 0, 12)
	elementLabel.Position = UDim2.new(0, 0, 0, 14)
	elementLabel.BackgroundTransparency = 1
	elementLabel.TextColor3 = ElementSystem:GetColor(species.element)
	elementLabel.TextSize = 10
	elementLabel.Font = Enum.Font.Gotham
	elementLabel.Text = ElementSystem:GetIcon(species.element) .. " " .. species.element .. (trait.id ~= "none" and (" | " .. trait.name) or "")
	elementLabel.Parent = billboard
	
	-- HP bar
	local hpBg = Instance.new("Frame")
	hpBg.Size = UDim2.new(1, 0, 0, 10)
	hpBg.Position = UDim2.new(0, 0, 0, 28)
	hpBg.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
	hpBg.BorderSizePixel = 0
	hpBg.Parent = billboard
	
	local hpFill = Instance.new("Frame")
	hpFill.Name = "Fill"
	hpFill.Size = UDim2.new(1, 0, 1, 0)
	hpFill.BackgroundColor3 = isBoss and Color3.fromRGB(255, 50, 200) or Color3.fromRGB(255, 50, 50)
	hpFill.BorderSizePixel = 0
	hpFill.Parent = hpBg
	
	local hpText = Instance.new("TextLabel")
	hpText.Size = UDim2.new(1, 0, 1, 0)
	hpText.BackgroundTransparency = 1
	hpText.TextColor3 = Color3.new(1, 1, 1)
	hpText.TextSize = 8
	hpText.Font = Enum.Font.GothamBold
	hpText.Text = hp .. "/" .. hp
	hpText.Parent = hpBg
	
	-- ClickDetector
	local detector = Instance.new("ClickDetector")
	detector.MaxActivationDistance = 30
	detector.Parent = body
	
	-- Attributs sur le modele
	monster:SetAttribute("MonsterType", "Wild")
	monster:SetAttribute("SpeciesID", speciesId)
	monster:SetAttribute("WildLevel", wildLevel)
	monster:SetAttribute("Element", species.element)
	monster:SetAttribute("Rarity", rarity)
	monster:SetAttribute("TraitID", trait.id)
	monster:SetAttribute("ATK", atk)
	monster:SetAttribute("IsBoss", isBoss or false)
	monster:SetAttribute("IsKnockedOut", false)
	
	-- Tracking des degats par joueur (pour partage XP)
	local damageTracking = {} -- {playerUserId = totalDamage}
	
	-- === CLICK = ATTAQUE ===
	detector.MouseClick:Connect(function(player)
		if monster:GetAttribute("IsKnockedOut") then return end
		
		local data = PlayerDataService:GetData(player)
		if not data then return end
		
		-- Calcul degats joueur
		local forceStat = data.SkillPoints and data.SkillPoints.ATK or 0
		local baseDmg = math.random(5, 12) + forceStat * GameConfig.SKILLS.ATK_DMG_PER_POINT
		
		-- Bonus elementaire (arme vs monstre)
		-- Pour l'instant, pas d'element sur l'arme
		local damage = math.floor(baseDmg)
		
		humanoid:TakeDamage(damage)
		
		-- Tracker les degats
		damageTracking[player.UserId] = (damageTracking[player.UserId] or 0) + damage
		
		-- Update HP bar
		local ratio = math.clamp(humanoid.Health / humanoid.MaxHealth, 0, 1)
		hpFill.Size = UDim2.new(ratio, 0, 1, 0)
		hpText.Text = math.ceil(math.max(0, humanoid.Health)) .. "/" .. hp
		
		-- MORT -> KNOCKOUT (pas destroy!)
		if humanoid.Health <= 0 then
			monster:SetAttribute("IsKnockedOut", true)
			
			-- Visuels knockout
			body.Material = Enum.Material.SmoothPlastic
			body.Transparency = 0.4
			body.Color = Color3.fromRGB(100, 100, 100)
			nameLabel.Text = "ASSOMME! (5s pour capturer)"
			nameLabel.TextColor3 = Color3.fromRGB(255, 255, 100)
			
			-- Distribuer XP et or selon les degats
			local totalDmg = 0
			for _, d in pairs(damageTracking) do totalDmg = totalDmg + d end
			
			for userId, dmg in pairs(damageTracking) do
				local p = Players:GetPlayerByUserId(userId)
				if p then
					local pData = PlayerDataService:GetData(p)
					if pData then
						local share = dmg / math.max(totalDmg, 1)
						
						-- XP joueur
						local baseXP = GameConfig.XP.PLAYER_KILL_BASE + GameConfig.XP.PLAYER_KILL_PER_WILD_LEVEL * wildLevel
						local rarityBonus = GameConfig.XP.RARITY_XP_BONUS[rarity] or 0
						local xpGain = math.floor((baseXP + rarityBonus) * share * (isBoss and GameConfig.SPAWN.BOSS_XP_MULTIPLIER or 1))
						PlayerDataService:AddPlayerXP(p, xpGain)
						
						-- Or
						local goldGain = math.floor((GameConfig.GOLD.KILL_BASE + GameConfig.GOLD.KILL_PER_WILD_LEVEL * wildLevel) * share * (isBoss and GameConfig.GOLD.KILL_BOSS_MULTIPLIER or 1))
						PlayerDataService:AddGold(p, goldGain)
						
						-- Stats
						pData.TotalKills = (pData.TotalKills or 0) + 1
						
						-- Element mastery
						PlayerDataService:AddElementMastery(p, species.element, math.floor(share * 2))
						
						-- Bestiaire: "seen"
						if not pData.Bestiary[speciesId] then
							pData.Bestiary[speciesId] = "seen"
						end
						
						-- XP aux monstres defenseurs de ce joueur
						for _, defUID in ipairs(pData.DefenseSlots or {}) do
							local defMonster = PlayerDataService:GetMonsterByUID(p, defUID)
							if defMonster then
								local mXP = math.floor(GameConfig.MONSTER_XP.KILL_BASE * share * 0.3)
								defMonster.XP = (defMonster.XP or 0) + mXP
								-- Level up monstre
								local mLevel = defMonster.Level or 1
								local mReq = GameConfig.MONSTER_XP.LEVELUP_BASE * mLevel
								while defMonster.XP >= mReq and mLevel < GameConfig.MONSTER_XP.MAX_LEVEL do
									defMonster.XP = defMonster.XP - mReq
									mLevel = mLevel + 1
									defMonster.Level = mLevel
									defMonster.Stats.ATK = defMonster.Stats.ATK + math.floor(GameConfig.MONSTER_XP.STATS_PER_LEVEL.ATK)
									defMonster.Stats.Agility = defMonster.Stats.Agility + math.floor(GameConfig.MONSTER_XP.STATS_PER_LEVEL.Agility)
									defMonster.Stats.Vitality = defMonster.Stats.Vitality + math.floor(GameConfig.MONSTER_XP.STATS_PER_LEVEL.Vitality)
									print("[MonsterSpawner] Monster level up!", defMonster.Name, "Lv", mLevel)
									mReq = GameConfig.MONSTER_XP.LEVELUP_BASE * mLevel
								end
							end
						end
						
						print("[Spawner] +" .. xpGain .. "XP +" .. goldGain .. "g ->", p.Name)
					end
				end
			end
			
			MONSTERS_KILLED_IN_WAVE = MONSTERS_KILLED_IN_WAVE + 1
			updateWaveForAll()
			
			if isBoss then
				for _, p in ipairs(Players:GetPlayers()) do
					local pData = PlayerDataService:GetData(p)
					if pData then pData.BossesKilled = (pData.BossesKilled or 0) + 1 end
				end
				notifyAll("BOSS VAINCU! " .. species.name .. " est tombe!")
			end
			
			-- Timer knockout puis disparition
			task.delay(GameConfig.SPAWN.KNOCKOUT_DURATION, function()
				if monster.Parent and monster:GetAttribute("IsKnockedOut") then
					-- Pas capture -> disparait
					monster:Destroy()
				end
			end)
		end
	end)
	
	monster.Parent = Workspace
	
	-- === IA: marcher vers cristal et attaquer ===
	local lastCrystalAttack = 0
	local lastPlayerAttack = 0
	local crystalPos = getCrystalPos()
	
	task.spawn(function()
		while monster.Parent and not monster:GetAttribute("IsKnockedOut") do
			if CRYSTAL_DOWN then
				task.wait(1)
				continue
			end
			
			local bodyPos = body.Position
			local distCrystal = (bodyPos - crystalPos).Magnitude
			
			-- Chercher joueur proche
			local nearPlayer = nil
			local nearDist = 15
			for _, p in ipairs(Players:GetPlayers()) do
				if p.Character then
					local hrp = p.Character:FindFirstChild("HumanoidRootPart")
					if hrp then
						local d = (bodyPos - hrp.Position).Magnitude
						if d < nearDist then nearPlayer = p; nearDist = d end
					end
				end
			end
			
			-- Attaquer joueur si tres proche
			if nearPlayer and nearDist < 6 then
				local pHum = nearPlayer.Character and nearPlayer.Character:FindFirstChild("Humanoid")
				if pHum and tick() - lastPlayerAttack > 2 then
					pHum:TakeDamage(math.floor(atk * 0.3))
					lastPlayerAttack = tick()
				end
			-- Attaquer cristal si proche
			elseif distCrystal < 10 then
				if tick() - lastCrystalAttack > 1.5 then
					local dmg = math.floor(atk * 0.5)
					CRYSTAL_HP = math.max(0, CRYSTAL_HP - dmg)
					CRYSTAL_LAST_HIT = tick()
					crystal:SetAttribute("CrystalHP", CRYSTAL_HP)
					lastCrystalAttack = tick()
					
					if CRYSTAL_HP <= 0 and not CRYSTAL_DOWN then
						-- CRYSTAL DETRUIT -> SOFT FAIL
						CRYSTAL_DOWN = true
						local downDuration = math.min(
							GameConfig.CRYSTAL.DOWN_DURATION_CAP,
							GameConfig.CRYSTAL.DOWN_DURATION_BASE + GameConfig.CRYSTAL.DOWN_DURATION_PER_LEVEL * getAverageVilleLevel()
						)
						CRYSTAL_DOWN_UNTIL = tick() + downDuration
						crystal:SetAttribute("CrystalDown", true)
						
						notifyAll("CRISTAL DETRUIT! Reparation en " .. math.floor(downDuration) .. "s...")
						
						-- Despawn tous les monstres sauvages
						for _, obj in ipairs(Workspace:GetChildren()) do
							if obj:IsA("Model") and (obj.Name:match("^Wild_") or obj.Name:match("^Boss_")) then
								obj:Destroy()
							end
						end
						
						-- Penalite or
						for _, p in ipairs(Players:GetPlayers()) do
							local loss = PlayerDataService:ApplyCrystalDestructionPenalty(p)
							local notify = remotes:FindFirstChild("NotifyPlayer")
							if notify then
								notify:FireClient(p, "Cristal detruit! -" .. loss .. " or!")
							end
						end
						
						-- Timer de reparation
						task.delay(downDuration, function()
							CRYSTAL_DOWN = false
							CRYSTAL_HP = math.floor(CRYSTAL_MAX_HP * GameConfig.CRYSTAL.RESPAWN_HP_PERCENT)
							crystal:SetAttribute("CrystalHP", CRYSTAL_HP)
							crystal:SetAttribute("CrystalDown", false)
							notifyAll("Cristal repare! (" .. math.floor(GameConfig.CRYSTAL.RESPAWN_HP_PERCENT * 100) .. "% HP)")
						end)
					end
				end
			else
				-- Marcher vers cristal
				local direction = (crystalPos - bodyPos).Unit
				body.Velocity = direction * speed
			end
			
			task.wait(0.15)
		end
	end)
	
	return monster
end

-- === SPAWNER DE DEFENSEUR ===
local function spawnDefenderModel(player, monsterData)
	if not monsterData then return end
	
	local species = MonsterDB:Get(monsterData.SpeciesID)
	if not species then return end
	
	local crystalPos = getCrystalPos()
	
	local defender = Instance.new("Model")
	defender.Name = "Defender_" .. monsterData.Name .. "_" .. player.UserId
	
	local body = Instance.new("Part")
	body.Name = "Body"
	body.Shape = Enum.PartType.Ball
	body.Size = Vector3.new(3, 3, 3)
	body.Color = ElementSystem:GetColor(species.element)
	body.Material = Enum.Material.Neon
	body.CanCollide = true
	body.CFrame = CFrame.new(crystalPos + Vector3.new(math.random(-8, 8), 2, math.random(-8, 8)))
	body.Parent = defender
	defender.PrimaryPart = body
	
	local hum = Instance.new("Humanoid")
	hum.MaxHealth = monsterData.MaxHP or 200
	hum.Health = monsterData.CurrentHP or 200
	hum.Parent = defender
	
	-- Billboard
	local bb = Instance.new("BillboardGui")
	bb.Size = UDim2.new(0, 150, 0, 35)
	bb.StudsOffset = Vector3.new(0, 3, 0)
	bb.AlwaysOnTop = true
	bb.Parent = body
	
	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.new(1, 0, 0, 16)
	nameLabel.BackgroundTransparency = 1
	nameLabel.TextColor3 = ElementSystem:GetColor(species.element)
	nameLabel.TextSize = 12
	nameLabel.Font = Enum.Font.GothamBold
	nameLabel.Text = monsterData.Name .. " Nv." .. monsterData.Level .. " (DEF)"
	nameLabel.Parent = bb
	
	local rarityLabel = Instance.new("TextLabel")
	rarityLabel.Size = UDim2.new(1, 0, 0, 12)
	rarityLabel.Position = UDim2.new(0, 0, 0, 16)
	rarityLabel.BackgroundTransparency = 1
	rarityLabel.TextColor3 = MonsterDB.RARITY_COLORS[monsterData.Rarity] or Color3.new(1,1,1)
	rarityLabel.TextSize = 9
	rarityLabel.Font = Enum.Font.Gotham
	rarityLabel.Text = monsterData.Rarity .. " | " .. species.element
	rarityLabel.Parent = bb
	
	defender:SetAttribute("OwnerUserId", player.UserId)
	defender:SetAttribute("MonsterUID", monsterData.UID)
	defender.Parent = Workspace
	
	-- IA defenseur: attaquer monstres sauvages
	task.spawn(function()
		while defender.Parent and hum.Health > 0 do
			local nearestEnemy = nil
			local nearestDist = 25
			
			for _, obj in ipairs(Workspace:GetChildren()) do
				if obj:IsA("Model") and (obj.Name:match("^Wild_") or obj.Name:match("^Boss_")) and obj.PrimaryPart then
					if not obj:GetAttribute("IsKnockedOut") then
						local dist = (body.Position - obj.PrimaryPart.Position).Magnitude
						if dist < nearestDist then
							nearestEnemy = obj
							nearestDist = dist
						end
					end
				end
			end
			
			if nearestEnemy and nearestEnemy.PrimaryPart then
				if nearestDist < 5 then
					local enemyHum = nearestEnemy:FindFirstChildOfClass("Humanoid")
					if enemyHum and enemyHum.Health > 0 then
						local dmg = math.random(
							math.floor(monsterData.Stats.ATK * 0.8),
							math.floor(monsterData.Stats.ATK * 1.2)
						)
						
						-- Bonus element
						local mult = ElementSystem:GetMultiplier(species.element, nearestEnemy:GetAttribute("Element") or "Neutre")
						dmg = math.floor(dmg * mult)
						
						enemyHum:TakeDamage(dmg)
						
						-- Update billboard ennemi
						local ebody = nearestEnemy.PrimaryPart
						if ebody then
							local ebb = ebody:FindFirstChildOfClass("BillboardGui")
							if ebb then
								local bg = ebb:FindFirstChildOfClass("Frame")
								if bg then
									local fill = bg:FindFirstChild("Fill")
									if fill then
										fill.Size = UDim2.new(math.clamp(enemyHum.Health/enemyHum.MaxHealth, 0, 1), 0, 1, 0)
									end
									local txt = bg:FindFirstChildOfClass("TextLabel")
									if txt then
										txt.Text = math.ceil(math.max(0, enemyHum.Health)) .. "/" .. enemyHum.MaxHealth
									end
								end
							end
						end
					end
					task.wait(1.2)
				else
					local dir = (nearestEnemy.PrimaryPart.Position - body.Position).Unit
					body.Velocity = dir * 18
					task.wait(0.15)
				end
			else
				-- Retourner pres du cristal
				local distCrystal = (body.Position - getCrystalPos()).Magnitude
				if distCrystal > 15 then
					body.Velocity = (getCrystalPos() - body.Position).Unit * 12
				else
					body.Velocity = Vector3.new(0, 0, 0)
				end
				task.wait(0.5)
			end
		end
	end)
	
	return defender
end

-- === BILLBOARD CRYSTAL HP ===
local crystalCore = crystal:FindFirstChild("Core")
if crystalCore then
	local bb = Instance.new("BillboardGui")
	bb.Size = UDim2.new(0, 160, 0, 50)
	bb.StudsOffset = Vector3.new(0, 5, 0)
	bb.MaxDistance = 200
	bb.Parent = crystalCore
	
	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(1, 0, 1, 0)
	label.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
	label.BackgroundTransparency = 0.3
	label.TextColor3 = Color3.fromRGB(100, 255, 100)
	label.TextSize = 16
	label.Font = Enum.Font.GothamBold
	label.Text = "CRISTAL " .. CRYSTAL_HP .. "/" .. CRYSTAL_MAX_HP
	label.Parent = bb
	
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 6)
	corner.Parent = label
	
	task.spawn(function()
		while true do
			task.wait(0.5)
			if CRYSTAL_DOWN then
				local remaining = math.max(0, math.floor(CRYSTAL_DOWN_UNTIL - tick()))
				label.Text = "DETRUIT! Reparation: " .. remaining .. "s"
				label.TextColor3 = Color3.fromRGB(255, 50, 50)
			else
				label.Text = "CRISTAL " .. CRYSTAL_HP .. "/" .. CRYSTAL_MAX_HP
				local ratio = CRYSTAL_HP / math.max(CRYSTAL_MAX_HP, 1)
				if ratio > 0.5 then
					label.TextColor3 = Color3.fromRGB(100, 255, 100)
				elseif ratio > 0.25 then
					label.TextColor3 = Color3.fromRGB(255, 200, 50)
				else
					label.TextColor3 = Color3.fromRGB(255, 50, 50)
				end
			end
		end
	end)
end

crystal:SetAttribute("CrystalHP", CRYSTAL_HP)
crystal:SetAttribute("CrystalMaxHP", CRYSTAL_MAX_HP)

-- === CRYSTAL REGEN ===
task.spawn(function()
	while true do
		task.wait(10) -- check toutes les 10s
		if not CRYSTAL_DOWN and CRYSTAL_HP < CRYSTAL_MAX_HP then
			if tick() - CRYSTAL_LAST_HIT > GameConfig.CRYSTAL.REGEN_COMBAT_COOLDOWN then
				local regen = math.floor(CRYSTAL_MAX_HP * GameConfig.CRYSTAL.REGEN_RATE * (10/60))
				CRYSTAL_HP = math.min(CRYSTAL_MAX_HP, CRYSTAL_HP + regen)
				crystal:SetAttribute("CrystalHP", CRYSTAL_HP)
			end
		end
	end
end)

-- === SYSTEME DE VAGUES ===
local function runWave(waveNumber)
	CURRENT_WAVE = waveNumber
	WAVE_ACTIVE = true
	MONSTERS_KILLED_IN_WAVE = 0
	
	local villeLevel = getAverageVilleLevel()
	local isBossWave = (waveNumber % GameConfig.SPAWN.BOSS_EVERY_N_WAVES == 0)
	
	-- Nombre de monstres dans la vague
	local monstersCount = math.floor(GameConfig.SPAWN.MONSTERS_PER_WAVE_BASE * (1 + waveNumber * GameConfig.SPAWN.MONSTERS_PER_WAVE_GROWTH))
	monstersCount = math.min(monstersCount, GameConfig.SPAWN.MAX_ALIVE_CAP)
	MONSTERS_IN_WAVE = monstersCount
	TOTAL_SPAWNED_IN_WAVE = 0
	
	-- Niveau des monstres sauvages
	local wildLevel = math.max(1, math.floor(villeLevel * 0.9) + math.floor(waveNumber / 5))
	
	if isBossWave then
		notifyAll("VAGUE " .. waveNumber .. " - BOSS INCOMING!")
	else
		notifyAll("Vague " .. waveNumber .. " - " .. monstersCount .. " monstres!")
	end
	
	updateWaveForAll()
	
	-- Calculer intervalle de spawn
	local spawnInterval = math.max(
		GameConfig.SPAWN.MIN_INTERVAL,
		GameConfig.SPAWN.BASE_INTERVAL - villeLevel * GameConfig.SPAWN.INTERVAL_REDUCTION
	)
	
	-- Spawn les monstres progressivement
	local points = spawnPoints:GetChildren()
	
	for i = 1, monstersCount do
		if CRYSTAL_DOWN then break end
		
		local alive = countAliveWild()
		local maxAlive = math.min(
			GameConfig.SPAWN.MAX_ALIVE_CAP,
			GameConfig.SPAWN.MAX_ALIVE_BASE + math.floor(villeLevel / 10)
		)
		
		-- Attendre si trop de monstres vivants
		while alive >= maxAlive and not CRYSTAL_DOWN do
			task.wait(1)
			alive = countAliveWild()
		end
		
		if CRYSTAL_DOWN then break end
		
		if #points > 0 then
			local sp = points[math.random(1, #points)]
			
			-- Dernier monstre d'une boss wave = le boss
			if isBossWave and i == monstersCount then
				createWildMonster(sp.Position, wildLevel + 5, true)
			else
				createWildMonster(sp.Position, wildLevel + math.random(-1, 1), false)
			end
			TOTAL_SPAWNED_IN_WAVE = TOTAL_SPAWNED_IN_WAVE + 1
		end
		
		task.wait(spawnInterval)
	end
	
	-- Attendre que tous les monstres soient tues ou despawn
	while countAliveWild() > 0 and not CRYSTAL_DOWN do
		task.wait(1)
		updateWaveForAll()
	end
	
	WAVE_ACTIVE = false
	
	-- Mettre a jour les joueurs
	for _, p in ipairs(Players:GetPlayers()) do
		local pData = PlayerDataService:GetData(p)
		if pData then
			pData.CurrentWave = waveNumber
			if waveNumber > (pData.HighestWave or 0) then
				pData.HighestWave = waveNumber
			end
		end
	end
	
	updateWaveForAll()
end

-- === BOUCLE PRINCIPALE DE VAGUES ===
task.spawn(function()
	while true do
		task.wait(2)
		
		if not MONSTERS_ENABLED then continue end
		if CRYSTAL_DOWN then continue end
		
		-- Pause entre vagues
		task.wait(GameConfig.SPAWN.WAVE_PAUSE)
		
		if not CRYSTAL_DOWN then
			CURRENT_WAVE = CURRENT_WAVE + 1
			runWave(CURRENT_WAVE)
		end
	end
end)

-- === ECOUTER LE CHOIX DU STARTER ===
if remotes then
	local requestStarter = remotes:WaitForChild("RequestStarter", 5)
	if requestStarter then
		requestStarter.OnServerEvent:Connect(function(player, starterId)
			if MONSTERS_ENABLED then return end
			
			print("[MonsterSpawner] STARTER CHOSEN:", starterId, "by", player.Name)
			
			-- Mapper starterId vers speciesId
			local starterMap = {[1] = "flameguard", [2] = "aquashell", [3] = "voltsprite"}
			local speciesId = starterMap[starterId] or "flameguard"
			
			-- Creer l'instance monstre dans PlayerData
			local monsterInstance = MonsterDB:CreateInstance(speciesId, 5, "Commun")
			local data = PlayerDataService:GetData(player)
			if data and monsterInstance then
				table.insert(data.Monsters, monsterInstance)
				data.StarterMonster = monsterInstance.UID
				data.DefenseSlots = {monsterInstance.UID}
				monsterInstance.Assignment = "defense"
				data.Bestiary[speciesId] = "captured"
				
				-- Spawn le modele defenseur
				spawnDefenderModel(player, monsterInstance)
				
				-- Activer les vagues apres 3s
				task.delay(3, function()
					MONSTERS_ENABLED = true
					print("[MonsterSpawner] WAVES ENABLED!")
				end)
			end
		end)
	end
end

print("[MonsterSpawner V20] Ready! Wave system loaded.")
