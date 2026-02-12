--[[
	Minimap V23 - Mini carte en haut a droite
	- Montre le joueur, les monstres, le cristal, les batiments
	- Zoom automatique
	- Dots colores par type
]]

print("[Minimap V23] Loading...")

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui", 10)
if not playerGui then return end

-- === GUI ===
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "Minimap_V23"
screenGui.ResetOnSpawn = false
screenGui.DisplayOrder = 5
screenGui.Parent = playerGui

-- Minimap container
local mapFrame = Instance.new("Frame")
mapFrame.Name = "MinimapFrame"
mapFrame.Size = UDim2.new(0, 160, 0, 160)
mapFrame.Position = UDim2.new(1, -170, 0, 10)
mapFrame.BackgroundColor3 = Color3.fromRGB(10, 15, 25)
mapFrame.BackgroundTransparency = 0.15
mapFrame.BorderSizePixel = 0
mapFrame.ClipsDescendants = true
mapFrame.Parent = screenGui
Instance.new("UICorner", mapFrame).CornerRadius = UDim.new(0, 80) -- cercle
local mapStroke = Instance.new("UIStroke")
mapStroke.Color = Color3.fromRGB(80, 150, 255)
mapStroke.Thickness = 2
mapStroke.Parent = mapFrame

-- Label "CARTE"
local mapLabel = Instance.new("TextLabel")
mapLabel.Size = UDim2.new(1, 0, 0, 14)
mapLabel.Position = UDim2.new(0, 0, 1, 2)
mapLabel.BackgroundTransparency = 1
mapLabel.TextColor3 = Color3.fromRGB(120, 160, 200)
mapLabel.TextSize = 9
mapLabel.Font = Enum.Font.Gotham
mapLabel.Text = "CARTE"
mapLabel.Parent = screenGui

-- Dot pool
local dots = {}
local MAP_SCALE = 1.0  -- 1 pixel = MAP_SCALE studs
local MAP_RANGE = 120   -- studs visibles depuis le centre

local function createDot(name, color, size)
	local dot = Instance.new("Frame")
	dot.Name = name
	dot.Size = UDim2.new(0, size, 0, size)
	dot.BackgroundColor3 = color
	dot.BorderSizePixel = 0
	dot.Visible = false
	dot.Parent = mapFrame
	Instance.new("UICorner", dot).CornerRadius = UDim.new(1, 0) -- circle
	return dot
end

-- Player dot (always centered, bright)
local playerDot = createDot("Player", Color3.fromRGB(100, 255, 100), 8)
playerDot.Visible = true

-- Direction indicator
local dirIndicator = createDot("Direction", Color3.fromRGB(100, 255, 100), 4)
dirIndicator.Visible = true

-- Crystal dot
local crystalDot = createDot("Crystal", Color3.fromRGB(0, 200, 255), 10)

-- Building dots
local buildingDots = {}
-- Monster dots (reusable pool)
local monsterDotPool = {}
for i = 1, 40 do
	local d = createDot("Monster" .. i, Color3.fromRGB(255, 80, 80), 4)
	table.insert(monsterDotPool, {dot = d, active = false})
end

-- Helper: world pos -> minimap pos
local function worldToMinimap(worldPos, playerPos)
	local dx = worldPos.X - playerPos.X
	local dz = worldPos.Z - playerPos.Z
	
	local pixelX = (dx / MAP_RANGE) * 80 + 80  -- center = 80,80
	local pixelY = (dz / MAP_RANGE) * 80 + 80
	
	return pixelX, pixelY
end

local function isInRange(px, py)
	local cx, cy = 80, 80
	local dist = math.sqrt((px - cx)^2 + (py - cy)^2)
	return dist < 76  -- slightly less than radius
end

-- === UPDATE LOOP ===
local updateCounter = 0
RunService.Heartbeat:Connect(function()
	updateCounter = updateCounter + 1
	if updateCounter % 3 ~= 0 then return end -- update every 3 frames for perf
	
	local char = player.Character
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	if not hrp then return end
	
	local playerPos = hrp.Position
	
	-- Player dot always centered
	playerDot.Position = UDim2.new(0, 76, 0, 76)
	
	-- Direction indicator (shows where player faces)
	local lookDir = hrp.CFrame.LookVector
	local dirX = 80 + lookDir.X * 12
	local dirY = 80 + lookDir.Z * 12
	dirIndicator.Position = UDim2.new(0, dirX - 2, 0, dirY - 2)
	
	-- Crystal
	local crystal = game.Workspace:FindFirstChild("Crystal")
	if crystal then
		local cPos = crystal.PrimaryPart and crystal.PrimaryPart.Position or crystal:GetPivot().Position
		local cx, cy = worldToMinimap(cPos, playerPos)
		if isInRange(cx, cy) then
			crystalDot.Visible = true
			crystalDot.Position = UDim2.new(0, cx - 5, 0, cy - 5)
		else
			crystalDot.Visible = false
		end
	end
	
	-- Monsters
	local poolIdx = 1
	for _, obj in ipairs(game.Workspace:GetChildren()) do
		if obj:IsA("Model") and (obj:GetAttribute("SpeciesID") or obj.Name:match("^Defender_")) and obj.PrimaryPart then
			if poolIdx <= #monsterDotPool then
				local mPos = obj.PrimaryPart.Position
				local mx, my = worldToMinimap(mPos, playerPos)
				local pool = monsterDotPool[poolIdx]
				
				if isInRange(mx, my) then
					pool.dot.Visible = true
					pool.dot.Position = UDim2.new(0, mx - 2, 0, my - 2)
					
					-- Color: KO=yellow, Boss=purple, Defender=blue, Normal=red
					if obj:GetAttribute("IsKnockedOut") then
						pool.dot.BackgroundColor3 = Color3.fromRGB(255, 255, 80)
					elseif obj.Name:match("^Defender_") then
						pool.dot.BackgroundColor3 = Color3.fromRGB(80, 150, 255)
					elseif obj:GetAttribute("IsBoss") then
						pool.dot.BackgroundColor3 = Color3.fromRGB(200, 50, 255)
						pool.dot.Size = UDim2.new(0, 6, 0, 6)
					else
						pool.dot.BackgroundColor3 = Color3.fromRGB(255, 80, 80)
						pool.dot.Size = UDim2.new(0, 4, 0, 4)
					end
					pool.active = true
				else
					pool.dot.Visible = false
					pool.active = false
				end
				poolIdx = poolIdx + 1
			end
		end
	end
	-- Hide unused dots
	for i = poolIdx, #monsterDotPool do
		monsterDotPool[i].dot.Visible = false
		monsterDotPool[i].active = false
	end
	
	-- Buildings (less frequent - every 30 frames)
	if updateCounter % 30 == 0 then
		-- Clear old building dots
		for _, bd in ipairs(buildingDots) do bd:Destroy() end
		buildingDots = {}
		
		for _, obj in ipairs(game.Workspace:GetChildren()) do
			if obj:IsA("Model") and obj.Name:match("^Building_") then
				local pp = obj.PrimaryPart
				if pp then
					local bx, by = worldToMinimap(pp.Position, playerPos)
					if isInRange(bx, by) then
						local bd = createDot("BDot", Color3.fromRGB(200, 170, 50), 6)
						bd.Visible = true
						bd.Position = UDim2.new(0, bx - 3, 0, by - 3)
						-- Square shape for buildings
						for _, c in ipairs(bd:GetChildren()) do
							if c:IsA("UICorner") then c.CornerRadius = UDim.new(0, 1) end
						end
						table.insert(buildingDots, bd)
					end
				end
			end
		end
	end
end)

print("[Minimap V23] Ready!")
