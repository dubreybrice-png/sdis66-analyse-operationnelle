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
local WeaponSystem = require(ServerScriptService.Services.WeaponSystem)
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

-- === COULEURS SPECIFIQUES PAR BATIMENT ===
local BUILDING_STYLES = {
	monster_storage = {wallColor = Color3.fromRGB(180, 140, 100), roofColor = Color3.fromRGB(120, 80, 50), doorColor = Color3.fromRGB(80, 50, 20), accent = Color3.fromRGB(200, 100, 50), material = Enum.Material.WoodPlanks},
	gold_mine = {wallColor = Color3.fromRGB(160, 140, 100), roofColor = Color3.fromRGB(100, 80, 40), doorColor = Color3.fromRGB(90, 70, 30), accent = Color3.fromRGB(255, 200, 50), material = Enum.Material.Cobblestone},
	class_hall = {wallColor = Color3.fromRGB(200, 190, 180), roofColor = Color3.fromRGB(140, 60, 60), doorColor = Color3.fromRGB(100, 60, 30), accent = Color3.fromRGB(180, 160, 255), material = Enum.Material.Marble},
	defense_bureau = {wallColor = Color3.fromRGB(140, 140, 150), roofColor = Color3.fromRGB(80, 80, 100), doorColor = Color3.fromRGB(60, 60, 80), accent = Color3.fromRGB(100, 150, 255), material = Enum.Material.Concrete},
	bank = {wallColor = Color3.fromRGB(200, 180, 140), roofColor = Color3.fromRGB(50, 80, 50), doorColor = Color3.fromRGB(80, 60, 30), accent = Color3.fromRGB(255, 215, 0), material = Enum.Material.Marble},
	armory = {wallColor = Color3.fromRGB(130, 120, 120), roofColor = Color3.fromRGB(60, 50, 50), doorColor = Color3.fromRGB(70, 50, 30), accent = Color3.fromRGB(255, 100, 50), material = Enum.Material.Slate},
	monster_school = {wallColor = Color3.fromRGB(180, 160, 200), roofColor = Color3.fromRGB(100, 60, 120), doorColor = Color3.fromRGB(90, 60, 40), accent = Color3.fromRGB(160, 100, 255), material = Enum.Material.Brick},
	training_center = {wallColor = Color3.fromRGB(180, 150, 120), roofColor = Color3.fromRGB(120, 70, 40), doorColor = Color3.fromRGB(80, 50, 20), accent = Color3.fromRGB(255, 150, 50), material = Enum.Material.Wood},
}

-- === CREER UN MODELE VISUEL DE BATIMENT (VRAI BATIMENT!) ===
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
	
	local style = BUILDING_STYLES[buildingId] or {
		wallColor = ERA_COLORS[bData.era] or Color3.fromRGB(160, 140, 120),
		roofColor = Color3.fromRGB(140, 60, 50),
		doorColor = Color3.fromRGB(80, 50, 20),
		accent = Color3.fromRGB(200, 200, 100),
		material = Enum.Material.Brick
	}
	
	-- Tailles basees sur le niveau (vraie maison!)
	local w = 10 + level * 0.5   -- largeur
	local h = 8 + level * 0.3    -- hauteur murs
	local d = 12 + level * 0.5   -- profondeur
	local pos = bData.position
	
	-- === FONDATION ===
	local foundation = Instance.new("Part")
	foundation.Name = "Foundation"
	foundation.Size = Vector3.new(w + 2, 0.6, d + 2)
	foundation.Color = Color3.fromRGB(70, 70, 80)
	foundation.Material = Enum.Material.Concrete
	foundation.Anchored = true
	foundation.CanCollide = true
	foundation.CFrame = CFrame.new(pos + Vector3.new(0, 0.3, 0))
	foundation.Parent = model
	
	-- === 4 MURS ===
	-- Mur avant (avec trou pour la porte)
	local wallFrontL = Instance.new("Part")
	wallFrontL.Name = "WallFrontL"
	wallFrontL.Size = Vector3.new((w - 3) / 2, h, 0.8)
	wallFrontL.Color = style.wallColor
	wallFrontL.Material = style.material
	wallFrontL.Anchored = true
	wallFrontL.CanCollide = true
	wallFrontL.CFrame = CFrame.new(pos + Vector3.new(-(w - 3) / 4 - 1.5, h / 2 + 0.6, d / 2))
	wallFrontL.Parent = model
	
	local wallFrontR = Instance.new("Part")
	wallFrontR.Name = "WallFrontR"
	wallFrontR.Size = Vector3.new((w - 3) / 2, h, 0.8)
	wallFrontR.Color = style.wallColor
	wallFrontR.Material = style.material
	wallFrontR.Anchored = true
	wallFrontR.CanCollide = true
	wallFrontR.CFrame = CFrame.new(pos + Vector3.new((w - 3) / 4 + 1.5, h / 2 + 0.6, d / 2))
	wallFrontR.Parent = model
	
	-- Au-dessus de la porte
	local wallFrontTop = Instance.new("Part")
	wallFrontTop.Name = "WallFrontTop"
	wallFrontTop.Size = Vector3.new(3, h - 5, 0.8)
	wallFrontTop.Color = style.wallColor
	wallFrontTop.Material = style.material
	wallFrontTop.Anchored = true
	wallFrontTop.CanCollide = true
	wallFrontTop.CFrame = CFrame.new(pos + Vector3.new(0, 5 + (h - 5) / 2 + 0.6, d / 2))
	wallFrontTop.Parent = model
	
	-- Mur arriere
	local wallBack = Instance.new("Part")
	wallBack.Name = "WallBack"
	wallBack.Size = Vector3.new(w, h, 0.8)
	wallBack.Color = style.wallColor
	wallBack.Material = style.material
	wallBack.Anchored = true
	wallBack.CanCollide = true
	wallBack.CFrame = CFrame.new(pos + Vector3.new(0, h / 2 + 0.6, -d / 2))
	wallBack.Parent = model
	
	-- Mur gauche
	local wallLeft = Instance.new("Part")
	wallLeft.Name = "WallLeft"
	wallLeft.Size = Vector3.new(0.8, h, d)
	wallLeft.Color = style.wallColor
	wallLeft.Material = style.material
	wallLeft.Anchored = true
	wallLeft.CanCollide = true
	wallLeft.CFrame = CFrame.new(pos + Vector3.new(-w / 2, h / 2 + 0.6, 0))
	wallLeft.Parent = model
	
	-- Mur droite
	local wallRight = Instance.new("Part")
	wallRight.Name = "WallRight"
	wallRight.Size = Vector3.new(0.8, h, d)
	wallRight.Color = style.wallColor
	wallRight.Material = style.material
	wallRight.Anchored = true
	wallRight.CanCollide = true
	wallRight.CFrame = CFrame.new(pos + Vector3.new(w / 2, h / 2 + 0.6, 0))
	wallRight.Parent = model
	
	-- === PORTE ===
	local door = Instance.new("Part")
	door.Name = "Door"
	door.Size = Vector3.new(2.8, 5, 0.5)
	door.Color = style.doorColor
	door.Material = Enum.Material.Wood
	door.Anchored = true
	door.CanCollide = false
	door.CFrame = CFrame.new(pos + Vector3.new(0, 3.1, d / 2 + 0.2))
	door.Parent = model
	
	-- Poignee de porte
	local handle = Instance.new("Part")
	handle.Name = "DoorHandle"
	handle.Shape = Enum.PartType.Ball
	handle.Size = Vector3.new(0.3, 0.3, 0.3)
	handle.Color = Color3.fromRGB(200, 180, 50)
	handle.Material = Enum.Material.Metal
	handle.Anchored = true
	handle.CanCollide = false
	handle.CFrame = CFrame.new(pos + Vector3.new(0.8, 3, d / 2 + 0.5))
	handle.Parent = model
	
	-- === FENETRES (2 de chaque cote) ===
	for side = -1, 1, 2 do
		for j = 1, 2 do
			local zOff = (j == 1) and (-d * 0.25) or (d * 0.25)
			local window = Instance.new("Part")
			window.Name = "Window"
			window.Size = Vector3.new(0.3, 2.5, 2)
			window.Color = Color3.fromRGB(150, 200, 255)
			window.Material = Enum.Material.Glass
			window.Transparency = 0.4
			window.Anchored = true
			window.CanCollide = false
			window.CFrame = CFrame.new(pos + Vector3.new(side * (w / 2 + 0.1), h * 0.55 + 0.6, zOff))
			window.Parent = model
			
			-- Cadre fenetre
			local frame = Instance.new("Part")
			frame.Name = "WindowFrame"
			frame.Size = Vector3.new(0.4, 3, 2.4)
			frame.Color = Color3.fromRGB(60, 40, 20)
			frame.Material = Enum.Material.Wood
			frame.Anchored = true
			frame.CanCollide = false
			frame.CFrame = CFrame.new(pos + Vector3.new(side * (w / 2 + 0.15), h * 0.55 + 0.6, zOff))
			frame.Parent = model
		end
	end
	
	-- === TOIT (2 pans inclines) ===
	local roofAngle = math.rad(30)
	local roofLen = (w / 2 + 1.5) / math.cos(roofAngle)
	
	for side = -1, 1, 2 do
		local roofPanel = Instance.new("Part")
		roofPanel.Name = "RoofPanel"
		roofPanel.Size = Vector3.new(roofLen, 0.5, d + 2)
		roofPanel.Color = style.roofColor
		roofPanel.Material = Enum.Material.Slate
		roofPanel.Anchored = true
		roofPanel.CanCollide = true
		local yRoof = h + 0.6 + math.sin(roofAngle) * (w / 4 + 0.75)
		local xRoof = side * math.cos(roofAngle) * (w / 4 + 0.75)
		roofPanel.CFrame = CFrame.new(pos + Vector3.new(xRoof, yRoof, 0)) * CFrame.Angles(0, 0, -side * roofAngle)
		roofPanel.Parent = model
	end
	
	-- Pignon avant (triangle simplifie avec Part)
	local gable = Instance.new("Part")
	gable.Name = "Gable"
	gable.Size = Vector3.new(w, 0.8, 0.8)
	gable.Color = style.wallColor
	gable.Material = style.material
	gable.Anchored = true
	gable.CanCollide = false
	gable.CFrame = CFrame.new(pos + Vector3.new(0, h + 0.6, d / 2))
	gable.Parent = model
	
	-- === CHEMINEE ===
	local chimney = Instance.new("Part")
	chimney.Name = "Chimney"
	chimney.Size = Vector3.new(1.5, 3, 1.5)
	chimney.Color = Color3.fromRGB(100, 70, 60)
	chimney.Material = Enum.Material.Brick
	chimney.Anchored = true
	chimney.CanCollide = false
	chimney.CFrame = CFrame.new(pos + Vector3.new(w * 0.3, h + 3, -d * 0.3))
	chimney.Parent = model
	
	-- === ACCENT DECORATIF (enseigne, lampe, etc.) ===
	-- Enseigne au-dessus de la porte
	local signBoard = Instance.new("Part")
	signBoard.Name = "SignBoard"
	signBoard.Size = Vector3.new(4, 1.5, 0.3)
	signBoard.Color = Color3.fromRGB(50, 35, 20)
	signBoard.Material = Enum.Material.Wood
	signBoard.Anchored = true
	signBoard.CanCollide = false
	signBoard.CFrame = CFrame.new(pos + Vector3.new(0, 6.5, d / 2 + 0.5))
	signBoard.Parent = model
	
	local signGui = Instance.new("SurfaceGui")
	signGui.Face = Enum.NormalId.Front
	signGui.Parent = signBoard
	local signText = Instance.new("TextLabel")
	signText.Size = UDim2.new(1, 0, 1, 0)
	signText.BackgroundTransparency = 1
	signText.Text = bData.icon or "🏗"
	signText.TextScaled = true
	signText.TextColor3 = Color3.new(1, 1, 1)
	signText.Font = Enum.Font.GothamBold
	signText.Parent = signGui
	
	-- Lampe a cote de la porte
	for side = -1, 1, 2 do
		local lamp = Instance.new("Part")
		lamp.Name = "Lamp"
		lamp.Shape = Enum.PartType.Ball
		lamp.Size = Vector3.new(0.8, 0.8, 0.8)
		lamp.Color = style.accent
		lamp.Material = Enum.Material.Neon
		lamp.Anchored = true
		lamp.CanCollide = false
		lamp.CFrame = CFrame.new(pos + Vector3.new(side * 2.2, 5.5, d / 2 + 0.5))
		lamp.Parent = model
		
		local lampLight = Instance.new("PointLight")
		lampLight.Brightness = 0.5
		lampLight.Range = 10
		lampLight.Color = style.accent
		lampLight.Parent = lamp
	end
	
	-- Sol interieur
	local floor = Instance.new("Part")
	floor.Name = "Floor"
	floor.Size = Vector3.new(w - 1, 0.2, d - 1)
	floor.Color = Color3.fromRGB(120, 90, 60)
	floor.Material = Enum.Material.WoodPlanks
	floor.Anchored = true
	floor.CanCollide = true
	floor.CFrame = CFrame.new(pos + Vector3.new(0, 0.7, 0))
	floor.Parent = model
	
	-- === BODY (pour click + billboard) - Part invisible ===
	local body = Instance.new("Part")
	body.Name = "Body"
	body.Size = Vector3.new(w, h, d)
	body.Transparency = 1
	body.Anchored = true
	body.CanCollide = false
	body.CFrame = CFrame.new(pos + Vector3.new(0, h / 2 + 0.6, 0))
	body.Parent = model
	model.PrimaryPart = body
	
	-- Billboard au-dessus du batiment
	local bb = Instance.new("BillboardGui")
	bb.Size = UDim2.new(0, 220, 0, 55)
	bb.StudsOffset = Vector3.new(0, h / 2 + 5, 0)
	bb.AlwaysOnTop = true
	bb.Parent = body
	
	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.new(1, 0, 0, 20)
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
	infoLabel.Position = UDim2.new(0, 0, 0, 22)
	infoLabel.BackgroundTransparency = 1
	infoLabel.TextColor3 = Color3.fromRGB(180, 230, 180)
	infoLabel.TextSize = 10
	infoLabel.Font = Enum.Font.Gotham
	infoLabel.Text = "Clic pour interagir"
	infoLabel.TextWrapped = true
	infoLabel.Parent = bb
	
	-- Click detector pour interactions
	local detector = Instance.new("ClickDetector")
	detector.MaxActivationDistance = 25
	detector.Parent = body
	
	-- ProximityPrompt pour acceder au batiment
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "Ouvrir " .. bData.name
	prompt.ObjectText = bData.icon .. " " .. bData.name
	prompt.KeyboardKeyCode = Enum.KeyCode.F
	prompt.MaxActivationDistance = 15
	prompt.HoldDuration = 0
	prompt.RequiresLineOfSight = false
	prompt.Parent = body
	
	local function onInteract(clickPlayer)
		if clickPlayer.UserId ~= player.UserId then
			notify(clickPlayer, "Ce batiment appartient a " .. player.Name)
			return
		end
		
		-- Ouvrir l'UI du batiment
		local openUI = remotes:FindFirstChild("OpenBuildingUI")
		if openUI then
			openUI:FireClient(clickPlayer, buildingId, level, bData)
		end
	end
	
	detector.MouseClick:Connect(onInteract)
	prompt.Triggered:Connect(onInteract)
	
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
	
	local pos = bData.position
	local lockedColor = Color3.fromRGB(50, 50, 55)
	local unlockedColor = Color3.fromRGB(140, 120, 80)
	
	-- Fondation ruinee
	local foundation = Instance.new("Part")
	foundation.Name = "Foundation"
	foundation.Size = Vector3.new(12, 0.4, 14)
	foundation.Color = isLocked and lockedColor or Color3.fromRGB(90, 80, 70)
	foundation.Material = Enum.Material.Cobblestone
	foundation.Transparency = isLocked and 0.4 or 0.1
	foundation.Anchored = true
	foundation.CanCollide = true
	foundation.CFrame = CFrame.new(pos + Vector3.new(0, 0.2, 0))
	foundation.Parent = model
	
	-- Murs ruines (2-3 bouts de murs)
	local wallPieces = {
		{size = Vector3.new(5, 3, 0.6), offset = Vector3.new(-3, 1.5, 6)},
		{size = Vector3.new(0.6, 4, 4), offset = Vector3.new(5, 2, 1)},
		{size = Vector3.new(3, 2, 0.6), offset = Vector3.new(2, 1, -6)},
	}
	for _, wp in ipairs(wallPieces) do
		local wall = Instance.new("Part")
		wall.Size = wp.size
		wall.Color = isLocked and lockedColor or unlockedColor
		wall.Material = isLocked and Enum.Material.Slate or Enum.Material.Cobblestone
		wall.Transparency = isLocked and 0.5 or 0.2
		wall.Anchored = true
		wall.CanCollide = true
		wall.CFrame = CFrame.new(pos + wp.offset + Vector3.new(0, 0.4, 0))
		wall.Parent = model
	end
	
	-- Body (invisible, pour click)
	local base = Instance.new("Part")
	base.Name = "Body"
	base.Size = Vector3.new(12, 6, 14)
	base.Transparency = 1
	base.Anchored = true
	base.CanCollide = false
	base.CFrame = CFrame.new(pos + Vector3.new(0, 3, 0))
	base.Parent = model
	model.PrimaryPart = base
	
	-- Debris decoratifs
	for i = 1, 4 do
		local debris = Instance.new("Part")
		debris.Size = Vector3.new(math.random(1, 3), math.random(1, 2), math.random(1, 3))
		debris.Color = Color3.fromRGB(90, 80, 70)
		debris.Material = Enum.Material.Cobblestone
		debris.Transparency = isLocked and 0.5 or 0.3
		debris.Anchored = true
		debris.CanCollide = false
		debris.CFrame = CFrame.new(pos + Vector3.new(math.random(-4, 4), debris.Size.Y / 2 + 0.4, math.random(-5, 5))) * CFrame.Angles(0, math.rad(math.random(0, 90)), math.rad(math.random(-15, 15)))
		debris.Parent = model
	end
	-- Billboard
	local bb = Instance.new("BillboardGui")
	bb.Size = UDim2.new(0, 220, 0, 65)
	bb.StudsOffset = Vector3.new(0, 5, 0)
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
		
		-- Donner le laser si c'est le centre de stockage
		if buildingId == "monster_storage" then
			local pData = PlayerDataService:GetData(clickPlayer)
			if pData and not pData.HasCaptureLaser then
				pData.HasCaptureLaser = true
				local laserGun = WeaponSystem.WEAPONS.LASER_GUN
				if laserGun then
					WeaponSystem:GiveWeapon(clickPlayer, laserGun)
				end
				notify(clickPlayer, "🔫 Aldric t'a donne le Laser de Capture! Appuie sur E pres d'un monstre assomme!")
			end
		end
		
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
		
		-- Donner le laser si c'est le centre de stockage
		if buildingId == "monster_storage" then
			if not data.HasCaptureLaser then
				data.HasCaptureLaser = true
				local laserGun = WeaponSystem.WEAPONS.LASER_GUN
				if laserGun then
					WeaponSystem:GiveWeapon(player, laserGun)
				end
				notify(player, "🔫 Aldric t'a donne le Laser de Capture! Appuie sur E pres d'un monstre assomme!")
			end
		end
		
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

-- === HANDLER: OpenStorageUI (envoyer liste monstres au client) ===
local openStorageRemote = remotes:WaitForChild("OpenStorageUI", 5)
if openStorageRemote then
	openStorageRemote.OnServerEvent:Connect(function(player)
		local data = PlayerDataService:GetData(player)
		if not data then return end
		
		local monsterList = {}
		for _, m in ipairs(data.Monsters or {}) do
			table.insert(monsterList, {
				UID = m.UID,
				Name = m.Name,
				Level = m.Level,
				Element = m.Element,
				Rarity = m.Rarity,
				Assignment = m.Assignment or "none",
				Stats = m.Stats or {ATK = 0, Agility = 0, Vitality = 0},
				XP = m.XP or 0,
				CurrentHP = m.CurrentHP or 100,
				MaxHP = m.MaxHP or 100,
			})
		end
		
		local updateRemote = remotes:FindFirstChild("UpdateMonsterStorage")
		if updateRemote then
			updateRemote:FireClient(player, monsterList)
		end
	end)
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
