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
