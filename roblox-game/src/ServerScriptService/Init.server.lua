--[[
	Init V25 - MEGA UPDATE
	Bigger text, fixed I key, monster movement, achievements panel
]]

print("===================================================")
print("  VERSION TEST 25 - BIGGER TEXT + MOVEMENT FIX")
print("  I key fix, BodyVelocity, Achievements panel, Combos")
print("===================================================")
local ServerScriptService = game:GetService("ServerScriptService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local PlayerDataService = require(ServerScriptService.Services.PlayerDataService)
local WeaponSystem = require(ServerScriptService.Services.WeaponSystem)
local WorldBuilder = require(ServerScriptService.Services.WorldBuilder)
local DojoBuilder = require(ServerScriptService.Services.DojoBuilder)

print("[Server] Initializing Monster Defense V25...")

-- CREER LE DOSSIER REMOTES
local remotes = ReplicatedStorage:FindFirstChild("Remotes")
if not remotes then
	remotes = Instance.new("Folder")
	remotes.Name = "Remotes"
	remotes.Parent = ReplicatedStorage
end

-- Creer TOUS les remotes necessaires
local remotesList = {
	-- Existants
	"RequestStarter", "RequestAttack", "RequestCapture", "PlayerAttack",
	"UseSkill", "ShowDialogue", "CloseDialogue", "ShowDialogueSimple",
	-- V19
	"AllocateSkillPoint",
	-- V20 Nouveau
	"RequestCaptureLaser",   -- tirer le laser de capture
	"PurchaseBuilding",      -- acheter/reparer un batiment
	"UpgradeBuilding",       -- ameliorer un batiment
	"AssignMonster",         -- assigner monstre (defense/mine/training/none)
	"DepositGold",           -- deposer or a la banque
	"SelectHotbar",          -- changer slot hotbar
	"RepairCrystal",         -- reparer cristal manuellement
	"ChangeClass",           -- changer de classe
	"OpenStorageUI",         -- ouvrir l'UI de stockage
	-- Reponses serveur -> client
	"UpdateMonsterStorage",  -- envoyer les donnees monstres au client
	"CaptureResult",         -- resultat capture (success/fail)
	"WaveUpdate",            -- mise a jour vague
	"CrystalStateUpdate",    -- etat du cristal
	"WeatherUpdate",         -- meteo
	"NotifyPlayer",          -- notification generique
	"OpenBuildingUI",        -- ouvrir l'UI d'un batiment
	"DamageNumber",          -- afficher numero de degats flottant
}

for _, remoteName in ipairs(remotesList) do
	if not remotes:FindFirstChild(remoteName) then
		local remote = Instance.new("RemoteEvent")
		remote.Name = remoteName
		remote.Parent = remotes
	end
end
print("[Server] All", #remotesList, "remotes ready")

-- Creer le monde
WorldBuilder.CreateCrystal()
WorldBuilder.CreateTown()
WorldBuilder.CreateSpawnPoints()
WorldBuilder.CreatePlayerSpawn()
DojoBuilder.CreateDojo()
WorldBuilder.CreateClassHall()
WorldBuilder.SetupLighting()
local npc, npcDetector, npcPrompt = WorldBuilder.CreateNPC()
print("[Server] World created (with improved lighting)")

-- Systemes auto-executes (.server.lua)
print("[Server] Auto-systems: MonsterSpawner, CaptureSystem, CrystalManager, BuildingSystem, MonsterManager")

-- === HANDLER: AllocateSkillPoint ===
local allocateRemote = remotes:WaitForChild("AllocateSkillPoint")
allocateRemote.OnServerEvent:Connect(function(player, skillName)
	local validSkills = {ATK = true, Agility = true, Vitality = true}
	if not validSkills[skillName] then return end
	
	local data = PlayerDataService:GetData(player)
	if not data then return end
	if (data.SkillPointsAvailable or 0) <= 0 then return end
	
	data.SkillPointsAvailable = data.SkillPointsAvailable - 1
	data.SkillPoints[skillName] = (data.SkillPoints[skillName] or 0) + 1
	
	print("[Init] Skill allocated:", player.Name, "+1", skillName)
end)

-- === HANDLER: DepositGold ===
local depositRemote = remotes:WaitForChild("DepositGold")
depositRemote.OnServerEvent:Connect(function(player, amount)
	amount = math.floor(tonumber(amount) or 0)
	if amount <= 0 then return end
	PlayerDataService:DepositToBank(player, amount)
end)

-- === HANDLER: ChangeClass ===
local changeClassRemote = remotes:WaitForChild("ChangeClass")
changeClassRemote.OnServerEvent:Connect(function(player, newClass)
	local success = PlayerDataService:ChangeClass(player, newClass)
	if success then
		-- Donner l'arme correspondante
		local classWeapons = {
			Novice = "NOVICE_STAFF",
			Guerrier = "NOVICE_STAFF", -- on gardera l'epee pour plus tard
			Archer = "NOVICE_STAFF",
			Mage = "NOVICE_STAFF",
			Acolyte = "NOVICE_STAFF",
		}
		local weaponKey = classWeapons[newClass] or "NOVICE_STAFF"
		if WeaponSystem.WEAPONS[weaponKey] then
			WeaponSystem:GiveWeapon(player, WeaponSystem.WEAPONS[weaponKey])
		end
	end
end)

-- === HANDLER: SelectHotbar ===
local selectHotbar = remotes:WaitForChild("SelectHotbar")
selectHotbar.OnServerEvent:Connect(function(player, slot)
	local data = PlayerDataService:GetData(player)
	if not data then return end
	slot = math.clamp(slot, 1, 5)
	data.SelectedHotbar = slot
end)

-- === GERER ARRIVEE DES JOUEURS ===
Players.PlayerAdded:Connect(function(player)
	print("[Server]", player.Name, "joined - initializing V20 data...")
	
	local data = PlayerDataService:LoadData(player)
	
	-- Leaderstats
	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	leaderstats.Parent = player
	
	local goldValue = Instance.new("IntValue")
	goldValue.Name = "Gold"
	goldValue.Value = data.GoldWallet
	goldValue.Parent = leaderstats
	
	local levelValue = Instance.new("IntValue")
	levelValue.Name = "Level"
	levelValue.Value = data.ClassLevels[data.CurrentClass] or 1
	levelValue.Parent = leaderstats
	
	-- Sync attributes (init)
	local function syncAttributes()
		local d = PlayerDataService:GetData(player)
		if not d then return end
		
		local currentClass = d.CurrentClass
		local level = d.ClassLevels[currentClass] or 1
		local xp = d.ClassXP[currentClass] or 0
		
		player:SetAttribute("GoldWallet", d.GoldWallet)
		player:SetAttribute("GoldBank", d.GoldBank)
		player:SetAttribute("PlayerLevel", level)
		player:SetAttribute("PlayerXP", xp)
		player:SetAttribute("CurrentClass", currentClass)
		player:SetAttribute("VilleLevel", d.VilleLevel)
		player:SetAttribute("VilleEra", d.VilleEra)
		player:SetAttribute("SkillPointsAvailable", d.SkillPointsAvailable or 0)
		player:SetAttribute("SkillATK", d.SkillPoints.ATK or 0)
		player:SetAttribute("SkillAgility", d.SkillPoints.Agility or 0)
		player:SetAttribute("SkillVitality", d.SkillPoints.Vitality or 0)
		player:SetAttribute("TotalKills", d.TotalKills or 0)
		player:SetAttribute("TotalCaptures", d.TotalCaptures or 0)
		player:SetAttribute("CurrentWave", d.CurrentWave or 0)
		player:SetAttribute("HighestWave", d.HighestWave or 0)
		player:SetAttribute("BossesKilled", d.BossesKilled or 0)
		player:SetAttribute("CaptureOrbs", d.CaptureOrbs or 5)
		player:SetAttribute("HasCaptureLaser", d.HasCaptureLaser)
		player:SetAttribute("MonsterCount", #d.Monsters)
		player:SetAttribute("StorageCapacity", PlayerDataService:GetMonsterStorageCapacity(player))
		player:SetAttribute("SelectedHotbar", d.SelectedHotbar or 1)
		player:SetAttribute("PlayerRebirths", d.PlayerRebirths or 0)
		
		-- Starter info
		if d.StarterMonster then
			local starter = PlayerDataService:GetMonsterByUID(player, d.StarterMonster)
			if starter then
				player:SetAttribute("StarterName", starter.Name)
				player:SetAttribute("StarterLevel", starter.Level)
				player:SetAttribute("StarterXP", starter.XP)
			end
		end
		
		-- Leaderstats
		goldValue.Value = d.GoldWallet + d.GoldBank
		levelValue.Value = level
	end
	
	syncAttributes()
	
	-- Boucle de sync toutes les secondes
	task.spawn(function()
		while player.Parent do
			syncAttributes()
			task.wait(1)
		end
	end)
end)

print("[Server] V24 Init complete! All systems go.")
