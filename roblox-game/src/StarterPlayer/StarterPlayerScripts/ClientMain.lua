--[[
	ClientMain
	Point d'entrée client - initialise l'UI et les contrôles
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer

print("[Client] Initializing for", player.Name)

-- Attendre que le personnage soit chargé
player.CharacterAdded:Connect(function(character)
	print("[Client] Character loaded")
	
	-- CAMÉRA EN HAUTEUR pour voir toute la grande ville (200x200)
	local camera = workspace.CurrentCamera
	camera.CameraType = Enum.CameraType.Scriptable
	camera.FieldOfView = 90 -- FOV large
	
	-- Position: très haut (y=200) pour voir toute la map
	camera.CFrame = CFrame.new(0, 200, 100) * CFrame.Angles(math.rad(-50), 0, 0)
	
	print("[Client] Camera positioned high (can see whole town)")
end)

-- Charger l'UI de base
local StarterGui = game:GetService("StarterGui")
StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.PlayerList, true)
StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.Health, false) -- On utilisera une UI custom

print("[Client] Ready!")
