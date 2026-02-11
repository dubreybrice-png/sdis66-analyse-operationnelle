--[[
	CaptureSystem V20 - Laser capture de monstres assommes
	- Joueur clique sur monstre assomme
	- Channel de 4s (modifie par upgrades laser)
	- Roll de capture base sur rarete + bonus
	- Ajout au storage si reussi
]]

print("[CaptureSystem V20] Loading...")

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local Workspace = game.Workspace

local PlayerDataService = require(ServerScriptService.Services.PlayerDataService)
local GameConfig = require(ReplicatedStorage.Data.GameConfig)
local MonsterDB = require(ReplicatedStorage.Data.MonsterDatabase)

local remotes = ReplicatedStorage:WaitForChild("Remotes", 10)
if not remotes then warn("[CaptureSystem] Remotes not found!") return end

local requestCapture = remotes:WaitForChild("RequestCaptureLaser", 5)
local captureResult = remotes:WaitForChild("CaptureResult", 5)
local notifyRemote = remotes:FindFirstChild("NotifyPlayer")

-- Tracking joueurs en train de capturer (anti-spam)
local capturingPlayers = {} -- {userId = true}

local function notify(player, msg)
	if notifyRemote then
		notifyRemote:FireClient(player, msg)
	end
end

if requestCapture then
	requestCapture.OnServerEvent:Connect(function(player, monsterName)
		-- Anti-spam
		if capturingPlayers[player.UserId] then
			notify(player, "Capture deja en cours!")
			return
		end
		
		local data = PlayerDataService:GetData(player)
		if not data then return end
		
		-- Verifier que le joueur a le laser
		if not data.HasCaptureLaser then
			notify(player, "Tu n'as pas de laser de capture! Construis l'Armurerie.")
			return
		end
		
		-- Laser illimite (plus besoin d'orbes)
		
		-- Trouver le monstre assomme
		local monsterModel = nil
		for _, obj in ipairs(Workspace:GetChildren()) do
			if obj:IsA("Model") and obj.Name == monsterName then
				if obj:GetAttribute("IsKnockedOut") then
					monsterModel = obj
					break
				end
			end
		end
		
		if not monsterModel then
			notify(player, "Monstre introuvable ou pas assomme!")
			return
		end
		
		-- Verifier distance
		if player.Character and player.Character:FindFirstChild("HumanoidRootPart") then
			local dist = (player.Character.HumanoidRootPart.Position - monsterModel.PrimaryPart.Position).Magnitude
			if dist > 30 then
				notify(player, "Trop loin! Approche-toi.")
				return
			end
		end
		
		-- Verifier capacite de stockage
		local capacity = PlayerDataService:GetMonsterStorageCapacity(player)
		if #data.Monsters >= capacity then
			notify(player, "Stockage plein! (" .. #data.Monsters .. "/" .. capacity .. ") Ameliore ton Centre de Stockage.")
			return
		end
		
		-- DEBUT CAPTURE
		capturingPlayers[player.UserId] = true
		
		-- Laser illimite, pas de consommation d'orbes
		
		-- Channel time (modifie par laser speed)
		local channelTime = math.max(1, GameConfig.CAPTURE.CHANNEL_TIME - (data.LaserSpeed or 0) * 0.3)
		
		notify(player, "Capture en cours... (" .. string.format("%.1f", channelTime) .. "s)")
		
		-- Marquer visuellement
		if monsterModel.PrimaryPart then
			monsterModel.PrimaryPart.Color = Color3.fromRGB(255, 255, 50)
			monsterModel.PrimaryPart.Material = Enum.Material.ForceField
		end
		
		task.wait(channelTime)
		
		-- Verifier que le monstre est toujours la
		if not monsterModel.Parent then
			notify(player, "Le monstre a disparu!")
			capturingPlayers[player.UserId] = nil
			return
		end
		
		-- ROLL DE CAPTURE
		local rarity = monsterModel:GetAttribute("Rarity") or "Commun"
		local baseRate = GameConfig.CAPTURE.BASE_RATE[rarity] or 0.15
		local bonusRate = (data.LaserChance or 0) * 0.02 -- +2% par upgrade
		local captureChance = math.min(0.85, baseRate + bonusRate)
		
		local roll = math.random()
		local captured = roll <= captureChance
		
		if not captured then
			-- Retry chance?
			local retryChance = (data.LaserRetry or 0) * 0.08
			if retryChance > 0 and math.random() < retryChance then
				captured = true
				notify(player, "Deuxieme chance! Relance automatique!")
			end
		end
		
		if captured then
			-- CAPTURE REUSSIE!
			local speciesId = monsterModel:GetAttribute("SpeciesID")
			local wildLevel = monsterModel:GetAttribute("WildLevel") or 1
			local traitId = monsterModel:GetAttribute("TraitID")
			
			-- Creer l'instance monstre
			local monsterInstance = MonsterDB:CreateInstance(speciesId, wildLevel, rarity, traitId)
			
			if monsterInstance then
				PlayerDataService:AddMonster(player, monsterInstance)
				
				-- Bestiary: "captured"
				data.Bestiary[speciesId] = "captured"
				data.TotalCaptures = (data.TotalCaptures or 0) + 1
				
				-- XP de capture
				local captureXP = GameConfig.XP.CAPTURE_BASE + (GameConfig.XP.RARITY_XP_BONUS[rarity] or 0) * 2
				PlayerDataService:AddPlayerXP(player, captureXP)
				
				-- Notification succes
				local species = MonsterDB:Get(speciesId)
				local speciesName = species and species.name or speciesId
				notify(player, "CAPTURE! " .. speciesName .. " [" .. rarity .. "] Nv." .. wildLevel .. " rejoint ton equipe!")
				
				-- Fire result pour UI
				if captureResult then
					captureResult:FireClient(player, true, speciesName, rarity, wildLevel)
				end
			end
			
			-- Detruire le modele
			monsterModel:Destroy()
		else
			-- ECHEC
			local percent = math.floor(captureChance * 100)
			notify(player, "Capture echouee! (" .. percent .. "% de chance) Le monstre s'enfuit...")
			
			if captureResult then
				captureResult:FireClient(player, false, "", rarity, 0)
			end
			
			-- Le monstre disparait apres echec
			task.delay(1, function()
				if monsterModel.Parent then
					monsterModel:Destroy()
				end
			end)
		end
		
		capturingPlayers[player.UserId] = nil
	end)
end

-- Ecouter AssignMonster (assigner un monstre a defense/mine/training)
local assignRemote = remotes:WaitForChild("AssignMonster", 5)
if assignRemote then
	assignRemote.OnServerEvent:Connect(function(player, monsterUID, assignment)
		local data = PlayerDataService:GetData(player)
		if not data then return end
		
		local monster = PlayerDataService:GetMonsterByUID(player, monsterUID)
		if not monster then
			notify(player, "Monstre introuvable!")
			return
		end
		
		-- Retirer de l'ancien slot
		local oldAssignment = monster.Assignment or "none"
		if oldAssignment == "defense" then
			for i, uid in ipairs(data.DefenseSlots) do
				if uid == monsterUID then
					table.remove(data.DefenseSlots, i)
					-- Detruire le modele defenseur
					for _, obj in ipairs(Workspace:GetChildren()) do
						if obj.Name:match("Defender_") and obj:GetAttribute("MonsterUID") == monsterUID then
							obj:Destroy()
							break
						end
					end
					break
				end
			end
		elseif oldAssignment == "mine" then
			for i, uid in ipairs(data.MineSlots) do
				if uid == monsterUID then table.remove(data.MineSlots, i); break end
			end
		elseif oldAssignment == "training" then
			for i, uid in ipairs(data.TrainingSlots) do
				if uid == monsterUID then table.remove(data.TrainingSlots, i); break end
			end
		end
		
		-- Assigner au nouveau slot
		if assignment == "defense" then
			local maxSlots = PlayerDataService:GetDefenseSlotCount(player)
			if #data.DefenseSlots >= maxSlots then
				notify(player, "Slots de defense pleins! (" .. #data.DefenseSlots .. "/" .. maxSlots .. ")")
				monster.Assignment = "none"
				return
			end
			table.insert(data.DefenseSlots, monsterUID)
			monster.Assignment = "defense"
			
			-- Spawn le modele defenseur
			local MonsterSpawner = {} -- Reference pour spawn
			-- On cree directement ici
			local species = MonsterDB:Get(monster.SpeciesID)
			if species then
				local crystalPos = Workspace.Crystal and (Workspace.Crystal.PrimaryPart and Workspace.Crystal.PrimaryPart.Position or Workspace.Crystal:GetPivot().Position) or Vector3.new(0, 5, 0)
				
				local defender = Instance.new("Model")
				defender.Name = "Defender_" .. monster.Name .. "_" .. player.UserId
				
				local body = Instance.new("Part")
				body.Name = "Body"
				body.Shape = Enum.PartType.Ball
				body.Size = Vector3.new(3, 3, 3)
				body.Color = require(ReplicatedStorage.Data.ElementSystem):GetColor(species.element)
				body.Material = Enum.Material.Neon
				body.CanCollide = true
				body.CFrame = CFrame.new(crystalPos + Vector3.new(math.random(-8, 8), 2, math.random(-8, 8)))
				body.Parent = defender
				defender.PrimaryPart = body
				
				local hum = Instance.new("Humanoid")
				hum.MaxHealth = monster.MaxHP or 200
				hum.Health = monster.CurrentHP or 200
				hum.Parent = defender
				
				defender:SetAttribute("OwnerUserId", player.UserId)
				defender:SetAttribute("MonsterUID", monsterUID)
				defender.Parent = Workspace
			end
			
			notify(player, monster.Name .. " assigne en DEFENSE!")
			
		elseif assignment == "mine" then
			local maxSlots = PlayerDataService:GetMineSlotCount(player)
			if #data.MineSlots >= maxSlots then
				notify(player, "Slots de mine pleins!")
				monster.Assignment = "none"
				return
			end
			table.insert(data.MineSlots, monsterUID)
			monster.Assignment = "mine"
			notify(player, monster.Name .. " assigne a la MINE!")
			
		elseif assignment == "training" then
			local maxSlots = PlayerDataService:GetTrainingSlotCount(player)
			if #data.TrainingSlots >= maxSlots then
				notify(player, "Slots d'entrainement pleins!")
				monster.Assignment = "none"
				return
			end
			table.insert(data.TrainingSlots, monsterUID)
			monster.Assignment = "training"
			notify(player, monster.Name .. " en ENTRAINEMENT!")
			
		else
			monster.Assignment = "none"
			notify(player, monster.Name .. " est maintenant libre.")
		end
	end)
end

print("[CaptureSystem V20] Ready!")
