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
	
	local body = Instance.new("Part")
	body.Name = "Body"
	body.Size = Vector3.new(size, size * 1.2, size)
	body.Color = bData.color or Color3.fromRGB(139, 119, 101)
	body.Material = Enum.Material.Brick
	body.Anchored = true
	body.CanCollide = true
	body.CFrame = CFrame.new(bData.position + Vector3.new(0, size * 0.6, 0))
	body.Parent = model
	model.PrimaryPart = body
	
	-- Toit
	local roof = Instance.new("Part")
	roof.Name = "Roof"
	roof.Size = Vector3.new(size + 2, 1, size + 2)
	roof.Color = Color3.fromRGB(180, 50, 50)
	roof.Material = Enum.Material.Slate
	roof.Anchored = true
	roof.CanCollide = true
	roof.CFrame = CFrame.new(bData.position + Vector3.new(0, size * 1.2 + 0.5, 0))
	roof.Parent = model
	
	-- Billboard
	local bb = Instance.new("BillboardGui")
	bb.Size = UDim2.new(0, 180, 0, 50)
	bb.StudsOffset = Vector3.new(0, size * 0.6 + 3, 0)
	bb.AlwaysOnTop = true
	bb.Parent = body
	
	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.new(1, 0, 0.5, 0)
	nameLabel.BackgroundTransparency = 1
	nameLabel.TextColor3 = Color3.fromRGB(255, 255, 200)
	nameLabel.TextSize = 12
	nameLabel.Font = Enum.Font.GothamBold
	nameLabel.Text = bData.name .. " Nv." .. level
	nameLabel.Parent = bb
	
	local infoLabel = Instance.new("TextLabel")
	infoLabel.Size = UDim2.new(1, 0, 0.5, 0)
	infoLabel.Position = UDim2.new(0, 0, 0.5, 0)
	infoLabel.BackgroundTransparency = 1
	infoLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
	infoLabel.TextSize = 10
	infoLabel.Font = Enum.Font.Gotham
	infoLabel.Text = bData.description
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
		
		-- Verifier pas deja construit
		if data.Buildings[buildingId] then
			notify(player, "Deja construit! Utilise 'Ameliorer'.")
			return
		end
		
		-- Verifier or
		local cost = bData.baseCost
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
		
		-- Creer le modele visuel
		createBuildingModel(player, buildingId, 1)
		
		notify(player, bData.name .. " construit! (-" .. cost .. "g)")
		
		-- Verifier si VilleLevel augmente
		checkVilleLevelUp(player)
		
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
	if not data or not data.Buildings then return end
	
	for buildingId, building in pairs(data.Buildings) do
		if building.built then
			createBuildingModel(player, buildingId, building.level or 1)
			applyBuildingEffects(player, buildingId, building.level or 1)
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
