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
		
		-- === ANIMATION DE CAPTURE: Beam laser + cercle lumineux ===
		local captureBeam = nil
		local captureGlow = nil
		local captureRing = nil
		local captureParticles = {}
		
		if player.Character and player.Character:FindFirstChild("HumanoidRootPart") and monsterModel.PrimaryPart then
			local hrp = player.Character.HumanoidRootPart
			local mPos = monsterModel.PrimaryPart.Position
			
			-- Beam laser (Part allongee entre joueur et monstre)
			local dist = (hrp.Position - mPos).Magnitude
			captureBeam = Instance.new("Part")
			captureBeam.Name = "CaptureBeam"
			captureBeam.Size = Vector3.new(0.3, 0.3, dist)
			captureBeam.Color = Color3.fromRGB(100, 255, 200)
			captureBeam.Material = Enum.Material.Neon
			captureBeam.Transparency = 0.3
			captureBeam.Anchored = true
			captureBeam.CanCollide = false
			captureBeam.CFrame = CFrame.lookAt(hrp.Position, mPos) * CFrame.new(0, 0, -dist / 2)
			captureBeam.Parent = Workspace
			
			-- Glow autour du monstre (sphere forcefield)
			captureGlow = Instance.new("Part")
			captureGlow.Name = "CaptureGlow"
			captureGlow.Shape = Enum.PartType.Ball
			captureGlow.Size = Vector3.new(6, 6, 6)
			captureGlow.Color = Color3.fromRGB(100, 255, 200)
			captureGlow.Material = Enum.Material.ForceField
			captureGlow.Transparency = 0.5
			captureGlow.Anchored = true
			captureGlow.CanCollide = false
			captureGlow.CFrame = CFrame.new(mPos)
			captureGlow.Parent = Workspace
			
			-- Anneau rotatif
			captureRing = Instance.new("Part")
			captureRing.Name = "CaptureRing"
			captureRing.Shape = Enum.PartType.Cylinder
			captureRing.Size = Vector3.new(0.2, 8, 8)
			captureRing.Color = Color3.fromRGB(50, 200, 255)
			captureRing.Material = Enum.Material.Neon
			captureRing.Transparency = 0.4
			captureRing.Anchored = true
			captureRing.CanCollide = false
			captureRing.CFrame = CFrame.new(mPos) * CFrame.Angles(0, 0, math.rad(90))
			captureRing.Parent = Workspace
			
			-- Particules orbitales
			for i = 1, 4 do
				local particle = Instance.new("Part")
				particle.Name = "CaptureParticle"
				particle.Shape = Enum.PartType.Ball
				particle.Size = Vector3.new(0.5, 0.5, 0.5)
				particle.Color = Color3.fromRGB(255, 255, 100)
				particle.Material = Enum.Material.Neon
				particle.Transparency = 0
				particle.Anchored = true
				particle.CanCollide = false
				particle.CFrame = CFrame.new(mPos)
				particle.Parent = Workspace
				table.insert(captureParticles, particle)
			end
			
			-- Animation async: pulse le glow + rotate ring + orbit particles
			task.spawn(function()
				local t = 0
				while captureGlow and captureGlow.Parent do
					t = t + 0.03
					local pulse = 0.3 + math.sin(t * 6) * 0.2
					if captureGlow.Parent then
						captureGlow.Transparency = pulse
						captureGlow.Size = Vector3.new(5 + math.sin(t * 4), 5 + math.sin(t * 4), 5 + math.sin(t * 4))
					end
					if captureRing and captureRing.Parent then
						captureRing.CFrame = CFrame.new(mPos) * CFrame.Angles(t * 2, t * 3, math.rad(90))
					end
					for idx, p in ipairs(captureParticles) do
						if p.Parent then
							local angle = t * 4 + (idx / #captureParticles) * math.pi * 2
							p.CFrame = CFrame.new(mPos + Vector3.new(math.cos(angle) * 4, math.sin(t * 3 + idx) * 2, math.sin(angle) * 4))
						end
					end
					if captureBeam and captureBeam.Parent and player.Character and player.Character:FindFirstChild("HumanoidRootPart") then
						local hrp2 = player.Character.HumanoidRootPart
						local d2 = (hrp2.Position - mPos).Magnitude
						captureBeam.Size = Vector3.new(0.2 + math.sin(t * 8) * 0.1, 0.2 + math.sin(t * 8) * 0.1, d2)
						captureBeam.CFrame = CFrame.lookAt(hrp2.Position, mPos) * CFrame.new(0, 0, -d2 / 2)
					end
					task.wait(0.03)
				end
			end)
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
			
			-- === ANIMATION SUCCES: flash vert + monstre aspiré ===
			if captureGlow and captureGlow.Parent then
				captureGlow.Color = Color3.fromRGB(50, 255, 50)
				captureGlow.Transparency = 0.2
			end
			-- Shrink le monstre
			if monsterModel.PrimaryPart then
				for i = 1, 10 do
					for _, part in ipairs(monsterModel:GetDescendants()) do
						if part:IsA("BasePart") then
							part.Size = part.Size * 0.85
							part.Transparency = part.Transparency + 0.08
						end
					end
					task.wait(0.05)
				end
			end
			-- Cleanup capture effects
			if captureBeam and captureBeam.Parent then captureBeam:Destroy() end
			if captureGlow and captureGlow.Parent then captureGlow:Destroy() end
			if captureRing and captureRing.Parent then captureRing:Destroy() end
			for _, p in ipairs(captureParticles) do if p.Parent then p:Destroy() end end
			
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
			-- === ANIMATION ECHEC: flash rouge ===
			if captureGlow and captureGlow.Parent then
				captureGlow.Color = Color3.fromRGB(255, 50, 50)
				captureGlow.Transparency = 0.2
			end
			task.wait(0.3)
			-- Cleanup capture effects
			if captureBeam and captureBeam.Parent then captureBeam:Destroy() end
			if captureGlow and captureGlow.Parent then captureGlow:Destroy() end
			if captureRing and captureRing.Parent then captureRing:Destroy() end
			for _, p in ipairs(captureParticles) do if p.Parent then p:Destroy() end end
			
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
		
		-- Verifier que le batiment correspondant est construit
		if assignment == "defense" then
			local defBuilding = data.Buildings and data.Buildings["defense_bureau"]
			if not defBuilding or not defBuilding.built then
				notify(player, "Construis le Bureau des Defenses d'abord!")
				return
			end
		elseif assignment == "mine" then
			local mineBuilding = data.Buildings and data.Buildings["gold_mine"]
			if not mineBuilding or not mineBuilding.built then
				notify(player, "Construis la Mine d'Or d'abord!")
				return
			end
		elseif assignment == "training" then
			local trainBuilding = data.Buildings and data.Buildings["training_center"]
			if not trainBuilding or not trainBuilding.built then
				notify(player, "Construis le Centre d'Entrainement d'abord!")
				return
			end
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
			
			-- Spawn le modele defenseur (modele multi-parts)
			local species = MonsterDB:Get(monster.SpeciesID)
			if species then
				local ElementSystem = require(ReplicatedStorage.Data.ElementSystem)
				local crystalPos = Workspace.Crystal and (Workspace.Crystal.PrimaryPart and Workspace.Crystal.PrimaryPart.Position or Workspace.Crystal:GetPivot().Position) or Vector3.new(0, 5, 0)
				
				local defender = Instance.new("Model")
				defender.Name = "Defender_" .. monster.Name .. "_" .. player.UserId
				
				local defColor = ElementSystem:GetColor(species.element)
				local defSize = (species.size or 2.5) * 0.8
				local spawnCF = CFrame.new(crystalPos + Vector3.new(math.random(-8, 8), defSize * 0.8, math.random(-8, 8)))
				
				local body = Instance.new("Part")
				body.Name = "Body"
				body.Size = Vector3.new(defSize * 1.4, defSize * 1.0, defSize * 1.8)
				body.Color = defColor
				body.Material = Enum.Material.Neon
				body.CanCollide = true
				body.CFrame = spawnCF
				body.Parent = defender
				defender.PrimaryPart = body
				
				-- Tete
				local dHead = Instance.new("Part")
				dHead.Shape = Enum.PartType.Ball
				dHead.Size = Vector3.new(defSize * 1.0, defSize * 0.9, defSize * 0.9)
				dHead.Color = defColor
				dHead.Material = Enum.Material.Neon
				dHead.CanCollide = false
				dHead.CFrame = body.CFrame * CFrame.new(0, defSize * 0.3, -defSize * 1.1)
				dHead.Parent = defender
				local dhw = Instance.new("WeldConstraint"); dhw.Part0 = body; dhw.Part1 = dHead; dhw.Parent = dHead
				
				-- Yeux
				for side = -1, 1, 2 do
					local eye = Instance.new("Part")
					eye.Shape = Enum.PartType.Ball
					eye.Size = Vector3.new(defSize * 0.2, defSize * 0.22, defSize * 0.12)
					eye.Color = Color3.new(1, 1, 1)
					eye.Material = Enum.Material.SmoothPlastic
					eye.CanCollide = false
					eye.CFrame = dHead.CFrame * CFrame.new(side * defSize * 0.25, defSize * 0.15, -defSize * 0.35)
					eye.Parent = defender
					local ew = Instance.new("WeldConstraint"); ew.Part0 = dHead; ew.Part1 = eye; ew.Parent = eye
				end
				
				-- Pattes
				for _, offset in ipairs({
					Vector3.new(-defSize*0.4, -defSize*0.4, -defSize*0.5),
					Vector3.new(defSize*0.4, -defSize*0.4, -defSize*0.5),
					Vector3.new(-defSize*0.4, -defSize*0.4, defSize*0.5),
					Vector3.new(defSize*0.4, -defSize*0.4, defSize*0.5),
				}) do
					local leg = Instance.new("Part")
					leg.Size = Vector3.new(defSize * 0.3, defSize * 0.5, defSize * 0.3)
					leg.Color = Color3.new(defColor.R * 0.7, defColor.G * 0.7, defColor.B * 0.7)
					leg.Material = Enum.Material.Neon
					leg.CanCollide = false
					leg.CFrame = body.CFrame * CFrame.new(offset)
					leg.Parent = defender
					local lw = Instance.new("WeldConstraint"); lw.Part0 = body; lw.Part1 = leg; lw.Parent = leg
				end
				
				local glow = Instance.new("PointLight")
				glow.Brightness = 1; glow.Range = 10; glow.Color = defColor; glow.Parent = body
				
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
