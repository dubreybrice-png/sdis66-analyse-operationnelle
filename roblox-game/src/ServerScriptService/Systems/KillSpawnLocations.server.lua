--[[
	KillSpawnLocations - Tue tous les clignotements
	Détruit TOUS les SpawnLocation du jeu
]]

local Workspace = game.Workspace

-- Détruire TOUS les SpawnLocation
for _, obj in pairs(Workspace:GetDescendants()) do
	if obj:IsA("SpawnLocation") then
		print("[KillSpawnLocations] Destroying:", obj.Name, obj:GetFullName())
		obj:Destroy()
	end
end

-- Écouter les nouveaux SpawnLocation (s'il y en a)
Workspace.DescendantAdded:Connect(function(descendant)
	if descendant:IsA("SpawnLocation") then
		print("[KillSpawnLocations] Nouveau SpawnLocation créé! Destruction:", descendant.Name)
		task.wait(0.1)
		descendant:Destroy()
	end
end)

print("[KillSpawnLocations] Système actif - tous les SpawnLocation seront détruits!")
