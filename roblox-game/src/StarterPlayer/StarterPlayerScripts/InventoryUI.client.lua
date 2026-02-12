--[[
	InventoryUI V24 - Inventaire complet avec equipement
	- Personnage 3D ViewportFrame
	- Slots d'equipement: Arme, Armure, Casque, Relique, Bottes, Accessoire
	- Grille d'inventaire avec items
	- Drag & drop pour equiper
	- Stats panel
]]

print("[InventoryUI V24] Loading...")

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui", 10)
if not playerGui then return end

local remotes = ReplicatedStorage:WaitForChild("Remotes", 10)

-- === INVENTORY DATA (client side cache) ===
local equippedItems = {
	Arme = nil,
	Armure = nil,
	Casque = nil,
	Relique = nil,
	Bottes = nil,
	Accessoire = nil,
}

-- Starting items (given by game progression)
local inventoryItems = {}

local SLOT_CONFIG = {
	{name = "Arme", icon = "⚔️", x = 0, y = 0, color = Color3.fromRGB(200, 80, 80)},
	{name = "Armure", icon = "🛡️", x = 0, y = 1, color = Color3.fromRGB(80, 140, 200)},
	{name = "Casque", icon = "⛑️", x = 0, y = 2, color = Color3.fromRGB(180, 160, 80)},
	{name = "Relique", icon = "💎", x = 1, y = 0, color = Color3.fromRGB(200, 100, 255)},
	{name = "Bottes", icon = "👢", x = 1, y = 1, color = Color3.fromRGB(140, 100, 60)},
	{name = "Accessoire", icon = "📿", x = 1, y = 2, color = Color3.fromRGB(100, 200, 150)},
}

-- Item rarity colors
local RARITY_COLORS = {
	Commun = Color3.fromRGB(180, 180, 180),
	Rare = Color3.fromRGB(80, 150, 255),
	Exceptionnel = Color3.fromRGB(200, 80, 255),
	Epique = Color3.fromRGB(255, 180, 50),
	Legendaire = Color3.fromRGB(255, 80, 80),
}

-- === SCREEN GUI ===
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "InventoryUI_V24"
screenGui.ResetOnSpawn = false
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 15
screenGui.Parent = playerGui

-- === MAIN INVENTORY PANEL ===
local invPanel = Instance.new("Frame")
invPanel.Name = "InventoryPanel"
invPanel.Size = UDim2.new(0, 640, 0, 440)
invPanel.Position = UDim2.new(0.5, -320, 0.5, -220)
invPanel.BackgroundColor3 = Color3.fromRGB(12, 12, 20)
invPanel.BackgroundTransparency = 0.02
invPanel.BorderSizePixel = 0
invPanel.Visible = false
invPanel.Parent = screenGui
Instance.new("UICorner", invPanel).CornerRadius = UDim.new(0, 14)
local mainStroke = Instance.new("UIStroke")
mainStroke.Color = Color3.fromRGB(120, 80, 200)
mainStroke.Thickness = 2
mainStroke.Parent = invPanel

-- Title bar
local titleBar = Instance.new("Frame")
titleBar.Size = UDim2.new(1, 0, 0, 40)
titleBar.BackgroundColor3 = Color3.fromRGB(20, 15, 35)
titleBar.BorderSizePixel = 0
titleBar.Parent = invPanel
Instance.new("UICorner", titleBar).CornerRadius = UDim.new(0, 14)

local titleLabel = Instance.new("TextLabel")
titleLabel.Size = UDim2.new(1, -50, 1, 0)
titleLabel.Position = UDim2.new(0, 15, 0, 0)
titleLabel.BackgroundTransparency = 1
titleLabel.TextColor3 = Color3.fromRGB(200, 150, 255)
titleLabel.TextSize = 18
titleLabel.Font = Enum.Font.GothamBold
titleLabel.TextXAlignment = Enum.TextXAlignment.Left
titleLabel.Text = "🎒 INVENTAIRE & EQUIPEMENT"
titleLabel.Parent = titleBar

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.new(0, 34, 0, 34)
closeBtn.Position = UDim2.new(1, -40, 0, 3)
closeBtn.BackgroundColor3 = Color3.fromRGB(180, 50, 50)
closeBtn.TextColor3 = Color3.new(1, 1, 1)
closeBtn.TextSize = 16
closeBtn.Font = Enum.Font.GothamBold
closeBtn.Text = "X"
closeBtn.Parent = titleBar
Instance.new("UICorner", closeBtn).CornerRadius = UDim.new(0, 6)
closeBtn.MouseButton1Click:Connect(function()
	invPanel.Visible = false
end)

-- ============================================
-- LEFT SIDE: CHARACTER VIEW (ViewportFrame)
-- ============================================
local charSection = Instance.new("Frame")
charSection.Name = "CharSection"
charSection.Size = UDim2.new(0, 200, 0, 380)
charSection.Position = UDim2.new(0, 10, 0, 48)
charSection.BackgroundColor3 = Color3.fromRGB(18, 18, 30)
charSection.BorderSizePixel = 0
charSection.Parent = invPanel
Instance.new("UICorner", charSection).CornerRadius = UDim.new(0, 10)
Instance.new("UIStroke", charSection).Color = Color3.fromRGB(60, 50, 80)

-- Character viewport
local viewport = Instance.new("ViewportFrame")
viewport.Name = "CharViewport"
viewport.Size = UDim2.new(1, -10, 0, 240)
viewport.Position = UDim2.new(0, 5, 0, 5)
viewport.BackgroundColor3 = Color3.fromRGB(25, 20, 40)
viewport.BackgroundTransparency = 0
viewport.BorderSizePixel = 0
viewport.Parent = charSection
Instance.new("UICorner", viewport).CornerRadius = UDim.new(0, 8)

-- Camera for viewport
local vpCamera = Instance.new("Camera")
vpCamera.Parent = viewport
viewport.CurrentCamera = vpCamera

-- Character clone + rotation
local charClone = nil
local rotationAngle = 0

local function updateCharacterClone()
	-- Clear old clone
	for _, c in ipairs(viewport:GetChildren()) do
		if c:IsA("Model") or c:IsA("BasePart") then c:Destroy() end
	end
	
	local character = player.Character
	if not character then return end
	
	charClone = character:Clone()
	
	-- Remove scripts and stuff
	for _, d in ipairs(charClone:GetDescendants()) do
		if d:IsA("Script") or d:IsA("LocalScript") or d:IsA("BillboardGui") then
			d:Destroy()
		end
	end
	
	charClone.Parent = viewport
	
	-- Position camera
	local hrp = charClone:FindFirstChild("HumanoidRootPart")
	if hrp then
		hrp.Anchored = true
		hrp.CFrame = CFrame.new(0, 0, 0) * CFrame.Angles(0, rotationAngle, 0)
		vpCamera.CFrame = CFrame.new(Vector3.new(0, 2, -8), Vector3.new(0, 1.5, 0))
	end
	
	-- Lighting for viewport
	local vpLight = Instance.new("PointLight")
	vpLight.Brightness = 2
	vpLight.Range = 20
	vpLight.Color = Color3.new(1, 1, 1)
	if hrp then vpLight.Parent = hrp end
end

-- Initial clone
task.delay(3, updateCharacterClone)

-- Rotate character with drag
local isDraggingChar = false
local lastDragX = 0

viewport.InputBegan:Connect(function(input)
	if input.UserInputType == Enum.UserInputType.MouseButton1 then
		isDraggingChar = true
		lastDragX = input.Position.X
	end
end)

viewport.InputEnded:Connect(function(input)
	if input.UserInputType == Enum.UserInputType.MouseButton1 then
		isDraggingChar = false
	end
end)

UserInputService.InputChanged:Connect(function(input)
	if isDraggingChar and input.UserInputType == Enum.UserInputType.MouseMovement then
		local deltaX = input.Position.X - lastDragX
		rotationAngle = rotationAngle + deltaX * 0.01
		lastDragX = input.Position.X
		
		if charClone then
			local hrp = charClone:FindFirstChild("HumanoidRootPart")
			if hrp then
				hrp.CFrame = CFrame.new(0, 0, 0) * CFrame.Angles(0, rotationAngle, 0)
			end
		end
	end
end)

-- Player name & class below viewport
local charName = Instance.new("TextLabel")
charName.Size = UDim2.new(1, 0, 0, 18)
charName.Position = UDim2.new(0, 0, 0, 248)
charName.BackgroundTransparency = 1
charName.TextColor3 = Color3.fromRGB(200, 200, 255)
charName.TextSize = 13
charName.Font = Enum.Font.GothamBold
charName.Text = player.Name
charName.Parent = charSection

local charClass = Instance.new("TextLabel")
charClass.Size = UDim2.new(1, 0, 0, 14)
charClass.Position = UDim2.new(0, 0, 0, 266)
charClass.BackgroundTransparency = 1
charClass.TextColor3 = Color3.fromRGB(150, 180, 255)
charClass.TextSize = 11
charClass.Font = Enum.Font.Gotham
charClass.Text = "Novice Nv.1"
charClass.Parent = charSection

-- Stats summary below class
local statsLines = {"⚔ ATK: 0", "⚡ AGI: 0", "❤ VIT: 0", "🛡 DEF: 0", "💰 Or: 0g"}
local statLabels = {}
for i, text in ipairs(statsLines) do
	local sl = Instance.new("TextLabel")
	sl.Size = UDim2.new(1, -16, 0, 14)
	sl.Position = UDim2.new(0, 8, 0, 282 + (i - 1) * 16)
	sl.BackgroundTransparency = 1
	sl.TextColor3 = Color3.fromRGB(160, 160, 180)
	sl.TextSize = 10
	sl.Font = Enum.Font.Gotham
	sl.TextXAlignment = Enum.TextXAlignment.Left
	sl.Text = text
	sl.Parent = charSection
	statLabels[i] = sl
end

-- ============================================
-- CENTER: EQUIPMENT SLOTS (2 columns, 3 rows)
-- ============================================
local equipSection = Instance.new("Frame")
equipSection.Name = "EquipSection"
equipSection.Size = UDim2.new(0, 140, 0, 300)
equipSection.Position = UDim2.new(0, 220, 0, 48)
equipSection.BackgroundColor3 = Color3.fromRGB(15, 15, 25)
equipSection.BorderSizePixel = 0
equipSection.Parent = invPanel
Instance.new("UICorner", equipSection).CornerRadius = UDim.new(0, 10)
Instance.new("UIStroke", equipSection).Color = Color3.fromRGB(60, 50, 80)

local equipTitle = Instance.new("TextLabel")
equipTitle.Size = UDim2.new(1, 0, 0, 22)
equipTitle.Position = UDim2.new(0, 0, 0, 2)
equipTitle.BackgroundTransparency = 1
equipTitle.TextColor3 = Color3.fromRGB(180, 150, 220)
equipTitle.TextSize = 11
equipTitle.Font = Enum.Font.GothamBold
equipTitle.Text = "EQUIPEMENT"
equipTitle.Parent = equipSection

local equipSlotFrames = {}

for _, cfg in ipairs(SLOT_CONFIG) do
	local slotFrame = Instance.new("TextButton")
	slotFrame.Name = "Slot_" .. cfg.name
	slotFrame.Size = UDim2.new(0, 58, 0, 80)
	slotFrame.Position = UDim2.new(0, 8 + cfg.x * 66, 0, 28 + cfg.y * 88)
	slotFrame.BackgroundColor3 = Color3.fromRGB(30, 28, 45)
	slotFrame.BorderSizePixel = 0
	slotFrame.TextColor3 = Color3.fromRGB(100, 100, 120)
	slotFrame.TextSize = 8
	slotFrame.Font = Enum.Font.Gotham
	slotFrame.TextYAlignment = Enum.TextYAlignment.Bottom
	slotFrame.Text = cfg.name
	slotFrame.Parent = equipSection
	Instance.new("UICorner", slotFrame).CornerRadius = UDim.new(0, 8)
	local slotStroke = Instance.new("UIStroke")
	slotStroke.Color = cfg.color
	slotStroke.Transparency = 0.5
	slotStroke.Thickness = 1
	slotStroke.Parent = slotFrame
	
	-- Icon
	local iconLabel = Instance.new("TextLabel")
	iconLabel.Name = "Icon"
	iconLabel.Size = UDim2.new(1, 0, 0, 30)
	iconLabel.Position = UDim2.new(0, 0, 0, 8)
	iconLabel.BackgroundTransparency = 1
	iconLabel.TextSize = 22
	iconLabel.Text = cfg.icon
	iconLabel.Parent = slotFrame
	
	-- Item name (if equipped)
	local itemName = Instance.new("TextLabel")
	itemName.Name = "ItemName"
	itemName.Size = UDim2.new(1, -4, 0, 14)
	itemName.Position = UDim2.new(0, 2, 0, 40)
	itemName.BackgroundTransparency = 1
	itemName.TextColor3 = Color3.fromRGB(180, 180, 180)
	itemName.TextSize = 8
	itemName.Font = Enum.Font.GothamBold
	itemName.Text = "Vide"
	itemName.TextWrapped = true
	itemName.Parent = slotFrame
	
	-- Stat bonus
	local statBonus = Instance.new("TextLabel")
	statBonus.Name = "StatBonus"
	statBonus.Size = UDim2.new(1, -4, 0, 12)
	statBonus.Position = UDim2.new(0, 2, 0, 54)
	statBonus.BackgroundTransparency = 1
	statBonus.TextColor3 = Color3.fromRGB(100, 200, 100)
	statBonus.TextSize = 7
	statBonus.Font = Enum.Font.Gotham
	statBonus.Text = ""
	statBonus.Parent = slotFrame
	
	equipSlotFrames[cfg.name] = {frame = slotFrame, icon = iconLabel, itemName = itemName, statBonus = statBonus, stroke = slotStroke, config = cfg}
end

-- ============================================
-- RIGHT: INVENTORY GRID (bag items)
-- ============================================
local bagSection = Instance.new("Frame")
bagSection.Name = "BagSection"
bagSection.Size = UDim2.new(0, 260, 0, 380)
bagSection.Position = UDim2.new(0, 370, 0, 48)
bagSection.BackgroundColor3 = Color3.fromRGB(15, 15, 25)
bagSection.BorderSizePixel = 0
bagSection.Parent = invPanel
Instance.new("UICorner", bagSection).CornerRadius = UDim.new(0, 10)
Instance.new("UIStroke", bagSection).Color = Color3.fromRGB(60, 50, 80)

local bagTitle = Instance.new("TextLabel")
bagTitle.Size = UDim2.new(1, 0, 0, 24)
bagTitle.Position = UDim2.new(0, 0, 0, 2)
bagTitle.BackgroundTransparency = 1
bagTitle.TextColor3 = Color3.fromRGB(180, 150, 220)
bagTitle.TextSize = 11
bagTitle.Font = Enum.Font.GothamBold
bagTitle.Text = "SAC A DOS (0 items)"
bagTitle.Parent = bagSection

-- Scrolling grid
local bagScroll = Instance.new("ScrollingFrame")
bagScroll.Name = "BagScroll"
bagScroll.Size = UDim2.new(1, -10, 1, -30)
bagScroll.Position = UDim2.new(0, 5, 0, 28)
bagScroll.BackgroundTransparency = 1
bagScroll.ScrollBarThickness = 4
bagScroll.ScrollBarImageColor3 = Color3.fromRGB(100, 80, 150)
bagScroll.CanvasSize = UDim2.new(0, 0, 0, 0)
bagScroll.Parent = bagSection

local bagGrid = Instance.new("UIGridLayout")
bagGrid.CellSize = UDim2.new(0, 56, 0, 70)
bagGrid.CellPadding = UDim2.new(0, 4, 0, 4)
bagGrid.SortOrder = Enum.SortOrder.LayoutOrder
bagGrid.Parent = bagScroll

-- === ITEM TOOLTIP ===
local tooltip = Instance.new("Frame")
tooltip.Name = "Tooltip"
tooltip.Size = UDim2.new(0, 180, 0, 100)
tooltip.BackgroundColor3 = Color3.fromRGB(20, 15, 30)
tooltip.BackgroundTransparency = 0.05
tooltip.BorderSizePixel = 0
tooltip.Visible = false
tooltip.ZIndex = 10
tooltip.Parent = screenGui
Instance.new("UICorner", tooltip).CornerRadius = UDim.new(0, 8)
local tipStroke = Instance.new("UIStroke")
tipStroke.Color = Color3.fromRGB(150, 100, 255)
tipStroke.Thickness = 1
tipStroke.Parent = tooltip

local tipName = Instance.new("TextLabel")
tipName.Size = UDim2.new(1, -10, 0, 18)
tipName.Position = UDim2.new(0, 5, 0, 5)
tipName.BackgroundTransparency = 1
tipName.TextColor3 = Color3.fromRGB(255, 200, 100)
tipName.TextSize = 12
tipName.Font = Enum.Font.GothamBold
tipName.TextXAlignment = Enum.TextXAlignment.Left
tipName.Text = ""
tipName.ZIndex = 11
tipName.Parent = tooltip

local tipType = Instance.new("TextLabel")
tipType.Size = UDim2.new(1, -10, 0, 14)
tipType.Position = UDim2.new(0, 5, 0, 24)
tipType.BackgroundTransparency = 1
tipType.TextColor3 = Color3.fromRGB(150, 150, 200)
tipType.TextSize = 9
tipType.Font = Enum.Font.Gotham
tipType.TextXAlignment = Enum.TextXAlignment.Left
tipType.Text = ""
tipType.ZIndex = 11
tipType.Parent = tooltip

local tipStats = Instance.new("TextLabel")
tipStats.Size = UDim2.new(1, -10, 0, 40)
tipStats.Position = UDim2.new(0, 5, 0, 40)
tipStats.BackgroundTransparency = 1
tipStats.TextColor3 = Color3.fromRGB(100, 200, 100)
tipStats.TextSize = 9
tipStats.Font = Enum.Font.Gotham
tipStats.TextXAlignment = Enum.TextXAlignment.Left
tipStats.TextYAlignment = Enum.TextYAlignment.Top
tipStats.TextWrapped = true
tipStats.Text = ""
tipStats.ZIndex = 11
tipStats.Parent = tooltip

local tipHint = Instance.new("TextLabel")
tipHint.Size = UDim2.new(1, -10, 0, 14)
tipHint.Position = UDim2.new(0, 5, 1, -18)
tipHint.BackgroundTransparency = 1
tipHint.TextColor3 = Color3.fromRGB(100, 100, 130)
tipHint.TextSize = 8
tipHint.Font = Enum.Font.Gotham
tipHint.TextXAlignment = Enum.TextXAlignment.Left
tipHint.Text = "Clic pour equiper | Clic-droit: jeter"
tipHint.ZIndex = 11
tipHint.Parent = tooltip

-- === DRAG GHOST ===
local dragGhost = Instance.new("Frame")
dragGhost.Name = "DragGhost"
dragGhost.Size = UDim2.new(0, 50, 0, 50)
dragGhost.BackgroundColor3 = Color3.fromRGB(80, 60, 120)
dragGhost.BackgroundTransparency = 0.3
dragGhost.BorderSizePixel = 0
dragGhost.Visible = false
dragGhost.ZIndex = 20
dragGhost.Parent = screenGui
Instance.new("UICorner", dragGhost).CornerRadius = UDim.new(0, 8)

local dragIcon = Instance.new("TextLabel")
dragIcon.Size = UDim2.new(1, 0, 1, 0)
dragIcon.BackgroundTransparency = 1
dragIcon.TextSize = 24
dragIcon.Text = ""
dragIcon.ZIndex = 21
dragIcon.Parent = dragGhost

-- === ITEM DATABASE (default items based on class + progression) ===
local ITEM_TEMPLATES = {
	-- Armes
	{id = "novice_staff", name = "Baton du Novice", slot = "Arme", icon = "🏑", rarity = "Commun", stats = {ATK = 3}, desc = "Arme de depart"},
	{id = "iron_sword", name = "Epee de Fer", slot = "Arme", icon = "⚔️", rarity = "Commun", stats = {ATK = 8}, desc = "Lame solide"},
	{id = "flame_blade", name = "Lame Ardente", slot = "Arme", icon = "🗡️", rarity = "Rare", stats = {ATK = 15, Agility = 3}, desc = "Bruler vos ennemis"},
	{id = "crystal_staff", name = "Sceptre Cristallin", slot = "Arme", icon = "🔮", rarity = "Epique", stats = {ATK = 25, Vitality = 5}, desc = "Pouvoir du cristal"},
	-- Armures
	{id = "leather_armor", name = "Armure Cuir", slot = "Armure", icon = "🥋", rarity = "Commun", stats = {Vitality = 5, DEF = 3}, desc = "Protection basique"},
	{id = "chain_mail", name = "Cotte de Mailles", slot = "Armure", icon = "🛡️", rarity = "Rare", stats = {Vitality = 10, DEF = 8}, desc = "Resistant aux coups"},
	{id = "crystal_plate", name = "Plastron Cristal", slot = "Armure", icon = "💠", rarity = "Epique", stats = {Vitality = 20, DEF = 15, ATK = 5}, desc = "Defense supreme"},
	-- Casques
	{id = "basic_helm", name = "Casque Basique", slot = "Casque", icon = "⛑️", rarity = "Commun", stats = {Vitality = 3}, desc = "Protege la tete"},
	{id = "iron_helm", name = "Heaume de Fer", slot = "Casque", icon = "🪖", rarity = "Rare", stats = {Vitality = 8, DEF = 4}, desc = "Robuste et lourd"},
	-- Reliques
	{id = "luck_charm", name = "Charme de Chance", slot = "Relique", icon = "🍀", rarity = "Rare", stats = {CaptureBonus = 5}, desc = "+5% chance capture"},
	{id = "gold_amulet", name = "Amulette d'Or", slot = "Relique", icon = "💎", rarity = "Exceptionnel", stats = {GoldBonus = 10}, desc = "+10% or gagne"},
	{id = "crystal_heart", name = "Coeur de Cristal", slot = "Relique", icon = "💜", rarity = "Legendaire", stats = {Vitality = 15, ATK = 10, Agility = 10}, desc = "Puissance pure"},
	-- Bottes
	{id = "sandals", name = "Sandales", slot = "Bottes", icon = "👟", rarity = "Commun", stats = {Agility = 3}, desc = "Rapides et legeres"},
	{id = "speed_boots", name = "Bottes de Vitesse", slot = "Bottes", icon = "👢", rarity = "Rare", stats = {Agility = 8}, desc = "Course eclair"},
	-- Accessoires
	{id = "iron_ring", name = "Anneau de Fer", slot = "Accessoire", icon = "💍", rarity = "Commun", stats = {ATK = 2, DEF = 2}, desc = "Simple mais efficace"},
	{id = "emerald_pendant", name = "Pendentif Emeraude", slot = "Accessoire", icon = "📿", rarity = "Exceptionnel", stats = {Vitality = 8, CaptureBonus = 3}, desc = "Vert et puissant"},
}

local function getItemTemplate(itemId)
	for _, t in ipairs(ITEM_TEMPLATES) do
		if t.id == itemId then return t end
	end
	return nil
end

-- === DRAG & DROP STATE ===
local draggingItem = nil -- the item data being dragged
local draggingFrom = nil -- "bag_index" or "equip_slotname"

-- === GENERATE STARTING ITEMS (based on player progress) ===
local function generateStartingItems()
	inventoryItems = {}
	-- Everyone gets novice staff
	table.insert(inventoryItems, {id = "novice_staff", uid = "item_1"})
	table.insert(inventoryItems, {id = "sandals", uid = "item_2"})
	table.insert(inventoryItems, {id = "iron_ring", uid = "item_3"})
	
	-- Level-based unlocks
	local lvl = player:GetAttribute("PlayerLevel") or 1
	if lvl >= 3 then
		table.insert(inventoryItems, {id = "leather_armor", uid = "item_4"})
		table.insert(inventoryItems, {id = "basic_helm", uid = "item_5"})
	end
	if lvl >= 5 then
		table.insert(inventoryItems, {id = "iron_sword", uid = "item_6"})
		table.insert(inventoryItems, {id = "luck_charm", uid = "item_7"})
	end
	if lvl >= 8 then
		table.insert(inventoryItems, {id = "chain_mail", uid = "item_8"})
		table.insert(inventoryItems, {id = "speed_boots", uid = "item_9"})
		table.insert(inventoryItems, {id = "iron_helm", uid = "item_10"})
	end
	if lvl >= 12 then
		table.insert(inventoryItems, {id = "flame_blade", uid = "item_11"})
		table.insert(inventoryItems, {id = "gold_amulet", uid = "item_12"})
	end
	if lvl >= 18 then
		table.insert(inventoryItems, {id = "crystal_staff", uid = "item_13"})
		table.insert(inventoryItems, {id = "crystal_plate", uid = "item_14"})
		table.insert(inventoryItems, {id = "emerald_pendant", uid = "item_15"})
	end
	if lvl >= 25 then
		table.insert(inventoryItems, {id = "crystal_heart", uid = "item_16"})
	end
end

-- === SHOW TOOLTIP ===
local function showTooltip(item, position)
	local template = getItemTemplate(item.id)
	if not template then return end
	
	tipName.Text = template.icon .. " " .. template.name
	tipName.TextColor3 = RARITY_COLORS[template.rarity] or Color3.new(1, 1, 1)
	tipType.Text = template.slot .. " | " .. template.rarity
	tipStroke.Color = RARITY_COLORS[template.rarity] or Color3.fromRGB(150, 100, 255)
	
	local statText = ""
	for stat, val in pairs(template.stats) do
		statText = statText .. "+" .. val .. " " .. stat .. "\n"
	end
	if template.desc then
		statText = statText .. "📝 " .. template.desc
	end
	tipStats.Text = statText
	
	tooltip.Position = UDim2.new(0, position.X + 10, 0, position.Y - 50)
	tooltip.Visible = true
end

local function hideTooltip()
	tooltip.Visible = false
end

-- === CREATE BAG ITEM BUTTON ===
local function createBagItemButton(item, index)
	local template = getItemTemplate(item.id)
	if not template then return end
	
	local btn = Instance.new("TextButton")
	btn.Name = "BagItem_" .. index
	btn.Size = UDim2.new(0, 56, 0, 70)
	btn.BackgroundColor3 = Color3.fromRGB(30, 28, 45)
	btn.BorderSizePixel = 0
	btn.Text = ""
	btn.LayoutOrder = index
	btn.AutoButtonColor = false
	btn.Parent = bagScroll
	Instance.new("UICorner", btn).CornerRadius = UDim.new(0, 6)
	local itemStroke = Instance.new("UIStroke")
	itemStroke.Color = RARITY_COLORS[template.rarity] or Color3.fromRGB(100, 100, 100)
	itemStroke.Transparency = 0.4
	itemStroke.Thickness = 1
	itemStroke.Parent = btn
	
	local iconLbl = Instance.new("TextLabel")
	iconLbl.Size = UDim2.new(1, 0, 0, 30)
	iconLbl.Position = UDim2.new(0, 0, 0, 4)
	iconLbl.BackgroundTransparency = 1
	iconLbl.TextSize = 22
	iconLbl.Text = template.icon
	iconLbl.Parent = btn
	
	local nameLbl = Instance.new("TextLabel")
	nameLbl.Size = UDim2.new(1, -4, 0, 22)
	nameLbl.Position = UDim2.new(0, 2, 0, 34)
	nameLbl.BackgroundTransparency = 1
	nameLbl.TextColor3 = RARITY_COLORS[template.rarity] or Color3.new(1, 1, 1)
	nameLbl.TextSize = 7
	nameLbl.Font = Enum.Font.GothamBold
	nameLbl.TextWrapped = true
	nameLbl.Text = template.name
	nameLbl.Parent = btn
	
	local slotLbl = Instance.new("TextLabel")
	slotLbl.Size = UDim2.new(1, 0, 0, 10)
	slotLbl.Position = UDim2.new(0, 0, 0, 58)
	slotLbl.BackgroundTransparency = 1
	slotLbl.TextColor3 = Color3.fromRGB(100, 100, 120)
	slotLbl.TextSize = 7
	slotLbl.Font = Enum.Font.Gotham
	slotLbl.Text = template.slot
	slotLbl.Parent = btn
	
	-- Hover: show tooltip
	btn.MouseEnter:Connect(function()
		if not draggingItem then
			local mouse = UserInputService:GetMouseLocation()
			showTooltip(item, mouse)
		end
		itemStroke.Transparency = 0
		btn.BackgroundColor3 = Color3.fromRGB(45, 40, 65)
	end)
	
	btn.MouseLeave:Connect(function()
		hideTooltip()
		itemStroke.Transparency = 0.4
		btn.BackgroundColor3 = Color3.fromRGB(30, 28, 45)
	end)
	
	-- Click: equip to matching slot OR start drag
	btn.MouseButton1Click:Connect(function()
		if draggingItem then
			-- Drop to bag
			draggingItem = nil
			draggingFrom = nil
			dragGhost.Visible = false
			refreshUI()
			return
		end
		
		-- Quick equip: put in matching slot
		local targetSlot = template.slot
		local oldEquipped = equippedItems[targetSlot]
		
		-- Equip the new item
		equippedItems[targetSlot] = item
		
		-- Remove from bag
		for i, bagItem in ipairs(inventoryItems) do
			if bagItem.uid == item.uid then
				table.remove(inventoryItems, i)
				break
			end
		end
		
		-- If old was equipped, put back to bag
		if oldEquipped then
			table.insert(inventoryItems, oldEquipped)
		end
		
		refreshUI()
	end)
	
	-- Right click: start drag
	btn.MouseButton2Click:Connect(function()
		-- Unequip hint or just ignore for bag items
	end)
	
	return btn
end

-- === REFRESH UI ===
function refreshUI()
	-- Clear bag
	for _, c in ipairs(bagScroll:GetChildren()) do
		if c:IsA("TextButton") then c:Destroy() end
	end
	
	-- Recreate bag items
	for i, item in ipairs(inventoryItems) do
		createBagItemButton(item, i)
	end
	
	bagTitle.Text = "SAC A DOS (" .. #inventoryItems .. " items)"
	bagScroll.CanvasSize = UDim2.new(0, 0, 0, math.ceil(#inventoryItems / 4) * 74 + 10)
	
	-- Update equipment slots
	for slotName, slotData in pairs(equipSlotFrames) do
		local item = equippedItems[slotName]
		if item then
			local template = getItemTemplate(item.id)
			if template then
				slotData.icon.Text = template.icon
				slotData.itemName.Text = template.name
				slotData.itemName.TextColor3 = RARITY_COLORS[template.rarity] or Color3.new(1, 1, 1)
				local statStr = ""
				for s, v in pairs(template.stats) do
					statStr = statStr .. "+" .. v .. " " .. s .. " "
				end
				slotData.statBonus.Text = statStr
				slotData.stroke.Color = RARITY_COLORS[template.rarity] or slotData.config.color
				slotData.stroke.Transparency = 0
				slotData.frame.BackgroundColor3 = Color3.fromRGB(40, 35, 60)
			end
		else
			slotData.icon.Text = slotData.config.icon
			slotData.itemName.Text = "Vide"
			slotData.itemName.TextColor3 = Color3.fromRGB(100, 100, 120)
			slotData.statBonus.Text = ""
			slotData.stroke.Color = slotData.config.color
			slotData.stroke.Transparency = 0.5
			slotData.frame.BackgroundColor3 = Color3.fromRGB(30, 28, 45)
		end
	end
	
	-- Click equip slots to unequip
	for slotName, slotData in pairs(equipSlotFrames) do
		-- Remove old connections by recreating
		slotData.frame.MouseButton1Click:Connect(function()
			local item = equippedItems[slotName]
			if item then
				equippedItems[slotName] = nil
				table.insert(inventoryItems, item)
				refreshUI()
			end
		end)
	end
	
	-- Update stats
	local atkPts = player:GetAttribute("SkillATK") or 0
	local agiPts = player:GetAttribute("SkillAgility") or 0
	local vitPts = player:GetAttribute("SkillVitality") or 0
	local goldW = player:GetAttribute("GoldWallet") or 0
	
	-- Calculate gear bonuses
	local gearATK, gearAGI, gearVIT, gearDEF = 0, 0, 0, 0
	for _, item in pairs(equippedItems) do
		if item then
			local t = getItemTemplate(item.id)
			if t and t.stats then
				gearATK = gearATK + (t.stats.ATK or 0)
				gearAGI = gearAGI + (t.stats.Agility or 0)
				gearVIT = gearVIT + (t.stats.Vitality or 0)
				gearDEF = gearDEF + (t.stats.DEF or 0)
			end
		end
	end
	
	statLabels[1].Text = "⚔ ATK: " .. atkPts .. " +" .. gearATK .. " gear"
	statLabels[2].Text = "⚡ AGI: " .. agiPts .. " +" .. gearAGI .. " gear"
	statLabels[3].Text = "❤ VIT: " .. vitPts .. " +" .. gearVIT .. " gear"
	statLabels[4].Text = "🛡 DEF: " .. gearDEF
	statLabels[5].Text = "💰 Or: " .. goldW .. "g"
	
	-- Update class info
	charClass.Text = (player:GetAttribute("CurrentClass") or "Novice") .. " Nv." .. (player:GetAttribute("PlayerLevel") or 1)
end

-- === TOGGLE INVENTORY ===
local function toggleInventory()
	invPanel.Visible = not invPanel.Visible
	if invPanel.Visible then
		generateStartingItems()
		updateCharacterClone()
		refreshUI()
	end
end

-- Listen from PlayerHUD inventory button (via UserInputService)
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.I then
		toggleInventory()
	end
	if input.KeyCode == Enum.KeyCode.Escape and invPanel.Visible then
		invPanel.Visible = false
	end
end)

-- Drag ghost follows mouse
RunService.RenderStepped:Connect(function()
	if dragGhost.Visible then
		local mouse = UserInputService:GetMouseLocation()
		dragGhost.Position = UDim2.new(0, mouse.X - 25, 0, mouse.Y - 25)
	end
end)

-- Also connect the inventory button from PlayerHUD
task.spawn(function()
	task.wait(2)
	local hudGui = playerGui:FindFirstChild("PlayerHUD_V20")
	if hudGui then
		local invBtnHUD = hudGui:FindFirstChild("InventoryBtn", true)
		if invBtnHUD then
			invBtnHUD.MouseButton1Click:Connect(function()
				toggleInventory()
			end)
		end
	end
end)

print("[InventoryUI V24] Ready!")
