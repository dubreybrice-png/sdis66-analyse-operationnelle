--[[
	WorldBuilder
	Crée la ville, le cristal, le PNJ au démarrage du serveur
]]

local WorldBuilder = {}

function WorldBuilder.CreateCrystal()
	print("🔵 VERSION TEST 9 - WorldBuilder.CreateCrystal() appelé!")
	local workspace = game.Workspace
	
	-- Supprimer l'ancien cristal s'il existe
	local oldCrystal = workspace:FindFirstChild("Crystal")
	if oldCrystal then oldCrystal:Destroy() end
	
	-- Base du cristal
	local base = Instance.new("Part")
	base.Name = "CrystalBase"
	base.Size = Vector3.new(12, 1, 12)
	base.Position = Vector3.new(0, 0.5, 0)
	base.Anchored = true
	base.Material = Enum.Material.Marble
	base.BrickColor = BrickColor.new("Light blue")
	base.Parent = workspace
	
	-- Cristal principal (Model)
	local crystal = Instance.new("Model")
	crystal.Name = "Crystal"
	crystal.Parent = workspace
	
	-- Corps du cristal
	local core = Instance.new("Part")
	core.Name = "Core"
	core.Size = Vector3.new(6, 12, 6)
	core.Position = Vector3.new(0, 7, 0)
	core.Anchored = true
	core.Material = Enum.Material.Neon
	core.BrickColor = BrickColor.new("Cyan")
	core.Transparency = 0.2
	core.Parent = crystal
	
	-- Pointes autour
	for i = 1, 6 do
		local angle = (i / 6) * math.pi * 2
		local spike = Instance.new("Part")
		spike.Name = "Spike" .. i
		spike.Size = Vector3.new(1.5, 8, 1.5)
		spike.CFrame = CFrame.new(
			math.cos(angle) * 4,
			6,
			math.sin(angle) * 4
		) * CFrame.Angles(math.rad(15), 0, 0)
		spike.Anchored = true
		spike.Material = Enum.Material.Glass
		spike.BrickColor = BrickColor.new("Light blue")
		spike.Transparency = 0.3
		spike.Parent = crystal
	end
	
	-- Point lumineux au sommet
	local light = Instance.new("PointLight")
	light.Brightness = 3
	light.Range = 40
	light.Color = Color3.fromRGB(100, 200, 255)
	light.Parent = core
	
	-- Animation rotation
	local rotate = Instance.new("BodyAngularVelocity")
	rotate.AngularVelocity = Vector3.new(0, 0.5, 0)
	rotate.MaxTorque = Vector3.new(0, math.huge, 0)
	rotate.Parent = core
	
	crystal.PrimaryPart = core
	
	-- Attributs
	crystal:SetAttribute("CrystalHP", 500)
	crystal:SetAttribute("MaxHP", 500)
	
	print("[WorldBuilder] Crystal created at (0, 7, 0)")
	return crystal
end

function WorldBuilder.CreateTown()
	local workspace = game.Workspace
	
	-- Supprimer ancienne ville
	local oldTown = workspace:FindFirstChild("Town")
	if oldTown then oldTown:Destroy() end
	
	local town = Instance.new("Folder")
	town.Name = "Town"
	town.Parent = workspace
	
	-- SOL PRINCIPAL (GRANDE plateforme 200x200)
	local ground = Instance.new("Part")
	ground.Name = "Ground"
	ground.Size = Vector3.new(200, 1, 200)
	ground.Position = Vector3.new(0, -0.5, 0)
	ground.Anchored = true
	ground.BrickColor = BrickColor.new("Dark green")
	ground.Material = Enum.Material.Grass
	ground.Parent = town
	
	-- Texture de sol (herbe detaillee)
	local texture = Instance.new("Texture")
	texture.Texture = "rbxasset://textures/terrain/grass.png"
	texture.StudsPerTileU = 8
	texture.StudsPerTileV = 8
	texture.Face = Enum.NormalId.Top
	texture.Parent = ground
	
	-- ÉNORME PLACE CENTRALE (4 cercles autour du cristal - radius jusqu'à 70 studs)
	-- Cercle sacré (très proche du cristal)
	for i = 1, 8 do
		local angle = (i / 8) * math.pi * 2
		local tile = Instance.new("Part")
		tile.Name = "PlazaSacred" .. i
		tile.Size = Vector3.new(10, 0.05, 10)
		tile.Position = Vector3.new(math.cos(angle) * 18, 0.03, math.sin(angle) * 18)
		tile.Anchored = true
		tile.CanCollide = false
		tile.BrickColor = BrickColor.new("Institutional white")
		tile.Material = Enum.Material.Marble
		tile.Parent = town
	end
	
	-- Cercle intérieur (marbre blanc)
	for i = 1, 16 do
		local angle = (i / 16) * math.pi * 2
		local tile = Instance.new("Part")
		tile.Name = "PlazaInner" .. i
		tile.Size = Vector3.new(9, 0.05, 9)
		tile.Position = Vector3.new(math.cos(angle) * 32, 0.03, math.sin(angle) * 32)
		tile.Anchored = true
		tile.CanCollide = false
		tile.BrickColor = BrickColor.new("White")
		tile.Material = Enum.Material.Marble
		tile.Parent = town
	end
	
	-- Cercle moyen (pierre claire)
	for i = 1, 24 do
		local angle = (i / 24) * math.pi * 2
		local tile = Instance.new("Part")
		tile.Name = "PlazaMid" .. i
		tile.Size = Vector3.new(8, 0.05, 8)
		tile.Position = Vector3.new(math.cos(angle) * 48, 0.03, math.sin(angle) * 48)
		tile.Anchored = true
		tile.CanCollide = false
		tile.BrickColor = BrickColor.new("Light stone grey")
		tile.Material = Enum.Material.Concrete
		tile.Parent = town
	end
	
	-- Cercle extérieur (brique sombre)
	for i = 1, 32 do
		local angle = (i / 32) * math.pi * 2
		local tile = Instance.new("Part")
		tile.Name = "PlazaOuter" .. i
		tile.Size = Vector3.new(7, 0.05, 7)
		tile.Position = Vector3.new(math.cos(angle) * 65, 0.03, math.sin(angle) * 65)
		tile.Anchored = true
		tile.CanCollide = false
		tile.BrickColor = BrickColor.new("Medium stone grey")
		tile.Material = Enum.Material.Brick
		tile.Parent = town
	end
	
	-- === 4 CHEMINS THÉMATIQUES ===
	
	-- CHEMIN NORD: Forêt (vert, bois)
	for i = 1, 15 do
		local path = Instance.new("Part")
		path.Size = Vector3.new(12, 0.05, 8)
		path.Position = Vector3.new(0, 0.03, -70 - i * 8)
		path.Anchored = true
		path.CanCollide = false
		path.BrickColor = BrickColor.new("Dark green")
		path.Material = Enum.Material.Grass
		path.Parent = town
		
		-- Arbres décoratifs
		if i % 3 == 0 then
			for side = -1, 1, 2 do
				local tree = Instance.new("Part")
				tree.Size = Vector3.new(3, 12, 3)
				tree.Position = Vector3.new(side * 10, 6, -70 - i * 8)
				tree.Anchored = true
				tree.BrickColor = BrickColor.new("Brown")
				tree.Material = Enum.Material.Wood
				tree.Parent = town
				
				local leaves = Instance.new("Part")
				leaves.Shape = Enum.PartType.Ball
				leaves.Size = Vector3.new(8, 8, 8)
				leaves.Position = tree.Position + Vector3.new(0, 8, 0)
				leaves.Anchored = true
				leaves.BrickColor = BrickColor.new("Earth green")
				leaves.Material = Enum.Material.Grass
				leaves.Parent = town
			end
		end
	end
	
	-- CHEMIN EST: Montagne (gris, roche)
	for i = 1, 15 do
		local path = Instance.new("Part")
		path.Size = Vector3.new(8, 0.05, 12)
		path.Position = Vector3.new(70 + i * 8, 0.03, 0)
		path.Anchored = true
		path.CanCollide = false
		path.BrickColor = BrickColor.new("Medium stone grey")
		path.Material = Enum.Material.Slate
		path.Parent = town
		
		-- Rochers
		if i % 2 == 0 then
			for side = -1, 1, 2 do
				local rock = Instance.new("Part")
				rock.Size = Vector3.new(math.random(4, 7), math.random(6, 10), math.random(4, 7))
				rock.Position = Vector3.new(70 + i * 8, rock.Size.Y/2, side * 10)
				rock.Anchored = true
				rock.BrickColor = BrickColor.new("Dark stone grey")
				rock.Material = Enum.Material.Slate
				rock.Parent = town
			end
		end
	end
	
	-- CHEMIN SUD: Mer (bleu, sable)
	for i = 1, 15 do
		local path = Instance.new("Part")
		path.Size = Vector3.new(12, 0.05, 8)
		path.Position = Vector3.new(0, 0.03, 70 + i * 8)
		path.Anchored = true
		path.CanCollide = false
		path.BrickColor = BrickColor.new("Sand blue")
		path.Material = Enum.Material.Sand
		path.Parent = town
		
		-- Eau décorative
		if i > 10 then
			for side = -1, 1, 2 do
				local water = Instance.new("Part")
				water.Size = Vector3.new(15, 1, 10)
				water.Position = Vector3.new(side * 12, 0.5, 70 + i * 8)
				water.Anchored = true
				water.BrickColor = BrickColor.new("Bright blue")
				water.Material = Enum.Material.SmoothPlastic
				water.Transparency = 0.4
				water.Parent = town
			end
		end
	end
	
	-- CHEMIN OUEST: Zone sombre enfumée (noir, brouillard)
	for i = 1, 15 do
		local path = Instance.new("Part")
		path.Size = Vector3.new(8, 0.05, 12)
		path.Position = Vector3.new(-70 - i * 8, 0.03, 0)
		path.Anchored = true
		path.CanCollide = false
		path.BrickColor = BrickColor.new("Black")
		path.Material = Enum.Material.Cobblestone
		path.Parent = town
		
		-- Particules de fumée (Parts semi-transparents)
		if i % 3 == 0 then
			for side = -1, 1, 2 do
				local smoke = Instance.new("Part")
				smoke.Size = Vector3.new(6, 8, 6)
				smoke.Position = Vector3.new(-70 - i * 8, 4, side * 8)
				smoke.Anchored = true
				smoke.BrickColor = BrickColor.new("Really black")
				smoke.Material = Enum.Material.Neon
				smoke.Transparency = 0.7
				smoke.CanCollide = false
				smoke.Parent = town
			end
		end
	end
	
	-- (Anciens batiments statiques supprimes - geres dynamiquement par BuildingSystem)
	-- (PlayerZones et DojoMarker supprimés - le Dojo est géré par DojoBuilder)
	
	print("[WorldBuilder] Large town created (200x200) with zones")
	return town
end

function WorldBuilder.CreateNPC()
	local workspace = game.Workspace
	
	-- Position à côté du cristal sur la place centrale
	local npcPos = Vector3.new(25, 1, 5)
	
	-- Model NPC
	local npc = Instance.new("Model")
	npc.Name = "GuideNPC"
	npc.Parent = workspace
	
	-- Torse
	local torso = Instance.new("Part")
	torso.Name = "Torso"
	torso.Size = Vector3.new(2, 2, 1)
	torso.Position = npcPos + Vector3.new(0, 3, 0)
	torso.Anchored = true
	torso.BrickColor = BrickColor.new("Bright blue")
	torso.Parent = npc
	
	-- Tête
	local head = Instance.new("Part")
	head.Name = "Head"
	head.Size = Vector3.new(2, 1, 1)
	head.Position = torso.Position + Vector3.new(0, 1.5, 0)
	head.Anchored = true
	head.BrickColor = BrickColor.new("Light orange")
	head.Parent = npc
	
	-- Visage
	local face = Instance.new("Decal")
	face.Texture = "rbxasset://textures/face.png"
	face.Face = Enum.NormalId.Front
	face.Parent = head
	
	-- Jambes
	for i = -1, 1, 2 do
		local leg = Instance.new("Part")
		leg.Name = "Leg"
		leg.Size = Vector3.new(1, 2, 1)
		leg.Position = torso.Position + Vector3.new(i * 0.5, -2, 0)
		leg.Anchored = true
		leg.BrickColor = BrickColor.new("Dark green")
		leg.Parent = npc
	end
	
	-- Bras
	for i = -1, 1, 2 do
		local arm = Instance.new("Part")
		arm.Name = "Arm"
		arm.Size = Vector3.new(1, 2, 1)
		arm.Position = torso.Position + Vector3.new(i * 1.5, 0, 0)
		arm.Anchored = true
		arm.BrickColor = BrickColor.new("Light orange")
		arm.Parent = npc
	end
	
	npc.PrimaryPart = torso
	
	-- Billboard au-dessus de la tête
	local billboard = Instance.new("BillboardGui")
	billboard.Size = UDim2.fromOffset(200, 50)
	billboard.StudsOffset = Vector3.new(0, 3, 0)
	billboard.AlwaysOnTop = true
	billboard.Parent = head
	
	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.new(1, 0, 1, 0)
	nameLabel.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
	nameLabel.BackgroundTransparency = 0.5
	nameLabel.Text = "💬 Guide Aldric"
	nameLabel.TextScaled = true
	nameLabel.TextColor3 = Color3.new(1, 1, 1)
	nameLabel.Font = Enum.Font.GothamBold
	nameLabel.Parent = billboard
	
	-- Interaction zone (ClickDetector)
	local detector = Instance.new("ClickDetector")
	detector.MaxActivationDistance = 25 -- Distance augmentée
	detector.CursorIcon = "rbxasset://textures/GunCursor.png"
	detector.Parent = torso
	
	-- Proximity prompt (alternative moderne)
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "Parler"
	prompt.ObjectText = "Guide Aldric"
	prompt.KeyboardKeyCode = Enum.KeyCode.F
	prompt.MaxActivationDistance = 20 -- Distance augmentée
	prompt.HoldDuration = 0
	prompt.RequiresLineOfSight = false
	prompt.Parent = torso
	
	-- Attribut pour identifier le NPC
	npc:SetAttribute("NPCType", "Guide")
	
	print("[WorldBuilder] NPC created at", npcPos)
	return npc, detector, prompt
end

function WorldBuilder.CreateSpawnPoints()
	local workspace = game.Workspace
	
	-- Supprimer anciens spawns
	local oldSpawns = workspace:FindFirstChild("WildSpawnPoints")
	if oldSpawns then oldSpawns:Destroy() end
	
	local folder = Instance.new("Folder")
	folder.Name = "WildSpawnPoints"
	folder.Parent = workspace
	
	-- 4 SPAWN POINTS aux 4 chemins (LOIN de la ville)
	local spawnData = {
		{name = "SP_Foret", pos = Vector3.new(0, 0.5, -190), color = "Earth green"},
		{name = "SP_Montagne", pos = Vector3.new(190, 0.5, 0), color = "Medium stone grey"},
		{name = "SP_Mer", pos = Vector3.new(0, 0.5, 190), color = "Bright blue"},
		{name = "SP_Sombre", pos = Vector3.new(-190, 0.5, 0), color = "Really black"}
	}
	
	for _, data in ipairs(spawnData) do
		local sp = Instance.new("Part")
		sp.Name = data.name
		sp.Size = Vector3.new(8, 1, 8)
		sp.Position = data.pos
		sp.Anchored = true
		sp.CanCollide = false
		sp.Transparency = 0.6
		sp.BrickColor = BrickColor.new(data.color)
		sp.Material = Enum.Material.Neon
		sp.Parent = folder
		
		-- Marqueur visuel (colonne de lumière)
		local beacon = Instance.new("Part")
		beacon.Size = Vector3.new(1, 25, 1)
		beacon.Position = data.pos + Vector3.new(0, 12.5, 0)
		beacon.Anchored = true
		beacon.CanCollide = false
		beacon.Transparency = 0.8
		beacon.BrickColor = BrickColor.new(data.color)
		beacon.Material = Enum.Material.Neon
		beacon.Parent = folder
	end
	
	print("[WorldBuilder] 4 spawn points created (Forest, Mountain, Sea, Dark)")
	return folder
end

function WorldBuilder.CreatePlayerSpawn()
	local workspace = game.Workspace
	
	-- Supprimer ancien spawn ET TOUS les SpawnLocation
	for _, obj in pairs(workspace:GetDescendants()) do
		if obj:IsA("SpawnLocation") then
			obj:Destroy()
			print("[WorldBuilder] SpawnLocation supprimé:", obj.Name)
		end
	end
	
	-- Simple Part invisible pour le spawn (pas de SpawnLocation!)
	local spawn = Instance.new("Part")
	spawn.Name = "PlayerSpawn"
	spawn.Size = Vector3.new(15, 1, 15)
	spawn.Position = Vector3.new(0, 0.5, -85)
	spawn.Anchored = true
	spawn.CanCollide = false
	spawn.Transparency = 0.8
	spawn.BrickColor = BrickColor.new("Bright green")
	spawn.Material = Enum.Material.Grass
	spawn.Parent = workspace
	
	print("[WorldBuilder] Player spawn created at (0, 0, -85) - NO RESPAWN")
	return spawn
end

-- === HALL DES CLASSES (niveau 10) ===
function WorldBuilder.CreateClassHall()
	local workspace = game.Workspace
	
	-- Position: Sud-Est de la ville
	local hallPos = Vector3.new(120, 0, 120)
	
	local hall = Instance.new("Model")
	hall.Name = "ClassHall"
	
	-- Sol du hall
	local floor = Instance.new("Part")
	floor.Name = "Floor"
	floor.Size = Vector3.new(50, 1, 40)
	floor.Position = hallPos + Vector3.new(0, 0.5, 0)
	floor.Anchored = true
	floor.BrickColor = BrickColor.new("Reddish brown")
	floor.Material = Enum.Material.Marble
	floor.Parent = hall
	
	-- Murs
	local wallData = {
		{size = Vector3.new(50, 15, 2), offset = Vector3.new(0, 8, -19)},   -- Mur fond
		{size = Vector3.new(2, 15, 40), offset = Vector3.new(-24, 8, 0)},    -- Mur gauche
		{size = Vector3.new(2, 15, 40), offset = Vector3.new(24, 8, 0)},     -- Mur droite
	}
	
	for i, wd in ipairs(wallData) do
		local wall = Instance.new("Part")
		wall.Name = "Wall_" .. i
		wall.Size = wd.size
		wall.Position = hallPos + wd.offset
		wall.Anchored = true
		wall.BrickColor = BrickColor.new("Sand red")
		wall.Material = Enum.Material.Brick
		wall.Parent = hall
	end
	
	-- Toit
	local roof = Instance.new("Part")
	roof.Name = "Roof"
	roof.Size = Vector3.new(54, 2, 44)
	roof.Position = hallPos + Vector3.new(0, 16, 0)
	roof.Anchored = true
	roof.BrickColor = BrickColor.new("Dark red")
	roof.Material = Enum.Material.Slate
	roof.Parent = hall
	
	-- Colonnes devant (style temple)
	for i = -1, 1, 1 do
		local col = Instance.new("Part")
		col.Name = "Column_" .. i
		col.Size = Vector3.new(3, 14, 3)
		col.Position = hallPos + Vector3.new(i * 12, 8, 18)
		col.Anchored = true
		col.BrickColor = BrickColor.new("Institutional white")
		col.Material = Enum.Material.Marble
		col.Parent = hall
	end
	
	-- Pancarte principale
	local mainSign = Instance.new("Part")
	mainSign.Name = "MainSign"
	mainSign.Size = Vector3.new(30, 6, 1)
	mainSign.Position = hallPos + Vector3.new(0, 18, 18)
	mainSign.Anchored = true
	mainSign.BrickColor = BrickColor.new("Dark stone grey")
	mainSign.Material = Enum.Material.SmoothPlastic
	mainSign.Parent = hall
	
	local signGui = Instance.new("SurfaceGui")
	signGui.Face = Enum.NormalId.Front
	signGui.Parent = mainSign
	local signLabel = Instance.new("TextLabel")
	signLabel.Size = UDim2.new(1, 0, 1, 0)
	signLabel.BackgroundTransparency = 1
	signLabel.Text = "HALL DES CLASSES\n(Niveau 10 requis)"
	signLabel.TextScaled = true
	signLabel.TextColor3 = Color3.fromRGB(255, 220, 100)
	signLabel.Font = Enum.Font.GothamBold
	signLabel.Parent = signGui
	
	-- 4 podiums pour les 4 classes
	local classes = {
		{name = "Guerrier", color = Color3.fromRGB(200, 50, 50), emoji = "⚔️", offset = Vector3.new(-15, 0, -5)},
		{name = "Archer", color = Color3.fromRGB(50, 200, 50), emoji = "🏹", offset = Vector3.new(-5, 0, -5)},
		{name = "Mage", color = Color3.fromRGB(100, 50, 200), emoji = "🔮", offset = Vector3.new(5, 0, -5)},
		{name = "Acolyte", color = Color3.fromRGB(255, 220, 50), emoji = "✨", offset = Vector3.new(15, 0, -5)},
	}
	
	for _, cls in ipairs(classes) do
		-- Podium
		local podium = Instance.new("Part")
		podium.Name = "Podium_" .. cls.name
		podium.Size = Vector3.new(8, 3, 8)
		podium.Position = hallPos + cls.offset + Vector3.new(0, 2, 0)
		podium.Anchored = true
		podium.Color = cls.color
		podium.Material = Enum.Material.Marble
		podium.Parent = hall
		
		-- Mannequin/statue sur le podium
		local statue = Instance.new("Part")
		statue.Name = "Statue_" .. cls.name
		statue.Size = Vector3.new(2, 5, 2)
		statue.Position = hallPos + cls.offset + Vector3.new(0, 6, 0)
		statue.Anchored = true
		statue.Color = cls.color
		statue.Material = Enum.Material.Neon
		statue.Transparency = 0.3
		statue.Parent = hall
		
		-- Pancarte classe
		local classBillboard = Instance.new("BillboardGui")
		classBillboard.Size = UDim2.new(0, 120, 0, 50)
		classBillboard.StudsOffset = Vector3.new(0, 5, 0)
		classBillboard.AlwaysOnTop = false
		classBillboard.Parent = statue
		
		local classLabel = Instance.new("TextLabel")
		classLabel.Size = UDim2.new(1, 0, 1, 0)
		classLabel.BackgroundColor3 = Color3.new(0, 0, 0)
		classLabel.BackgroundTransparency = 0.4
		classLabel.Text = cls.emoji .. " " .. cls.name
		classLabel.TextScaled = true
		classLabel.TextColor3 = Color3.new(1, 1, 1)
		classLabel.Font = Enum.Font.GothamBold
		classLabel.Parent = classBillboard
		
		-- ProximityPrompt pour choisir la classe
		local classPrompt = Instance.new("ProximityPrompt")
		classPrompt.ActionText = "Choisir " .. cls.name
		classPrompt.ObjectText = cls.name
		classPrompt.KeyboardKeyCode = Enum.KeyCode.F
		classPrompt.MaxActivationDistance = 8
		classPrompt.HoldDuration = 1.5 -- 1.5 sec pour confirmer
		classPrompt.RequiresLineOfSight = false
		classPrompt.Parent = podium
		
		-- Tag pour identifier la classe
		podium:SetAttribute("ClassName", cls.name)
	end
	
	hall.Parent = workspace
	print("[WorldBuilder] Class Hall created at", hallPos, "with 4 class podiums")
	return hall
end

-- === AMELIORATION GRAPHIQUE: ECLAIRAGE ===
function WorldBuilder.SetupLighting()
	local Lighting = game:GetService("Lighting")
	
	-- Atmosphere (brume, couleurs)
	local atmo = Lighting:FindFirstChildOfClass("Atmosphere")
	if not atmo then
		atmo = Instance.new("Atmosphere")
		atmo.Parent = Lighting
	end
	atmo.Density = 0.25
	atmo.Offset = 0.1
	atmo.Color = Color3.fromRGB(180, 200, 230)
	atmo.Decay = Color3.fromRGB(130, 150, 180)
	atmo.Glare = 0
	atmo.Haze = 1.5
	
	-- Bloom
	local bloom = Lighting:FindFirstChild("Bloom")
	if not bloom then
		bloom = Instance.new("BloomEffect")
		bloom.Name = "Bloom"
		bloom.Parent = Lighting
	end
	bloom.Intensity = 0.15
	bloom.Size = 20
	bloom.Threshold = 1.2
	
	-- ColorCorrection
	local cc = Lighting:FindFirstChild("ColorCorrection")
	if not cc then
		cc = Instance.new("ColorCorrectionEffect")
		cc.Name = "ColorCorrection"
		cc.Parent = Lighting
	end
	cc.Brightness = 0.02
	cc.Contrast = 0.08
	cc.Saturation = 0.15
	cc.TintColor = Color3.fromRGB(255, 250, 245)
	
	-- SunRays
	local rays = Lighting:FindFirstChild("SunRays")
	if not rays then
		rays = Instance.new("SunRaysEffect")
		rays.Name = "SunRays"
		rays.Parent = Lighting
	end
	rays.Intensity = 0.04
	rays.Spread = 0.6
	
	-- Lighting properties
	Lighting.Ambient = Color3.fromRGB(60, 65, 80)
	Lighting.OutdoorAmbient = Color3.fromRGB(90, 100, 120)
	Lighting.Brightness = 2.2
	Lighting.ClockTime = 14
	Lighting.GeographicLatitude = 35
	Lighting.EnvironmentDiffuseScale = 0.6
	Lighting.EnvironmentSpecularScale = 0.4
	Lighting.GlobalShadows = true
	Lighting.ShadowSoftness = 0.2
	Lighting.ExposureCompensation = 0.1
	
	-- Sky (ciel realiste)
	local sky = Lighting:FindFirstChildOfClass("Sky")
	if not sky then
		sky = Instance.new("Sky")
		sky.Parent = Lighting
	end
	sky.CelestialBodiesShown = true
	sky.StarCount = 3000
	sky.MoonAngularSize = 11
	sky.SunAngularSize = 21
	-- Skybox textures (Roblox free blue sky)
	sky.SkyboxBk = "rbxassetid://6444884337"
	sky.SkyboxDn = "rbxassetid://6444884785"
	sky.SkyboxFt = "rbxassetid://6444884337"
	sky.SkyboxLf = "rbxassetid://6444884337"
	sky.SkyboxRt = "rbxassetid://6444884337"
	sky.SkyboxUp = "rbxassetid://6444885122"
	
	-- DepthOfField (flou de profondeur subtil)
	local dof = Lighting:FindFirstChild("DepthOfField")
	if not dof then
		dof = Instance.new("DepthOfFieldEffect")
		dof.Name = "DepthOfField"
		dof.Parent = Lighting
	end
	dof.FarIntensity = 0.1
	dof.FocusDistance = 50
	dof.InFocusRadius = 30
	dof.NearIntensity = 0
	
	print("[WorldBuilder] Lighting setup complete! (Sky + Atmosphere + Bloom + SunRays + DOF)")
end

return WorldBuilder
