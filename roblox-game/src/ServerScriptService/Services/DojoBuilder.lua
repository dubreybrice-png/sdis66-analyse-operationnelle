--[[
	DojoBuilder - Crée le dojo (tournoi partagé)
	Situé loin de la ville principale
]]

local DojoBuilder = {}

function DojoBuilder.CreateDojo()
	local workspace = game.Workspace
	
	-- Détruire TOUS les Dojo (pas juste le premier)
	for _, obj in pairs(workspace:GetChildren()) do
		if obj.Name == "Dojo" then
			print("[DojoBuilder] Destroying old dojo:", obj:GetFullName())
			obj:Destroy()
		end
	end
	
	local dojo = Instance.new("Model")
	dojo.Name = "Dojo"
	dojo.Parent = workspace
	
	-- POSITION: PÉRIPHÉRIE - À CÔTÉ DE LA ZONE SOMBRE (OUEST) - BIEN LOIN!
	local dojoPos = Vector3.new(-220, 0, 0)
	print("[DojoBuilder] 🟢 Creating Dojo at position:", dojoPos)
	
	-- Arène principale
	local arena = Instance.new("Part")
	arena.Name = "Arena"
	arena.Size = Vector3.new(80, 1, 80)
	arena.Position = dojoPos + Vector3.new(0, 0.5, 0)
	arena.Anchored = true
	arena.Material = Enum.Material.Marble
	arena.BrickColor = BrickColor.new("Dark stone grey")
	arena.Parent = dojo
	
	-- Murs de l'arène (transparent pour voir)
	local walls = {
		Vector3.new(40, 20, 0), -- Nord
		Vector3.new(-40, 20, 0), -- Sud
		Vector3.new(0, 20, 40), -- Est
		Vector3.new(0, 20, -40) -- Ouest
	}
	
	for i, wallOffset in ipairs(walls) do
		local wall = Instance.new("Part")
		wall.Name = "Wall" .. i
		wall.Size = Vector3.new(1, 20, 80)
		if i <= 2 then
			wall.Size = Vector3.new(80, 20, 1)
		end
		wall.Position = dojoPos + wallOffset + Vector3.new(0, 10, 0)
		wall.Anchored = true
		wall.Material = Enum.Material.Brick
		wall.BrickColor = BrickColor.new("Dark stone grey")
		wall.Transparency = 0.5
		wall.Parent = dojo
	end
	
	-- Plateforme spectateurs
	local spectator = Instance.new("Part")
	spectator.Name = "SpectatorArea"
	spectator.Size = Vector3.new(100, 1, 20)
	spectator.Position = dojoPos + Vector3.new(0, 21, -50)
	spectator.Anchored = true
	spectator.Material = Enum.Material.Marble
	spectator.BrickColor = BrickColor.new("Medium stone grey")
	spectator.Parent = dojo
	
	-- Enseigne du dojo
	local sign = Instance.new("Part")
	sign.Name = "Sign"
	sign.Size = Vector3.new(30, 8, 2)
	sign.Position = dojoPos + Vector3.new(0, 35, -42)
	sign.Anchored = true
	sign.Material = Enum.Material.Wood
	sign.BrickColor = BrickColor.new("Dark oak")
	sign.Parent = dojo
	
	local billboard = Instance.new("BillboardGui")
	billboard.Size = UDim2.fromOffset(200, 100)
	billboard.StudsOffset = Vector3.new(0, 5, 0)
	billboard.Parent = sign
	
	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(1, 0, 1, 0)
	label.BackgroundColor3 = Color3.fromRGB(200, 100, 50)
	label.BorderSizePixel = 3
	label.TextSize = 40
	label.Font = Enum.Font.GothamBold
	label.TextColor3 = Color3.new(1, 1, 1)
	label.Text = "⚔️ DOJO ⚔️"
	label.Parent = billboard
	
	print("[DojoBuilder] Dojo created at", dojoPos, "- FAR FROM MAIN CITY!")
	return dojo
end

return DojoBuilder
