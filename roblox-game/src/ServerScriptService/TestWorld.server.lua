--[[
	TEST RAPIDE - Vérifie que le monde se charge
	Place ce script dans ServerScriptService pour debug
]]

local workspace = game.Workspace

print("=== TEST WORLD ===")

task.wait(2)

-- Vérifier Crystal
local crystal = workspace:FindFirstChild("Crystal")
if crystal then
	print("✓ Crystal found at:", crystal.Position)
else
	warn("✗ Crystal NOT FOUND")
end

-- Vérifier Town
local town = workspace:FindFirstChild("Town")
if town then
	local children = town:GetChildren()
	print("✓ Town folder found with", #children, "elements")
	
	-- Lister quelques éléments
	for i = 1, math.min(5, #children) do
		print("  -", children[i].Name)
	end
else
	warn("✗ Town folder NOT FOUND")
end

-- Vérifier WildSpawnPoints
local spawns = workspace:FindFirstChild("WildSpawnPoints")
if spawns then
	local spawnChildren = spawns:GetChildren()
	print("✓ WildSpawnPoints found with", #spawnChildren, "spawn points")
	for _, sp in ipairs(spawnChildren) do
		print("  -", sp.Name, "at", sp.Position)
	end
else
	warn("✗ WildSpawnPoints NOT FOUND")
end

-- Vérifier PlayerSpawn
local playerSpawn = workspace:FindFirstChild("PlayerSpawn")
if playerSpawn then
	print("✓ PlayerSpawn found at:", playerSpawn.Position)
else
	warn("✗ PlayerSpawn NOT FOUND")
end

print("=== FIN TEST ===")
