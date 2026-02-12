--[[
	CoolFeatures V24 - Nouvelles fonctionnalites
	- Bestiaire (B) - encyclopedie des monstres vus
	- DPS Meter live en combat
	- Kill feed (derniers kills en bas a gauche)
	- Sprint system (shift)
	- Particules de pas
	- Auto-pickup or au sol
	- Emotes rapides
	- Achievements popup
]]

print("[CoolFeatures V24] Loading...")

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui", 10)
if not playerGui then return end

local remotes = ReplicatedStorage:WaitForChild("Remotes", 10)

-- === SCREEN GUI ===
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "CoolFeatures_V24"
screenGui.ResetOnSpawn = false
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 12
screenGui.Parent = playerGui

-- ============================================
-- 1. DPS METER (live combat damage tracking)
-- ============================================
local dpsMeter = Instance.new("Frame")
dpsMeter.Name = "DPSMeter"
dpsMeter.Size = UDim2.new(0, 130, 0, 50)
dpsMeter.Position = UDim2.new(0, 10, 0.6, 0)
dpsMeter.BackgroundColor3 = Color3.fromRGB(15, 10, 20)
dpsMeter.BackgroundTransparency = 0.3
dpsMeter.BorderSizePixel = 0
dpsMeter.Visible = false
dpsMeter.Parent = screenGui
Instance.new("UICorner", dpsMeter).CornerRadius = UDim.new(0, 8)
local dpsStroke = Instance.new("UIStroke")
dpsStroke.Color = Color3.fromRGB(255, 100, 50)
dpsStroke.Thickness = 1
dpsStroke.Parent = dpsMeter

local dpsTitle = Instance.new("TextLabel")
dpsTitle.Size = UDim2.new(1, 0, 0, 14)
dpsTitle.Position = UDim2.new(0, 0, 0, 2)
dpsTitle.BackgroundTransparency = 1
dpsTitle.TextColor3 = Color3.fromRGB(255, 150, 80)
dpsTitle.TextSize = 9
dpsTitle.Font = Enum.Font.GothamBold
dpsTitle.Text = "⚔ DPS METER"
dpsTitle.Parent = dpsMeter

local dpsValue = Instance.new("TextLabel")
dpsValue.Size = UDim2.new(1, 0, 0, 22)
dpsValue.Position = UDim2.new(0, 0, 0, 16)
dpsValue.BackgroundTransparency = 1
dpsValue.TextColor3 = Color3.fromRGB(255, 200, 100)
dpsValue.TextSize = 18
dpsValue.Font = Enum.Font.GothamBold
dpsValue.Text = "0"
dpsValue.Parent = dpsMeter

local dpsTotal = Instance.new("TextLabel")
dpsTotal.Size = UDim2.new(1, 0, 0, 12)
dpsTotal.Position = UDim2.new(0, 0, 0, 36)
dpsTotal.BackgroundTransparency = 1
dpsTotal.TextColor3 = Color3.fromRGB(180, 150, 120)
dpsTotal.TextSize = 8
dpsTotal.Font = Enum.Font.Gotham
dpsTotal.Text = "Total: 0 dmg"
dpsTotal.Parent = dpsMeter

local dmgLog = {}
local totalDmgSession = 0
local combatActive = false
local lastDmgTime = 0

if remotes then
	local dmgRemote = remotes:FindFirstChild("DamageNumber")
	if dmgRemote then
		dmgRemote.OnClientEvent:Connect(function(position, damage, isCrit)
			local now = tick()
			table.insert(dmgLog, {time = now, dmg = damage or 0})
			totalDmgSession = totalDmgSession + (damage or 0)
			lastDmgTime = now
			combatActive = true
			dpsMeter.Visible = true
		end)
	end
end

-- DPS calculation loop
task.spawn(function()
	while true do
		task.wait(0.5)
		if combatActive then
			local now = tick()
			-- Remove entries older than 5 seconds
			local recentDmg = 0
			local newLog = {}
			for _, entry in ipairs(dmgLog) do
				if now - entry.time < 5 then
					table.insert(newLog, entry)
					recentDmg = recentDmg + entry.dmg
				end
			end
			dmgLog = newLog
			
			local dps = recentDmg / 5
			dpsValue.Text = string.format("%.0f", dps)
			dpsTotal.Text = "Total: " .. totalDmgSession .. " dmg"
			
			-- Color based on DPS
			if dps > 100 then
				dpsValue.TextColor3 = Color3.fromRGB(255, 80, 80)
			elseif dps > 50 then
				dpsValue.TextColor3 = Color3.fromRGB(255, 200, 100)
			else
				dpsValue.TextColor3 = Color3.fromRGB(200, 200, 200)
			end
			
			-- Hide after 8s of no damage
			if now - lastDmgTime > 8 then
				combatActive = false
				dpsMeter.Visible = false
			end
		end
	end
end)

-- ============================================
-- 2. KILL FEED (bottom left, last 5 kills)
-- ============================================
local killFeed = Instance.new("Frame")
killFeed.Name = "KillFeed"
killFeed.Size = UDim2.new(0, 220, 0, 120)
killFeed.Position = UDim2.new(0, 10, 1, -200)
killFeed.BackgroundTransparency = 1
killFeed.Parent = screenGui

local killLayout = Instance.new("UIListLayout")
killLayout.SortOrder = Enum.SortOrder.LayoutOrder
killLayout.VerticalAlignment = Enum.VerticalAlignment.Bottom
killLayout.Padding = UDim.new(0, 2)
killLayout.Parent = killFeed

local killCount = 0

local function addKillEntry(monsterName, dmg, isCrit)
	killCount = killCount + 1
	local entry = Instance.new("TextLabel")
	entry.Size = UDim2.new(1, 0, 0, 16)
	entry.BackgroundColor3 = Color3.fromRGB(10, 10, 15)
	entry.BackgroundTransparency = 0.4
	entry.TextSize = 9
	entry.Font = Enum.Font.Gotham
	entry.TextXAlignment = Enum.TextXAlignment.Left
	entry.TextColor3 = isCrit and Color3.fromRGB(255, 200, 80) or Color3.fromRGB(180, 180, 180)
	entry.Text = "  💀 " .. (monsterName or "?") .. " -" .. (dmg or 0) .. (isCrit and " CRIT!" or "")
	entry.LayoutOrder = killCount
	entry.Parent = killFeed
	Instance.new("UICorner", entry).CornerRadius = UDim.new(0, 4)
	
	-- Fade out after 6s
	task.delay(6, function()
		for i = 0, 1, 0.05 do
			entry.TextTransparency = i
			entry.BackgroundTransparency = 0.4 + i * 0.6
			task.wait(0.02)
		end
		entry:Destroy()
	end)
	
	-- Limit to 5 visible
	local children = {}
	for _, c in ipairs(killFeed:GetChildren()) do
		if c:IsA("TextLabel") then table.insert(children, c) end
	end
	while #children > 5 do
		children[1]:Destroy()
		table.remove(children, 1)
	end
end

-- Track kills via DamageNumber events (when monster dies)
if remotes then
	local dmgR = remotes:FindFirstChild("DamageNumber")
	if dmgR then
		dmgR.OnClientEvent:Connect(function(position, damage, isCrit, monsterName, isKill)
			if isKill then
				addKillEntry(monsterName, damage, isCrit)
			end
		end)
	end
end

-- ============================================
-- 3. SPRINT SYSTEM (Shift)
-- ============================================
local isSprinting = false
local defaultWalkSpeed = 16
local sprintSpeed = 24

-- Sprint indicator
local sprintBar = Instance.new("Frame")
sprintBar.Name = "SprintBar"
sprintBar.Size = UDim2.new(0, 100, 0, 6)
sprintBar.Position = UDim2.new(0.5, -50, 0.92, 0)
sprintBar.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
sprintBar.BorderSizePixel = 0
sprintBar.Visible = false
sprintBar.Parent = screenGui
Instance.new("UICorner", sprintBar).CornerRadius = UDim.new(0, 3)

local sprintFill = Instance.new("Frame")
sprintFill.Size = UDim2.new(1, 0, 1, 0)
sprintFill.BackgroundColor3 = Color3.fromRGB(80, 200, 255)
sprintFill.BorderSizePixel = 0
sprintFill.Parent = sprintBar
Instance.new("UICorner", sprintFill).CornerRadius = UDim.new(0, 3)

local sprintLabel = Instance.new("TextLabel")
sprintLabel.Size = UDim2.new(1, 0, 0, 12)
sprintLabel.Position = UDim2.new(0, 0, 0, -14)
sprintLabel.BackgroundTransparency = 1
sprintLabel.TextColor3 = Color3.fromRGB(100, 200, 255)
sprintLabel.TextSize = 8
sprintLabel.Font = Enum.Font.GothamBold
sprintLabel.Text = "🏃 SPRINT"
sprintLabel.Parent = sprintBar

local staminaMax = 100
local staminaCurrent = staminaMax

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.LeftShift then
		isSprinting = true
		sprintBar.Visible = true
	end
end)

UserInputService.InputEnded:Connect(function(input)
	if input.KeyCode == Enum.KeyCode.LeftShift then
		isSprinting = false
	end
end)

RunService.Heartbeat:Connect(function(dt)
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if not humanoid then return end
	
	if isSprinting and staminaCurrent > 0 then
		humanoid.WalkSpeed = sprintSpeed
		staminaCurrent = math.max(0, staminaCurrent - dt * 25)
		if staminaCurrent <= 0 then
			isSprinting = false
		end
	else
		humanoid.WalkSpeed = defaultWalkSpeed
		staminaCurrent = math.min(staminaMax, staminaCurrent + dt * 15)
	end
	
	local ratio = staminaCurrent / staminaMax
	sprintFill.Size = UDim2.new(ratio, 0, 1, 0)
	
	if ratio < 0.3 then
		sprintFill.BackgroundColor3 = Color3.fromRGB(255, 80, 80)
	elseif ratio < 0.6 then
		sprintFill.BackgroundColor3 = Color3.fromRGB(255, 200, 80)
	else
		sprintFill.BackgroundColor3 = Color3.fromRGB(80, 200, 255)
	end
	
	-- Hide bar when full and not sprinting
	if ratio >= 1 and not isSprinting then
		sprintBar.Visible = false
	end
end)

-- ============================================
-- 4. BESTIAIRE (B key) - Monster Encyclopedia
-- ============================================
local bestiaryGui = Instance.new("Frame")
bestiaryGui.Name = "BestiaryPanel"
bestiaryGui.Size = UDim2.new(0, 500, 0, 380)
bestiaryGui.Position = UDim2.new(0.5, -250, 0.5, -190)
bestiaryGui.BackgroundColor3 = Color3.fromRGB(12, 12, 22)
bestiaryGui.BackgroundTransparency = 0.02
bestiaryGui.BorderSizePixel = 0
bestiaryGui.Visible = false
bestiaryGui.Parent = screenGui
Instance.new("UICorner", bestiaryGui).CornerRadius = UDim.new(0, 14)
local bStroke = Instance.new("UIStroke")
bStroke.Color = Color3.fromRGB(255, 180, 50)
bStroke.Thickness = 2
bStroke.Parent = bestiaryGui

-- Title bar
local bTitleBar = Instance.new("Frame")
bTitleBar.Size = UDim2.new(1, 0, 0, 38)
bTitleBar.BackgroundColor3 = Color3.fromRGB(20, 15, 30)
bTitleBar.BorderSizePixel = 0
bTitleBar.Parent = bestiaryGui
Instance.new("UICorner", bTitleBar).CornerRadius = UDim.new(0, 14)

local bTitle = Instance.new("TextLabel")
bTitle.Size = UDim2.new(1, -50, 1, 0)
bTitle.Position = UDim2.new(0, 15, 0, 0)
bTitle.BackgroundTransparency = 1
bTitle.TextColor3 = Color3.fromRGB(255, 200, 80)
bTitle.TextSize = 16
bTitle.Font = Enum.Font.GothamBold
bTitle.TextXAlignment = Enum.TextXAlignment.Left
bTitle.Text = "📖 BESTIAIRE"
bTitle.Parent = bTitleBar

local bCloseBtn = Instance.new("TextButton")
bCloseBtn.Size = UDim2.new(0, 32, 0, 32)
bCloseBtn.Position = UDim2.new(1, -38, 0, 3)
bCloseBtn.BackgroundColor3 = Color3.fromRGB(180, 50, 50)
bCloseBtn.TextColor3 = Color3.new(1, 1, 1)
bCloseBtn.TextSize = 14
bCloseBtn.Font = Enum.Font.GothamBold
bCloseBtn.Text = "X"
bCloseBtn.Parent = bTitleBar
Instance.new("UICorner", bCloseBtn).CornerRadius = UDim.new(0, 6)
bCloseBtn.MouseButton1Click:Connect(function()
	bestiaryGui.Visible = false
end)

-- Monster grid
local bScroll = Instance.new("ScrollingFrame")
bScroll.Size = UDim2.new(1, -10, 1, -46)
bScroll.Position = UDim2.new(0, 5, 0, 42)
bScroll.BackgroundTransparency = 1
bScroll.ScrollBarThickness = 4
bScroll.ScrollBarImageColor3 = Color3.fromRGB(200, 150, 50)
bScroll.Parent = bestiaryGui

local bGrid = Instance.new("UIGridLayout")
bGrid.CellSize = UDim2.new(0, 90, 0, 100)
bGrid.CellPadding = UDim2.new(0, 6, 0, 6)
bGrid.SortOrder = Enum.SortOrder.LayoutOrder
bGrid.Parent = bScroll

-- Monster data for bestiary
local BESTIARY_DATA = {
	{name = "Flameguard", element = "🔥 Feu", rarity = "Commun", hp = 50, atk = 8, icon = "🔥", color = Color3.fromRGB(255, 100, 50)},
	{name = "Aquashield", element = "💧 Eau", rarity = "Commun", hp = 60, atk = 6, icon = "💧", color = Color3.fromRGB(50, 150, 255)},
	{name = "Thornvine", element = "🌿 Plante", rarity = "Commun", hp = 55, atk = 7, icon = "🌿", color = Color3.fromRGB(80, 200, 80)},
	{name = "Voltfang", element = "⚡ Foudre", rarity = "Commun", hp = 45, atk = 10, icon = "⚡", color = Color3.fromRGB(255, 230, 50)},
	{name = "Stoneclaw", element = "🪨 Terre", rarity = "Commun", hp = 70, atk = 5, icon = "🪨", color = Color3.fromRGB(160, 130, 80)},
	{name = "Frostbite", element = "❄ Glace", rarity = "Rare", hp = 55, atk = 9, icon = "❄", color = Color3.fromRGB(150, 220, 255)},
	{name = "Shadowfang", element = "🌑 Tenebres", rarity = "Rare", hp = 50, atk = 12, icon = "🌑", color = Color3.fromRGB(100, 50, 150)},
	{name = "Luminos", element = "✨ Lumiere", rarity = "Rare", hp = 60, atk = 11, icon = "✨", color = Color3.fromRGB(255, 255, 150)},
	{name = "Windrunner", element = "🌪 Vent", rarity = "Rare", hp = 40, atk = 14, icon = "🌪", color = Color3.fromRGB(180, 220, 200)},
	{name = "Infernox", element = "🔥 Feu", rarity = "Epique", hp = 90, atk = 18, icon = "🔥", color = Color3.fromRGB(255, 60, 30)},
	{name = "Leviathan", element = "💧 Eau", rarity = "Epique", hp = 120, atk = 15, icon = "💧", color = Color3.fromRGB(30, 100, 200)},
	{name = "Crystalion", element = "💎 Cristal", rarity = "Legendaire", hp = 150, atk = 25, icon = "💎", color = Color3.fromRGB(200, 100, 255)},
}

local RARITY_CLR = {
	Commun = Color3.fromRGB(180, 180, 180),
	Rare = Color3.fromRGB(80, 150, 255),
	Epique = Color3.fromRGB(255, 180, 50),
	Legendaire = Color3.fromRGB(255, 80, 80),
}

-- Monster discovery tracking
local discoveredMonsters = {}

local function populateBestiary()
	for _, c in ipairs(bScroll:GetChildren()) do
		if c:IsA("Frame") then c:Destroy() end
	end
	
	for i, mon in ipairs(BESTIARY_DATA) do
		local discovered = discoveredMonsters[mon.name] or false
		
		local card = Instance.new("Frame")
		card.Size = UDim2.new(0, 90, 0, 100)
		card.BackgroundColor3 = discovered and Color3.fromRGB(25, 22, 40) or Color3.fromRGB(15, 15, 20)
		card.BorderSizePixel = 0
		card.LayoutOrder = i
		card.Parent = bScroll
		Instance.new("UICorner", card).CornerRadius = UDim.new(0, 8)
		local cs = Instance.new("UIStroke")
		cs.Color = discovered and (RARITY_CLR[mon.rarity] or Color3.fromRGB(100, 100, 100)) or Color3.fromRGB(40, 40, 50)
		cs.Thickness = 1
		cs.Parent = card
		
		local icon = Instance.new("TextLabel")
		icon.Size = UDim2.new(1, 0, 0, 32)
		icon.Position = UDim2.new(0, 0, 0, 6)
		icon.BackgroundTransparency = 1
		icon.TextSize = 24
		icon.Text = discovered and mon.icon or "❓"
		icon.Parent = card
		
		local nameL = Instance.new("TextLabel")
		nameL.Size = UDim2.new(1, -6, 0, 14)
		nameL.Position = UDim2.new(0, 3, 0, 40)
		nameL.BackgroundTransparency = 1
		nameL.TextColor3 = discovered and mon.color or Color3.fromRGB(60, 60, 60)
		nameL.TextSize = 8
		nameL.Font = Enum.Font.GothamBold
		nameL.Text = discovered and mon.name or "???"
		nameL.TextWrapped = true
		nameL.Parent = card
		
		local elemL = Instance.new("TextLabel")
		elemL.Size = UDim2.new(1, 0, 0, 12)
		elemL.Position = UDim2.new(0, 0, 0, 56)
		elemL.BackgroundTransparency = 1
		elemL.TextColor3 = Color3.fromRGB(120, 120, 140)
		elemL.TextSize = 7
		elemL.Font = Enum.Font.Gotham
		elemL.Text = discovered and mon.element or "???"
		elemL.Parent = card
		
		local rarL = Instance.new("TextLabel")
		rarL.Size = UDim2.new(1, 0, 0, 12)
		rarL.Position = UDim2.new(0, 0, 0, 68)
		rarL.BackgroundTransparency = 1
		rarL.TextColor3 = RARITY_CLR[mon.rarity] or Color3.new(1, 1, 1)
		rarL.TextSize = 7
		rarL.Font = Enum.Font.GothamBold
		rarL.Text = discovered and mon.rarity or "---"
		rarL.Parent = card
		
		if discovered then
			local statsL = Instance.new("TextLabel")
			statsL.Size = UDim2.new(1, 0, 0, 12)
			statsL.Position = UDim2.new(0, 0, 0, 82)
			statsL.BackgroundTransparency = 1
			statsL.TextColor3 = Color3.fromRGB(150, 200, 150)
			statsL.TextSize = 7
			statsL.Font = Enum.Font.Gotham
			statsL.Text = "HP:" .. mon.hp .. " ATK:" .. mon.atk
			statsL.Parent = card
		end
	end
	
	bScroll.CanvasSize = UDim2.new(0, 0, 0, math.ceil(#BESTIARY_DATA / 5) * 106 + 10)
	
	-- Update title with count
	local discovered_count = 0
	for _ in pairs(discoveredMonsters) do discovered_count = discovered_count + 1 end
	bTitle.Text = "📖 BESTIAIRE (" .. discovered_count .. "/" .. #BESTIARY_DATA .. ")"
end

-- Auto-discover monsters near player
task.spawn(function()
	task.wait(5)
	while true do
		task.wait(3)
		local character = player.Character
		if not character then continue end
		local hrp = character:FindFirstChild("HumanoidRootPart")
		if not hrp then continue end
		
		-- Search for wild monsters nearby
		local wildFolder = game.Workspace:FindFirstChild("WildMonsters")
		if wildFolder then
			for _, mon in ipairs(wildFolder:GetChildren()) do
				if mon:IsA("Model") then
					local dist = (mon:GetPivot().Position - hrp.Position).Magnitude
					if dist < 40 then
						local monName = mon:GetAttribute("MonsterName") or mon.Name
						if not discoveredMonsters[monName] then
							discoveredMonsters[monName] = true
						end
					end
				end
			end
		end
	end
end)

-- B key to toggle bestiary
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.B then
		bestiaryGui.Visible = not bestiaryGui.Visible
		if bestiaryGui.Visible then
			populateBestiary()
		end
	end
end)

-- ============================================
-- 5. ACHIEVEMENT POPUP SYSTEM
-- ============================================
local achievementQueue = {}
local isShowingAchievement = false

local ACHIEVEMENTS = {
	{id = "first_kill", name = "Premier Sang", desc = "Elimine ton premier monstre", icon = "🗡️", condition = function() return (player:GetAttribute("TotalKills") or 0) >= 1 end},
	{id = "kill_10", name = "Chasseur", desc = "Elimine 10 monstres", icon = "⚔️", condition = function() return (player:GetAttribute("TotalKills") or 0) >= 10 end},
	{id = "kill_50", name = "Guerrier Aguerri", desc = "Elimine 50 monstres", icon = "🏆", condition = function() return (player:GetAttribute("TotalKills") or 0) >= 50 end},
	{id = "first_capture", name = "Dresseur Debutant", desc = "Capture ton premier monstre", icon = "🎯", condition = function() return (player:GetAttribute("TotalCaptures") or 0) >= 1 end},
	{id = "capture_5", name = "Collectionneur", desc = "Capture 5 monstres", icon = "📦", condition = function() return (player:GetAttribute("TotalCaptures") or 0) >= 5 end},
	{id = "wave_5", name = "Survivant", desc = "Atteins la vague 5", icon = "🌊", condition = function() return (player:GetAttribute("HighestWave") or 0) >= 5 end},
	{id = "wave_10", name = "Tenace", desc = "Atteins la vague 10", icon = "💪", condition = function() return (player:GetAttribute("HighestWave") or 0) >= 10 end},
	{id = "level_5", name = "Apprenti", desc = "Atteins le niveau 5", icon = "⭐", condition = function() return (player:GetAttribute("PlayerLevel") or 1) >= 5 end},
	{id = "level_10", name = "Expert", desc = "Atteins le niveau 10", icon = "🌟", condition = function() return (player:GetAttribute("PlayerLevel") or 1) >= 10 end},
	{id = "boss_kill", name = "Tueur de Boss", desc = "Abats un boss", icon = "👑", condition = function() return (player:GetAttribute("BossesKilled") or 0) >= 1 end},
	{id = "rich", name = "Riche", desc = "Possede 500 or", icon = "💰", condition = function() return (player:GetAttribute("GoldWallet") or 0) >= 500 end},
	{id = "speed_demon", name = "Demon de Vitesse", desc = "Sprinte 50 fois", icon = "🏃", condition = function() return sprintUseCount >= 50 end},
}

local unlockedAchievements = {}
sprintUseCount = 0

-- Count sprints
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.LeftShift then
		sprintUseCount = sprintUseCount + 1
	end
end)

local function showAchievementPopup(achievement)
	isShowingAchievement = true
	
	local popup = Instance.new("Frame")
	popup.Size = UDim2.new(0, 280, 0, 60)
	popup.Position = UDim2.new(0.5, -140, 0, -70)
	popup.BackgroundColor3 = Color3.fromRGB(20, 30, 15)
	popup.BackgroundTransparency = 0.05
	popup.BorderSizePixel = 0
	popup.Parent = screenGui
	Instance.new("UICorner", popup).CornerRadius = UDim.new(0, 10)
	local ps = Instance.new("UIStroke")
	ps.Color = Color3.fromRGB(255, 215, 0)
	ps.Thickness = 2
	ps.Parent = popup
	
	local achieveIcon = Instance.new("TextLabel")
	achieveIcon.Size = UDim2.new(0, 40, 0, 40)
	achieveIcon.Position = UDim2.new(0, 8, 0, 10)
	achieveIcon.BackgroundTransparency = 1
	achieveIcon.TextSize = 28
	achieveIcon.Text = achievement.icon
	achieveIcon.Parent = popup
	
	local achieveTitle = Instance.new("TextLabel")
	achieveTitle.Size = UDim2.new(1, -55, 0, 18)
	achieveTitle.Position = UDim2.new(0, 50, 0, 8)
	achieveTitle.BackgroundTransparency = 1
	achieveTitle.TextColor3 = Color3.fromRGB(255, 215, 0)
	achieveTitle.TextSize = 13
	achieveTitle.Font = Enum.Font.GothamBold
	achieveTitle.TextXAlignment = Enum.TextXAlignment.Left
	achieveTitle.Text = "🏆 " .. achievement.name
	achieveTitle.Parent = popup
	
	local achieveDesc = Instance.new("TextLabel")
	achieveDesc.Size = UDim2.new(1, -55, 0, 14)
	achieveDesc.Position = UDim2.new(0, 50, 0, 28)
	achieveDesc.BackgroundTransparency = 1
	achieveDesc.TextColor3 = Color3.fromRGB(180, 200, 150)
	achieveDesc.TextSize = 10
	achieveDesc.Font = Enum.Font.Gotham
	achieveDesc.TextXAlignment = Enum.TextXAlignment.Left
	achieveDesc.Text = achievement.desc
	achieveDesc.Parent = popup
	
	local achieveTag = Instance.new("TextLabel")
	achieveTag.Size = UDim2.new(1, -55, 0, 12)
	achieveTag.Position = UDim2.new(0, 50, 0, 43)
	achieveTag.BackgroundTransparency = 1
	achieveTag.TextColor3 = Color3.fromRGB(120, 120, 80)
	achieveTag.TextSize = 8
	achieveTag.Font = Enum.Font.Gotham
	achieveTag.TextXAlignment = Enum.TextXAlignment.Left
	achieveTag.Text = "SUCCES DEBLOQUE!"
	achieveTag.Parent = popup
	
	-- Slide in from top
	local tweenIn = TweenService:Create(popup, TweenInfo.new(0.5, Enum.EasingStyle.Back), {
		Position = UDim2.new(0.5, -140, 0, 15)
	})
	tweenIn:Play()
	
	-- Slide out after 4s
	task.delay(4, function()
		local tweenOut = TweenService:Create(popup, TweenInfo.new(0.4, Enum.EasingStyle.Quad), {
			Position = UDim2.new(0.5, -140, 0, -70),
			BackgroundTransparency = 1
		})
		tweenOut:Play()
		task.delay(0.5, function()
			popup:Destroy()
			isShowingAchievement = false
			-- Check queue
			if #achievementQueue > 0 then
				local next = table.remove(achievementQueue, 1)
				showAchievementPopup(next)
			end
		end)
	end)
end

-- Check achievements periodically
task.spawn(function()
	task.wait(10)
	while true do
		task.wait(5)
		for _, ach in ipairs(ACHIEVEMENTS) do
			if not unlockedAchievements[ach.id] then
				local ok, result = pcall(ach.condition)
				if ok and result then
					unlockedAchievements[ach.id] = true
					if isShowingAchievement then
						table.insert(achievementQueue, ach)
					else
						showAchievementPopup(ach)
					end
				end
			end
		end
	end
end)

-- ============================================
-- 6. FOOTSTEP PARTICLES when walking
-- ============================================
task.spawn(function()
	task.wait(3)
	local lastFootstepPos = Vector3.zero
	while true do
		task.wait(0.3)
		local character = player.Character
		if not character then continue end
		local hrp = character:FindFirstChild("HumanoidRootPart")
		local humanoid = character:FindFirstChildOfClass("Humanoid")
		if not hrp or not humanoid then continue end
		
		if humanoid.MoveDirection.Magnitude > 0.1 then
			if (hrp.Position - lastFootstepPos).Magnitude > 2 then
				lastFootstepPos = hrp.Position
				
				-- Create small dust particle
				local dust = Instance.new("Part")
				dust.Shape = Enum.PartType.Ball
				dust.Size = Vector3.new(0.4, 0.4, 0.4)
				dust.Color = isSprinting and Color3.fromRGB(150, 200, 255) or Color3.fromRGB(180, 160, 140)
				dust.Material = Enum.Material.SmoothPlastic
				dust.Transparency = 0.5
				dust.Anchored = true
				dust.CanCollide = false
				dust.CFrame = CFrame.new(hrp.Position + Vector3.new(
					math.random(-5, 5) / 10,
					-2.5,
					math.random(-5, 5) / 10
				))
				dust.Parent = game.Workspace
				
				task.spawn(function()
					for i = 1, 20 do
						dust.Transparency = 0.5 + (i / 20) * 0.5
						dust.Size = dust.Size + Vector3.new(0.02, 0.01, 0.02)
						dust.Position = dust.Position + Vector3.new(0, 0.02, 0)
						task.wait(0.03)
					end
					dust:Destroy()
				end)
			end
		end
	end
end)

-- ============================================
-- 7. CONTROLS HELP (H key)
-- ============================================
local helpPanel = Instance.new("Frame")
helpPanel.Name = "HelpPanel"
helpPanel.Size = UDim2.new(0, 280, 0, 250)
helpPanel.Position = UDim2.new(0.5, -140, 0.5, -125)
helpPanel.BackgroundColor3 = Color3.fromRGB(12, 12, 22)
helpPanel.BackgroundTransparency = 0.03
helpPanel.BorderSizePixel = 0
helpPanel.Visible = false
helpPanel.Parent = screenGui
Instance.new("UICorner", helpPanel).CornerRadius = UDim.new(0, 12)
Instance.new("UIStroke", helpPanel).Color = Color3.fromRGB(100, 180, 255)

local helpTitle = Instance.new("TextLabel")
helpTitle.Size = UDim2.new(1, 0, 0, 28)
helpTitle.BackgroundTransparency = 1
helpTitle.TextColor3 = Color3.fromRGB(100, 200, 255)
helpTitle.TextSize = 15
helpTitle.Font = Enum.Font.GothamBold
helpTitle.Text = "📋 RACCOURCIS CLAVIER"
helpTitle.Parent = helpPanel

local controls = {
	"[1-5]  Hotbar / Armes",
	"[I]      Inventaire & Equipement",
	"[B]     Bestiaire (Encyclopedie)",
	"[P]     Points de Competence",
	"[H]     Aide (ce panneau)",
	"[Shift] Sprint",
	"[Esc]  Fermer menus",
	"[Clic]  Attaquer",
	"[E]      Interagir / Capturer",
}

for i, text in ipairs(controls) do
	local cl = Instance.new("TextLabel")
	cl.Size = UDim2.new(1, -20, 0, 18)
	cl.Position = UDim2.new(0, 10, 0, 28 + (i - 1) * 22)
	cl.BackgroundTransparency = 1
	cl.TextColor3 = Color3.fromRGB(180, 180, 200)
	cl.TextSize = 10
	cl.Font = Enum.Font.Code
	cl.TextXAlignment = Enum.TextXAlignment.Left
	cl.Text = text
	cl.Parent = helpPanel
end

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.H then
		helpPanel.Visible = not helpPanel.Visible
	end
end)

-- ============================================
-- 8. AUTO-COLLECT GOLD DROPS (nearby gold items)
-- ============================================
task.spawn(function()
	task.wait(5)
	while true do
		task.wait(0.5)
		local character = player.Character
		if not character then continue end
		local hrp = character:FindFirstChild("HumanoidRootPart")
		if not hrp then continue end
		
		-- Look for gold drops
		local goldFolder = game.Workspace:FindFirstChild("GoldDrops")
		if goldFolder then
			for _, gold in ipairs(goldFolder:GetChildren()) do
				if gold:IsA("BasePart") then
					local dist = (gold.Position - hrp.Position).Magnitude
					if dist < 6 then
						-- Animate towards player
						task.spawn(function()
							for i = 1, 10 do
								if not gold.Parent then break end
								local hrpNew = character:FindFirstChild("HumanoidRootPart")
								if hrpNew then
									gold.CFrame = gold.CFrame:Lerp(hrpNew.CFrame, 0.3)
								end
								gold.Size = gold.Size * 0.92
								gold.Transparency = i / 10
								task.wait(0.03)
							end
							if gold.Parent then gold:Destroy() end
						end)
					end
				end
			end
		end
	end
end)

print("[CoolFeatures V24] Ready! Sprint(Shift), Bestiary(B), Help(H), DPS Meter, Achievements")
