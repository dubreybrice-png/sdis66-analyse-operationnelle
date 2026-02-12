--[[
	BuildingUI V23 - UI fonctionnelle pour chaque batiment
	- Centre de Stockage: voir monstres, assigner (defense/mine/stockage)
	- Mine d'Or: voir rendement, slots
	- Hall des Classes: info
	- Bureau des Defenses: stats cristal
	- Banque: depot/retrait
	- Armurerie: forge/laser info
	- Ecole des Monstres: skills
	- Centre d'Entrainement: training slots
	- Chaque batiment: bouton upgrade
]]

print("[BuildingUI V23] Loading...")

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui", 10)
if not playerGui then return end

local remotes = ReplicatedStorage:WaitForChild("Remotes", 10)

-- === SCREEN GUI ===
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "BuildingUI_V23"
screenGui.ResetOnSpawn = false
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 10
screenGui.Parent = playerGui

-- === MAIN BUILDING PANEL ===
local buildingPanel = Instance.new("Frame")
buildingPanel.Name = "BuildingPanel"
buildingPanel.Size = UDim2.new(0, 420, 0, 380)
buildingPanel.Position = UDim2.new(0.5, -210, 0.5, -190)
buildingPanel.BackgroundColor3 = Color3.fromRGB(15, 15, 25)
buildingPanel.BackgroundTransparency = 0.05
buildingPanel.BorderSizePixel = 0
buildingPanel.Visible = false
buildingPanel.Parent = screenGui
Instance.new("UICorner", buildingPanel).CornerRadius = UDim.new(0, 12)
local panelStroke = Instance.new("UIStroke")
panelStroke.Color = Color3.fromRGB(100, 150, 255)
panelStroke.Thickness = 2
panelStroke.Parent = buildingPanel

-- Title bar
local titleBar = Instance.new("Frame")
titleBar.Size = UDim2.new(1, 0, 0, 36)
titleBar.BackgroundColor3 = Color3.fromRGB(25, 30, 50)
titleBar.BorderSizePixel = 0
titleBar.Parent = buildingPanel
Instance.new("UICorner", titleBar).CornerRadius = UDim.new(0, 12)

local titleLabel = Instance.new("TextLabel")
titleLabel.Size = UDim2.new(1, -50, 1, 0)
titleLabel.Position = UDim2.new(0, 10, 0, 0)
titleLabel.BackgroundTransparency = 1
titleLabel.TextColor3 = Color3.fromRGB(255, 220, 100)
titleLabel.TextSize = 16
titleLabel.Font = Enum.Font.GothamBold
titleLabel.TextXAlignment = Enum.TextXAlignment.Left
titleLabel.Text = "📦 Batiment"
titleLabel.Parent = titleBar

-- Close button
local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.new(0, 30, 0, 30)
closeBtn.Position = UDim2.new(1, -35, 0, 3)
closeBtn.BackgroundColor3 = Color3.fromRGB(180, 50, 50)
closeBtn.TextColor3 = Color3.new(1, 1, 1)
closeBtn.TextSize = 16
closeBtn.Font = Enum.Font.GothamBold
closeBtn.Text = "X"
closeBtn.Parent = titleBar
Instance.new("UICorner", closeBtn).CornerRadius = UDim.new(0, 6)

closeBtn.MouseButton1Click:Connect(function()
	buildingPanel.Visible = false
end)

-- Content area
local contentFrame = Instance.new("ScrollingFrame")
contentFrame.Name = "Content"
contentFrame.Size = UDim2.new(1, -20, 1, -90)
contentFrame.Position = UDim2.new(0, 10, 0, 40)
contentFrame.BackgroundTransparency = 1
contentFrame.BorderSizePixel = 0
contentFrame.ScrollBarThickness = 4
contentFrame.ScrollBarImageColor3 = Color3.fromRGB(100, 100, 150)
contentFrame.CanvasSize = UDim2.new(0, 0, 0, 600)
contentFrame.Parent = buildingPanel

local contentLayout = Instance.new("UIListLayout")
contentLayout.SortOrder = Enum.SortOrder.LayoutOrder
contentLayout.Padding = UDim.new(0, 6)
contentLayout.Parent = contentFrame

-- Upgrade button (at bottom)
local upgradeBtn = Instance.new("TextButton")
upgradeBtn.Name = "UpgradeBtn"
upgradeBtn.Size = UDim2.new(1, -20, 0, 36)
upgradeBtn.Position = UDim2.new(0, 10, 1, -42)
upgradeBtn.BackgroundColor3 = Color3.fromRGB(50, 150, 50)
upgradeBtn.TextColor3 = Color3.new(1, 1, 1)
upgradeBtn.TextSize = 14
upgradeBtn.Font = Enum.Font.GothamBold
upgradeBtn.Text = "⬆ AMELIORER"
upgradeBtn.Parent = buildingPanel
Instance.new("UICorner", upgradeBtn).CornerRadius = UDim.new(0, 8)

-- === HELPER: Create info row ===
local function createInfoRow(parent, text, color, order)
	local row = Instance.new("TextLabel")
	row.Size = UDim2.new(1, 0, 0, 20)
	row.BackgroundTransparency = 1
	row.TextColor3 = color or Color3.fromRGB(200, 200, 200)
	row.TextSize = 12
	row.Font = Enum.Font.Gotham
	row.TextXAlignment = Enum.TextXAlignment.Left
	row.TextWrapped = true
	row.Text = text
	row.LayoutOrder = order or 0
	row.Parent = parent
	return row
end

-- === HELPER: Create monster slot row (for storage UI) ===
local function createMonsterSlotRow(parent, monsterData, order, assignCallback)
	local row = Instance.new("Frame")
	row.Size = UDim2.new(1, 0, 0, 50)
	row.BackgroundColor3 = Color3.fromRGB(30, 30, 45)
	row.BorderSizePixel = 0
	row.LayoutOrder = order
	row.Parent = parent
	Instance.new("UICorner", row).CornerRadius = UDim.new(0, 6)
	
	-- Monster name + info
	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.new(0.5, 0, 0, 18)
	nameLabel.Position = UDim2.new(0, 8, 0, 4)
	nameLabel.BackgroundTransparency = 1
	nameLabel.TextColor3 = Color3.fromRGB(255, 200, 100)
	nameLabel.TextSize = 11
	nameLabel.Font = Enum.Font.GothamBold
	nameLabel.TextXAlignment = Enum.TextXAlignment.Left
	nameLabel.Text = (monsterData.Name or "?") .. " Nv." .. (monsterData.Level or 1)
	nameLabel.Parent = row
	
	local infoLabel = Instance.new("TextLabel")
	infoLabel.Size = UDim2.new(0.5, 0, 0, 14)
	infoLabel.Position = UDim2.new(0, 8, 0, 22)
	infoLabel.BackgroundTransparency = 1
	infoLabel.TextColor3 = Color3.fromRGB(150, 150, 150)
	infoLabel.TextSize = 9
	infoLabel.Font = Enum.Font.Gotham
	infoLabel.TextXAlignment = Enum.TextXAlignment.Left
	infoLabel.Text = (monsterData.Element or "?") .. " | " .. (monsterData.Rarity or "?") .. " | " .. (monsterData.Assignment or "libre")
	infoLabel.Parent = row
	
	local statsLabel = Instance.new("TextLabel")
	statsLabel.Size = UDim2.new(0.5, 0, 0, 14)
	statsLabel.Position = UDim2.new(0, 8, 0, 35)
	statsLabel.BackgroundTransparency = 1
	statsLabel.TextColor3 = Color3.fromRGB(120, 180, 255)
	statsLabel.TextSize = 9
	statsLabel.Font = Enum.Font.Gotham
	statsLabel.TextXAlignment = Enum.TextXAlignment.Left
	local s = monsterData.Stats or {}
	statsLabel.Text = "ATK:" .. (s.ATK or 0) .. " AGI:" .. (s.Agility or 0) .. " VIT:" .. (s.Vitality or 0)
	statsLabel.Parent = row
	
	-- Assignment buttons
	local assignments = {
		{name = "⚔ Def", assignment = "defense", color = Color3.fromRGB(180, 60, 60)},
		{name = "⛏ Mine", assignment = "mine", color = Color3.fromRGB(200, 170, 50)},
		{name = "📦 Stock", assignment = "none", color = Color3.fromRGB(80, 80, 120)},
	}
	
	for i, a in ipairs(assignments) do
		local btn = Instance.new("TextButton")
		btn.Size = UDim2.new(0, 48, 0, 18)
		btn.Position = UDim2.new(0.52, (i-1) * 52, 0, 4 + (i > 2 and 20 or 0))
		if i == 2 then btn.Position = UDim2.new(0.52, 52, 0, 4) end
		if i == 3 then btn.Position = UDim2.new(0.52, 0, 0, 26) end
		btn.BackgroundColor3 = (monsterData.Assignment == a.assignment) and a.color or Color3.fromRGB(50, 50, 65)
		btn.TextColor3 = Color3.new(1, 1, 1)
		btn.TextSize = 9
		btn.Font = Enum.Font.GothamBold
		btn.Text = a.name
		btn.Parent = row
		Instance.new("UICorner", btn).CornerRadius = UDim.new(0, 4)
		
		btn.MouseButton1Click:Connect(function()
			if assignCallback then
				assignCallback(monsterData.UID, a.assignment)
			end
		end)
	end
	
	return row
end

-- === CURRENT BUILDING STATE ===
local currentBuildingId = nil
local currentBuildingLevel = 0

-- === OPEN BUILDING UI ===
local function openBuildingUI(buildingId, level, bData)
	currentBuildingId = buildingId
	currentBuildingLevel = level
	
	-- Clear content
	for _, child in ipairs(contentFrame:GetChildren()) do
		if not child:IsA("UIListLayout") then
			child:Destroy()
		end
	end
	
	-- Title
	titleLabel.Text = (bData.icon or "🏗") .. " " .. (bData.name or buildingId) .. " Nv." .. level
	
	-- Description
	createInfoRow(contentFrame, bData.desc or "", Color3.fromRGB(180, 180, 180), 1)
	
	-- Separator
	local sep = Instance.new("Frame")
	sep.Size = UDim2.new(1, 0, 0, 1)
	sep.BackgroundColor3 = Color3.fromRGB(60, 60, 80)
	sep.BorderSizePixel = 0
	sep.LayoutOrder = 2
	sep.Parent = contentFrame
	
	-- === BUILDING-SPECIFIC CONTENT ===
	
	if buildingId == "monster_storage" then
		-- CENTRE DE STOCKAGE: liste des monstres, assigner
		createInfoRow(contentFrame, "🐾 Tes monstres captures:", Color3.fromRGB(200, 150, 255), 3)
		
		local monsterCount = player:GetAttribute("MonsterCount") or 0
		local capacity = player:GetAttribute("StorageCapacity") or 5
		createInfoRow(contentFrame, "Capacite: " .. monsterCount .. "/" .. capacity .. " (+" .. (level * 3) .. " avec Nv." .. level .. ")", Color3.fromRGB(100, 200, 100), 4)
		
		-- Hint
		createInfoRow(contentFrame, "Assigne tes monstres: Defense (protege cristal), Mine (genere or), ou Stockage (repos)", Color3.fromRGB(150, 150, 100), 5)
		
		-- Request monster list from server
		local storageRemote = remotes:FindFirstChild("UpdateMonsterStorage")
		local openStorage = remotes:FindFirstChild("OpenStorageUI")
		if openStorage then
			openStorage:FireServer()
		end
		
		-- We'll create placeholder for now and update on remote callback
		local monsterListFrame = Instance.new("Frame")
		monsterListFrame.Name = "MonsterList"
		monsterListFrame.Size = UDim2.new(1, 0, 0, 300)
		monsterListFrame.BackgroundTransparency = 1
		monsterListFrame.LayoutOrder = 10
		monsterListFrame.Parent = contentFrame
		
		local mlLayout = Instance.new("UIListLayout")
		mlLayout.SortOrder = Enum.SortOrder.LayoutOrder
		mlLayout.Padding = UDim.new(0, 4)
		mlLayout.Parent = monsterListFrame
		
		-- Listen for monster data
		if storageRemote then
			local conn
			conn = storageRemote.OnClientEvent:Connect(function(monsters)
				if not buildingPanel.Visible or currentBuildingId ~= "monster_storage" then
					conn:Disconnect()
					return
				end
				-- Clear old
				for _, c in ipairs(monsterListFrame:GetChildren()) do
					if not c:IsA("UIListLayout") then c:Destroy() end
				end
				
				if #monsters == 0 then
					createInfoRow(monsterListFrame, "Aucun monstre capture! Assomme un monstre et appuie E.", Color3.fromRGB(200, 100, 100), 1)
				else
					for idx, m in ipairs(monsters) do
						createMonsterSlotRow(monsterListFrame, m, idx, function(uid, assignment)
							local assignRemote = remotes:FindFirstChild("AssignMonster")
							if assignRemote then
								assignRemote:FireServer(uid, assignment)
								-- Refresh after short delay
								task.delay(0.5, function()
									if openStorage then openStorage:FireServer() end
								end)
							end
						end)
					end
				end
				
				-- Auto-resize
				local totalHeight = #monsters * 54 + 20
				monsterListFrame.Size = UDim2.new(1, 0, 0, math.max(totalHeight, 60))
				contentFrame.CanvasSize = UDim2.new(0, 0, 0, 200 + totalHeight)
			end)
		end
		
	elseif buildingId == "gold_mine" then
		-- MINE D'OR: rendement popup
		local baseGold = 5
		local perLevel = 3
		local goldPerMin = baseGold + perLevel * level
		local mineSlots = 1 + math.floor(level / 1)
		
		createInfoRow(contentFrame, "⛏️ RENDEMENT DE LA MINE", Color3.fromRGB(255, 215, 50), 3)
		createInfoRow(contentFrame, "Or par minute par monstre: " .. goldPerMin .. "g/min", Color3.fromRGB(255, 230, 100), 4)
		createInfoRow(contentFrame, "Slots de mine: " .. mineSlots, Color3.fromRGB(200, 200, 100), 5)
		createInfoRow(contentFrame, "Rendement total max: " .. (goldPerMin * mineSlots) .. "g/min", Color3.fromRGB(100, 255, 100), 6)
		createInfoRow(contentFrame, "", Color3.fromRGB(150, 150, 150), 7)
		createInfoRow(contentFrame, "📌 Assigne des monstres a la mine depuis le Centre de Stockage!", Color3.fromRGB(180, 150, 100), 8)
		createInfoRow(contentFrame, "Les monstres de type Sol donnent +20% de bonus!", Color3.fromRGB(160, 130, 80), 9)
		
		contentFrame.CanvasSize = UDim2.new(0, 0, 0, 300)
		
	elseif buildingId == "class_hall" then
		-- HALL DES CLASSES
		local currentClass = player:GetAttribute("CurrentClass") or "Novice"
		local playerLevel = player:GetAttribute("PlayerLevel") or 1
		
		createInfoRow(contentFrame, "🏛️ CLASSES DISPONIBLES", Color3.fromRGB(200, 180, 255), 3)
		createInfoRow(contentFrame, "Ta classe actuelle: " .. currentClass, Color3.fromRGB(100, 200, 255), 4)
		createInfoRow(contentFrame, "Niveau requis: 10 (tu es Nv." .. playerLevel .. ")", Color3.fromRGB(180, 180, 180), 5)
		createInfoRow(contentFrame, "", Color3.fromRGB(150, 150, 150), 6)
		createInfoRow(contentFrame, "⚔️ Guerrier: +ATK, tanky, epee lourde", Color3.fromRGB(200, 80, 80), 7)
		createInfoRow(contentFrame, "🏹 Archer: +AGI, rapide, tir a distance", Color3.fromRGB(80, 200, 80), 8)
		createInfoRow(contentFrame, "🔮 Mage: +dmg zone, sorts elementaires", Color3.fromRGB(120, 80, 220), 9)
		createInfoRow(contentFrame, "✨ Acolyte: heal, support, buffs equipe", Color3.fromRGB(255, 220, 80), 10)
		createInfoRow(contentFrame, "", Color3.fromRGB(150, 150, 150), 11)
		createInfoRow(contentFrame, "Va au Hall des Classes (sud-est) pour choisir!", Color3.fromRGB(150, 150, 150), 12)
		
		contentFrame.CanvasSize = UDim2.new(0, 0, 0, 350)
		
	elseif buildingId == "defense_bureau" then
		-- BUREAU DES DEFENSES
		local crystalHP = 500 + (level * 200)
		local defSlots = 2 + level
		
		createInfoRow(contentFrame, "🛡️ STATISTIQUES DE DEFENSE", Color3.fromRGB(100, 200, 255), 3)
		createInfoRow(contentFrame, "HP Cristal bonus: +" .. (level * 200), Color3.fromRGB(100, 255, 150), 4)
		createInfoRow(contentFrame, "Slots defense monstres: " .. defSlots, Color3.fromRGB(200, 150, 100), 5)
		createInfoRow(contentFrame, "Regen cristal bonus: +" .. string.format("%.1f", level * 0.2) .. "%", Color3.fromRGB(150, 200, 150), 6)
		createInfoRow(contentFrame, "", Color3.fromRGB(150, 150, 150), 7)
		createInfoRow(contentFrame, "📌 Ameliore pour plus de HP cristal et slots defense!", Color3.fromRGB(180, 150, 100), 8)
		
		contentFrame.CanvasSize = UDim2.new(0, 0, 0, 280)
		
	elseif buildingId == "bank" then
		-- BANQUE
		local goldW = player:GetAttribute("GoldWallet") or 0
		local goldB = player:GetAttribute("GoldBank") or 0
		local maxProtected = 500 + (level * 500)
		
		createInfoRow(contentFrame, "🏦 BANQUE - Coffre Fort", Color3.fromRGB(255, 215, 50), 3)
		createInfoRow(contentFrame, "Or en poche: " .. goldW .. "g", Color3.fromRGB(255, 230, 100), 4)
		createInfoRow(contentFrame, "Or en banque: " .. goldB .. "/" .. maxProtected .. "g", Color3.fromRGB(100, 255, 100), 5)
		createInfoRow(contentFrame, "", Color3.fromRGB(150, 150, 150), 6)
		
		-- Deposit buttons
		local depositAmounts = {50, 100, 500, "MAX"}
		for i, amount in ipairs(depositAmounts) do
			local depBtn = Instance.new("TextButton")
			depBtn.Size = UDim2.new(0, 80, 0, 28)
			depBtn.BackgroundColor3 = Color3.fromRGB(50, 120, 50)
			depBtn.TextColor3 = Color3.new(1, 1, 1)
			depBtn.TextSize = 11
			depBtn.Font = Enum.Font.GothamBold
			depBtn.Text = "Deposer " .. tostring(amount) .. "g"
			depBtn.LayoutOrder = 7 + i
			depBtn.Parent = contentFrame
			Instance.new("UICorner", depBtn).CornerRadius = UDim.new(0, 6)
			
			depBtn.MouseButton1Click:Connect(function()
				local depositRemote = remotes:FindFirstChild("DepositGold")
				if depositRemote then
					local amtToSend = amount == "MAX" and 999999 or amount
					depositRemote:FireServer(amtToSend)
				end
			end)
		end
		
		createInfoRow(contentFrame, "", Color3.fromRGB(150, 150, 150), 12)
		createInfoRow(contentFrame, "L'or en banque est protege a la destruction du cristal!", Color3.fromRGB(180, 150, 100), 13)
		
		contentFrame.CanvasSize = UDim2.new(0, 0, 0, 350)
		
	elseif buildingId == "armory" then
		-- ARMURERIE
		createInfoRow(contentFrame, "⚔️ ARMURERIE", Color3.fromRGB(200, 100, 50), 3)
		createInfoRow(contentFrame, "Forge: Tier " .. level, Color3.fromRGB(255, 150, 50), 4)
		createInfoRow(contentFrame, "Vitesse Laser: +" .. string.format("%.0f", level * 10) .. "%", Color3.fromRGB(100, 255, 200), 5)
		createInfoRow(contentFrame, "Chance Capture: +" .. string.format("%.0f", level * 2) .. "%", Color3.fromRGB(100, 200, 255), 6)
		createInfoRow(contentFrame, "Chance Relance: +" .. string.format("%.0f", level * 3) .. "%", Color3.fromRGB(200, 150, 255), 7)
		createInfoRow(contentFrame, "", Color3.fromRGB(150, 150, 150), 8)
		createInfoRow(contentFrame, "📌 Ameliore pour de meilleures chances de capture!", Color3.fromRGB(180, 150, 100), 9)
		
		contentFrame.CanvasSize = UDim2.new(0, 0, 0, 280)
		
	elseif buildingId == "monster_school" then
		-- ECOLE DES MONSTRES
		createInfoRow(contentFrame, "📚 ECOLE DES MONSTRES", Color3.fromRGB(150, 100, 255), 3)
		createInfoRow(contentFrame, "Tier de skills max: " .. level, Color3.fromRGB(200, 180, 255), 4)
		createInfoRow(contentFrame, "Reduction cout: -" .. string.format("%.0f", level * 5) .. "%", Color3.fromRGB(100, 255, 150), 5)
		createInfoRow(contentFrame, "", Color3.fromRGB(150, 150, 150), 6)
		createInfoRow(contentFrame, "📌 Debloque les skills de tes monstres ici!", Color3.fromRGB(180, 150, 100), 7)
		createInfoRow(contentFrame, "Chaque monstre a des skills specifiques a debloquer.", Color3.fromRGB(150, 150, 150), 8)
		
		contentFrame.CanvasSize = UDim2.new(0, 0, 0, 260)
		
	elseif buildingId == "training_center" then
		-- CENTRE D'ENTRAINEMENT
		local trainSlots = 1 + level
		
		createInfoRow(contentFrame, "🥊 CENTRE D'ENTRAINEMENT", Color3.fromRGB(200, 100, 80), 3)
		createInfoRow(contentFrame, "Slots d'entrainement: " .. trainSlots, Color3.fromRGB(255, 180, 100), 4)
		createInfoRow(contentFrame, "Bonus XP passif: +" .. string.format("%.0f", level * 10) .. "%", Color3.fromRGB(100, 255, 150), 5)
		createInfoRow(contentFrame, "Evolution dispo au Nv.3", Color3.fromRGB(200, 200, 150), 6)
		createInfoRow(contentFrame, "", Color3.fromRGB(150, 150, 150), 7)
		createInfoRow(contentFrame, "📌 Place tes monstres ici pour gagner de l'XP passive!", Color3.fromRGB(180, 150, 100), 8)
		
		contentFrame.CanvasSize = UDim2.new(0, 0, 0, 260)
		
	elseif buildingId == "infirmary" then
		createInfoRow(contentFrame, "🏥 INFIRMERIE", Color3.fromRGB(100, 255, 150), 3)
		createInfoRow(contentFrame, "Regen fatigue: +" .. (level * 5) .. "/min", Color3.fromRGB(150, 255, 150), 4)
		createInfoRow(contentFrame, "Heal apres vague: " .. string.format("%.0f", level * 10) .. "% HP", Color3.fromRGB(100, 255, 200), 5)
		contentFrame.CanvasSize = UDim2.new(0, 0, 0, 200)
		
	elseif buildingId == "watchtower" then
		createInfoRow(contentFrame, "🗼 TOUR DE GUET", Color3.fromRGB(200, 200, 100), 3)
		createInfoRow(contentFrame, "Bonus monstres rares: +" .. string.format("%.0f", level * 5) .. "%", Color3.fromRGB(255, 200, 100), 4)
		contentFrame.CanvasSize = UDim2.new(0, 0, 0, 180)
		
	else
		-- GENERIC building
		createInfoRow(contentFrame, "Niveau: " .. level, Color3.fromRGB(200, 200, 200), 3)
		createInfoRow(contentFrame, "Ameliore ce batiment pour debloquer plus de fonctionnalites!", Color3.fromRGB(150, 150, 150), 4)
		contentFrame.CanvasSize = UDim2.new(0, 0, 0, 200)
	end
	
	-- Update upgrade button text
	-- Calculate cost: upgradeCostBase * 2^(level-1) 
	local baseCost = bData.upgradeCostBase or 100
	local upgradeCost = math.floor(baseCost * math.pow(2, level - 1))
	upgradeBtn.Text = "⬆ AMELIORER Nv." .. (level + 1) .. " (" .. upgradeCost .. "g)"
	
	buildingPanel.Visible = true
end

-- Upgrade button handler
upgradeBtn.MouseButton1Click:Connect(function()
	if currentBuildingId and remotes then
		local upgradeRemote = remotes:FindFirstChild("UpgradeBuilding")
		if upgradeRemote then
			upgradeRemote:FireServer(currentBuildingId)
			-- Close after upgrading
			task.delay(0.5, function()
				buildingPanel.Visible = false
			end)
		end
	end
end)

-- === ESCAPE TO CLOSE ===
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.Escape or input.KeyCode == Enum.KeyCode.B then
		buildingPanel.Visible = false
	end
end)

-- === LISTEN FOR OpenBuildingUI REMOTE ===
if remotes then
	local openRemote = remotes:FindFirstChild("OpenBuildingUI")
	if openRemote then
		openRemote.OnClientEvent:Connect(function(buildingId, level, bData)
			openBuildingUI(buildingId, level, bData)
		end)
	end
end

print("[BuildingUI V23] Ready!")
