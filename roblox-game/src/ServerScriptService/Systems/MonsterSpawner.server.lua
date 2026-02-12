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

-- === TEXTURES MONSTRES (faces PNG) ===
local MONSTER_FACE_TEXTURES = {
	"rbxassetid://125985888729814",
	"rbxassetid://130172870219546",
	"rbxassetid://88842105258488",
	"rbxassetid://135286085838302",
}

local function addMonsterFace(body)
	local textureId = MONSTER_FACE_TEXTURES[math.random(1, #MONSTER_FACE_TEXTURES)]
	-- Face avant
	local decalFront = Instance.new("Decal")
	decalFront.Texture = textureId
	decalFront.Face = Enum.NormalId.Front
	decalFront.Parent = body
	-- Face arriere
	local decalBack = Instance.new("Decal")
	decalBack.Texture = textureId
	decalBack.Face = Enum.NormalId.Back
	decalBack.Parent = body
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
	
	local baseSize = species.size * (isBoss and 1.8 or 1)
	local bodyColor = ElementSystem:GetColor(species.element)
	local bodyMat = isBoss and Enum.Material.ForceField or Enum.Material.SmoothPlastic
	
	-- === CORPS (torse ovale) ===
	local body = Instance.new("Part")
	body.Name = "Body"
	body.Size = Vector3.new(baseSize * 1.4, baseSize * 1.0, baseSize * 1.8)
	body.Color = bodyColor
	body.Material = bodyMat
	body.CanCollide = true
	body.CFrame = CFrame.new(spawnPos + Vector3.new(0, baseSize * 0.8, 0))
	body.Parent = monster
	monster.PrimaryPart = body
	
	-- === TETE (sphere un peu aplatie devant) ===
	local head = Instance.new("Part")
	head.Name = "Head"
	head.Shape = Enum.PartType.Ball
	head.Size = Vector3.new(baseSize * 1.0, baseSize * 0.9, baseSize * 0.9)
	head.Color = bodyColor
	head.Material = bodyMat
	head.CanCollide = false
	local headOffset = Vector3.new(0, baseSize * 0.3, -baseSize * 1.1)
	head.CFrame = body.CFrame * CFrame.new(headOffset)
	head.Parent = monster
	
	local headWeld = Instance.new("WeldConstraint")
	headWeld.Part0 = body
	headWeld.Part1 = head
	headWeld.Parent = head
	
	-- Ajouter les textures de face sur la tete
	addMonsterFace(head)
	
	-- === YEUX ===
	for side = -1, 1, 2 do
		local eye = Instance.new("Part")
		eye.Name = "Eye"
		eye.Shape = Enum.PartType.Ball
		eye.Size = Vector3.new(baseSize * 0.22, baseSize * 0.25, baseSize * 0.15)
		eye.Color = Color3.new(1, 1, 1)
		eye.Material = Enum.Material.SmoothPlastic
		eye.CanCollide = false
		eye.CFrame = head.CFrame * CFrame.new(side * baseSize * 0.25, baseSize * 0.15, -baseSize * 0.35)
		eye.Parent = monster
		local eyeWeld = Instance.new("WeldConstraint")
		eyeWeld.Part0 = head
		eyeWeld.Part1 = eye
		eyeWeld.Parent = eye
		
		-- Pupille
		local pupil = Instance.new("Part")
		pupil.Name = "Pupil"
		pupil.Shape = Enum.PartType.Ball
		pupil.Size = Vector3.new(baseSize * 0.12, baseSize * 0.14, baseSize * 0.1)
		pupil.Color = Color3.fromRGB(20, 20, 20)
		pupil.Material = Enum.Material.SmoothPlastic
		pupil.CanCollide = false
		pupil.CFrame = eye.CFrame * CFrame.new(0, 0, -baseSize * 0.05)
		pupil.Parent = monster
		local pupilWeld = Instance.new("WeldConstraint")
		pupilWeld.Part0 = eye
		pupilWeld.Part1 = pupil
		pupilWeld.Parent = pupil
	end
	
	-- === PATTES (4 petites pattes) ===
	local legOffsets = {
		Vector3.new(-baseSize * 0.45, -baseSize * 0.4, -baseSize * 0.5),
		Vector3.new(baseSize * 0.45, -baseSize * 0.4, -baseSize * 0.5),
		Vector3.new(-baseSize * 0.45, -baseSize * 0.4, baseSize * 0.5),
		Vector3.new(baseSize * 0.45, -baseSize * 0.4, baseSize * 0.5),
	}
	for _, offset in ipairs(legOffsets) do
		local leg = Instance.new("Part")
		leg.Name = "Leg"
		leg.Size = Vector3.new(baseSize * 0.3, baseSize * 0.5, baseSize * 0.3)
		leg.Color = Color3.new(bodyColor.R * 0.7, bodyColor.G * 0.7, bodyColor.B * 0.7)
		leg.Material = bodyMat
		leg.CanCollide = false
		leg.CFrame = body.CFrame * CFrame.new(offset)
		leg.Parent = monster
		local legWeld = Instance.new("WeldConstraint")
		legWeld.Part0 = body
		legWeld.Part1 = leg
		legWeld.Parent = leg
	end
	
	-- === QUEUE ===
	local tail = Instance.new("Part")
	tail.Name = "Tail"
	tail.Size = Vector3.new(baseSize * 0.2, baseSize * 0.2, baseSize * 0.7)
	tail.Color = Color3.new(bodyColor.R * 0.8, bodyColor.G * 0.8, bodyColor.B * 0.8)
	tail.Material = bodyMat
	tail.CanCollide = false
	tail.CFrame = body.CFrame * CFrame.new(0, baseSize * 0.1, baseSize * 1.0) * CFrame.Angles(0, 0, math.rad(15))
	tail.Parent = monster
	local tailWeld = Instance.new("WeldConstraint")
	tailWeld.Part0 = body
	tailWeld.Part1 = tail
	tailWeld.Parent = tail
	
	-- === ORNEMENTS (element-specifiques) ===
	local elem = species.element
	if elem == "Feu" or elem == "Demon" then
		-- Cornes
		for side = -1, 1, 2 do
			local horn = Instance.new("Part")
			horn.Name = "Horn"
			horn.Size = Vector3.new(baseSize * 0.12, baseSize * 0.5, baseSize * 0.12)
			horn.Color = isBoss and Color3.fromRGB(255, 50, 0) or Color3.fromRGB(200, 80, 30)
			horn.Material = Enum.Material.Neon
			horn.CanCollide = false
			horn.CFrame = head.CFrame * CFrame.new(side * baseSize * 0.25, baseSize * 0.45, 0) * CFrame.Angles(0, 0, side * math.rad(20))
			horn.Parent = monster
			local hornWeld = Instance.new("WeldConstraint")
			hornWeld.Part0 = head
			hornWeld.Part1 = horn
			hornWeld.Parent = horn
		end
	elseif elem == "Eau" or elem == "Vol" then
		-- Nageoires / Ailes
		for side = -1, 1, 2 do
			local fin = Instance.new("Part")
			fin.Name = "Fin"
			fin.Size = Vector3.new(baseSize * 0.05, baseSize * 0.6, baseSize * 0.8)
			fin.Color = Color3.new(bodyColor.R * 0.9, bodyColor.G * 0.9, bodyColor.B)
			fin.Material = Enum.Material.SmoothPlastic
			fin.Transparency = 0.3
			fin.CanCollide = false
			fin.CFrame = body.CFrame * CFrame.new(side * baseSize * 0.8, baseSize * 0.2, 0) * CFrame.Angles(0, 0, side * math.rad(30))
			fin.Parent = monster
			local finWeld = Instance.new("WeldConstraint")
			finWeld.Part0 = body
			finWeld.Part1 = fin
			finWeld.Parent = fin
		end
	elseif elem == "Electrique" then
		-- Antennes electriques
		for side = -1, 1, 2 do
			local antenna = Instance.new("Part")
			antenna.Name = "Antenna"
			antenna.Size = Vector3.new(baseSize * 0.08, baseSize * 0.6, baseSize * 0.08)
			antenna.Color = Color3.fromRGB(255, 255, 50)
			antenna.Material = Enum.Material.Neon
			antenna.CanCollide = false
			antenna.CFrame = head.CFrame * CFrame.new(side * baseSize * 0.2, baseSize * 0.5, -baseSize * 0.1)
			antenna.Parent = monster
			local aWeld = Instance.new("WeldConstraint")
			aWeld.Part0 = head
			aWeld.Part1 = antenna
			aWeld.Parent = antenna
		end
	elseif elem == "Plante" then
		-- Feuilles sur le dos
		for i = 1, 3 do
			local leaf = Instance.new("Part")
			leaf.Name = "Leaf"
			leaf.Size = Vector3.new(baseSize * 0.5, baseSize * 0.05, baseSize * 0.3)
			leaf.Color = Color3.fromRGB(40, 160, 40)
			leaf.Material = Enum.Material.Grass
			leaf.CanCollide = false
			leaf.CFrame = body.CFrame * CFrame.new(0, baseSize * 0.5, (i - 2) * baseSize * 0.4) * CFrame.Angles(0, math.rad(i * 40), 0)
			leaf.Parent = monster
			local lWeld = Instance.new("WeldConstraint")
			lWeld.Part0 = body
			lWeld.Part1 = leaf
			lWeld.Parent = leaf
		end
	elseif elem == "Sol" then
		-- Plaques rocheuses
		for i = 1, 3 do
			local plate = Instance.new("Part")
			plate.Name = "ArmorPlate"
			plate.Size = Vector3.new(baseSize * 0.5, baseSize * 0.15, baseSize * 0.4)
			plate.Color = Color3.fromRGB(120, 100, 70)
			plate.Material = Enum.Material.Slate
			plate.CanCollide = false
			plate.CFrame = body.CFrame * CFrame.new(0, baseSize * 0.55, (i - 2) * baseSize * 0.5)
			plate.Parent = monster
			local pWeld = Instance.new("WeldConstraint")
			pWeld.Part0 = body
			pWeld.Part1 = plate
			pWeld.Parent = plate
		end
	elseif elem == "Ange" then
		-- Halo
		local halo = Instance.new("Part")
		halo.Name = "Halo"
		halo.Shape = Enum.PartType.Cylinder
		halo.Size = Vector3.new(baseSize * 0.08, baseSize * 0.8, baseSize * 0.8)
		halo.Color = Color3.fromRGB(255, 255, 180)
		halo.Material = Enum.Material.Neon
		halo.CanCollide = false
		halo.CFrame = head.CFrame * CFrame.new(0, baseSize * 0.55, 0) * CFrame.Angles(0, 0, math.rad(90))
		halo.Parent = monster
		local hWeld = Instance.new("WeldConstraint")
		hWeld.Part0 = head
		hWeld.Part1 = halo
		hWeld.Parent = halo
	elseif elem == "Tenebres" then
		-- Aura sombre
		local aura = Instance.new("Part")
		aura.Name = "Aura"
		aura.Shape = Enum.PartType.Ball
		aura.Size = Vector3.new(baseSize * 2.0, baseSize * 1.6, baseSize * 2.0)
		aura.Color = Color3.fromRGB(30, 0, 60)
		aura.Material = Enum.Material.ForceField
		aura.Transparency = 0.7
		aura.CanCollide = false
		aura.CFrame = body.CFrame
		aura.Parent = monster
		local auWeld = Instance.new("WeldConstraint")
		auWeld.Part0 = body
		auWeld.Part1 = aura
		auWeld.Parent = aura
	end
	
	-- Boss glow
	if isBoss then
		local glow = Instance.new("PointLight")
		glow.Brightness = 2
		glow.Range = 15
		glow.Color = bodyColor
		glow.Parent = body
	end
	
	-- Humanoid
	local humanoid = Instance.new("Humanoid")
	humanoid.MaxHealth = hp
	humanoid.Health = hp
	humanoid.Parent = monster
	
	-- Billboard
	local billboard = Instance.new("BillboardGui")
	billboard.Size = UDim2.new(0, 160, 0, 45)
	billboard.StudsOffset = Vector3.new(0, baseSize + 1, 0)
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
		
		-- Critical hit? (10% de chance)
		local isCrit = math.random() < 0.10
		if isCrit then
			damage = math.floor(damage * 1.8)
		end
		
		humanoid:TakeDamage(damage)
		
		-- Envoyer le numero de degats au client
		local dmgRemote = remotes:FindFirstChild("DamageNumber")
		if dmgRemote and body then
			dmgRemote:FireClient(player, body.Position, damage, isCrit)
		end
		
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
			nameLabel.TextColor3 = Color3.fromRGB(255, 255, 100)
			
			-- Countdown live au-dessus de la tete
			local knockoutDuration = GameConfig.SPAWN.KNOCKOUT_DURATION
			task.spawn(function()
				for countdown = knockoutDuration, 1, -1 do
					if not monster.Parent or not monster:GetAttribute("IsKnockedOut") then break end
					nameLabel.Text = "ASSOMME! (" .. countdown .. "s pour capturer)"
					task.wait(1)
				end
				if monster.Parent and monster:GetAttribute("IsKnockedOut") then
					nameLabel.Text = "Trop tard..."
					nameLabel.TextColor3 = Color3.fromRGB(150, 150, 150)
				end
			end)
			
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
	
	-- BodyVelocity pour mouvement fiable (body.Velocity ne marche pas sur les modeles welds)
	local bodyMover = Instance.new("BodyVelocity")
	bodyMover.Name = "Mover"
	bodyMover.MaxForce = Vector3.new(50000, 0, 50000) -- pas de force verticale (gravite)
	bodyMover.Velocity = Vector3.new(0, 0, 0)
	bodyMover.P = 1250
	bodyMover.Parent = body
	
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
				bodyMover.Velocity = Vector3.new(0, 0, 0) -- stop pour attaquer
				local pHum = nearPlayer.Character and nearPlayer.Character:FindFirstChild("Humanoid")
				if pHum and tick() - lastPlayerAttack > 2 then
					pHum:TakeDamage(math.floor(atk * 0.3))
					lastPlayerAttack = tick()
				end
			-- Attaquer cristal si proche
			elseif distCrystal < 10 then
				bodyMover.Velocity = Vector3.new(0, 0, 0) -- stop pour attaquer
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
				-- Marcher vers cristal (BodyVelocity)
				local direction = (crystalPos - bodyPos).Unit
				bodyMover.Velocity = direction * speed
				-- Orienter le monstre vers la cible
				local lookCF = CFrame.lookAt(body.Position, body.Position + direction)
				body.CFrame = CFrame.new(body.Position) * CFrame.Angles(0, select(2, lookCF:ToEulerAnglesYXZ()), 0)
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
	
	local defColor = ElementSystem:GetColor(species.element)
	local defSize = (species.size or 2.5) * 0.8
	local spawnCF = CFrame.new(crystalPos + Vector3.new(math.random(-8, 8), defSize * 0.8, math.random(-8, 8)))
	
	-- Corps
	local body = Instance.new("Part")
	body.Name = "Body"
	body.Size = Vector3.new(defSize * 1.4, defSize * 1.0, defSize * 1.8)
	body.Color = defColor
	body.Material = Enum.Material.Neon
	body.CanCollide = true
	body.CFrame = spawnCF
	body.Parent = defender
	defender.PrimaryPart = body
	
	-- Tete
	local dHead = Instance.new("Part")
	dHead.Name = "Head"
	dHead.Shape = Enum.PartType.Ball
	dHead.Size = Vector3.new(defSize * 1.0, defSize * 0.9, defSize * 0.9)
	dHead.Color = defColor
	dHead.Material = Enum.Material.Neon
	dHead.CanCollide = false
	dHead.CFrame = body.CFrame * CFrame.new(0, defSize * 0.3, -defSize * 1.1)
	dHead.Parent = defender
	Instance.new("WeldConstraint", dHead).Part0 = body; dHead:FindFirstChild("WeldConstraint").Part1 = dHead
	local dHeadWeld = Instance.new("WeldConstraint")
	dHeadWeld.Part0 = body
	dHeadWeld.Part1 = dHead
	dHeadWeld.Parent = dHead
	
	addMonsterFace(dHead)
	
	-- Yeux
	for side = -1, 1, 2 do
		local eye = Instance.new("Part")
		eye.Shape = Enum.PartType.Ball
		eye.Size = Vector3.new(defSize * 0.2, defSize * 0.22, defSize * 0.12)
		eye.Color = Color3.new(1, 1, 1)
		eye.Material = Enum.Material.SmoothPlastic
		eye.CanCollide = false
		eye.CFrame = dHead.CFrame * CFrame.new(side * defSize * 0.25, defSize * 0.15, -defSize * 0.35)
		eye.Parent = defender
		local ew = Instance.new("WeldConstraint"); ew.Part0 = dHead; ew.Part1 = eye; ew.Parent = eye
	end
	
	-- Pattes
	for _, offset in ipairs({
		Vector3.new(-defSize*0.4, -defSize*0.4, -defSize*0.5),
		Vector3.new(defSize*0.4, -defSize*0.4, -defSize*0.5),
		Vector3.new(-defSize*0.4, -defSize*0.4, defSize*0.5),
		Vector3.new(defSize*0.4, -defSize*0.4, defSize*0.5),
	}) do
		local leg = Instance.new("Part")
		leg.Size = Vector3.new(defSize * 0.3, defSize * 0.5, defSize * 0.3)
		leg.Color = Color3.new(defColor.R * 0.7, defColor.G * 0.7, defColor.B * 0.7)
		leg.Material = Enum.Material.Neon
		leg.CanCollide = false
		leg.CFrame = body.CFrame * CFrame.new(offset)
		leg.Parent = defender
		local lw = Instance.new("WeldConstraint"); lw.Part0 = body; lw.Part1 = leg; lw.Parent = leg
	end
	
	-- Glow defenseur
	local glow = Instance.new("PointLight")
	glow.Brightness = 1
	glow.Range = 10
	glow.Color = defColor
	glow.Parent = body
	
	local hum = Instance.new("Humanoid")
	hum.MaxHealth = monsterData.MaxHP or 200
	hum.Health = monsterData.CurrentHP or 200
	hum.Parent = defender
	
	-- Billboard
	local bb = Instance.new("BillboardGui")
	bb.Size = UDim2.new(0, 150, 0, 50)
	bb.StudsOffset = Vector3.new(0, 3, 0)
	bb.AlwaysOnTop = true
	bb.Parent = body
	
	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.new(1, 0, 0, 14)
	nameLabel.BackgroundTransparency = 1
	nameLabel.TextColor3 = ElementSystem:GetColor(species.element)
	nameLabel.TextSize = 12
	nameLabel.Font = Enum.Font.GothamBold
	nameLabel.Text = monsterData.Name .. " Nv." .. monsterData.Level .. " (DEF)"
	nameLabel.Parent = bb
	
	local rarityLabel = Instance.new("TextLabel")
	rarityLabel.Size = UDim2.new(1, 0, 0, 12)
	rarityLabel.Position = UDim2.new(0, 0, 0, 14)
	rarityLabel.BackgroundTransparency = 1
	rarityLabel.TextColor3 = MonsterDB.RARITY_COLORS[monsterData.Rarity] or Color3.new(1,1,1)
	rarityLabel.TextSize = 9
	rarityLabel.Font = Enum.Font.Gotham
	rarityLabel.Text = monsterData.Rarity .. " | " .. species.element
	rarityLabel.Parent = bb
	
	-- XP Bar du defenseur
	local xpBarBg = Instance.new("Frame")
	xpBarBg.Size = UDim2.new(0.9, 0, 0, 6)
	xpBarBg.Position = UDim2.new(0.05, 0, 0, 28)
	xpBarBg.BackgroundColor3 = Color3.fromRGB(30, 30, 50)
	xpBarBg.BorderSizePixel = 0
	xpBarBg.Parent = bb
	Instance.new("UICorner", xpBarBg).CornerRadius = UDim.new(0, 3)
	
	local xpBarFill = Instance.new("Frame")
	xpBarFill.Name = "XPFill"
	xpBarFill.Size = UDim2.new(0, 0, 1, 0)
	xpBarFill.BackgroundColor3 = Color3.fromRGB(80, 200, 255)
	xpBarFill.BorderSizePixel = 0
	xpBarFill.Parent = xpBarBg
	Instance.new("UICorner", xpBarFill).CornerRadius = UDim.new(0, 3)
	
	local xpTextDef = Instance.new("TextLabel")
	xpTextDef.Size = UDim2.new(1, 0, 0, 10)
	xpTextDef.Position = UDim2.new(0, 0, 0, 35)
	xpTextDef.BackgroundTransparency = 1
	xpTextDef.TextColor3 = Color3.fromRGB(120, 180, 255)
	xpTextDef.TextSize = 7
	xpTextDef.Font = Enum.Font.Gotham
	xpTextDef.Text = "XP: 0/80"
	xpTextDef.Parent = bb
	
	defender:SetAttribute("OwnerUserId", player.UserId)
	defender:SetAttribute("MonsterUID", monsterData.UID)
	
	-- BodyVelocity pour mouvement fiable des defenseurs
	local defMover = Instance.new("BodyVelocity")
	defMover.Name = "Mover"
	defMover.MaxForce = Vector3.new(50000, 0, 50000)
	defMover.Velocity = Vector3.new(0, 0, 0)
	defMover.P = 1250
	defMover.Parent = body
	
	defender.Parent = Workspace
	
	-- IA defenseur: attaquer monstres sauvages
	task.spawn(function()
		while defender.Parent and hum.Health > 0 do
			-- Update XP bar du defenseur
			local currentMonster = PlayerDataService:GetMonsterByUID(player, monsterData.UID)
			if currentMonster then
				local mLevel = currentMonster.Level or 1
				local mXP = currentMonster.XP or 0
				local mReq = GameConfig.MONSTER_XP.LEVELUP_BASE * mLevel
				local xpRatio = math.clamp(mXP / math.max(mReq, 1), 0, 1)
				xpBarFill.Size = UDim2.new(xpRatio, 0, 1, 0)
				xpTextDef.Text = "XP: " .. mXP .. "/" .. mReq
				nameLabel.Text = currentMonster.Name .. " Nv." .. mLevel .. " (DEF)"
			end
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
					defMover.Velocity = Vector3.new(0, 0, 0) -- stop pour attaquer
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
					defMover.Velocity = dir * 18
					-- Face direction
					local lookCF = CFrame.lookAt(body.Position, body.Position + dir)
					body.CFrame = CFrame.new(body.Position) * CFrame.Angles(0, select(2, lookCF:ToEulerAnglesYXZ()), 0)
					task.wait(0.15)
				end
			else
				-- Retourner pres du cristal
				local distCrystal = (body.Position - getCrystalPos()).Magnitude
				if distCrystal > 15 then
					local retDir = (getCrystalPos() - body.Position).Unit
					defMover.Velocity = retDir * 12
				else
					defMover.Velocity = Vector3.new(0, 0, 0)
				end
				task.wait(0.5)
			end
		end
	end)
	
	return defender
end

-- === BILLBOARD CRYSTAL HP (barre de vie stable) ===
local crystalCore = crystal:FindFirstChild("Core")
if crystalCore then
	local bb = Instance.new("BillboardGui")
	bb.Name = "CrystalHPBar"
	bb.Size = UDim2.new(0, 200, 0, 60)
	bb.StudsOffset = Vector3.new(0, 12, 0)
	bb.MaxDistance = 250
	bb.AlwaysOnTop = true
	bb.Parent = crystalCore
	
	-- Title
	local titleLabel = Instance.new("TextLabel")
	titleLabel.Name = "Title"
	titleLabel.Size = UDim2.new(1, 0, 0, 18)
	titleLabel.BackgroundTransparency = 1
	titleLabel.TextColor3 = Color3.fromRGB(100, 255, 255)
	titleLabel.TextSize = 14
	titleLabel.Font = Enum.Font.GothamBold
	titleLabel.Text = "💎 CRISTAL"
	titleLabel.Parent = bb
	
	-- HP Bar background
	local hpBarBg = Instance.new("Frame")
	hpBarBg.Name = "HPBarBg"
	hpBarBg.Size = UDim2.new(0.95, 0, 0, 14)
	hpBarBg.Position = UDim2.new(0.025, 0, 0, 20)
	hpBarBg.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
	hpBarBg.BorderSizePixel = 0
	hpBarBg.Parent = bb
	Instance.new("UICorner", hpBarBg).CornerRadius = UDim.new(0, 4)
	local barStroke = Instance.new("UIStroke")
	barStroke.Color = Color3.fromRGB(60, 60, 80)
	barStroke.Thickness = 1
	barStroke.Parent = hpBarBg
	
	-- HP Bar fill
	local hpBarFill = Instance.new("Frame")
	hpBarFill.Name = "Fill"
	hpBarFill.Size = UDim2.new(1, 0, 1, 0)
	hpBarFill.BackgroundColor3 = Color3.fromRGB(50, 220, 220)
	hpBarFill.BorderSizePixel = 0
	hpBarFill.Parent = hpBarBg
	Instance.new("UICorner", hpBarFill).CornerRadius = UDim.new(0, 4)
	
	-- HP text (inside bar)
	local hpText = Instance.new("TextLabel")
	hpText.Name = "HPText"
	hpText.Size = UDim2.new(1, 0, 1, 0)
	hpText.BackgroundTransparency = 1
	hpText.TextColor3 = Color3.new(1, 1, 1)
	hpText.TextSize = 10
	hpText.Font = Enum.Font.GothamBold
	hpText.Text = CRYSTAL_HP .. "/" .. CRYSTAL_MAX_HP
	hpText.ZIndex = 2
	hpText.Parent = hpBarBg
	
	-- Status text below bar
	local statusLabel = Instance.new("TextLabel")
	statusLabel.Name = "Status"
	statusLabel.Size = UDim2.new(1, 0, 0, 14)
	statusLabel.Position = UDim2.new(0, 0, 0, 36)
	statusLabel.BackgroundTransparency = 1
	statusLabel.TextColor3 = Color3.fromRGB(150, 200, 200)
	statusLabel.TextSize = 9
	statusLabel.Font = Enum.Font.Gotham
	statusLabel.Text = ""
	statusLabel.Parent = bb
	
	-- Update loop
	task.spawn(function()
		while true do
			task.wait(0.3)
			if CRYSTAL_DOWN then
				local remaining = math.max(0, math.floor(CRYSTAL_DOWN_UNTIL - tick()))
				titleLabel.Text = "💔 CRISTAL DETRUIT"
				titleLabel.TextColor3 = Color3.fromRGB(255, 80, 80)
				hpBarFill.Size = UDim2.new(0, 0, 1, 0)
				hpBarFill.BackgroundColor3 = Color3.fromRGB(255, 50, 50)
				hpText.Text = "0/" .. CRYSTAL_MAX_HP
				statusLabel.Text = "Reparation: " .. remaining .. "s"
				statusLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
			else
				local ratio = math.clamp(CRYSTAL_HP / math.max(CRYSTAL_MAX_HP, 1), 0, 1)
				titleLabel.Text = "💎 CRISTAL"
				hpBarFill.Size = UDim2.new(ratio, 0, 1, 0)
				hpText.Text = CRYSTAL_HP .. "/" .. CRYSTAL_MAX_HP
				
				-- Color gradient
				if ratio > 0.6 then
					titleLabel.TextColor3 = Color3.fromRGB(100, 255, 255)
					hpBarFill.BackgroundColor3 = Color3.fromRGB(50, 220, 220)
					statusLabel.Text = ""
				elseif ratio > 0.3 then
					titleLabel.TextColor3 = Color3.fromRGB(255, 200, 50)
					hpBarFill.BackgroundColor3 = Color3.fromRGB(255, 200, 50)
					statusLabel.Text = "⚠ Cristal en danger!"
					statusLabel.TextColor3 = Color3.fromRGB(255, 200, 100)
				else
					titleLabel.TextColor3 = Color3.fromRGB(255, 80, 80)
					hpBarFill.BackgroundColor3 = Color3.fromRGB(255, 60, 60)
					statusLabel.Text = "🔥 CRISTAL CRITIQUE!"
					statusLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
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

-- === REGEN PASSIVE JOUEUR ===
task.spawn(function()
	while true do
		task.wait(3)
		for _, p in ipairs(Players:GetPlayers()) do
			local character = p.Character
			local hum = character and character:FindFirstChildOfClass("Humanoid")
			if hum and hum.Health > 0 and hum.Health < hum.MaxHealth then
				local vitPts = 0
				local data = PlayerDataService:GetData(p)
				if data and data.SkillPoints then
					vitPts = data.SkillPoints.Vitality or 0
				end
				-- Regen: 2 HP/3s base + 0.5 per Vitality point
				local regenAmount = 2 + vitPts * 0.5
				hum.Health = math.min(hum.MaxHealth, hum.Health + regenAmount)
			end
		end
	end
end)
