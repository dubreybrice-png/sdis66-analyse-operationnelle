--[[
	CaptureAnimation V23 - Effets visuels de capture cote client
	- Barre de progression pendant le channeling
	- Texte flottant "+CAPTURE!" / "ECHEC"
	- Particules de succes
]]

print("[CaptureAnimation V23] Loading...")

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui", 10)
if not playerGui then return end

local remotes = ReplicatedStorage:WaitForChild("Remotes", 10)

-- === CAPTURE PROGRESS BAR ===
local captureGui = Instance.new("ScreenGui")
captureGui.Name = "CaptureEffects"
captureGui.ResetOnSpawn = false
captureGui.Parent = playerGui

-- Progress bar (au centre bas)
local progressFrame = Instance.new("Frame")
progressFrame.Name = "CaptureProgress"
progressFrame.Size = UDim2.new(0, 300, 0, 30)
progressFrame.Position = UDim2.new(0.5, -150, 0.55, 0)
progressFrame.BackgroundColor3 = Color3.fromRGB(20, 20, 30)
progressFrame.BackgroundTransparency = 0.2
progressFrame.BorderSizePixel = 0
progressFrame.Visible = false
progressFrame.Parent = captureGui
Instance.new("UICorner", progressFrame).CornerRadius = UDim.new(0, 8)
local progStroke = Instance.new("UIStroke")
progStroke.Color = Color3.fromRGB(100, 255, 200)
progStroke.Thickness = 2
progStroke.Parent = progressFrame

local progressFill = Instance.new("Frame")
progressFill.Name = "Fill"
progressFill.Size = UDim2.new(0, 0, 1, 0)
progressFill.BackgroundColor3 = Color3.fromRGB(100, 255, 200)
progressFill.BorderSizePixel = 0
progressFill.Parent = progressFrame
Instance.new("UICorner", progressFill).CornerRadius = UDim.new(0, 8)

local progressText = Instance.new("TextLabel")
progressText.Size = UDim2.new(1, 0, 1, 0)
progressText.BackgroundTransparency = 1
progressText.TextColor3 = Color3.new(1, 1, 1)
progressText.TextSize = 14
progressText.Font = Enum.Font.GothamBold
progressText.Text = "⚡ CAPTURE EN COURS..."
progressText.ZIndex = 2
progressText.Parent = progressFrame

-- === ENHANCED CAPTURE RESULT (grand popup anime) ===
local function showEnhancedCaptureResult(success, monsterName, rarity, level)
	-- Grand popup au centre
	local popup = Instance.new("Frame")
	popup.Size = UDim2.new(0, 350, 0, 120)
	popup.Position = UDim2.new(0.5, -175, 0.35, 0)
	popup.BackgroundColor3 = success and Color3.fromRGB(15, 50, 15) or Color3.fromRGB(50, 15, 15)
	popup.BackgroundTransparency = 0.05
	popup.BorderSizePixel = 0
	popup.Parent = captureGui
	Instance.new("UICorner", popup).CornerRadius = UDim.new(0, 14)
	local popStroke = Instance.new("UIStroke")
	popStroke.Color = success and Color3.fromRGB(50, 255, 100) or Color3.fromRGB(255, 80, 80)
	popStroke.Thickness = 3
	popStroke.Parent = popup
	
	-- Icone
	local icon = Instance.new("TextLabel")
	icon.Size = UDim2.new(0, 60, 0, 60)
	icon.Position = UDim2.new(0, 10, 0.5, -30)
	icon.BackgroundTransparency = 1
	icon.TextSize = 40
	icon.Font = Enum.Font.GothamBold
	icon.Text = success and "✨" or "💨"
	icon.Parent = popup
	
	-- Titre
	local title = Instance.new("TextLabel")
	title.Size = UDim2.new(1, -80, 0, 30)
	title.Position = UDim2.new(0, 75, 0, 10)
	title.BackgroundTransparency = 1
	title.TextColor3 = success and Color3.fromRGB(100, 255, 150) or Color3.fromRGB(255, 100, 100)
	title.TextSize = 22
	title.Font = Enum.Font.GothamBold
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.Text = success and "CAPTURE REUSSIE!" or "CAPTURE ECHOUEE..."
	title.Parent = popup
	
	-- Details
	local details = Instance.new("TextLabel")
	details.Size = UDim2.new(1, -80, 0, 20)
	details.Position = UDim2.new(0, 75, 0, 42)
	details.BackgroundTransparency = 1
	details.TextColor3 = Color3.new(1, 1, 1)
	details.TextSize = 15
	details.Font = Enum.Font.Gotham
	details.TextXAlignment = Enum.TextXAlignment.Left
	details.Text = success and (monsterName .. " [" .. rarity .. "] Nv." .. level) or "Le monstre s'est enfui!"
	details.Parent = popup
	
	-- Sub-info
	local subInfo = Instance.new("TextLabel")
	subInfo.Size = UDim2.new(1, -80, 0, 16)
	subInfo.Position = UDim2.new(0, 75, 0, 65)
	subInfo.BackgroundTransparency = 1
	subInfo.TextColor3 = Color3.fromRGB(150, 150, 150)
	subInfo.TextSize = 11
	subInfo.Font = Enum.Font.Gotham
	subInfo.TextXAlignment = Enum.TextXAlignment.Left
	subInfo.Text = success and "Rejoint ton equipe! Gere-le dans le Centre de Stockage." or "Ameliore ton Laser a l'Armurerie pour plus de chance!"
	subInfo.TextWrapped = true
	subInfo.Parent = popup
	
	-- Stars animation si succes
	if success then
		for i = 1, 5 do
			local star = Instance.new("TextLabel")
			star.Size = UDim2.new(0, 20, 0, 20)
			star.Position = UDim2.new(math.random() * 0.8 + 0.1, 0, math.random() * 0.6 + 0.1, 0)
			star.BackgroundTransparency = 1
			star.TextSize = 16
			star.Text = "⭐"
			star.Parent = popup
			
			-- Tween star
			task.spawn(function()
				for j = 1, 20 do
					star.Position = star.Position + UDim2.new(0, 0, 0, -2)
					star.TextTransparency = j / 20
					task.wait(0.05)
				end
				star:Destroy()
			end)
		end
	end
	
	-- Animation d'entree
	popup.Position = UDim2.new(0.5, -175, 0.25, 0)
	local tweenIn = TweenService:Create(popup, TweenInfo.new(0.3, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
		Position = UDim2.new(0.5, -175, 0.35, 0)
	})
	tweenIn:Play()
	
	-- Disparition apres 4s
	task.delay(4, function()
		local tweenOut = TweenService:Create(popup, TweenInfo.new(0.5, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
			Position = UDim2.new(0.5, -175, 0.25, 0),
			BackgroundTransparency = 1
		})
		tweenOut:Play()
		task.delay(0.5, function() popup:Destroy() end)
	end)
end

-- === DAMAGE NUMBERS (flottent au-dessus des monstres) ===
local function showDamageNumber(position, damage, isCrit)
	local billboardPart = Instance.new("Part")
	billboardPart.Name = "DmgNumber"
	billboardPart.Size = Vector3.new(0.1, 0.1, 0.1)
	billboardPart.Transparency = 1
	billboardPart.Anchored = true
	billboardPart.CanCollide = false
	billboardPart.Position = position + Vector3.new(math.random(-2, 2), 3, math.random(-2, 2))
	billboardPart.Parent = game.Workspace
	
	local bb = Instance.new("BillboardGui")
	bb.Size = UDim2.new(0, 80, 0, 30)
	bb.AlwaysOnTop = true
	bb.Parent = billboardPart
	
	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(1, 0, 1, 0)
	label.BackgroundTransparency = 1
	label.TextColor3 = isCrit and Color3.fromRGB(255, 50, 50) or Color3.fromRGB(255, 200, 50)
	label.TextSize = isCrit and 20 or 16
	label.Font = Enum.Font.GothamBold
	label.Text = (isCrit and "CRIT! " or "") .. "-" .. damage
	label.TextStrokeColor3 = Color3.new(0, 0, 0)
	label.TextStrokeTransparency = 0.5
	label.Parent = bb
	
	-- Float up and fade
	task.spawn(function()
		for i = 1, 30 do
			billboardPart.Position = billboardPart.Position + Vector3.new(0, 0.12, 0)
			label.TextTransparency = i / 30
			label.TextStrokeTransparency = 0.5 + (i / 30) * 0.5
			task.wait(0.03)
		end
		billboardPart:Destroy()
	end)
end

-- === CAPTURE PROGRESS SIMULATION ===
-- Quand on press E, on montre la barre de progression
local UserInputService = game:GetService("UserInputService")
local capturing = false

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.KeyCode == Enum.KeyCode.E and not capturing then
		local hasLaser = player:GetAttribute("HasCaptureLaser")
		if not hasLaser then return end
		
		-- Check if monster KO nearby
		local hrp = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if not hrp then return end
		
		local foundKO = false
		for _, obj in ipairs(game.Workspace:GetChildren()) do
			if obj:IsA("Model") and obj:GetAttribute("IsKnockedOut") and obj.PrimaryPart then
				if (hrp.Position - obj.PrimaryPart.Position).Magnitude < 30 then
					foundKO = true
					break
				end
			end
		end
		
		if foundKO then
			capturing = true
			progressFrame.Visible = true
			progressFill.Size = UDim2.new(0, 0, 1, 0)
			
			-- Simulate capture bar (4s default)
			local channelTime = 4
			local startTime = tick()
			task.spawn(function()
				while capturing and tick() - startTime < channelTime do
					local progress = (tick() - startTime) / channelTime
					progressFill.Size = UDim2.new(math.clamp(progress, 0, 1), 0, 1, 0)
					
					-- Color shift from blue to green
					local r = math.floor(100 * (1 - progress))
					local g = math.floor(200 + 55 * progress)
					local b = math.floor(200 * (1 - progress))
					progressFill.BackgroundColor3 = Color3.fromRGB(r, g, b)
					
					task.wait(0.03)
				end
				progressFrame.Visible = false
				capturing = false
			end)
		end
	end
end)

-- === LISTEN FOR CAPTURE RESULT ===
if remotes then
	local captureR = remotes:FindFirstChild("CaptureResult")
	if captureR then
		captureR.OnClientEvent:Connect(function(success, name, rarity, level)
			capturing = false
			progressFrame.Visible = false
			showEnhancedCaptureResult(success, name or "?", rarity or "?", level or 1)
		end)
	end
	
	-- === LISTEN FOR DAMAGE NUMBERS ===
	local dmgRemote = remotes:FindFirstChild("DamageNumber")
	if dmgRemote then
		dmgRemote.OnClientEvent:Connect(function(position, damage, isCrit)
			showDamageNumber(position, damage, isCrit)
		end)
	end
end

print("[CaptureAnimation V23] Ready!")
