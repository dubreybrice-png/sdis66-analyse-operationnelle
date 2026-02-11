--[[
	ClassSystem V20 - Systeme de classes au niveau 10
	Guerrier, Archer, Mage, Acolyte
	Compatible avec le systeme de niveaux par classe de V20
]]

print("[ClassSystem V20] Loading...")

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local PlayerDataService = require(ServerScriptService.Services.PlayerDataService)
local WeaponSystem = require(ServerScriptService.Services.WeaponSystem)

local MIN_LEVEL = 10

-- Definitions des classes
local CLASS_DEFS = {
	Guerrier = {
		name = "Guerrier",
		description = "Specialiste du combat rapproche. Bonus ATK et DEF.",
		bonusATK = 5,
		bonusDEF = 3,
		bonusHP = 20,
	},
	Archer = {
		name = "Archer",
		description = "Tireur d'elite. Bonus portee et vitesse.",
		bonusATK = 3,
		bonusDEF = 1,
		bonusHP = 10,
	},
	Mage = {
		name = "Mage",
		description = "Maitre des elements. Bonus capture et degats magiques.",
		bonusATK = 4,
		bonusDEF = 1,
		bonusHP = 5,
	},
	Acolyte = {
		name = "Acolyte",
		description = "Guerisseur sacre. Bonus soins et support.",
		bonusATK = 2,
		bonusDEF = 2,
		bonusHP = 15,
	},
}

-- Attendre que le Hall des Classes soit cree
task.wait(3)

local classHall = workspace:FindFirstChild("ClassHall")
if not classHall then
	warn("[ClassSystem] ClassHall not found in workspace!")
	return
end

print("[ClassSystem] ClassHall found! Setting up podium interactions...")

-- Connecter tous les ProximityPrompts des podiums
for _, child in ipairs(classHall:GetDescendants()) do
	if child:IsA("ProximityPrompt") then
		local podium = child.Parent
		local className = podium:GetAttribute("ClassName")
		
		if className and CLASS_DEFS[className] then
			print("[ClassSystem] Connected prompt for class:", className)
			
			child.Triggered:Connect(function(player)
				print("[ClassSystem] Player", player.Name, "wants to become", className)
				
				-- Verifier le niveau
				local data = PlayerDataService:GetData(player)
				if not data then
					warn("[ClassSystem] No data for", player.Name)
					return
				end
				
				-- V20: utiliser le niveau de la classe courante
				local level = PlayerDataService:GetPlayerLevel(player)
				if level < MIN_LEVEL then
					print("[ClassSystem] Player level", level, "< required", MIN_LEVEL)
					return
				end
				
				-- V20: Permettre le changement de classe (pas juste premiere fois)
				local currentClass = data.CurrentClass or "Novice"
				if currentClass == className then
					print("[ClassSystem] Already this class:", className)
					return
				end
				
				-- V20: Utiliser PlayerDataService:ChangeClass
				local success = PlayerDataService:ChangeClass(player, className)
				if success then
					-- Mettre a jour les attributes pour le HUD
					player:SetAttribute("CurrentClass", className)
					
					-- Donner le Pistolet Laser (arme niveau 10+)
					local laserGun = WeaponSystem.WEAPONS.LASER_GUN
					if laserGun then
						WeaponSystem:GiveWeapon(player, laserGun)
						print("[ClassSystem] Given " .. laserGun.name)
					end
					
					-- Activer le laser de capture
					data.HasCaptureLaser = true
					
					print("[ClassSystem] " .. player.Name .. " is now a " .. className .. "!")
				end
			end)
		end
	end
end

print("[ClassSystem V18] Ready! Waiting for level 10 players...")
