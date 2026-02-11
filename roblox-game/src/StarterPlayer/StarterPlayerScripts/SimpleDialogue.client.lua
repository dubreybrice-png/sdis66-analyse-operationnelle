--[[
	SimpleDialogue V18 - Dialogue NPC + Selection Starter
	Quand le serveur fire ShowDialogueSimple, on affiche le dialogue puis les starters
]]

print("[SimpleDialogue V18] Script loaded!")

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local player = Players.LocalPlayer

if not player then
	print("[SimpleDialogue] No player!")
	return
end

local playerGui = player:WaitForChild("PlayerGui", 10)
if not playerGui then
	print("[SimpleDialogue] No PlayerGui!")
	return
end

-- Attendre les remotes
local remotes = ReplicatedStorage:WaitForChild("Remotes", 10)
if not remotes then
	print("[SimpleDialogue] No remotes folder!")
	return
end

local requestStarter = remotes:WaitForChild("RequestStarter", 10)
print("[SimpleDialogue] RequestStarter:", requestStarter and "FOUND" or "MISSING")

-- === STARTER DATA (local, pas besoin du module serveur) ===
local STARTERS = {
	{id = 1, name = "Flameguard", element = "Feu", emoji = "🔥", color = Color3.fromRGB(255, 80, 40), hp = 45, atk = 12, def = 8},
	{id = 2, name = "Aquashell", element = "Eau", emoji = "💧", color = Color3.fromRGB(40, 120, 255), hp = 50, atk = 9, def = 12},
	{id = 3, name = "Voltsprite", element = "Electrique", emoji = "⚡", color = Color3.fromRGB(255, 220, 40), hp = 40, atk = 14, def = 7},
}

-- === AFFICHER LE DIALOGUE ===
local function showDialogueAndStarters()
	print("[SimpleDialogue] SHOWING DIALOGUE!")
	
	-- Supprimer un ancien popup s'il existe
	local old = playerGui:FindFirstChild("DialoguePopup")
	if old then old:Destroy() end
	
	local gui = Instance.new("ScreenGui")
	gui.Name = "DialoguePopup"
	gui.ResetOnSpawn = false
	gui.Parent = playerGui
	
	-- Fond noir semi-transparent
	local bg = Instance.new("Frame")
	bg.Name = "Background"
	bg.Size = UDim2.new(1, 0, 1, 0)
	bg.BackgroundColor3 = Color3.new(0, 0, 0)
	bg.BackgroundTransparency = 0.4
	bg.Parent = gui
	
	-- Boite de dialogue
	local dialog = Instance.new("Frame")
	dialog.Name = "DialogBox"
	dialog.Size = UDim2.new(0, 750, 0, 500)
	dialog.AnchorPoint = Vector2.new(0.5, 0.5)
	dialog.Position = UDim2.new(0.5, 0, 0.5, 0)
	dialog.BackgroundColor3 = Color3.fromRGB(25, 18, 35)
	dialog.BorderSizePixel = 3
	dialog.BorderColor3 = Color3.fromRGB(200, 150, 80)
	dialog.Parent = gui
	
	-- Coins arrondis
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 12)
	corner.Parent = dialog
	
	-- Titre
	local title = Instance.new("TextLabel")
	title.Size = UDim2.new(1, -20, 0, 45)
	title.Position = UDim2.new(0, 10, 0, 10)
	title.BackgroundTransparency = 1
	title.TextSize = 26
	title.Font = Enum.Font.GothamBold
	title.TextColor3 = Color3.fromRGB(255, 220, 100)
	title.Text = "Guide Aldric"
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.Parent = dialog
	
	-- Texte dialogue
	local text = Instance.new("TextLabel")
	text.Size = UDim2.new(1, -20, 0, 100)
	text.Position = UDim2.new(0, 10, 0, 55)
	text.BackgroundTransparency = 1
	text.TextSize = 15
	text.Font = Enum.Font.Gotham
	text.TextColor3 = Color3.new(0.95, 0.95, 0.95)
	text.TextWrapped = true
	text.TextXAlignment = Enum.TextXAlignment.Left
	text.TextYAlignment = Enum.TextYAlignment.Top
	text.Text = "Bienvenue, nouveau dresseur !\n\nNotre cristal magique est en danger ! Des monstres sauvages l'attaquent sans cesse.\nChoisis un monstre de depart pour nous aider a le proteger !"
	text.Parent = dialog
	
	-- === SECTION STARTER SELECTION ===
	local starterTitle = Instance.new("TextLabel")
	starterTitle.Size = UDim2.new(1, 0, 0, 35)
	starterTitle.Position = UDim2.new(0, 0, 0, 160)
	starterTitle.BackgroundTransparency = 1
	starterTitle.TextSize = 22
	starterTitle.Font = Enum.Font.GothamBold
	starterTitle.TextColor3 = Color3.fromRGB(255, 180, 50)
	starterTitle.Text = "CHOISIS TON MONSTRE DE DEPART"
	starterTitle.Parent = dialog
	
	-- Créer les 3 cartes starter
	for i, starter in ipairs(STARTERS) do
		local cardX = 30 + ((i - 1) * 235)
		
		local card = Instance.new("Frame")
		card.Name = "Card_" .. starter.name
		card.Size = UDim2.new(0, 215, 0, 260)
		card.Position = UDim2.new(0, cardX, 0, 200)
		card.BackgroundColor3 = Color3.fromRGB(40, 35, 55)
		card.BorderSizePixel = 2
		card.BorderColor3 = starter.color
		card.Parent = dialog
		
		local cardCorner = Instance.new("UICorner")
		cardCorner.CornerRadius = UDim.new(0, 8)
		cardCorner.Parent = card
		
		-- Emoji / image placeholder
		local emojiLabel = Instance.new("TextLabel")
		emojiLabel.Size = UDim2.new(1, 0, 0, 80)
		emojiLabel.Position = UDim2.new(0, 0, 0, 5)
		emojiLabel.BackgroundTransparency = 1
		emojiLabel.TextSize = 50
		emojiLabel.Text = starter.emoji
		emojiLabel.Parent = card
		
		-- Nom
		local nameLabel = Instance.new("TextLabel")
		nameLabel.Size = UDim2.new(1, -10, 0, 28)
		nameLabel.Position = UDim2.new(0, 5, 0, 85)
		nameLabel.BackgroundTransparency = 1
		nameLabel.TextSize = 18
		nameLabel.Font = Enum.Font.GothamBold
		nameLabel.TextColor3 = starter.color
		nameLabel.Text = starter.name
		nameLabel.Parent = card
		
		-- Element
		local elemLabel = Instance.new("TextLabel")
		elemLabel.Size = UDim2.new(1, -10, 0, 20)
		elemLabel.Position = UDim2.new(0, 5, 0, 113)
		elemLabel.BackgroundTransparency = 1
		elemLabel.TextSize = 13
		elemLabel.Font = Enum.Font.Gotham
		elemLabel.TextColor3 = Color3.fromRGB(180, 180, 220)
		elemLabel.Text = "Type: " .. starter.element
		elemLabel.Parent = card
		
		-- Stats
		local statsLabel = Instance.new("TextLabel")
		statsLabel.Size = UDim2.new(1, -10, 0, 50)
		statsLabel.Position = UDim2.new(0, 5, 0, 135)
		statsLabel.BackgroundTransparency = 1
		statsLabel.TextSize = 12
		statsLabel.Font = Enum.Font.Gotham
		statsLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
		statsLabel.TextWrapped = true
		statsLabel.Text = string.format("HP: %d\nATK: %d | DEF: %d", starter.hp, starter.atk, starter.def)
		statsLabel.Parent = card
		
		-- Bouton CHOISIR
		local btn = Instance.new("TextButton")
		btn.Size = UDim2.new(1, -20, 0, 40)
		btn.Position = UDim2.new(0, 10, 1, -50)
		btn.BackgroundColor3 = Color3.fromRGB(60, 180, 60)
		btn.TextSize = 16
		btn.Font = Enum.Font.GothamBold
		btn.TextColor3 = Color3.new(1, 1, 1)
		btn.Text = "CHOISIR"
		btn.Parent = card
		
		local btnCorner = Instance.new("UICorner")
		btnCorner.CornerRadius = UDim.new(0, 6)
		btnCorner.Parent = btn
		
		-- Hover effect
		btn.MouseEnter:Connect(function()
			btn.BackgroundColor3 = Color3.fromRGB(80, 220, 80)
		end)
		btn.MouseLeave:Connect(function()
			btn.BackgroundColor3 = Color3.fromRGB(60, 180, 60)
		end)
		
		btn.MouseButton1Click:Connect(function()
			print("[SimpleDialogue] Starter chosen:", starter.name, "id:", starter.id)
			
			-- Fire au serveur
			if requestStarter then
				requestStarter:FireServer(starter.id)
				print("[SimpleDialogue] Fired RequestStarter with id", starter.id)
			else
				warn("[SimpleDialogue] RequestStarter remote not found!")
			end
			
			-- Message de confirmation
			for _, child in ipairs(dialog:GetChildren()) do
				if child:IsA("GuiObject") then
					child:Destroy()
				end
			end
			
			local confirmText = Instance.new("TextLabel")
			confirmText.Size = UDim2.new(1, -40, 1, -40)
			confirmText.Position = UDim2.new(0, 20, 0, 20)
			confirmText.BackgroundTransparency = 1
			confirmText.TextSize = 28
			confirmText.Font = Enum.Font.GothamBold
			confirmText.TextColor3 = starter.color
			confirmText.TextWrapped = true
			confirmText.Text = starter.emoji .. " " .. starter.name .. " rejoint ton equipe !\n\nTu recois aussi un Baton de Novice !\n\nLes monstres vont commencer a apparaitre...\nBonne chance, dresseur !"
			confirmText.Parent = dialog
			
			-- Fermer apres 4 secondes
			task.delay(4, function()
				if gui and gui.Parent then
					gui:Destroy()
				end
			end)
		end)
	end
	
	-- Bouton fermer (X) en haut a droite
	local closeBtn = Instance.new("TextButton")
	closeBtn.Size = UDim2.new(0, 35, 0, 35)
	closeBtn.Position = UDim2.new(1, -40, 0, 5)
	closeBtn.BackgroundColor3 = Color3.fromRGB(180, 40, 40)
	closeBtn.TextSize = 20
	closeBtn.Font = Enum.Font.GothamBold
	closeBtn.TextColor3 = Color3.new(1, 1, 1)
	closeBtn.Text = "X"
	closeBtn.Parent = dialog
	
	local closeBtnCorner = Instance.new("UICorner")
	closeBtnCorner.CornerRadius = UDim.new(0, 6)
	closeBtnCorner.Parent = closeBtn
	
	closeBtn.MouseButton1Click:Connect(function()
		gui:Destroy()
	end)
end

-- === ECOUTER LE SERVEUR ===
local showDialogueSimple = remotes:WaitForChild("ShowDialogueSimple", 10)
if showDialogueSimple then
	print("[SimpleDialogue] ShowDialogueSimple remote FOUND! Connecting...")
	showDialogueSimple.OnClientEvent:Connect(function()
		print("[SimpleDialogue] SERVER FIRED ShowDialogueSimple! Showing popup!")
		showDialogueAndStarters()
	end)
	print("[SimpleDialogue] Listener connected!")
else
	warn("[SimpleDialogue] ShowDialogueSimple remote NOT FOUND!")
end

print("[SimpleDialogue V18] Ready! Waiting for NPC interaction...")
