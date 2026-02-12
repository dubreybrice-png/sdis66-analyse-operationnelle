--[[
	CoolFeatures V25 - Bigger text + Achievements Panel + New features
	1. DPS Meter (live combat damage)
	2. Kill Feed (derniers kills)
	3. Sprint System (Shift + stamina)
	4. Bestiary (B key)
	5. Achievement System + PANEL COMPLET (viewable from menu!)
	6. Footstep Particles
	7. Controls Help (H key)
	8. Auto-collect Gold
	NEW V25:
	9. Combo Counter (hits consecutifs)
	10. Screen Damage Flash (flash rouge quand touche)
	11. Auto-heal near crystal
	12. Boss Warning Banner
	13. Time Played Counter
	14. Emotes rapides (numpad)
]]

print("[CoolFeatures V25] Loading...")

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
screenGui.Name = "CoolFeatures_V25"
screenGui.ResetOnSpawn = false
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.DisplayOrder = 12
screenGui.Parent = playerGui

-- ============================================
-- 1. DPS METER
-- ============================================
local dpsMeter = Instance.new("Frame")
dpsMeter.Name = "DPSMeter"
dpsMeter.Size = UDim2.new(0, 160, 0, 70)
dpsMeter.Position = UDim2.new(0, 10, 0.55, 0)
dpsMeter.BackgroundColor3 = Color3.fromRGB(15, 10, 20)
dpsMeter.BackgroundTransparency = 0.3
dpsMeter.BorderSizePixel = 0
dpsMeter.Visible = false
dpsMeter.Parent = screenGui
Instance.new("UICorner", dpsMeter).CornerRadius = UDim.new(0, 8)
Instance.new("UIStroke", dpsMeter).Color = Color3.fromRGB(255, 100, 50)

local dpsTitle = Instance.new("TextLabel")
dpsTitle.Size = UDim2.new(1, 0, 0, 18)
dpsTitle.Position = UDim2.new(0, 0, 0, 2)
dpsTitle.BackgroundTransparency = 1
dpsTitle.TextColor3 = Color3.fromRGB(255, 150, 80)
dpsTitle.TextSize = 14
dpsTitle.Font = Enum.Font.GothamBold
dpsTitle.Text = "⚔ DPS METER"
dpsTitle.Parent = dpsMeter

local dpsValue = Instance.new("TextLabel")
dpsValue.Size = UDim2.new(1, 0, 0, 28)
dpsValue.Position = UDim2.new(0, 0, 0, 20)
dpsValue.BackgroundTransparency = 1
dpsValue.TextColor3 = Color3.fromRGB(255, 200, 100)
dpsValue.TextSize = 24
dpsValue.Font = Enum.Font.GothamBold
dpsValue.Text = "0"
dpsValue.Parent = dpsMeter

local dpsTotal = Instance.new("TextLabel")
dpsTotal.Size = UDim2.new(1, 0, 0, 16)
dpsTotal.Position = UDim2.new(0, 0, 0, 50)
dpsTotal.BackgroundTransparency = 1
dpsTotal.TextColor3 = Color3.fromRGB(180, 150, 120)
dpsTotal.TextSize = 13
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

task.spawn(function()
	while true do
		task.wait(0.5)
		if combatActive then
			local now = tick()
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
			if dps > 100 then
				dpsValue.TextColor3 = Color3.fromRGB(255, 80, 80)
			elseif dps > 50 then
				dpsValue.TextColor3 = Color3.fromRGB(255, 200, 100)
			else
				dpsValue.TextColor3 = Color3.fromRGB(200, 200, 200)
			end
			if now - lastDmgTime > 8 then
				combatActive = false
				dpsMeter.Visible = false
			end
		end
	end
end)

-- ============================================
-- 2. KILL FEED
-- ============================================
local killFeed = Instance.new("Frame")
killFeed.Name = "KillFeed"
killFeed.Size = UDim2.new(0, 280, 0, 140)
killFeed.Position = UDim2.new(0, 10, 1, -220)
killFeed.BackgroundTransparency = 1
killFeed.Parent = screenGui

local killLayout = Instance.new("UIListLayout")
killLayout.SortOrder = Enum.SortOrder.LayoutOrder
killLayout.VerticalAlignment = Enum.VerticalAlignment.Bottom
killLayout.Padding = UDim.new(0, 3)
killLayout.Parent = killFeed

local killCount = 0

local function addKillEntry(monsterName, dmg, isCrit)
	killCount = killCount + 1
	local entry = Instance.new("TextLabel")
	entry.Size = UDim2.new(1, 0, 0, 22)
	entry.BackgroundColor3 = Color3.fromRGB(10, 10, 15)
	entry.BackgroundTransparency = 0.4
	entry.TextSize = 14
	entry.Font = Enum.Font.Gotham
	entry.TextXAlignment = Enum.TextXAlignment.Left
	entry.TextColor3 = isCrit and Color3.fromRGB(255, 200, 80) or Color3.fromRGB(180, 180, 180)
	entry.Text = "  💀 " .. (monsterName or "?") .. " -" .. (dmg or 0) .. (isCrit and " CRIT!" or "")
	entry.LayoutOrder = killCount
	entry.Parent = killFeed
	Instance.new("UICorner", entry).CornerRadius = UDim.new(0, 4)
	task.delay(6, function()
		for i = 0, 1, 0.05 do
			entry.TextTransparency = i
			entry.BackgroundTransparency = 0.4 + i * 0.6
			task.wait(0.02)
		end
		entry:Destroy()
	end)
	local children = {}
	for _, c in ipairs(killFeed:GetChildren()) do
		if c:IsA("TextLabel") then table.insert(children, c) end
	end
	while #children > 5 do
		children[1]:Destroy()
		table.remove(children, 1)
	end
end

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

local sprintBar = Instance.new("Frame")
sprintBar.Name = "SprintBar"
sprintBar.Size = UDim2.new(0, 140, 0, 10)
sprintBar.Position = UDim2.new(0.5, -70, 0.91, 0)
sprintBar.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
sprintBar.BorderSizePixel = 0
sprintBar.Visible = false
sprintBar.Parent = screenGui
Instance.new("UICorner", sprintBar).CornerRadius = UDim.new(0, 5)

local sprintFill = Instance.new("Frame")
sprintFill.Size = UDim2.new(1, 0, 1, 0)
sprintFill.BackgroundColor3 = Color3.fromRGB(80, 200, 255)
sprintFill.BorderSizePixel = 0
sprintFill.Parent = sprintBar
Instance.new("UICorner", sprintFill).CornerRadius = UDim.new(0, 5)

local sprintLabel = Instance.new("TextLabel")
sprintLabel.Size = UDim2.new(1, 0, 0, 16)
sprintLabel.Position = UDim2.new(0, 0, 0, -18)
sprintLabel.BackgroundTransparency = 1
sprintLabel.TextColor3 = Color3.fromRGB(100, 200, 255)
sprintLabel.TextSize = 14
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
		if staminaCurrent <= 0 then isSprinting = false end
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
	if ratio >= 1 and not isSprinting then
		sprintBar.Visible = false
	end
end)

-- ============================================
-- 4. BESTIARY (B key)
-- ============================================
local bestiaryGui = Instance.new("Frame")
bestiaryGui.Name = "BestiaryPanel"
bestiaryGui.Size = UDim2.new(0, 600, 0, 450)
bestiaryGui.Position = UDim2.new(0.5, -300, 0.5, -225)
bestiaryGui.BackgroundColor3 = Color3.fromRGB(12, 12, 22)
bestiaryGui.BackgroundTransparency = 0.02
bestiaryGui.BorderSizePixel = 0
bestiaryGui.Visible = false
bestiaryGui.Parent = screenGui
Instance.new("UICorner", bestiaryGui).CornerRadius = UDim.new(0, 14)
Instance.new("UIStroke", bestiaryGui).Color = Color3.fromRGB(255, 180, 50)

local bTitleBar = Instance.new("Frame")
bTitleBar.Size = UDim2.new(1, 0, 0, 44)
bTitleBar.BackgroundColor3 = Color3.fromRGB(20, 15, 30)
bTitleBar.BorderSizePixel = 0
bTitleBar.Parent = bestiaryGui
Instance.new("UICorner", bTitleBar).CornerRadius = UDim.new(0, 14)

local bTitle = Instance.new("TextLabel")
bTitle.Size = UDim2.new(1, -50, 1, 0)
bTitle.Position = UDim2.new(0, 15, 0, 0)
bTitle.BackgroundTransparency = 1
bTitle.TextColor3 = Color3.fromRGB(255, 200, 80)
bTitle.TextSize = 22
bTitle.Font = Enum.Font.GothamBold
bTitle.TextXAlignment = Enum.TextXAlignment.Left
bTitle.Text = "📖 BESTIAIRE"
bTitle.Parent = bTitleBar

local bCloseBtn = Instance.new("TextButton")
bCloseBtn.Size = UDim2.new(0, 36, 0, 36)
bCloseBtn.Position = UDim2.new(1, -42, 0, 4)
bCloseBtn.BackgroundColor3 = Color3.fromRGB(180, 50, 50)
bCloseBtn.TextColor3 = Color3.new(1, 1, 1)
bCloseBtn.TextSize = 18
bCloseBtn.Font = Enum.Font.GothamBold
bCloseBtn.Text = "X"
bCloseBtn.Parent = bTitleBar
Instance.new("UICorner", bCloseBtn).CornerRadius = UDim.new(0, 6)
bCloseBtn.MouseButton1Click:Connect(function()
	bestiaryGui.Visible = false
end)

local bScroll = Instance.new("ScrollingFrame")
bScroll.Size = UDim2.new(1, -10, 1, -52)
bScroll.Position = UDim2.new(0, 5, 0, 48)
bScroll.BackgroundTransparency = 1
bScroll.ScrollBarThickness = 5
bScroll.ScrollBarImageColor3 = Color3.fromRGB(200, 150, 50)
bScroll.Parent = bestiaryGui

local bGrid = Instance.new("UIGridLayout")
bGrid.CellSize = UDim2.new(0, 120, 0, 130)
bGrid.CellPadding = UDim2.new(0, 8, 0, 8)
bGrid.SortOrder = Enum.SortOrder.LayoutOrder
bGrid.Parent = bScroll

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

local discoveredMonsters = {}

local function populateBestiary()
	for _, c in ipairs(bScroll:GetChildren()) do
		if c:IsA("Frame") then c:Destroy() end
	end
	for i, mon in ipairs(BESTIARY_DATA) do
		local discovered = discoveredMonsters[mon.name] or false
		local card = Instance.new("Frame")
		card.Size = UDim2.new(0, 120, 0, 130)
		card.BackgroundColor3 = discovered and Color3.fromRGB(25, 22, 40) or Color3.fromRGB(15, 15, 20)
		card.BorderSizePixel = 0
		card.LayoutOrder = i
		card.Parent = bScroll
		Instance.new("UICorner", card).CornerRadius = UDim.new(0, 8)
		local cs = Instance.new("UIStroke")
		cs.Color = discovered and (RARITY_CLR[mon.rarity] or Color3.fromRGB(100, 100, 100)) or Color3.fromRGB(40, 40, 50)
		cs.Thickness = 1.5
		cs.Parent = card

		local icon = Instance.new("TextLabel")
		icon.Size = UDim2.new(1, 0, 0, 36)
		icon.Position = UDim2.new(0, 0, 0, 6)
		icon.BackgroundTransparency = 1
		icon.TextSize = 30
		icon.Text = discovered and mon.icon or "❓"
		icon.Parent = card

		local nameL = Instance.new("TextLabel")
		nameL.Size = UDim2.new(1, -8, 0, 20)
		nameL.Position = UDim2.new(0, 4, 0, 44)
		nameL.BackgroundTransparency = 1
		nameL.TextColor3 = discovered and mon.color or Color3.fromRGB(60, 60, 60)
		nameL.TextSize = 14
		nameL.Font = Enum.Font.GothamBold
		nameL.Text = discovered and mon.name or "???"
		nameL.TextWrapped = true
		nameL.Parent = card

		local elemL = Instance.new("TextLabel")
		elemL.Size = UDim2.new(1, 0, 0, 16)
		elemL.Position = UDim2.new(0, 0, 0, 66)
		elemL.BackgroundTransparency = 1
		elemL.TextColor3 = Color3.fromRGB(140, 140, 160)
		elemL.TextSize = 12
		elemL.Font = Enum.Font.Gotham
		elemL.Text = discovered and mon.element or "???"
		elemL.Parent = card

		local rarL = Instance.new("TextLabel")
		rarL.Size = UDim2.new(1, 0, 0, 16)
		rarL.Position = UDim2.new(0, 0, 0, 82)
		rarL.BackgroundTransparency = 1
		rarL.TextColor3 = RARITY_CLR[mon.rarity] or Color3.new(1, 1, 1)
		rarL.TextSize = 12
		rarL.Font = Enum.Font.GothamBold
		rarL.Text = discovered and mon.rarity or "---"
		rarL.Parent = card

		if discovered then
			local statsL = Instance.new("TextLabel")
			statsL.Size = UDim2.new(1, 0, 0, 16)
			statsL.Position = UDim2.new(0, 0, 0, 100)
			statsL.BackgroundTransparency = 1
			statsL.TextColor3 = Color3.fromRGB(150, 200, 150)
			statsL.TextSize = 12
			statsL.Font = Enum.Font.Gotham
			statsL.Text = "HP:" .. mon.hp .. " ATK:" .. mon.atk
			statsL.Parent = card
		end
	end
	bScroll.CanvasSize = UDim2.new(0, 0, 0, math.ceil(#BESTIARY_DATA / 4) * 140 + 10)
	local discovered_count = 0
	for _ in pairs(discoveredMonsters) do discovered_count = discovered_count + 1 end
	bTitle.Text = "📖 BESTIAIRE (" .. discovered_count .. "/" .. #BESTIARY_DATA .. ")"
end

-- Auto-discover nearby monsters
task.spawn(function()
	task.wait(5)
	while true do
		task.wait(3)
		local character = player.Character
		if not character then continue end
		local hrp = character:FindFirstChild("HumanoidRootPart")
		if not hrp then continue end
		for _, mon in ipairs(game.Workspace:GetChildren()) do
			if mon:IsA("Model") and (mon.Name:match("^Wild_") or mon.Name:match("^Boss_")) then
				local pp = mon.PrimaryPart or mon:FindFirstChild("Body")
				if pp then
					local dist = (pp.Position - hrp.Position).Magnitude
					if dist < 50 then
						local monName = mon:GetAttribute("MonsterName") or mon.Name:gsub("Wild_", ""):gsub("Boss_", ""):gsub("_%d+$", "")
						if not discoveredMonsters[monName] then
							discoveredMonsters[monName] = true
						end
					end
				end
			end
		end
	end
end)

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.B then
		bestiaryGui.Visible = not bestiaryGui.Visible
		if bestiaryGui.Visible then populateBestiary() end
	end
end)

-- ============================================
-- 5. ACHIEVEMENTS SYSTEM + FULL PANEL
-- ============================================
local sprintUseCount = 0

local ACHIEVEMENTS = {
	{id = "first_kill", name = "Premier Sang", desc = "Elimine ton premier monstre", icon = "🗡️", condition = function() return (player:GetAttribute("TotalKills") or 0) >= 1 end},
	{id = "kill_10", name = "Chasseur", desc = "Elimine 10 monstres", icon = "⚔️", condition = function() return (player:GetAttribute("TotalKills") or 0) >= 10 end},
	{id = "kill_50", name = "Guerrier Aguerri", desc = "Elimine 50 monstres", icon = "🏆", condition = function() return (player:GetAttribute("TotalKills") or 0) >= 50 end},
	{id = "kill_100", name = "Legende Vivante", desc = "Elimine 100 monstres", icon = "👑", condition = function() return (player:GetAttribute("TotalKills") or 0) >= 100 end},
	{id = "first_capture", name = "Dresseur Debutant", desc = "Capture ton premier monstre", icon = "🎯", condition = function() return (player:GetAttribute("TotalCaptures") or 0) >= 1 end},
	{id = "capture_5", name = "Collectionneur", desc = "Capture 5 monstres", icon = "📦", condition = function() return (player:GetAttribute("TotalCaptures") or 0) >= 5 end},
	{id = "capture_10", name = "Maitre Dresseur", desc = "Capture 10 monstres", icon = "🌟", condition = function() return (player:GetAttribute("TotalCaptures") or 0) >= 10 end},
	{id = "wave_5", name = "Survivant", desc = "Atteins la vague 5", icon = "🌊", condition = function() return (player:GetAttribute("HighestWave") or 0) >= 5 end},
	{id = "wave_10", name = "Tenace", desc = "Atteins la vague 10", icon = "💪", condition = function() return (player:GetAttribute("HighestWave") or 0) >= 10 end},
	{id = "wave_25", name = "Indestructible", desc = "Atteins la vague 25", icon = "🔥", condition = function() return (player:GetAttribute("HighestWave") or 0) >= 25 end},
	{id = "level_5", name = "Apprenti", desc = "Atteins le niveau 5", icon = "⭐", condition = function() return (player:GetAttribute("PlayerLevel") or 1) >= 5 end},
	{id = "level_10", name = "Expert", desc = "Atteins le niveau 10", icon = "🌟", condition = function() return (player:GetAttribute("PlayerLevel") or 1) >= 10 end},
	{id = "level_20", name = "Grand Maitre", desc = "Atteins le niveau 20", icon = "💫", condition = function() return (player:GetAttribute("PlayerLevel") or 1) >= 20 end},
	{id = "boss_kill", name = "Tueur de Boss", desc = "Abats un boss", icon = "👑", condition = function() return (player:GetAttribute("BossesKilled") or 0) >= 1 end},
	{id = "boss_5", name = "Chasseur de Boss", desc = "Abats 5 boss", icon = "💀", condition = function() return (player:GetAttribute("BossesKilled") or 0) >= 5 end},
	{id = "rich", name = "Riche", desc = "Possede 500 or", icon = "💰", condition = function() return (player:GetAttribute("GoldWallet") or 0) >= 500 end},
	{id = "wealthy", name = "Milliardaire", desc = "Possede 2000 or", icon = "💎", condition = function() return (player:GetAttribute("GoldWallet") or 0) >= 2000 end},
	{id = "speed_demon", name = "Demon de Vitesse", desc = "Sprinte 50 fois", icon = "🏃", condition = function() return sprintUseCount >= 50 end},
}

local unlockedAchievements = {}
local achievementQueue = {}
local isShowingAchievement = false

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.LeftShift then
		sprintUseCount = sprintUseCount + 1
	end
end)

local function showAchievementPopup(achievement)
	isShowingAchievement = true
	local popup = Instance.new("Frame")
	popup.Size = UDim2.new(0, 340, 0, 80)
	popup.Position = UDim2.new(0.5, -170, 0, -90)
	popup.BackgroundColor3 = Color3.fromRGB(20, 30, 15)
	popup.BackgroundTransparency = 0.05
	popup.BorderSizePixel = 0
	popup.Parent = screenGui
	Instance.new("UICorner", popup).CornerRadius = UDim.new(0, 10)
	Instance.new("UIStroke", popup).Color = Color3.fromRGB(255, 215, 0)

	local aIcon = Instance.new("TextLabel")
	aIcon.Size = UDim2.new(0, 50, 0, 50)
	aIcon.Position = UDim2.new(0, 10, 0, 15)
	aIcon.BackgroundTransparency = 1
	aIcon.TextSize = 34
	aIcon.Text = achievement.icon
	aIcon.Parent = popup

	local aTitle = Instance.new("TextLabel")
	aTitle.Size = UDim2.new(1, -70, 0, 24)
	aTitle.Position = UDim2.new(0, 65, 0, 10)
	aTitle.BackgroundTransparency = 1
	aTitle.TextColor3 = Color3.fromRGB(255, 215, 0)
	aTitle.TextSize = 18
	aTitle.Font = Enum.Font.GothamBold
	aTitle.TextXAlignment = Enum.TextXAlignment.Left
	aTitle.Text = "🏆 " .. achievement.name
	aTitle.Parent = popup

	local aDesc = Instance.new("TextLabel")
	aDesc.Size = UDim2.new(1, -70, 0, 18)
	aDesc.Position = UDim2.new(0, 65, 0, 36)
	aDesc.BackgroundTransparency = 1
	aDesc.TextColor3 = Color3.fromRGB(180, 200, 150)
	aDesc.TextSize = 14
	aDesc.Font = Enum.Font.Gotham
	aDesc.TextXAlignment = Enum.TextXAlignment.Left
	aDesc.Text = achievement.desc
	aDesc.Parent = popup

	local aTag = Instance.new("TextLabel")
	aTag.Size = UDim2.new(1, -70, 0, 14)
	aTag.Position = UDim2.new(0, 65, 0, 56)
	aTag.BackgroundTransparency = 1
	aTag.TextColor3 = Color3.fromRGB(120, 150, 80)
	aTag.TextSize = 12
	aTag.Font = Enum.Font.Gotham
	aTag.TextXAlignment = Enum.TextXAlignment.Left
	aTag.Text = "SUCCES DEBLOQUE!"
	aTag.Parent = popup

	TweenService:Create(popup, TweenInfo.new(0.5, Enum.EasingStyle.Back), {
		Position = UDim2.new(0.5, -170, 0, 15)
	}):Play()

	task.delay(4, function()
		TweenService:Create(popup, TweenInfo.new(0.4, Enum.EasingStyle.Quad), {
			Position = UDim2.new(0.5, -170, 0, -90),
			BackgroundTransparency = 1
		}):Play()
		task.delay(0.5, function()
			popup:Destroy()
			isShowingAchievement = false
			if #achievementQueue > 0 then
				showAchievementPopup(table.remove(achievementQueue, 1))
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

-- === ACHIEVEMENTS PANEL (full list, toggleable from menu) ===
local achPanel = Instance.new("Frame")
achPanel.Name = "AchievementsPanel"
achPanel.Size = UDim2.new(0, 550, 0, 450)
achPanel.Position = UDim2.new(0.5, -275, 0.5, -225)
achPanel.BackgroundColor3 = Color3.fromRGB(12, 12, 22)
achPanel.BackgroundTransparency = 0.02
achPanel.BorderSizePixel = 0
achPanel.Visible = false
achPanel.Parent = screenGui
Instance.new("UICorner", achPanel).CornerRadius = UDim.new(0, 14)
Instance.new("UIStroke", achPanel).Color = Color3.fromRGB(255, 215, 0)

local achTitleBar = Instance.new("Frame")
achTitleBar.Size = UDim2.new(1, 0, 0, 44)
achTitleBar.BackgroundColor3 = Color3.fromRGB(25, 20, 10)
achTitleBar.BorderSizePixel = 0
achTitleBar.Parent = achPanel
Instance.new("UICorner", achTitleBar).CornerRadius = UDim.new(0, 14)

local achTitle = Instance.new("TextLabel")
achTitle.Size = UDim2.new(1, -50, 1, 0)
achTitle.Position = UDim2.new(0, 15, 0, 0)
achTitle.BackgroundTransparency = 1
achTitle.TextColor3 = Color3.fromRGB(255, 215, 0)
achTitle.TextSize = 22
achTitle.Font = Enum.Font.GothamBold
achTitle.TextXAlignment = Enum.TextXAlignment.Left
achTitle.Text = "🏆 HAUTS FAITS (0/" .. #ACHIEVEMENTS .. ")"
achTitle.Parent = achTitleBar

local achCloseBtn = Instance.new("TextButton")
achCloseBtn.Size = UDim2.new(0, 36, 0, 36)
achCloseBtn.Position = UDim2.new(1, -42, 0, 4)
achCloseBtn.BackgroundColor3 = Color3.fromRGB(180, 50, 50)
achCloseBtn.TextColor3 = Color3.new(1, 1, 1)
achCloseBtn.TextSize = 18
achCloseBtn.Font = Enum.Font.GothamBold
achCloseBtn.Text = "X"
achCloseBtn.Parent = achTitleBar
Instance.new("UICorner", achCloseBtn).CornerRadius = UDim.new(0, 6)
achCloseBtn.MouseButton1Click:Connect(function()
	achPanel.Visible = false
end)

local achScroll = Instance.new("ScrollingFrame")
achScroll.Size = UDim2.new(1, -10, 1, -52)
achScroll.Position = UDim2.new(0, 5, 0, 48)
achScroll.BackgroundTransparency = 1
achScroll.ScrollBarThickness = 5
achScroll.ScrollBarImageColor3 = Color3.fromRGB(255, 200, 50)
achScroll.Parent = achPanel

local achLayout = Instance.new("UIListLayout")
achLayout.SortOrder = Enum.SortOrder.LayoutOrder
achLayout.Padding = UDim.new(0, 4)
achLayout.Parent = achScroll

local function refreshAchievementsPanel()
	for _, c in ipairs(achScroll:GetChildren()) do
		if c:IsA("Frame") then c:Destroy() end
	end
	local unlocked_count = 0
	for i, ach in ipairs(ACHIEVEMENTS) do
		local isUnlocked = unlockedAchievements[ach.id] or false
		if isUnlocked then unlocked_count = unlocked_count + 1 end

		local row = Instance.new("Frame")
		row.Size = UDim2.new(1, -10, 0, 55)
		row.BackgroundColor3 = isUnlocked and Color3.fromRGB(25, 30, 15) or Color3.fromRGB(18, 18, 25)
		row.BackgroundTransparency = 0.1
		row.BorderSizePixel = 0
		row.LayoutOrder = i
		row.Parent = achScroll
		Instance.new("UICorner", row).CornerRadius = UDim.new(0, 8)
		local rs = Instance.new("UIStroke")
		rs.Color = isUnlocked and Color3.fromRGB(255, 215, 0) or Color3.fromRGB(50, 50, 60)
		rs.Thickness = isUnlocked and 1.5 or 0.5
		rs.Parent = row

		local rIcon = Instance.new("TextLabel")
		rIcon.Size = UDim2.new(0, 40, 0, 40)
		rIcon.Position = UDim2.new(0, 8, 0, 7)
		rIcon.BackgroundTransparency = 1
		rIcon.TextSize = 28
		rIcon.Text = isUnlocked and ach.icon or "🔒"
		rIcon.Parent = row

		local rName = Instance.new("TextLabel")
		rName.Size = UDim2.new(0, 250, 0, 22)
		rName.Position = UDim2.new(0, 55, 0, 5)
		rName.BackgroundTransparency = 1
		rName.TextColor3 = isUnlocked and Color3.fromRGB(255, 215, 0) or Color3.fromRGB(100, 100, 110)
		rName.TextSize = 16
		rName.Font = Enum.Font.GothamBold
		rName.TextXAlignment = Enum.TextXAlignment.Left
		rName.Text = ach.name
		rName.Parent = row

		local rDesc = Instance.new("TextLabel")
		rDesc.Size = UDim2.new(0, 300, 0, 18)
		rDesc.Position = UDim2.new(0, 55, 0, 28)
		rDesc.BackgroundTransparency = 1
		rDesc.TextColor3 = isUnlocked and Color3.fromRGB(180, 200, 150) or Color3.fromRGB(80, 80, 90)
		rDesc.TextSize = 14
		rDesc.Font = Enum.Font.Gotham
		rDesc.TextXAlignment = Enum.TextXAlignment.Left
		rDesc.Text = ach.desc
		rDesc.Parent = row

		local rStatus = Instance.new("TextLabel")
		rStatus.Size = UDim2.new(0, 100, 0, 20)
		rStatus.Position = UDim2.new(1, -110, 0, 17)
		rStatus.BackgroundTransparency = 1
		rStatus.TextColor3 = isUnlocked and Color3.fromRGB(100, 255, 100) or Color3.fromRGB(80, 80, 80)
		rStatus.TextSize = 14
		rStatus.Font = Enum.Font.GothamBold
		rStatus.Text = isUnlocked and "✅ OBTENU" or "❌ Verrou."
		rStatus.Parent = row
	end
	achScroll.CanvasSize = UDim2.new(0, 0, 0, #ACHIEVEMENTS * 59 + 10)
	achTitle.Text = "🏆 HAUTS FAITS (" .. unlocked_count .. "/" .. #ACHIEVEMENTS .. ")"
end

-- ============================================
-- 6. FOOTSTEP PARTICLES
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
				local dust = Instance.new("Part")
				dust.Shape = Enum.PartType.Ball
				dust.Size = Vector3.new(0.4, 0.4, 0.4)
				dust.Color = isSprinting and Color3.fromRGB(150, 200, 255) or Color3.fromRGB(180, 160, 140)
				dust.Material = Enum.Material.SmoothPlastic
				dust.Transparency = 0.5
				dust.Anchored = true
				dust.CanCollide = false
				dust.CFrame = CFrame.new(hrp.Position + Vector3.new(math.random(-5,5)/10, -2.5, math.random(-5,5)/10))
				dust.Parent = game.Workspace
				task.spawn(function()
					for i = 1, 20 do
						dust.Transparency = 0.5 + (i/20)*0.5
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
helpPanel.Size = UDim2.new(0, 340, 0, 320)
helpPanel.Position = UDim2.new(0.5, -170, 0.5, -160)
helpPanel.BackgroundColor3 = Color3.fromRGB(12, 12, 22)
helpPanel.BackgroundTransparency = 0.03
helpPanel.BorderSizePixel = 0
helpPanel.Visible = false
helpPanel.Parent = screenGui
Instance.new("UICorner", helpPanel).CornerRadius = UDim.new(0, 12)
Instance.new("UIStroke", helpPanel).Color = Color3.fromRGB(100, 180, 255)

local helpTitle = Instance.new("TextLabel")
helpTitle.Size = UDim2.new(1, 0, 0, 34)
helpTitle.BackgroundTransparency = 1
helpTitle.TextColor3 = Color3.fromRGB(100, 200, 255)
helpTitle.TextSize = 20
helpTitle.Font = Enum.Font.GothamBold
helpTitle.Text = "📋 RACCOURCIS CLAVIER"
helpTitle.Parent = helpPanel

local controlsList = {
	"[1-5]    Hotbar / Armes",
	"[I]        Inventaire & Equipement",
	"[B]       Bestiaire (Encyclopedie)",
	"[P]       Points de Competence",
	"[H]       Aide (ce panneau)",
	"[Shift]  Sprint",
	"[Esc]    Fermer menus",
	"[Clic]    Attaquer monstre",
	"[E]        Capturer monstre assomme",
	"[F]        Interagir / PNJ",
}

for i, text in ipairs(controlsList) do
	local cl = Instance.new("TextLabel")
	cl.Size = UDim2.new(1, -24, 0, 24)
	cl.Position = UDim2.new(0, 12, 0, 36 + (i - 1) * 26)
	cl.BackgroundTransparency = 1
	cl.TextColor3 = Color3.fromRGB(180, 180, 200)
	cl.TextSize = 15
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
-- 8. AUTO-COLLECT GOLD DROPS
-- ============================================
task.spawn(function()
	task.wait(5)
	while true do
		task.wait(0.5)
		local character = player.Character
		if not character then continue end
		local hrp = character:FindFirstChild("HumanoidRootPart")
		if not hrp then continue end
		local goldFolder = game.Workspace:FindFirstChild("GoldDrops")
		if goldFolder then
			for _, gold in ipairs(goldFolder:GetChildren()) do
				if gold:IsA("BasePart") then
					local dist = (gold.Position - hrp.Position).Magnitude
					if dist < 8 then
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

-- ============================================
-- 9. COMBO COUNTER (NEW V25)
-- ============================================
local comboCount = 0
local lastHitTime = 0
local comboDecayTime = 2.5

local comboFrame = Instance.new("Frame")
comboFrame.Name = "ComboCounter"
comboFrame.Size = UDim2.new(0, 180, 0, 60)
comboFrame.Position = UDim2.new(0.5, -90, 0.35, 0)
comboFrame.BackgroundTransparency = 1
comboFrame.Visible = false
comboFrame.Parent = screenGui

local comboText = Instance.new("TextLabel")
comboText.Size = UDim2.new(1, 0, 0, 36)
comboText.BackgroundTransparency = 1
comboText.TextColor3 = Color3.fromRGB(255, 200, 50)
comboText.TextSize = 32
comboText.Font = Enum.Font.GothamBold
comboText.Text = "x1 COMBO"
comboText.Parent = comboFrame
comboText.TextStrokeColor3 = Color3.fromRGB(0, 0, 0)
comboText.TextStrokeTransparency = 0.3

local comboBonusText = Instance.new("TextLabel")
comboBonusText.Size = UDim2.new(1, 0, 0, 20)
comboBonusText.Position = UDim2.new(0, 0, 0, 36)
comboBonusText.BackgroundTransparency = 1
comboBonusText.TextColor3 = Color3.fromRGB(255, 150, 50)
comboBonusText.TextSize = 16
comboBonusText.Font = Enum.Font.Gotham
comboBonusText.Text = ""
comboBonusText.Parent = comboFrame

if remotes then
	local dmgR = remotes:FindFirstChild("DamageNumber")
	if dmgR then
		dmgR.OnClientEvent:Connect(function(position, damage, isCrit)
			local now = tick()
			if now - lastHitTime < comboDecayTime then
				comboCount = comboCount + 1
			else
				comboCount = 1
			end
			lastHitTime = now

			if comboCount >= 3 then
				comboFrame.Visible = true
				comboText.Text = "x" .. comboCount .. " COMBO!"
				if comboCount >= 20 then
					comboText.TextColor3 = Color3.fromRGB(255, 50, 50)
					comboBonusText.Text = "🔥 ULTRA COMBO!"
				elseif comboCount >= 10 then
					comboText.TextColor3 = Color3.fromRGB(255, 100, 255)
					comboBonusText.Text = "⚡ MEGA COMBO!"
				elseif comboCount >= 5 then
					comboText.TextColor3 = Color3.fromRGB(255, 200, 50)
					comboBonusText.Text = "💥 Enchainement!"
				else
					comboText.TextColor3 = Color3.fromRGB(200, 200, 200)
					comboBonusText.Text = ""
				end
				-- Scale animation
				comboText.TextSize = 38
				task.delay(0.1, function()
					comboText.TextSize = 32
				end)
			end
		end)
	end
end

-- Combo decay
task.spawn(function()
	while true do
		task.wait(0.5)
		if tick() - lastHitTime > comboDecayTime and comboFrame.Visible then
			comboFrame.Visible = false
			comboCount = 0
		end
	end
end)

-- ============================================
-- 10. SCREEN DAMAGE FLASH (NEW V25)
-- ============================================
local damageFlash = Instance.new("Frame")
damageFlash.Name = "DamageFlash"
damageFlash.Size = UDim2.new(1, 0, 1, 0)
damageFlash.BackgroundColor3 = Color3.fromRGB(255, 0, 0)
damageFlash.BackgroundTransparency = 1
damageFlash.BorderSizePixel = 0
damageFlash.ZIndex = 0
damageFlash.Parent = screenGui

local lastPlayerHP = 100

task.spawn(function()
	task.wait(2)
	while true do
		task.wait(0.2)
		local character = player.Character
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		if humanoid then
			local currentHP = humanoid.Health
			if currentHP < lastPlayerHP and lastPlayerHP > 0 then
				-- Took damage! Flash red
				damageFlash.BackgroundTransparency = 0.6
				local hpRatio = currentHP / humanoid.MaxHealth
				if hpRatio < 0.25 then
					damageFlash.BackgroundTransparency = 0.4
				end
				task.spawn(function()
					for i = 1, 10 do
						damageFlash.BackgroundTransparency = damageFlash.BackgroundTransparency + 0.04
						task.wait(0.03)
					end
					damageFlash.BackgroundTransparency = 1
				end)
			end
			lastPlayerHP = currentHP
		end
	end
end)

-- ============================================
-- 11. AUTO-HEAL NEAR CRYSTAL (NEW V25)
-- ============================================
task.spawn(function()
	task.wait(5)
	while true do
		task.wait(1)
		local character = player.Character
		if not character then continue end
		local hrp = character:FindFirstChild("HumanoidRootPart")
		local humanoid = character:FindFirstChildOfClass("Humanoid")
		if not hrp or not humanoid then continue end

		local crystal = game.Workspace:FindFirstChild("Crystal")
		if crystal then
			local crystalPos
			if crystal:IsA("Model") then
				crystalPos = crystal:GetPivot().Position
			else
				crystalPos = crystal.Position
			end
			local dist = (hrp.Position - crystalPos).Magnitude
			if dist < 20 and humanoid.Health < humanoid.MaxHealth then
				humanoid.Health = math.min(humanoid.MaxHealth, humanoid.Health + humanoid.MaxHealth * 0.02)
			end
		end
	end
end)

-- ============================================
-- 12. BOSS WARNING BANNER (NEW V25)
-- ============================================
local bossWarning = Instance.new("Frame")
bossWarning.Name = "BossWarning"
bossWarning.Size = UDim2.new(1, 0, 0, 80)
bossWarning.Position = UDim2.new(0, 0, 0.3, 0)
bossWarning.BackgroundColor3 = Color3.fromRGB(60, 10, 10)
bossWarning.BackgroundTransparency = 0.2
bossWarning.BorderSizePixel = 0
bossWarning.Visible = false
bossWarning.Parent = screenGui

local bossWarnText = Instance.new("TextLabel")
bossWarnText.Size = UDim2.new(1, 0, 1, 0)
bossWarnText.BackgroundTransparency = 1
bossWarnText.TextColor3 = Color3.fromRGB(255, 50, 50)
bossWarnText.TextSize = 36
bossWarnText.Font = Enum.Font.GothamBold
bossWarnText.Text = "⚠️ BOSS INCOMING! ⚠️"
bossWarnText.Parent = bossWarning
bossWarnText.TextStrokeColor3 = Color3.fromRGB(0, 0, 0)
bossWarnText.TextStrokeTransparency = 0.3

-- Detect boss spawn
task.spawn(function()
	task.wait(5)
	local lastBossCheck = 0
	while true do
		task.wait(1)
		local hasBoss = false
		for _, obj in ipairs(game.Workspace:GetChildren()) do
			if obj:IsA("Model") and obj.Name:match("^Boss_") then
				hasBoss = true
				break
			end
		end
		if hasBoss and tick() - lastBossCheck > 30 then
			lastBossCheck = tick()
			bossWarning.Visible = true
			-- Flash effect
			task.spawn(function()
				for i = 1, 6 do
					bossWarnText.TextTransparency = (i % 2 == 0) and 0 or 0.5
					task.wait(0.3)
				end
				task.wait(2)
				bossWarning.Visible = false
				bossWarnText.TextTransparency = 0
			end)
		end
	end
end)

-- ============================================
-- 13. TIME PLAYED COUNTER (NEW V25)
-- ============================================
local timePlayedLabel = Instance.new("TextLabel")
timePlayedLabel.Name = "TimePlayed"
timePlayedLabel.Size = UDim2.new(0, 140, 0, 22)
timePlayedLabel.Position = UDim2.new(1, -145, 1, -25)
timePlayedLabel.BackgroundTransparency = 1
timePlayedLabel.TextColor3 = Color3.fromRGB(100, 100, 120)
timePlayedLabel.TextSize = 14
timePlayedLabel.Font = Enum.Font.Gotham
timePlayedLabel.TextXAlignment = Enum.TextXAlignment.Right
timePlayedLabel.Text = "⏱ 0:00"
timePlayedLabel.Parent = screenGui

local sessionStart = tick()
task.spawn(function()
	while true do
		task.wait(1)
		local elapsed = math.floor(tick() - sessionStart)
		local mins = math.floor(elapsed / 60)
		local secs = elapsed % 60
		local hrs = math.floor(mins / 60)
		mins = mins % 60
		if hrs > 0 then
			timePlayedLabel.Text = string.format("⏱ %d:%02d:%02d", hrs, mins, secs)
		else
			timePlayedLabel.Text = string.format("⏱ %d:%02d", mins, secs)
		end
	end
end)

-- ============================================
-- 14. EMOTES RAPIDES (NEW V25)
-- ============================================
local emoteGui = Instance.new("Frame")
emoteGui.Name = "EmoteWheel"
emoteGui.Size = UDim2.new(0, 200, 0, 50)
emoteGui.Position = UDim2.new(0.5, -100, 0.85, 0)
emoteGui.BackgroundColor3 = Color3.fromRGB(15, 15, 25)
emoteGui.BackgroundTransparency = 0.3
emoteGui.BorderSizePixel = 0
emoteGui.Visible = false
emoteGui.Parent = screenGui
Instance.new("UICorner", emoteGui).CornerRadius = UDim.new(0, 8)

local emotes = {"👋", "😄", "👍", "💪", "🎉"}
for i, emoji in ipairs(emotes) do
	local eBtn = Instance.new("TextButton")
	eBtn.Size = UDim2.new(0, 34, 0, 34)
	eBtn.Position = UDim2.new(0, 8 + (i-1) * 38, 0, 8)
	eBtn.BackgroundColor3 = Color3.fromRGB(35, 35, 50)
	eBtn.TextSize = 22
	eBtn.Text = emoji
	eBtn.Parent = emoteGui
	Instance.new("UICorner", eBtn).CornerRadius = UDim.new(0, 6)
	eBtn.MouseButton1Click:Connect(function()
		-- Show emote above player head
		local character = player.Character
		if not character then return end
		local head = character:FindFirstChild("Head")
		if not head then return end
		local emoteBB = Instance.new("BillboardGui")
		emoteBB.Size = UDim2.new(0, 60, 0, 60)
		emoteBB.StudsOffset = Vector3.new(0, 4, 0)
		emoteBB.AlwaysOnTop = true
		emoteBB.Parent = head
		local emojiLabel = Instance.new("TextLabel")
		emojiLabel.Size = UDim2.new(1, 0, 1, 0)
		emojiLabel.BackgroundTransparency = 1
		emojiLabel.TextSize = 36
		emojiLabel.Text = emoji
		emojiLabel.Parent = emoteBB
		task.delay(3, function() emoteBB:Destroy() end)
		emoteGui.Visible = false
	end)
end

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.T then
		emoteGui.Visible = not emoteGui.Visible
	end
end)

-- ============================================
-- EXPOSE: refreshAchievementsPanel for external use
-- ============================================
-- The PlayerHUD can toggle this panel and call refresh
task.spawn(function()
	task.wait(2)
	-- Auto-refresh when panel becomes visible
	achPanel:GetPropertyChangedSignal("Visible"):Connect(function()
		if achPanel.Visible then
			-- Re-check all achievements first
			for _, ach in ipairs(ACHIEVEMENTS) do
				if not unlockedAchievements[ach.id] then
					local ok, result = pcall(ach.condition)
					if ok and result then
						unlockedAchievements[ach.id] = true
					end
				end
			end
			refreshAchievementsPanel()
		end
	end)
end)

print("[CoolFeatures V25] Ready! Sprint(Shift), Bestiary(B), Help(H), Emotes(T), DPS, Combos, Achievements")
