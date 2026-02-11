--[[
	NPCDialogueHandler V19
	Gere les dialogues du PNJ guide
	NOUVEAU: Ne re-montre plus le popup starter si deja choisi
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- Attendre que Remotes existe (cree par Init.server.lua)
local remotes = ReplicatedStorage:WaitForChild("Remotes", 10)
if not remotes then
	warn("[NPCDialogueHandler] Remotes folder not found!")
	return
end

-- Les remotes sont crees par Init.server.lua
local showDialogue = remotes:WaitForChild("ShowDialogue", 5)
local closeDialogue = remotes:WaitForChild("CloseDialogue", 5)

if not showDialogue or not closeDialogue then
	warn("[NPCDialogueHandler] Dialogue remotes not found!")
	return
end

-- Service
local PlayerDataService = require(script.Parent.Parent.Services.PlayerDataService)
local WeaponSystem = require(script.Parent.Parent.Services.WeaponSystem)

-- Quand le NPC est clique
local function onNPCClicked(player, npc)
	print("[NPCDialogue] DIALOGUE TRIGGERED BY", player.Name)
	
	-- VERIFIER SI LE JOUEUR A DEJA UN STARTER
	local data = PlayerDataService:GetData(player)
	if data and data.HasStarter then
		print("[NPCDialogue] Joueur a deja un starter, pas de popup starter.")
		-- On pourrait montrer un autre dialogue ici (shop, conseils...)
		return
	end
	
	print("[NPCDialogue] Sending simple dialogue popup...")
	
	local showDialogueSimple = remotes:FindFirstChild("ShowDialogueSimple")
	if not showDialogueSimple then
		showDialogueSimple = Instance.new("RemoteEvent")
		showDialogueSimple.Name = "ShowDialogueSimple"
		showDialogueSimple.Parent = remotes
	end
	
	-- Envoyer au client
	print("[NPCDialogue] Firing ShowDialogueSimple to client!")
	showDialogueSimple:FireClient(player)
end

-- Setup du NPC
task.wait(2) -- Attendre que le monde soit cree

local npc = workspace:WaitForChild("GuideNPC", 10)
if npc then
	print("[NPCDialogueHandler] NPC found!")
	local torso = npc:FindFirstChild("Torso")
	if torso then
		print("[NPCDialogueHandler] Torso found!")
		-- ClickDetector
		local detector = torso:FindFirstChildOfClass("ClickDetector")
		if detector then
			detector.MouseClick:Connect(function(player)
				print("[NPCDialogueHandler] ClickDetector triggered by", player.Name)
				onNPCClicked(player, npc)
			end)
			print("[NPCDialogueHandler] ClickDetector connected")
		else
			print("[NPCDialogueHandler] WARNING: No ClickDetector found!")
		end
		
		-- ProximityPrompt (methode moderne)
		local prompt = torso:FindFirstChildOfClass("ProximityPrompt")
		if prompt then
			prompt.Triggered:Connect(function(player)
				print("[NPCDialogueHandler] ProximityPrompt triggered by", player.Name)
				onNPCClicked(player, npc)
			end)
			print("[NPCDialogueHandler] ProximityPrompt connected")
		else
			print("[NPCDialogueHandler] WARNING: No ProximityPrompt found!")
		end
	else
		print("[NPCDialogueHandler] ERROR: Torso not found!")
	end
else
	print("[NPCDialogueHandler] ERROR: GuideNPC not found!")
end

-- Ecouter les choix de starter et donner l'arme
local requestStarter = remotes:WaitForChild("RequestStarter", 5)
if requestStarter then
	requestStarter.OnServerEvent:Connect(function(player, starterMonsterName)
		print("[NPCDialogueHandler] STARTER CHOSEN:", starterMonsterName, "by", player.Name)
		
		-- Marquer que le joueur a choisi un starter
		local data = PlayerDataService:GetData(player)
		if data then
			data.HasStarter = true
			print("[NPCDialogueHandler] HasStarter set to TRUE")
		end
		
		-- DONNER LE BATON DE NOVICE
		local noviceStaff = WeaponSystem.WEAPONS.NOVICE_STAFF
		WeaponSystem:GiveWeapon(player, noviceStaff)
		print("[NPCDialogueHandler] Given", noviceStaff.name, "to", player.Name)
		
		-- ACTIVER LES MONSTRES (le MonsterSpawner ecoute aussi RequestStarter)
		print("[NPCDialogueHandler] ACTIVATING MONSTER SPAWNING!")
		print("[NPCDialogueHandler] Starter selection complete!")
	end)
	print("[NPCDialogueHandler] RequestStarter listener connected")
else
	print("[NPCDialogueHandler] WARNING: RequestStarter remote not found!")
end
