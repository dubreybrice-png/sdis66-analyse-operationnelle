--[[
	PlayerHUD V25 - Interface joueur complete
	- Info joueur: or, niveau, classe, XP
	- Info ville: niveau, ere
	- Monstres: defenseurs, stockage
	- Skills points
	- Crystal HP
	- Notifications
	- BIGGER TEXT everywhere
	- Removed I key handler (InventoryUI V25 uses ContextActionService)
	- Added Achievements button (opens CoolFeatures_V25 panel)
]]

print("[PlayerHUD V25] Loading...")

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui", 10)
if not playerGui then return end

local remotes = ReplicatedStorage:WaitForChild("Remotes", 10)

-- === SCREEN GUI ===
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "PlayerHUD_V25"
screenGui.ResetOnSpawn = false
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.Parent = playerGui

-- =========================================
-- TOP LEFT: PLAYER INFO PANEL
-- =========================================
local playerPanel = Instance.new("Frame")
playerPanel.Name = "PlayerPanel"
playerPanel.Size = UDim2.new(0, 300, 0, 250)
playerPanel.Position = UDim2.new(0, 10, 0, 10)
playerPanel.BackgroundColor3 = Color3.fromRGB(20, 20, 30)
playerPanel.BackgroundTransparency = 0.2
playerPanel.BorderSizePixel = 0
playerPanel.Parent = screenGui

local ppCorner = Instance.new("UICorner")
ppCorner.CornerRadius = UDim.new(0, 10)
ppCorner.Parent = playerPanel

local ppStroke = Instance.new("UIStroke")
ppStroke.Color = Color3.fromRGB(80, 120, 200)
ppStroke.Thickness = 2
ppStroke.Parent = playerPanel

-- Title
local titleLabel = Instance.new("TextLabel")
titleLabel.Name = "Title"
titleLabel.Size = UDim2.new(1, 0, 0, 26)
titleLabel.Position = UDim2.new(0, 0, 0, 2)
titleLabel.BackgroundTransparency = 1
titleLabel.TextColor3 = Color3.fromRGB(100, 200, 255)
titleLabel.TextSize = 20
titleLabel.Font = Enum.Font.GothamBold
titleLabel.Text = player.Name
titleLabel.Parent = playerPanel

-- Class + Level
local classLabel = Instance.new("TextLabel")
classLabel.Name = "ClassInfo"
classLabel.Size = UDim2.new(1, 0, 0, 22)
classLabel.Position = UDim2.new(0, 0, 0, 28)
classLabel.BackgroundTransparency = 1
classLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
classLabel.TextSize = 16
classLabel.Font = Enum.Font.Gotham
classLabel.Text = "Novice Nv.1"
classLabel.Parent = playerPanel

-- XP Bar
local xpBarBg = Instance.new("Frame")
xpBarBg.Name = "XPBarBg"
xpBarBg.Size = UDim2.new(0.9, 0, 0, 10)
xpBarBg.Position = UDim2.new(0.05, 0, 0, 52)
xpBarBg.BackgroundColor3 = Color3.fromRGB(40, 40, 50)
xpBarBg.BorderSizePixel = 0
xpBarBg.Parent = playerPanel
Instance.new("UICorner", xpBarBg).CornerRadius = UDim.new(0, 5)

local xpBarFill = Instance.new("Frame")
xpBarFill.Name = "Fill"
xpBarFill.Size = UDim2.new(0, 0, 1, 0)
xpBarFill.BackgroundColor3 = Color3.fromRGB(80, 200, 255)
xpBarFill.BorderSizePixel = 0
xpBarFill.Parent = xpBarBg
Instance.new("UICorner", xpBarFill).CornerRadius = UDim.new(0, 5)

local xpText = Instance.new("TextLabel")
xpText.Name = "XPText"
xpText.Size = UDim2.new(1, 0, 0, 16)
xpText.Position = UDim2.new(0, 0, 0, 63)
xpText.BackgroundTransparency = 1
xpText.TextColor3 = Color3.fromRGB(150, 150, 150)
xpText.TextSize = 13
xpText.Font = Enum.Font.Gotham
xpText.Text = "XP: 0/100"
xpText.Parent = playerPanel

-- Gold info
local goldLabel = Instance.new("TextLabel")
goldLabel.Name = "GoldInfo"
goldLabel.Size = UDim2.new(1, -10, 0, 22)
goldLabel.Position = UDim2.new(0, 10, 0, 82)
goldLabel.BackgroundTransparency = 1
goldLabel.TextColor3 = Color3.fromRGB(255, 215, 50)
goldLabel.TextSize = 17
goldLabel.Font = Enum.Font.GothamBold
goldLabel.TextXAlignment = Enum.TextXAlignment.Left
goldLabel.Text = "💰 0g (Banque: 0g)"
goldLabel.Parent = playerPanel

-- Stats
local statsLabel = Instance.new("TextLabel")
statsLabel.Name = "StatsInfo"
statsLabel.Size = UDim2.new(1, -10, 0, 22)
statsLabel.Position = UDim2.new(0, 10, 0, 105)
statsLabel.BackgroundTransparency = 1
statsLabel.TextColor3 = Color3.fromRGB(180, 180, 180)
statsLabel.TextSize = 15
statsLabel.Font = Enum.Font.Gotham
statsLabel.TextXAlignment = Enum.TextXAlignment.Left
statsLabel.Text = "ATK:0 AGI:0 VIT:0"
statsLabel.Parent = playerPanel

-- Ville info
local villeLabel = Instance.new("TextLabel")
villeLabel.Name = "VilleInfo"
villeLabel.Size = UDim2.new(1, -10, 0, 22)
villeLabel.Position = UDim2.new(0, 10, 0, 128)
villeLabel.BackgroundTransparency = 1
villeLabel.TextColor3 = Color3.fromRGB(160, 220, 160)
villeLabel.TextSize = 15
villeLabel.Font = Enum.Font.Gotham
villeLabel.TextXAlignment = Enum.TextXAlignment.Left
villeLabel.Text = "🏘 Ville Nv.1 | Ere Primitive"
villeLabel.Parent = playerPanel

-- Monster count
local monsterLabel = Instance.new("TextLabel")
monsterLabel.Name = "MonsterInfo"
monsterLabel.Size = UDim2.new(1, -10, 0, 22)
monsterLabel.Position = UDim2.new(0, 10, 0, 151)
monsterLabel.BackgroundTransparency = 1
monsterLabel.TextColor3 = Color3.fromRGB(200, 160, 255)
monsterLabel.TextSize = 15
monsterLabel.Font = Enum.Font.Gotham
monsterLabel.TextXAlignment = Enum.TextXAlignment.Left
monsterLabel.Text = "🐾 Monstres: 0/5"
monsterLabel.Parent = playerPanel

-- Kills / Captures
local killsLabel = Instance.new("TextLabel")
killsLabel.Name = "KillsInfo"
killsLabel.Size = UDim2.new(1, -10, 0, 22)
killsLabel.Position = UDim2.new(0, 10, 0, 174)
killsLabel.BackgroundTransparency = 1
killsLabel.TextColor3 = Color3.fromRGB(255, 130, 130)
killsLabel.TextSize = 15
killsLabel.Font = Enum.Font.Gotham
killsLabel.TextXAlignment = Enum.TextXAlignment.Left
killsLabel.Text = "Kills: 0 | Captures: 0 | Boss: 0"
killsLabel.Parent = playerPanel

-- === BUTTONS ROW (Skills / Inventory / Achievements) ===
local skillBtn = Instance.new("TextButton")
skillBtn.Name = "SkillPointsBtn"
skillBtn.Size = UDim2.new(0.3, -4, 0, 26)
skillBtn.Position = UDim2.new(0.02, 0, 0, 200)
skillBtn.BackgroundColor3 = Color3.fromRGB(60, 100, 180)
skillBtn.TextColor3 = Color3.new(1, 1, 1)
skillBtn.TextSize = 14
skillBtn.Font = Enum.Font.GothamBold
skillBtn.Text = "SKILLS (0)"
skillBtn.Parent = playerPanel
Instance.new("UICorner", skillBtn).CornerRadius = UDim.new(0, 6)

local invBtn = Instance.new("TextButton")
invBtn.Name = "InventoryBtn"
invBtn.Size = UDim2.new(0.33, -4, 0, 26)
invBtn.Position = UDim2.new(0.33, 2, 0, 200)
invBtn.BackgroundColor3 = Color3.fromRGB(120, 80, 180)
invBtn.TextColor3 = Color3.new(1, 1, 1)
invBtn.TextSize = 14
invBtn.Font = Enum.Font.GothamBold
invBtn.Text = "🎒 INV (I)"
invBtn.Parent = playerPanel
Instance.new("UICorner", invBtn).CornerRadius = UDim.new(0, 6)

local achBtn = Instance.new("TextButton")
achBtn.Name = "AchievementsBtn"
achBtn.Size = UDim2.new(0.3, -4, 0, 26)
achBtn.Position = UDim2.new(0.68, 2, 0, 200)
achBtn.BackgroundColor3 = Color3.fromRGB(180, 150, 50)
achBtn.TextColor3 = Color3.new(1, 1, 1)
achBtn.TextSize = 13
achBtn.Font = Enum.Font.GothamBold
achBtn.Text = "🏆 SUCCES"
achBtn.Parent = playerPanel
Instance.new("UICorner", achBtn).CornerRadius = UDim.new(0, 6)

-- =========================================
-- PLAYER HP BAR (below player panel)
-- =========================================
local hpPanel = Instance.new("Frame")
hpPanel.Name = "HPPanel"
hpPanel.Size = UDim2.new(0, 300, 0, 40)
hpPanel.Position = UDim2.new(0, 10, 0, 265)
hpPanel.BackgroundColor3 = Color3.fromRGB(30, 15, 15)
hpPanel.BackgroundTransparency = 0.2
hpPanel.BorderSizePixel = 0
hpPanel.Parent = screenGui
Instance.new("UICorner", hpPanel).CornerRadius = UDim.new(0, 8)
Instance.new("UIStroke", hpPanel).Color = Color3.fromRGB(200, 60, 60)

local hpIcon = Instance.new("TextLabel")
hpIcon.Size = UDim2.new(0, 34, 1, 0)
hpIcon.BackgroundTransparency = 1
hpIcon.TextColor3 = Color3.fromRGB(255, 80, 80)
hpIcon.TextSize = 20
hpIcon.Font = Enum.Font.GothamBold
hpIcon.Text = "❤"
hpIcon.Parent = hpPanel

local hpBarBg = Instance.new("Frame")
hpBarBg.Name = "HPBarBg"
hpBarBg.Size = UDim2.new(1, -44, 0, 16)
hpBarBg.Position = UDim2.new(0, 36, 0, 4)
hpBarBg.BackgroundColor3 = Color3.fromRGB(50, 20, 20)
hpBarBg.BorderSizePixel = 0
hpBarBg.Parent = hpPanel
Instance.new("UICorner", hpBarBg).CornerRadius = UDim.new(0, 5)

local hpBarFill = Instance.new("Frame")
hpBarFill.Name = "Fill"
hpBarFill.Size = UDim2.new(1, 0, 1, 0)
hpBarFill.BackgroundColor3 = Color3.fromRGB(220, 50, 50)
hpBarFill.BorderSizePixel = 0
hpBarFill.Parent = hpBarBg
Instance.new("UICorner", hpBarFill).CornerRadius = UDim.new(0, 5)

local hpTextLabel = Instance.new("TextLabel")
hpTextLabel.Name = "HPText"
hpTextLabel.Size = UDim2.new(1, -44, 0, 16)
hpTextLabel.Position = UDim2.new(0, 36, 0, 21)
hpTextLabel.BackgroundTransparency = 1
hpTextLabel.TextColor3 = Color3.fromRGB(200, 150, 150)
hpTextLabel.TextSize = 13
hpTextLabel.Font = Enum.Font.Gotham
hpTextLabel.Text = "HP: 100/100"
hpTextLabel.Parent = hpPanel

-- =========================================
-- TOP CENTER: WAVE INFO
-- =========================================
local wavePanel = Instance.new("Frame")
wavePanel.Name = "WavePanel"
wavePanel.Size = UDim2.new(0, 260, 0, 65)
wavePanel.Position = UDim2.new(0.5, -130, 0, 10)
wavePanel.BackgroundColor3 = Color3.fromRGB(30, 20, 20)
wavePanel.BackgroundTransparency = 0.2
wavePanel.BorderSizePixel = 0
wavePanel.Parent = screenGui
Instance.new("UICorner", wavePanel).CornerRadius = UDim.new(0, 10)

local waveStroke = Instance.new("UIStroke")
waveStroke.Color = Color3.fromRGB(200, 50, 50)
waveStroke.Thickness = 2
waveStroke.Parent = wavePanel

local waveLabel = Instance.new("TextLabel")
waveLabel.Name = "WaveNumber"
waveLabel.Size = UDim2.new(1, 0, 0, 34)
waveLabel.BackgroundTransparency = 1
waveLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
waveLabel.TextSize = 26
waveLabel.Font = Enum.Font.GothamBold
waveLabel.Text = "VAGUE 0"
waveLabel.Parent = wavePanel

local monstersLeft = Instance.new("TextLabel")
monstersLeft.Name = "MonstersLeft"
monstersLeft.Size = UDim2.new(1, 0, 0, 22)
monstersLeft.Position = UDim2.new(0, 0, 0, 34)
monstersLeft.BackgroundTransparency = 1
monstersLeft.TextColor3 = Color3.fromRGB(200, 180, 180)
monstersLeft.TextSize = 15
monstersLeft.Font = Enum.Font.Gotham
monstersLeft.Text = "En attente..."
monstersLeft.Parent = wavePanel

-- =========================================
-- BOTTOM CENTER: HOTBAR
-- =========================================
local hotbarPanel = Instance.new("Frame")
hotbarPanel.Name = "HotbarPanel"
hotbarPanel.Size = UDim2.new(0, 350, 0, 68)
hotbarPanel.Position = UDim2.new(0.5, -175, 1, -78)
hotbarPanel.BackgroundColor3 = Color3.fromRGB(20, 20, 30)
hotbarPanel.BackgroundTransparency = 0.3
hotbarPanel.BorderSizePixel = 0
hotbarPanel.Parent = screenGui
Instance.new("UICorner", hotbarPanel).CornerRadius = UDim.new(0, 8)

local hotbarStroke = Instance.new("UIStroke")
hotbarStroke.Color = Color3.fromRGB(100, 100, 120)
hotbarStroke.Thickness = 1
hotbarStroke.Parent = hotbarPanel

local slotLabels = {"Arme", "Vide", "Item", "Item", "Item"}
local hotbarSlots = {}

for i = 1, 5 do
	local slot = Instance.new("TextButton")
	slot.Name = "Slot" .. i
	slot.Size = UDim2.new(0, 60, 0, 60)
	slot.Position = UDim2.new(0, 8 + (i-1) * 68, 0.5, -30)
	slot.BackgroundColor3 = Color3.fromRGB(40, 40, 55)
	slot.BorderSizePixel = 0
	slot.TextColor3 = Color3.fromRGB(150, 150, 150)
	slot.TextSize = 13
	slot.Font = Enum.Font.Gotham
	slot.Text = slotLabels[i] or "Vide"
	slot.Parent = hotbarPanel
	Instance.new("UICorner", slot).CornerRadius = UDim.new(0, 6)

	-- Numero raccourci
	local numLabel = Instance.new("TextLabel")
	numLabel.Size = UDim2.new(0, 16, 0, 16)
	numLabel.Position = UDim2.new(0, 2, 0, 2)
	numLabel.BackgroundTransparency = 1
	numLabel.TextColor3 = Color3.fromRGB(100, 100, 100)
	numLabel.TextSize = 12
	numLabel.Font = Enum.Font.GothamBold
	numLabel.Text = tostring(i)
	numLabel.Parent = slot

	hotbarSlots[i] = slot

	slot.MouseButton1Click:Connect(function()
		if remotes then
			local selectHotbar = remotes:FindFirstChild("SelectHotbar")
			if selectHotbar then
				selectHotbar:FireServer(i)
			end
		end
		-- Highlight
		for j, s in ipairs(hotbarSlots) do
			if j == i then
				s.BackgroundColor3 = Color3.fromRGB(80, 120, 200)
				local str = s:FindFirstChildOfClass("UIStroke")
				if not str then
					str = Instance.new("UIStroke")
					str.Parent = s
				end
				str.Color = Color3.fromRGB(100, 180, 255)
				str.Thickness = 2
			else
				s.BackgroundColor3 = Color3.fromRGB(40, 40, 55)
				local str = s:FindFirstChildOfClass("UIStroke")
				if str then str:Destroy() end
			end
		end
	end)
end

-- Select slot 1 by default
hotbarSlots[1].BackgroundColor3 = Color3.fromRGB(80, 120, 200)

-- =========================================
-- SKILL POINTS PANEL (toggle with button)
-- =========================================
local skillPanel = Instance.new("Frame")
skillPanel.Name = "SkillPanel"
skillPanel.Size = UDim2.new(0, 280, 0, 170)
skillPanel.Position = UDim2.new(0, 10, 0, 310)
skillPanel.BackgroundColor3 = Color3.fromRGB(20, 25, 40)
skillPanel.BackgroundTransparency = 0.1
skillPanel.BorderSizePixel = 0
skillPanel.Visible = false
skillPanel.Parent = screenGui
Instance.new("UICorner", skillPanel).CornerRadius = UDim.new(0, 10)
Instance.new("UIStroke", skillPanel).Color = Color3.fromRGB(100, 150, 255)

local skillTitle = Instance.new("TextLabel")
skillTitle.Size = UDim2.new(1, 0, 0, 28)
skillTitle.BackgroundTransparency = 1
skillTitle.TextColor3 = Color3.fromRGB(100, 180, 255)
skillTitle.TextSize = 17
skillTitle.Font = Enum.Font.GothamBold
skillTitle.Text = "SKILL POINTS"
skillTitle.Parent = skillPanel

local skillNames = {"ATK", "Agility", "Vitality"}
local skillBtns = {}

for idx, name in ipairs(skillNames) do
	local row = Instance.new("Frame")
	row.Size = UDim2.new(1, -20, 0, 36)
	row.Position = UDim2.new(0, 10, 0, 30 + (idx-1) * 40)
	row.BackgroundTransparency = 1
	row.Parent = skillPanel

	local label = Instance.new("TextLabel")
	label.Name = "Label"
	label.Size = UDim2.new(0.6, 0, 1, 0)
	label.BackgroundTransparency = 1
	label.TextColor3 = Color3.new(1, 1, 1)
	label.TextSize = 15
	label.Font = Enum.Font.Gotham
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.Text = name .. ": 0"
	label.Parent = row

	local btn = Instance.new("TextButton")
	btn.Name = "AddBtn"
	btn.Size = UDim2.new(0, 70, 0, 28)
	btn.Position = UDim2.new(1, -70, 0.5, -14)
	btn.BackgroundColor3 = Color3.fromRGB(50, 150, 50)
	btn.TextColor3 = Color3.new(1, 1, 1)
	btn.TextSize = 14
	btn.Font = Enum.Font.GothamBold
	btn.Text = "+1"
	btn.Parent = row
	Instance.new("UICorner", btn).CornerRadius = UDim.new(0, 4)

	btn.MouseButton1Click:Connect(function()
		if remotes then
			local allocate = remotes:FindFirstChild("AllocateSkillPoint")
			if allocate then
				allocate:FireServer(name)
			end
		end
	end)

	skillBtns[name] = {row = row, label = label, btn = btn}
end

-- Toggle skill panel
local skillPanelOpen = false
skillBtn.MouseButton1Click:Connect(function()
	skillPanelOpen = not skillPanelOpen
	skillPanel.Visible = skillPanelOpen
end)

-- =========================================
-- INVENTORY BUTTON → opens InventoryUI_V25
-- =========================================
invBtn.MouseButton1Click:Connect(function()
	-- V25: Toggle new InventoryUI_V25
	local invUI = playerGui:FindFirstChild("InventoryUI_V25")
	if invUI then
		local panel = invUI:FindFirstChild("InventoryPanel")
		if panel then
			panel.Visible = not panel.Visible
			-- Close skill panel if open
			if panel.Visible and skillPanelOpen then
				skillPanelOpen = false
				skillPanel.Visible = false
			end
			return
		end
	end
end)

-- =========================================
-- ACHIEVEMENTS BUTTON → opens CoolFeatures_V25.AchievementsPanel
-- =========================================
achBtn.MouseButton1Click:Connect(function()
	local cfUI = playerGui:FindFirstChild("CoolFeatures_V25")
	if cfUI then
		local achPanel = cfUI:FindFirstChild("AchievementsPanel")
		if achPanel then
			achPanel.Visible = not achPanel.Visible
		end
	end
end)

-- =========================================
-- NOTIFICATION SYSTEM (bottom-right)
-- =========================================
local notifContainer = Instance.new("Frame")
notifContainer.Name = "Notifications"
notifContainer.Size = UDim2.new(0, 380, 0, 300)
notifContainer.Position = UDim2.new(1, -390, 1, -380)
notifContainer.BackgroundTransparency = 1
notifContainer.Parent = screenGui

local notifLayout = Instance.new("UIListLayout")
notifLayout.SortOrder = Enum.SortOrder.LayoutOrder
notifLayout.VerticalAlignment = Enum.VerticalAlignment.Bottom
notifLayout.Padding = UDim.new(0, 4)
notifLayout.Parent = notifContainer

local notifCount = 0
local function showNotification(message)
	notifCount = notifCount + 1

	local notif = Instance.new("TextLabel")
	notif.Size = UDim2.new(1, 0, 0, 32)
	notif.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
	notif.BackgroundTransparency = 0.2
	notif.TextColor3 = Color3.fromRGB(255, 255, 200)
	notif.TextSize = 15
	notif.Font = Enum.Font.Gotham
	notif.Text = message
	notif.TextWrapped = true
	notif.LayoutOrder = notifCount
	notif.Parent = notifContainer
	Instance.new("UICorner", notif).CornerRadius = UDim.new(0, 6)

	-- Fade out after 5 seconds
	task.delay(5, function()
		for i = 0, 1, 0.05 do
			notif.BackgroundTransparency = 0.2 + i * 0.8
			notif.TextTransparency = i
			task.wait(0.02)
		end
		notif:Destroy()
	end)
end

-- =========================================
-- CAPTURE RESULT POPUP
-- =========================================
local function showCaptureResult(success, monsterName, rarity, level)
	local popup = Instance.new("Frame")
	popup.Size = UDim2.new(0, 340, 0, 90)
	popup.Position = UDim2.new(0.5, -170, 0.3, 0)
	popup.BackgroundColor3 = success and Color3.fromRGB(20, 60, 20) or Color3.fromRGB(60, 20, 20)
	popup.BackgroundTransparency = 0.1
	popup.BorderSizePixel = 0
	popup.Parent = screenGui
	Instance.new("UICorner", popup).CornerRadius = UDim.new(0, 12)
	Instance.new("UIStroke", popup).Color = success and Color3.fromRGB(50, 255, 50) or Color3.fromRGB(255, 50, 50)

	local text = Instance.new("TextLabel")
	text.Size = UDim2.new(1, 0, 1, 0)
	text.BackgroundTransparency = 1
	text.TextColor3 = Color3.new(1, 1, 1)
	text.TextSize = 20
	text.Font = Enum.Font.GothamBold
	text.TextWrapped = true

	if success then
		text.Text = "CAPTURE!\n" .. monsterName .. " [" .. rarity .. "] Nv." .. level
	else
		text.Text = "ECHEC!\nLe monstre s'est enfui..."
	end
	text.Parent = popup

	task.delay(3, function()
		popup:Destroy()
	end)
end

-- =========================================
-- CONTROLS HINT (bottom-left)
-- =========================================
local controls = Instance.new("TextLabel")
controls.Name = "ControlsHint"
controls.Size = UDim2.new(0, 220, 0, 90)
controls.Position = UDim2.new(0, 10, 1, -100)
controls.BackgroundColor3 = Color3.fromRGB(20, 20, 30)
controls.BackgroundTransparency = 0.5
controls.TextColor3 = Color3.fromRGB(150, 150, 150)
controls.TextSize = 13
controls.Font = Enum.Font.Gotham
controls.TextWrapped = true
controls.TextXAlignment = Enum.TextXAlignment.Left
controls.TextYAlignment = Enum.TextYAlignment.Top
controls.Text = "Click: Attaquer | E: Capturer\nF: PNJ | 1-5: Hotbar\nP: Skills | I: Inv | B: Bestiaire\nH: Aide | T: Emotes | Shift: Sprint"
controls.Parent = screenGui
Instance.new("UICorner", controls).CornerRadius = UDim.new(0, 6)

-- =========================================
-- STARTER INFO (right side)
-- =========================================
local starterPanel = Instance.new("Frame")
starterPanel.Name = "StarterPanel"
starterPanel.Size = UDim2.new(0, 170, 0, 60)
starterPanel.Position = UDim2.new(1, -175, 0, 10)
starterPanel.BackgroundColor3 = Color3.fromRGB(25, 20, 35)
starterPanel.BackgroundTransparency = 0.2
starterPanel.BorderSizePixel = 0
starterPanel.Visible = false
starterPanel.Parent = screenGui
Instance.new("UICorner", starterPanel).CornerRadius = UDim.new(0, 8)
Instance.new("UIStroke", starterPanel).Color = Color3.fromRGB(180, 100, 255)

local starterName = Instance.new("TextLabel")
starterName.Name = "StarterName"
starterName.Size = UDim2.new(1, -10, 0, 24)
starterName.Position = UDim2.new(0, 10, 0, 5)
starterName.BackgroundTransparency = 1
starterName.TextColor3 = Color3.fromRGB(200, 150, 255)
starterName.TextSize = 16
starterName.Font = Enum.Font.GothamBold
starterName.TextXAlignment = Enum.TextXAlignment.Left
starterName.Text = "Starter"
starterName.Parent = starterPanel

local starterInfo = Instance.new("TextLabel")
starterInfo.Name = "StarterInfo"
starterInfo.Size = UDim2.new(1, -10, 0, 20)
starterInfo.Position = UDim2.new(0, 10, 0, 30)
starterInfo.BackgroundTransparency = 1
starterInfo.TextColor3 = Color3.fromRGB(180, 180, 180)
starterInfo.TextSize = 14
starterInfo.Font = Enum.Font.Gotham
starterInfo.TextXAlignment = Enum.TextXAlignment.Left
starterInfo.Text = "Nv.1 XP: 0"
starterInfo.Parent = starterPanel

-- =========================================
-- UPDATE LOOP
-- =========================================
task.spawn(function()
	while true do
		task.wait(0.5)

		local currentClass = player:GetAttribute("CurrentClass") or "Novice"
		local level = player:GetAttribute("PlayerLevel") or 1
		local xp = player:GetAttribute("PlayerXP") or 0
		local goldW = player:GetAttribute("GoldWallet") or 0
		local goldB = player:GetAttribute("GoldBank") or 0
		local villeLevel = player:GetAttribute("VilleLevel") or 1
		local villeEra = player:GetAttribute("VilleEra") or 1
		local skillPts = player:GetAttribute("SkillPointsAvailable") or 0
		local atkPts = player:GetAttribute("SkillATK") or 0
		local agiPts = player:GetAttribute("SkillAgility") or 0
		local vitPts = player:GetAttribute("SkillVitality") or 0
		local totalKills = player:GetAttribute("TotalKills") or 0
		local totalCaptures = player:GetAttribute("TotalCaptures") or 0
		local bossKills = player:GetAttribute("BossesKilled") or 0
		local monsterCount = player:GetAttribute("MonsterCount") or 0
		local storageCapacity = player:GetAttribute("StorageCapacity") or 5
		local orbs = player:GetAttribute("CaptureOrbs") or 0
		local rebirths = player:GetAttribute("PlayerRebirths") or 0

		-- XP formula: 100 * 1.15^(level-1)
		local xpRequired = math.floor(100 * math.pow(1.15, level - 1))
		local xpRatio = math.clamp(xp / math.max(xpRequired, 1), 0, 1)

		-- Era names
		local eraNames = {"Primitive", "Bronze", "Fer", "Magique", "Cristalline", "Celeste"}
		local eraName = eraNames[villeEra] or "?"

		-- Update labels
		local rebirthStr = rebirths > 0 and (" [R" .. rebirths .. "]") or ""
		titleLabel.Text = player.Name .. rebirthStr
		classLabel.Text = currentClass .. " Nv." .. level
		xpBarFill.Size = UDim2.new(xpRatio, 0, 1, 0)
		xpText.Text = "XP: " .. xp .. "/" .. xpRequired
		goldLabel.Text = "💰 " .. goldW .. "g (Banque: " .. goldB .. "g)"
		statsLabel.Text = "⚔ATK:" .. atkPts .. " ⚡AGI:" .. agiPts .. " ❤VIT:" .. vitPts
		villeLabel.Text = "🏘 Ville Nv." .. villeLevel .. " | Ere " .. eraName
		monsterLabel.Text = "🐾 Monstres: " .. monsterCount .. "/" .. storageCapacity
		killsLabel.Text = "Kills: " .. totalKills .. " | Captures: " .. totalCaptures .. " | Boss: " .. bossKills

		-- Update hotbar slot 2: show Laser when obtained
		local hasLaser = player:GetAttribute("HasCaptureLaser")
		if hasLaser then
			hotbarSlots[2].Text = "Laser"
			hotbarSlots[2].TextColor3 = Color3.fromRGB(100, 255, 200)
		else
			hotbarSlots[2].Text = "Vide"
			hotbarSlots[2].TextColor3 = Color3.fromRGB(150, 150, 150)
		end

		-- Skill points button
		skillBtn.Text = "SKILLS (" .. skillPts .. ")"
		if skillPts > 0 then
			skillBtn.BackgroundColor3 = Color3.fromRGB(50, 180, 50)
		else
			skillBtn.BackgroundColor3 = Color3.fromRGB(60, 100, 180)
		end

		-- Skill panel
		if skillBtns.ATK then
			skillBtns.ATK.label.Text = "ATK: " .. atkPts .. " (+" .. string.format("%.1f", atkPts * 1.5) .. " dmg)"
			skillBtns.Agility.label.Text = "Agility: " .. agiPts .. " (+" .. string.format("%.1f", agiPts * 0.5) .. "% spd)"
			skillBtns.Vitality.label.Text = "Vitality: " .. vitPts .. " (+" .. (vitPts * 5) .. " HP)"
		end

		-- Starter panel
		local sName = player:GetAttribute("StarterName")
		if sName then
			starterPanel.Visible = true
			starterName.Text = "⭐ " .. sName
			starterInfo.Text = "Nv." .. (player:GetAttribute("StarterLevel") or 1) .. " XP:" .. (player:GetAttribute("StarterXP") or 0)
		end

		-- Player HP bar
		local character = player.Character
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		if humanoid then
			local hp = math.ceil(humanoid.Health)
			local maxHP = math.ceil(humanoid.MaxHealth)
			local ratio = math.clamp(humanoid.Health / math.max(humanoid.MaxHealth, 1), 0, 1)
			hpBarFill.Size = UDim2.new(ratio, 0, 1, 0)
			hpTextLabel.Text = "HP: " .. hp .. "/" .. maxHP
			if ratio > 0.5 then
				hpBarFill.BackgroundColor3 = Color3.fromRGB(50, 200, 50)
			elseif ratio > 0.25 then
				hpBarFill.BackgroundColor3 = Color3.fromRGB(220, 180, 50)
			else
				hpBarFill.BackgroundColor3 = Color3.fromRGB(220, 50, 50)
			end
		end
	end
end)

-- =========================================
-- REMOTES: LISTEN
-- =========================================
if remotes then
	-- Notifications
	local notifyR = remotes:FindFirstChild("NotifyPlayer")
	if notifyR then
		notifyR.OnClientEvent:Connect(function(message)
			showNotification(message)
		end)
	end

	-- Wave updates
	local waveR = remotes:FindFirstChild("WaveUpdate")
	if waveR then
		waveR.OnClientEvent:Connect(function(wave, alive, remaining)
			waveLabel.Text = "VAGUE " .. (wave or 0)
			if remaining and remaining > 0 then
				monstersLeft.Text = remaining .. " monstres restants (" .. (alive or 0) .. " en vie)"
			else
				monstersLeft.Text = "Vague terminee!"
			end
		end)
	end

	-- Capture result
	local captureR = remotes:FindFirstChild("CaptureResult")
	if captureR then
		captureR.OnClientEvent:Connect(function(success, name, rarity, level)
			showCaptureResult(success, name, rarity, level)
		end)
	end
end

-- =========================================
-- KEYBOARD SHORTCUTS (NO I KEY - handled by InventoryUI V25)
-- =========================================
local UIS = game:GetService("UserInputService")
UIS.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end

	-- 1-5 for hotbar
	local keyMap = {
		[Enum.KeyCode.One] = 1,
		[Enum.KeyCode.Two] = 2,
		[Enum.KeyCode.Three] = 3,
		[Enum.KeyCode.Four] = 4,
		[Enum.KeyCode.Five] = 5,
	}

	if keyMap[input.KeyCode] then
		local slot = keyMap[input.KeyCode]
		if remotes then
			local selectHotbar = remotes:FindFirstChild("SelectHotbar")
			if selectHotbar then
				selectHotbar:FireServer(slot)
			end
		end
		for j, s in ipairs(hotbarSlots) do
			if j == slot then
				s.BackgroundColor3 = Color3.fromRGB(80, 120, 200)
			else
				s.BackgroundColor3 = Color3.fromRGB(40, 40, 55)
			end
		end
	end

	-- P for skill panel
	if input.KeyCode == Enum.KeyCode.P then
		skillPanelOpen = not skillPanelOpen
		skillPanel.Visible = skillPanelOpen
	end

	-- NOTE: I key is NOT handled here anymore!
	-- It is handled by InventoryUI.client.lua V25 via ContextActionService (prevents camera zoom)
end)

print("[PlayerHUD V25] Ready!")
