--[[
	AmbientEffects V23 - Effets visuels d'ambiance
	- Particules scintillantes autour du cristal
	- Lucioles la nuit
	- Halo autour du joueur quand il level up
	- Screen effects (vignette legere)
	- Wave start/end announcements
]]

print("[AmbientEffects V23] Loading...")

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Lighting = game:GetService("Lighting")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui", 10)
if not playerGui then return end

local remotes = ReplicatedStorage:WaitForChild("Remotes", 10)

-- === SCREEN GUI ===
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "AmbientEffects_V23"
screenGui.ResetOnSpawn = false
screenGui.DisplayOrder = 1
screenGui.Parent = playerGui

-- === VIGNETTE (leger assombrissement des bords) ===
local vignetteFrame = Instance.new("ImageLabel")
vignetteFrame.Name = "Vignette"
vignetteFrame.Size = UDim2.new(1, 0, 1, 0)
vignetteFrame.BackgroundTransparency = 1
vignetteFrame.ImageColor3 = Color3.new(0, 0, 0)
vignetteFrame.ImageTransparency = 0.7
vignetteFrame.Image = ""  -- On ne charge pas d'image, on utilise un gradient
vignetteFrame.Parent = screenGui

-- Gradient overlay as pure code (no image dependency)
local vignetteGrad = Instance.new("Frame")
vignetteGrad.Name = "VignetteOverlay"
vignetteGrad.Size = UDim2.new(1, 0, 1, 0)
vignetteGrad.BackgroundColor3 = Color3.new(0, 0, 0)
vignetteGrad.BackgroundTransparency = 0.92
vignetteGrad.BorderSizePixel = 0
vignetteGrad.Parent = screenGui

-- === WAVE START ANNOUNCEMENT ===
local waveAnnouncement = Instance.new("Frame")
waveAnnouncement.Name = "WaveAnnouncement"
waveAnnouncement.Size = UDim2.new(0, 500, 0, 80)
waveAnnouncement.Position = UDim2.new(0.5, -250, 0.2, 0)
waveAnnouncement.BackgroundColor3 = Color3.fromRGB(15, 10, 25)
waveAnnouncement.BackgroundTransparency = 0.15
waveAnnouncement.BorderSizePixel = 0
waveAnnouncement.Visible = false
waveAnnouncement.Parent = screenGui
Instance.new("UICorner", waveAnnouncement).CornerRadius = UDim.new(0, 12)
local waStroke = Instance.new("UIStroke")
waStroke.Color = Color3.fromRGB(255, 80, 80)
waStroke.Thickness = 2
waStroke.Parent = waveAnnouncement

local waveTitle = Instance.new("TextLabel")
waveTitle.Size = UDim2.new(1, 0, 0, 40)
waveTitle.Position = UDim2.new(0, 0, 0, 5)
waveTitle.BackgroundTransparency = 1
waveTitle.TextColor3 = Color3.fromRGB(255, 80, 80)
waveTitle.TextSize = 28
waveTitle.Font = Enum.Font.GothamBold
waveTitle.Text = "⚔️ VAGUE 1"
waveTitle.Parent = waveAnnouncement

local waveSubtitle = Instance.new("TextLabel")
waveSubtitle.Size = UDim2.new(1, 0, 0, 24)
waveSubtitle.Position = UDim2.new(0, 0, 0, 45)
waveSubtitle.BackgroundTransparency = 1
waveSubtitle.TextColor3 = Color3.fromRGB(200, 150, 150)
waveSubtitle.TextSize = 14
waveSubtitle.Font = Enum.Font.Gotham
waveSubtitle.Text = "Les monstres approchent!"
waveSubtitle.Parent = waveAnnouncement

local function showWaveAnnouncement(waveNum)
	waveTitle.Text = "⚔️ VAGUE " .. waveNum
	
	-- Difficulty hints
	local hints = {
		"Les monstres approchent!",
		"Prépare tes défenses!",
		"Ca chauffe!",
		"Attention, boss possible!",
		"Les éléments se déchainent!",
	}
	local hintIndex = math.clamp(math.ceil(waveNum / 3), 1, #hints)
	waveSubtitle.Text = hints[hintIndex]
	
	-- Color intensity based on wave
	if waveNum >= 10 then
		waStroke.Color = Color3.fromRGB(255, 50, 50)
		waveTitle.TextColor3 = Color3.fromRGB(255, 50, 50)
	elseif waveNum >= 5 then
		waStroke.Color = Color3.fromRGB(255, 150, 50)
		waveTitle.TextColor3 = Color3.fromRGB(255, 150, 50)
	else
		waStroke.Color = Color3.fromRGB(255, 200, 80)
		waveTitle.TextColor3 = Color3.fromRGB(255, 200, 80)
	end
	
	-- Animate in
	waveAnnouncement.Visible = true
	waveAnnouncement.Position = UDim2.new(0.5, -250, 0.15, 0)
	waveAnnouncement.BackgroundTransparency = 0.15
	
	local tweenIn = TweenService:Create(waveAnnouncement, TweenInfo.new(0.4, Enum.EasingStyle.Back), {
		Position = UDim2.new(0.5, -250, 0.2, 0)
	})
	tweenIn:Play()
	
	-- Red flash on screen
	vignetteGrad.BackgroundColor3 = Color3.fromRGB(100, 20, 20)
	vignetteGrad.BackgroundTransparency = 0.7
	local flashTween = TweenService:Create(vignetteGrad, TweenInfo.new(1.5), {
		BackgroundColor3 = Color3.new(0, 0, 0),
		BackgroundTransparency = 0.92
	})
	flashTween:Play()
	
	-- Hide after 3s
	task.delay(3, function()
		local tweenOut = TweenService:Create(waveAnnouncement, TweenInfo.new(0.5, Enum.EasingStyle.Quad), {
			Position = UDim2.new(0.5, -250, 0.15, 0),
			BackgroundTransparency = 1
		})
		tweenOut:Play()
		task.delay(0.5, function()
			waveAnnouncement.Visible = false
		end)
	end)
end

-- === COMBO COUNTER ===
local comboFrame = Instance.new("Frame")
comboFrame.Name = "ComboCounter"
comboFrame.Size = UDim2.new(0, 120, 0, 50)
comboFrame.Position = UDim2.new(0.5, -60, 0.65, 0)
comboFrame.BackgroundTransparency = 1
comboFrame.Visible = false
comboFrame.Parent = screenGui

local comboText = Instance.new("TextLabel")
comboText.Size = UDim2.new(1, 0, 0, 28)
comboText.BackgroundTransparency = 1
comboText.TextColor3 = Color3.fromRGB(255, 200, 50)
comboText.TextSize = 24
comboText.Font = Enum.Font.GothamBold
comboText.Text = "COMBO x2"
comboText.Parent = comboFrame

local comboSub = Instance.new("TextLabel")
comboSub.Size = UDim2.new(1, 0, 0, 16)
comboSub.Position = UDim2.new(0, 0, 0, 28)
comboSub.BackgroundTransparency = 1
comboSub.TextColor3 = Color3.fromRGB(200, 180, 100)
comboSub.TextSize = 11
comboSub.Font = Enum.Font.Gotham
comboSub.Text = "+10% XP"
comboSub.Parent = comboFrame

local comboCount = 0
local lastHitTime = 0

-- Listen for damage numbers to track combos
if remotes then
	local dmgRemote = remotes:FindFirstChild("DamageNumber")
	if dmgRemote then
		dmgRemote.OnClientEvent:Connect(function(position, damage, isCrit)
			local now = tick()
			if now - lastHitTime < 2.5 then
				comboCount = comboCount + 1
			else
				comboCount = 1
			end
			lastHitTime = now
			
			if comboCount >= 2 then
				comboFrame.Visible = true
				comboText.Text = "COMBO x" .. comboCount
				local bonusXP = math.min(comboCount * 5, 50)
				comboSub.Text = "+" .. bonusXP .. "% XP"
				
				-- Color based on combo
				if comboCount >= 10 then
					comboText.TextColor3 = Color3.fromRGB(255, 50, 50)
				elseif comboCount >= 5 then
					comboText.TextColor3 = Color3.fromRGB(255, 150, 50)
				else
					comboText.TextColor3 = Color3.fromRGB(255, 200, 50)
				end
				
				-- Scale pop
				comboText.TextSize = 28
				task.delay(0.1, function()
					comboText.TextSize = 24
				end)
			end
		end)
	end
	
	-- Hide combo after timeout
	task.spawn(function()
		while true do
			task.wait(0.5)
			if tick() - lastHitTime > 3 and comboFrame.Visible then
				comboFrame.Visible = false
				comboCount = 0
			end
		end
	end)
end

-- === CRYSTAL SPARKLE PARTICLES (world-space) ===
task.spawn(function()
	task.wait(5) -- wait for world to load
	
	local crystal = game.Workspace:FindFirstChild("Crystal")
	if not crystal then return end
	
	local crystalPos = crystal.PrimaryPart and crystal.PrimaryPart.Position or crystal:GetPivot().Position
	
	-- Create sparkle particles around crystal
	while true do
		local sparkle = Instance.new("Part")
		sparkle.Name = "CrystalSparkle"
		sparkle.Shape = Enum.PartType.Ball
		sparkle.Size = Vector3.new(0.3, 0.3, 0.3)
		sparkle.Color = Color3.fromRGB(
			math.random(100, 200),
			math.random(200, 255),
			255
		)
		sparkle.Material = Enum.Material.Neon
		sparkle.Transparency = 0.3
		sparkle.Anchored = true
		sparkle.CanCollide = false
		sparkle.CFrame = CFrame.new(crystalPos + Vector3.new(
			math.random(-8, 8),
			math.random(0, 12),
			math.random(-8, 8)
		))
		sparkle.Parent = game.Workspace
		
		-- Float up and fade
		task.spawn(function()
			for i = 1, 40 do
				sparkle.Position = sparkle.Position + Vector3.new(0, 0.08, 0)
				sparkle.Transparency = 0.3 + (i / 40) * 0.7
				sparkle.Size = sparkle.Size * 0.98
				task.wait(0.05)
			end
			sparkle:Destroy()
		end)
		
		task.wait(0.3 + math.random() * 0.4)
	end
end)

-- === LISTEN FOR WAVE UPDATES ===
if remotes then
	local waveRemote = remotes:FindFirstChild("WaveUpdate")
	if waveRemote then
		local lastWave = 0
		waveRemote.OnClientEvent:Connect(function(waveNum, alive, remaining)
			if waveNum > lastWave then
				lastWave = waveNum
				showWaveAnnouncement(waveNum)
			end
		end)
	end
end

-- === LEVEL UP NOTIFICATION ===
local lastLevel = 0
task.spawn(function()
	task.wait(3)
	lastLevel = player:GetAttribute("PlayerLevel") or 1
	
	while player.Parent do
		task.wait(1)
		local currentLevel = player:GetAttribute("PlayerLevel") or 1
		if currentLevel > lastLevel then
			lastLevel = currentLevel
			
			-- Level up popup
			local lvlPopup = Instance.new("Frame")
			lvlPopup.Size = UDim2.new(0, 300, 0, 60)
			lvlPopup.Position = UDim2.new(0.5, -150, 0.3, 0)
			lvlPopup.BackgroundColor3 = Color3.fromRGB(20, 40, 20)
			lvlPopup.BackgroundTransparency = 0.1
			lvlPopup.BorderSizePixel = 0
			lvlPopup.Parent = screenGui
			Instance.new("UICorner", lvlPopup).CornerRadius = UDim.new(0, 10)
			local ls = Instance.new("UIStroke")
			ls.Color = Color3.fromRGB(100, 255, 100)
			ls.Thickness = 2
			ls.Parent = lvlPopup
			
			local lvlText = Instance.new("TextLabel")
			lvlText.Size = UDim2.new(1, 0, 0, 30)
			lvlText.Position = UDim2.new(0, 0, 0, 5)
			lvlText.BackgroundTransparency = 1
			lvlText.TextColor3 = Color3.fromRGB(100, 255, 150)
			lvlText.TextSize = 22
			lvlText.Font = Enum.Font.GothamBold
			lvlText.Text = "⬆ LEVEL UP! Nv." .. currentLevel
			lvlText.Parent = lvlPopup
			
			local lvlSub = Instance.new("TextLabel")
			lvlSub.Size = UDim2.new(1, 0, 0, 16)
			lvlSub.Position = UDim2.new(0, 0, 0, 35)
			lvlSub.BackgroundTransparency = 1
			lvlSub.TextColor3 = Color3.fromRGB(150, 200, 150)
			lvlSub.TextSize = 11
			lvlSub.Font = Enum.Font.Gotham
			lvlSub.Text = "+1 Point de Competence disponible!"
			lvlSub.Parent = lvlPopup
			
			-- Gold flash
			vignetteGrad.BackgroundColor3 = Color3.fromRGB(50, 100, 50)
			vignetteGrad.BackgroundTransparency = 0.6
			local flashTween = TweenService:Create(vignetteGrad, TweenInfo.new(2), {
				BackgroundColor3 = Color3.new(0, 0, 0),
				BackgroundTransparency = 0.92
			})
			flashTween:Play()
			
			-- Fade out after 3s
			task.delay(3, function()
				local tweenOut = TweenService:Create(lvlPopup, TweenInfo.new(0.5), {
					BackgroundTransparency = 1
				})
				tweenOut:Play()
				task.delay(0.5, function() lvlPopup:Destroy() end)
			end)
		end
	end
end)

print("[AmbientEffects V23] Ready!")
