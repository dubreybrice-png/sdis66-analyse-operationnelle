--[[
	CombatInput V20 - Gere les inputs combat du joueur
	Click = attaque (via ClickDetector server-side)
	E = capturer monstre assomme (laser)
	Attaque maintenant geree par ClickDetector dans MonsterSpawner
]]

print("[CombatInput V20] Script loaded!")

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local Workspace = game.Workspace

local player = Players.LocalPlayer
if not player then return end

local mouse = player:GetMouse()

-- Attendre les remotes
local remotes = ReplicatedStorage:WaitForChild("Remotes", 10)
if not remotes then
	warn("[CombatInput] Remotes not found!")
	return
end

local requestCaptureLaser = remotes:WaitForChild("RequestCaptureLaser", 10)
print("[CombatInput] RequestCaptureLaser:", requestCaptureLaser and "FOUND" or "MISSING")

-- === HINT "APPUIE SUR E POUR CAPTURER" ===
local playerGui = player:WaitForChild("PlayerGui", 10)
local hintGui = Instance.new("ScreenGui")
hintGui.Name = "CaptureHint"
hintGui.ResetOnSpawn = false
hintGui.Parent = playerGui

local captureHint = Instance.new("TextLabel")
captureHint.Name = "HintLabel"
captureHint.Size = UDim2.new(0, 320, 0, 40)
captureHint.Position = UDim2.new(0.5, -160, 0.65, 0)
captureHint.BackgroundColor3 = Color3.fromRGB(20, 20, 30)
captureHint.BackgroundTransparency = 0.3
captureHint.TextColor3 = Color3.fromRGB(255, 255, 100)
captureHint.TextSize = 16
captureHint.Font = Enum.Font.GothamBold
captureHint.Text = "⚡ Appuie sur E pour capturer! ⚡"
captureHint.Visible = false
captureHint.Parent = hintGui
Instance.new("UICorner", captureHint).CornerRadius = UDim.new(0, 8)
local hintStroke = Instance.new("UIStroke")
hintStroke.Color = Color3.fromRGB(255, 200, 50)
hintStroke.Thickness = 2
hintStroke.Parent = captureHint

-- Update loop: montrer le hint quand un monstre KO est proche
task.spawn(function()
	while true do
		task.wait(0.3)
		local hasLaser = player:GetAttribute("HasCaptureLaser")
		local hrp = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		
		if hasLaser and hrp then
			local foundKO = false
			for _, obj in ipairs(Workspace:GetChildren()) do
				if obj:IsA("Model") and obj:GetAttribute("IsKnockedOut") and obj.PrimaryPart then
					local dist = (hrp.Position - obj.PrimaryPart.Position).Magnitude
					if dist < 30 then
						foundKO = true
						break
					end
				end
			end
			captureHint.Visible = foundKO
		else
			captureHint.Visible = false
		end
	end
end)

-- === CAPTURE LASER AU E ===
UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	
	if input.KeyCode == Enum.KeyCode.E then
		if not requestCaptureLaser then return end
		
		-- Trouver le monstre assomme le plus proche
		local hrp = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if not hrp then return end
		
		local nearest = nil
		local nearestDist = 30
		
		for _, obj in ipairs(Workspace:GetChildren()) do
			if obj:IsA("Model") and obj:GetAttribute("IsKnockedOut") then
				if obj.PrimaryPart then
					local dist = (hrp.Position - obj.PrimaryPart.Position).Magnitude
					if dist < nearestDist then
						nearest = obj
						nearestDist = dist
					end
				end
			end
		end
		
		if nearest then
			print("[CombatInput] Capture attempt on:", nearest.Name)
			requestCaptureLaser:FireServer(nearest.Name)
		else
			print("[CombatInput] No knocked out monster nearby")
		end
	end
end)

print("[CombatInput V20] Ready! Click=Attack (ClickDetector), E=Capture")
