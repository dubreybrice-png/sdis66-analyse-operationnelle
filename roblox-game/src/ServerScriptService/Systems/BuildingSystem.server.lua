--[[
	BuildingSystem V20 - Achat, upgrade, reparation de batiments
	- Verifie les prerequisites d'ere
	- Gere les couts et niveaux max par ere
	- Cree les modeles visuels dans le workspace
]]

print("[BuildingSystem V20] Loading...")

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local Workspace = game.Workspace

local PlayerDataService = require(ServerScriptService.Services.PlayerDataService)
local BuildingDB = require(ReplicatedStorage.Data.BuildingDatabase)
local GameConfig = require(ReplicatedStorage.Data.GameConfig)

local remotes = ReplicatedStorage:WaitForChild("Remotes", 10)
if not remotes then warn("[BuildingSystem] Remotes not found!") return end

local notifyRemote = remotes:FindFirstChild("NotifyPlayer")

local function notify(player, msg)
	if notifyRemote then
		notifyRemote:FireClient(player, msg)
	end
end

-- Stockage des modeles visuels de batiments
local buildingModels = {} -- {userId_buildingId = model}

-- === ERA COLORS ===
local ERA_COLORS = {
	Color3.fromRGB(139, 119, 101),  -- Primitive
	Color3.fromRGB(205, 127, 50),   -- Bronze
	Color3.fromRGB(160, 160, 170),  -- Fer
	Color3.fromRGB(148, 103, 189),  -- Magique
	Color3.fromRGB(0, 200, 255),    -- Cristalline
	Color3.fromRGB(255, 215, 0),    -- Celeste
}

-- === CREER UN MODELE VISUEL DE BATIMENT ===
local function createBuildingModel(player, buildingId, level)
	local bData = BuildingDB:Get(buildingId)
	if not bData then return end
	
	local key = player.UserId .. "_" .. buildingId
	
	-- Detruire l'ancien modele si existant
	if buildingModels[key] then
		buildingModels[key]:Destroy()
	end
	
	local model = Instance.new("Model")
	model.Name = "Building_" .. buildingId .. "_" .. player.Name
	
	-- Taille basee sur le niveau
	local size = 4 + level
	local eraColor = ERA_COLORS[bData.era] or Color3.fromRGB(139, 119, 101)
	
	-- Base/fondation
	local foundation = Instance.new("Part")
	foundation.Name = "Foundation"
	foundation.Size = Vector3.new(size + 3, 0.5, size + 3)
	foundation.Color = Color3.fromRGB(80, 80, 90)
	foundation.Material = Enum.Material.Concrete
	foundation.Anchored = true
	foundation.CanCollide = true
	foundation.CFrame = CFrame.new(bData.position + Vector3.new(0, 0.25, 0))
	foundation.Parent = model

	local body = Instance.new("Part")
	body.Name = "Body"
	body.Size = Vector3.new(size, size * 1.2, size)
	body.Color = eraColor
	body.Material = Enum.Material.Brick
	body.Anchored = true
	body.CanCollide = true
	body.CFrame = CFrame.new(bData.position + Vector3.new(0, size * 0.6 + 0.5, 0))
	body.Parent = model
	model.PrimaryPart = body
	
	-- Porte
	local door = Instance.new("Part")
	door.Name = "Door"
	door.Size = Vector3.new(size * 0.3, size * 0.5, 0.3)
	door.Color = Color3.fromRGB(101, 67, 33)
	door.Material = Enum.Material.Wood
	door.Anchored = true
	door.CFrame = CFrame.new(bData.position + Vector3.new(0, size * 0.25 + 0.5, size / 2 + 0.1))
	door.Parent = model
	
	-- Toit (pyramide simplifiee)
	local roof = Instance.new("Part")
	roof.Name = "Roof"
	roof.Size = Vector3.new(size + 2, 1.5, size + 2)
	roof.Color = Color3.fromRGB(160, 50, 50)
	roof.Material = Enum.Material.Slate
	roof.Anchored = true
	roof.CanCollide = true
	roof.CFrame = CFrame.new(bData.position + Vector3.new(0, size * 1.2 + 1.25, 0))
	roof.Parent = model
	
	-- Pointe de toit
	local roofTip = Instance.new("Part")
	roofTip.Name = "RoofTip"
	roofTip.Shape = Enum.PartType.Ball
	roofTip.Size = Vector3.new(2, 2, 2)
	roofTip.Color = Color3.fromRGB(255, 215, 0)
	roofTip.Material = Enum.Material.Neon
	roofTip.Anchored = true
	roofTip.CFrame = CFrame.new(bData.position + Vector3.new(0, size * 1.2 + 2.5, 0))
	roofTip.Parent = model
	
	-- Billboard
	local bb = Instance.new("BillboardGui")
	bb.Size = UDim2.new(0, 200, 0, 55)
	bb.StudsOffset = Vector3.new(0, size * 0.6 + 4, 0)
	bb.AlwaysOnTop = true
	bb.Parent = body
	
	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.new(1, 0, 0, 18)
	nameLabel.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
	nameLabel.BackgroundTransparency = 0.3
	nameLabel.TextColor3 = Color3.fromRGB(255, 255, 200)
	nameLabel.TextSize = 13
	nameLabel.Font = Enum.Font.GothamBold
	nameLabel.Text = bData.icon .. " " .. bData.name .. " Nv." .. level
	nameLabel.Parent = bb
	Instance.new("UICorner", nameLabel).CornerRadius = UDim.new(0, 4)
	
	local infoLabel = Instance.new("TextLabel")
	infoLabel.Size = UDim2.new(1, 0, 0, 14)
	infoLabel.Position = UDim2.new(0, 0, 0, 20)
	infoLabel.BackgroundTransparency = 1
	infoLabel.TextColor3 = Color3.fromRGB(180, 230, 180)
	infoLabel.TextSize = 10
	infoLabel.Font = Enum.Font.Gotham
	infoLabel.Text = bData.desc
	infoLabel.TextWrapped = true
	infoLabel.Parent = bb
	
	-- Click detector pour interactions
	local detector = Instance.new("ClickDetector")
	detector.MaxActivationDistance = 20
	detector.Parent = body
	
	detector.MouseClick:Connect(function(clickPlayer)
		if clickPlayer.UserId ~= player.UserId then
			notify(clickPlayer, "Ce batiment appartient a " .. player.Name)
			return
		end
		
		-- Ouvrir l'UI du batiment
		local openUI = remotes:FindFirstChild("OpenBuildingUI")
		if openUI then
			openUI:FireClient(clickPlayer, buildingId, level, bData)
		end
	end)
	
	-- Dossier Buildings dans Workspace
	local buildingsFolder = Workspace:FindFirstChild("Buildings")
	if not buildingsFolder then
		buildingsFolder = Instance.new("Folder")
		buildingsFolder.Name = "Buildings"
		buildingsFolder.Parent = Workspace
	end
	
	model.Parent = buildingsFolder
	buildingModels[key] = model
	
	return model
end

-- === CREER UN PLACEHOLDER DE BATIMENT (ruine/chantier) ===
local function createBuildingPlaceholder(player, buildingId)
	local bData = BuildingDB:Get(buildingId)
	if not bData then return end
	
	local key = player.UserId .. "_" .. buildingId
	
	-- Ne pas recreer si deja un modele construit
	if buildingModels[key] then return end
	
	local isLocked = not BuildingDB:IsBuildingUnlocked(buildingId, PlayerDataService:GetData(player).Buildings or {})
	
	local model = Instance.new("Model")
	model.Name = "Placeholder_" .. buildingId .. "_" .. player.Name
	
	-- Base ruine
	local base = Instance.new("Part")
	base.Name = "Body"
	base.Size = Vector3.new(6, 2, 6)
	base.Color = isLocked and Color3.fromRGB(60, 60, 65) or Color3.fromRGB(120, 100, 80)
	base.Material = isLocked and Enum.Material.Slate or Enum.Material.Cobblestone
	base.Transparency = isLocked and 0.5 or 0.2
	base.Anchored = true
	base.CanCollide = true
	base.CFrame = CFrame.new(bData.position + Vector3.new(0, 1, 0))
	base.Parent = model
	model.PrimaryPart = base
	
	-- Debris decoratifs
	for i = 1, 3 do
		local debris = Instance.new("Part")
		debris.Size = Vector3.new(math.random(1, 2), math.random(1, 2), math.random(1, 2))
		debris.Color = Color3.fromRGB(90, 80, 70)
		debris.Material = Enum.Material.Cobblestone
		debris.Transparency = isLocked and 0.5 or 0.3
		debris.Anchored = true
		debris.CanCollide = false
		debris.CFrame = CFrame.new(bData.position + Vector3.new(math.random(-2, 2), 0.5, math.random(-2, 2)))
		debris.Parent = model
	end
	
	-- Billboard
	local bb = Instance.new("BillboardGui")
	bb.Size = UDim2.new(0, 200, 0, 60)
	bb.StudsOffset = Vector3.new(0, 4, 0)
	bb.AlwaysOnTop = true
	bb.Parent = base
	
	local cost = bData.repairCost or bData.baseCost or 0
	local costText = cost > 0 and (cost .. "g") or "Gratuit"
	
	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.new(1, 0, 0, 18)
	nameLabel.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
	nameLabel.BackgroundTransparency = 0.3
	nameLabel.TextColor3 = isLocked and Color3.fromRGB(150, 150, 150) or Color3.fromRGB(255, 200, 100)
	nameLabel.TextSize = 12
	nameLabel.Font = Enum.Font.GothamBold
	nameLabel.Text = bData.icon .. " " .. bData.name
	nameLabel.Parent = bb
	Instance.new("UICorner", nameLabel).CornerRadius = UDim.new(0, 4)
	
	local statusLabel = Instance.new("TextLabel")
	statusLabel.Name = "Status"
	statusLabel.Size = UDim2.new(1, 0, 0, 14)
	statusLabel.Position = UDim2.new(0, 0, 0, 20)
	statusLabel.BackgroundTransparency = 1
	statusLabel.TextSize = 10
	statusLabel.Font = Enum.Font.Gotham
	statusLabel.TextWrapped = true
	statusLabel.Parent = bb
	
	if isLocked then
		statusLabel.Text = "🔒 Construis d'abord les batiments precedents"
		statusLabel.TextColor3 = Color3.fromRGB(180, 100, 100)
	else
		local actionText = bData.repairCost and "Clic pour reparer" or "Clic pour construire"
		statusLabel.Text = actionText .. " (" .. costText .. ")"
		statusLabel.TextColor3 = Color3.fromRGB(100, 255, 100)
	end
	
	-- Click detector
	local detector = Instance.new("ClickDetector")
	detector.MaxActivationDistance = 20
	detector.Parent = base
	
	detector.MouseClick:Connect(function(clickPlayer)
		if clickPlayer.UserId ~= player.UserId then
			notify(clickPlayer, "Cette zone appartient a " .. player.Name)
			return
		end
		
		local data = PlayerDataService:GetData(clickPlayer)
		if not data then return end
		
		-- Verifier si deja construit
		if data.Buildings[buildingId] then return end
		
		-- Verifier deverrouillage sequentiel
		if not BuildingDB:IsBuildingUnlocked(buildingId, data.Buildings or {}) then
			notify(clickPlayer, "🔒 Travaux en cours... Construis d'abord les batiments precedents!")
			return
		end
		
		-- Verifier ere
		if (data.VilleEra or 1) < bData.era then
			notify(clickPlayer, "Ere " .. bData.era .. " requise! (tu es en ere " .. (data.VilleEra or 1) .. ")")
			return
		end
		
		-- Acheter/reparer directement
		local cost2 = bData.repairCost or bData.baseCost or 0
		if cost2 > 0 and data.GoldWallet < cost2 then
			notify(clickPlayer, "Pas assez d'or! " .. cost2 .. "g requis (tu as " .. data.GoldWallet .. "g)")
			return
		end
		
		-- Achat!
		if cost2 > 0 then
			PlayerDataService:RemoveGold(clickPlayer, cost2)
		end
		
		data.Buildings[buildingId] = {
			level = 1,
			built = true,
			builtAt = os.time()
		}
		
		applyBuildingEffects(clickPlayer, buildingId, 1)
		
		-- Detruire le placeholder
		model:Destroy()
		buildingModels[key] = nil
		
		-- Creer le vrai batiment
		createBuildingModel(clickPlayer, buildingId, 1)
		
		notify(clickPlayer, bData.icon .. " " .. bData.name .. " construit! (-" .. cost2 .. "g)")
		
		checkVilleLevelUp(clickPlayer)
		
		-- Refresh les placeholders (pour deverrouiller le suivant)
		refreshPlaceholders(clickPlayer)
		
		print("[BuildingSystem] " .. clickPlayer.Name .. " built " .. buildingId)
	end)
	
	-- Dossier Buildings dans Workspace
	local buildingsFolder = Workspace:FindFirstChild("Buildings")
	if not buildingsFolder then
		buildingsFolder = Instance.new("Folder")
		buildingsFolder.Name = "Buildings"
		buildingsFolder.Parent = Workspace
	end
	
	model.Parent = buildingsFolder
	buildingModels[key] = model
	
	return model
end

-- === REFRESH TOUS LES PLACEHOLDERS (apres construction) ===
function refreshPlaceholders(player)
	local data = PlayerDataService:GetData(player)
	if not data then return end
	
	for buildingId, bData in pairs(BuildingDB.BUILDINGS) do
		local key = player.UserId .. "_" .. buildingId
		if not data.Buildings[buildingId] then
			-- Detruire l'ancien placeholder
			if buildingModels[key] then
				buildingModels[key]:Destroy()
				buildingModels[key] = nil
			end
			-- Recreer avec le bon etat
			if (data.VilleEra or 1) >= bData.era then
				createBuildingPlaceholder(player, buildingId)
			end
		end
	end
end

-- === ACHETER UN BATIMENT ===
local purchaseRemote = remotes:WaitForChild("PurchaseBuilding", 5)
if purchaseRemote then
	purchaseRemote.OnServerEvent:Connect(function(player, buildingId)
		local data = PlayerDataService:GetData(player)
		if not data then return end
		
		local bData = BuildingDB:Get(buildingId)
		if not bData then
			notify(player, "Batiment inconnu!")
			return
		end
		
		-- Verifier ere
		if (data.VilleEra or 1) < bData.era then
			notify(player, "Ere " .. bData.era .. " requise! (tu es en ere " .. (data.VilleEra or 1) .. ")")
			return
		end
		
		-- Verifier deverrouillage sequentiel
		if not BuildingDB:IsBuildingUnlocked(buildingId, data.Buildings or {}) then
			notify(player, "🔒 Construis d'abord les batiments precedents!")
			return
		end
		
		-- Verifier pas deja construit
		if data.Buildings[buildingId] then
			notify(player, "Deja construit! Utilise 'Ameliorer'.")
			return
		end
		
		-- Verifier or
		local cost = bData.repairCost or bData.baseCost
		if data.GoldWallet < cost then
			notify(player, "Pas assez d'or! " .. cost .. "g requis (tu as " .. data.GoldWallet .. "g)")
			return
		end
		
		-- Achat!
		PlayerDataService:RemoveGold(player, cost)
		
		data.Buildings[buildingId] = {
			level = 1,
			built = true,
			builtAt = os.time()
		}
		
		-- Appliquer les effets du batiment
		applyBuildingEffects(player, buildingId, 1)
		
		-- Detruire le placeholder s'il existe
		local key = player.UserId .. "_" .. buildingId
		if buildingModels[key] then
			buildingModels[key]:Destroy()
			buildingModels[key] = nil
		end
		
		-- Creer le modele visuel
		createBuildingModel(player, buildingId, 1)
		
		notify(player, bData.icon .. " " .. bData.name .. " construit! (-" .. cost .. "g)")
		
		-- Verifier si VilleLevel augmente
		checkVilleLevelUp(player)
		
		-- Refresh placeholders
		refreshPlaceholders(player)
		
		print("[BuildingSystem] " .. player.Name .. " built " .. buildingId)
	end)
end

-- === AMELIORER UN BATIMENT ===
local upgradeRemote = remotes:WaitForChild("UpgradeBuilding", 5)
if upgradeRemote then
	upgradeRemote.OnServerEvent:Connect(function(player, buildingId)
		local data = PlayerDataService:GetData(player)
		if not data then return end
		
		local bData = BuildingDB:Get(buildingId)
		if not bData then return end
		
		local building = data.Buildings[buildingId]
		if not building then
			notify(player, "Batiment pas encore construit!")
			return
		end
		
		local currentLevel = building.level or 1
		local era = data.VilleEra or 1
		
		-- Verifier niveau max pour l'ere actuelle
		local maxLevel = bData.maxLevelPerEra[era] or 1
		if currentLevel >= maxLevel then
			notify(player, "Niveau max pour cette ere! (" .. currentLevel .. "/" .. maxLevel .. ") Passe a l'ere suivante.")
			return
		end
		
		-- Cout d'amelioration
		local cost = math.floor(bData.upgradeCostBase * math.pow(2, currentLevel - 1))
		
		if data.GoldWallet < cost then
			notify(player, "Pas assez d'or! " .. cost .. "g requis")
			return
		end
		
		-- Amelioration!
		PlayerDataService:RemoveGold(player, cost)
		building.level = currentLevel + 1
		
		-- Re-appliquer les effets
		applyBuildingEffects(player, buildingId, building.level)
		
		-- Mettre a jour le modele
		createBuildingModel(player, buildingId, building.level)
		
		notify(player, bData.name .. " ameliore au Nv." .. building.level .. "! (-" .. cost .. "g)")
		
		checkVilleLevelUp(player)
		
		print("[BuildingSystem] " .. player.Name .. " upgraded " .. buildingId .. " to level " .. building.level)
	end)
end

-- === APPLIQUER EFFETS DE BATIMENT ===
function applyBuildingEffects(player, buildingId, level)
	local data = PlayerDataService:GetData(player)
	if not data then return end
	
	local bData = BuildingDB:Get(buildingId)
	if not bData or not bData.effects then return end
	
	for effectType, effectData in pairs(bData.effects) do
		if effectType == "monsterStorage" then
			-- +X slots par niveau
			local base = effectData.base or 5
			local perLevel = effectData.perLevel or 3
			data.MonsterStorageCapacity = base + perLevel * level
			
		elseif effectType == "goldPerMin" then
			-- Mine: on track ca dans MonsterManager
			-- Rien a faire ici, MonsterManager lit le niveau de mine
			
		elseif effectType == "crystalHP" then
			-- +HP au cristal par niveau
			local crystal = Workspace:FindFirstChild("Crystal")
			if crystal then
				local bonus = (effectData.perLevel or 200) * level
				crystal:SetAttribute("CrystalMaxHP", GameConfig.CRYSTAL.BASE_HP + bonus)
				crystal:SetAttribute("CrystalHP", math.min(
					crystal:GetAttribute("CrystalHP") or GameConfig.CRYSTAL.BASE_HP,
					GameConfig.CRYSTAL.BASE_HP + bonus
				))
			end
			
		elseif effectType == "defenseSlots" then
			-- +defense slot count (stored in data, read by PlayerDataService)
			data.DefenseSlotsBonus = (effectData.base or 0) + (effectData.perLevel or 1) * level
			
		elseif effectType == "captureLaser" then
			data.HasCaptureLaser = true
			
		elseif effectType == "bankCapacity" then
			data.BankCapacityBonus = (effectData.base or 500) + (effectData.perLevel or 500) * level
			
		elseif effectType == "trainingSlots" then
			data.TrainingSlotsBonus = (effectData.perLevel or 1) * level
			
		elseif effectType == "rareSpawnBonus" then
			data.RareSpawnBonus = (effectData.perLevel or 0.02) * level
			
		elseif effectType == "mineSlots" then
			data.MineSlotsBonus = (effectData.perLevel or 1) * level
			
		elseif effectType == "monsterStorageBonus" then
			data.MonsterStorageCapacity = (data.MonsterStorageCapacity or 5) + (effectData.perLevel or 5) * level
		end
	end
end

-- === VERIFIER VILLE LEVEL UP ===
function checkVilleLevelUp(player)
	local data = PlayerDataService:GetData(player)
	if not data then return end
	
	-- VilleLevel = nombre total de niveaux de batiments
	local totalLevels = 0
	for _, building in pairs(data.Buildings) do
		totalLevels = totalLevels + (building.level or 1)
	end
	
	local newVilleLevel = math.max(1, totalLevels)
	
	if newVilleLevel > (data.VilleLevel or 1) then
		data.VilleLevel = newVilleLevel
		notify(player, "Ville niveau " .. newVilleLevel .. "!")
		
		-- Verifier changement d'ere
		local eraConfig = GameConfig.ERAS
		for i, era in ipairs(eraConfig) do
			if newVilleLevel >= era.villeLevel and i > (data.VilleEra or 1) then
				data.VilleEra = i
				notify(player, "NOUVELLE ERE: " .. era.name .. "! Nouveaux batiments disponibles!")
			end
		end
	end
	
	-- VillePower = somme de tous les niveaux * facteurs
	local power = 0
	for buildingId, building in pairs(data.Buildings) do
		local bData = BuildingDB:Get(buildingId)
		if bData then
			power = power + (building.level or 1) * (bData.powerWeight or 1)
		end
	end
	data.VillePower = power
end

-- === CHARGER LES BATIMENTS EXISTANTS AU LOGIN ===
Players.PlayerAdded:Connect(function(player)
	task.wait(3) -- attendre que PlayerData soit charge
	
	local data = PlayerDataService:GetData(player)
	if not data then return end
	
	-- Creer les modeles des batiments construits
	if data.Buildings then
		for buildingId, building in pairs(data.Buildings) do
			if building.built then
				createBuildingModel(player, buildingId, building.level or 1)
				applyBuildingEffects(player, buildingId, building.level or 1)
			end
		end
	end
	
	-- Creer les placeholders pour les batiments NON construits
	for buildingId, bData in pairs(BuildingDB.BUILDINGS) do
		if not data.Buildings[buildingId] then
			if (data.VilleEra or 1) >= bData.era then
				createBuildingPlaceholder(player, buildingId)
			end
		end
	end
	
	checkVilleLevelUp(player)
end)

-- Cleanup au depart du joueur
Players.PlayerRemoving:Connect(function(player)
	for key, model in pairs(buildingModels) do
		if key:match("^" .. player.UserId .. "_") then
			model:Destroy()
			buildingModels[key] = nil
		end
	end
end)

print("[BuildingSystem V20] Ready!")
