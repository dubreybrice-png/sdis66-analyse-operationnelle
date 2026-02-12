--[[
	Minimap V24 - Mini carte en haut a droite
	- Tourne avec la camera du joueur
	- Montre le joueur, les monstres, le cristal, les batiments
	- Dots colores par type
]]

print("[Minimap V24] Loading...")

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui", 10)
if not playerGui then return end

local camera = game.Workspace.CurrentCamera

-- === GUI ===
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "Minimap_V24"
screenGui.ResetOnSpawn = false
screenGui.DisplayOrder = 5
screenGui.Parent = playerGui

-- Minimap container - positionne sous le starter panel (top-right)
local mapFrame = Instance.new("Frame")
mapFrame.Name = "MinimapFrame"
mapFrame.Size = UDim2.new(0, 140, 0, 140)
mapFrame.Position = UDim2.new(1, -150, 0, 80)
mapFrame.BackgroundColor3 = Color3.fromRGB(10, 15, 25)
mapFrame.BackgroundTransparency = 0.15
mapFrame.BorderSizePixel = 0
mapFrame.ClipsDescendants = true
mapFrame.Parent = screenGui
Instance.new("UICorner", mapFrame).CornerRadius = UDim.new(0, 70) -- cercle
local mapStroke = Instance.new("UIStroke")
mapStroke.Color = Color3.fromRGB(80, 150, 255)
mapStroke.Thickness = 2
mapStroke.Parent = mapFrame

-- Nord indicator
local nordLabel = Instance.new("TextLabel")
nordLabel.Name = "Nord"
nordLabel.Size = UDim2.new(0, 16, 0, 12)
nordLabel.Position = UDim2.new(0.5, -8, 0, 2)
nordLabel.BackgroundTransparency = 1
nordLabel.TextColor3 = Color3.fromRGB(255, 80, 80)
nordLabel.TextSize = 9
nordLabel.Font = Enum.Font.GothamBold
nordLabel.Text = "N"
nordLabel.ZIndex = 5
nordLabel.Parent = mapFrame

-- Label "CARTE"
local mapLabel = Instance.new("TextLabel")
mapLabel.Size = UDim2.new(0, 140, 0, 14)
mapLabel.Position = UDim2.new(1, -150, 0, 222)
mapLabel.BackgroundTransparency = 1
mapLabel.TextColor3 = Color3.fromRGB(120, 160, 200)
mapLabel.TextSize = 9
mapLabel.Font = Enum.Font.Gotham
mapLabel.Text = "CARTE"
mapLabel.Parent = screenGui

-- Dot pool
local MAP_HALF = 70  -- half of 140px
local MAP_RANGE = 120   -- studs visibles depuis le centre

local function createDot(name, color, size)
	local dot = Instance.new("Frame")
	dot.Name = name
	dot.Size = UDim2.new(0, size, 0, size)
	dot.BackgroundColor3 = color
	dot.BorderSizePixel = 0
	dot.Visible = false
	dot.ZIndex = 3
	dot.Parent = mapFrame
	Instance.new("UICorner", dot).CornerRadius = UDim.new(1, 0) -- circle
	return dot
end

-- Player dot (always centered, bright)
local playerDot = createDot("Player", Color3.fromRGB(100, 255, 100), 8)
playerDot.Visible = true
playerDot.ZIndex = 4

-- Player direction triangle
local dirIndicator = createDot("Direction", Color3.fromRGB(150, 255, 150), 5)
dirIndicator.Visible = true
dirIndicator.ZIndex = 4

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

-- Helper: world pos -> minimap pos (with camera rotation!)
local function worldToMinimap(worldPos, playerPos, camAngle)
	local dx = worldPos.X - playerPos.X
	local dz = worldPos.Z - playerPos.Z
	
	-- Rotate by camera angle so map rotates with player view
	local cosA = math.cos(camAngle)
	local sinA = math.sin(camAngle)
	local rx = dx * cosA - dz * sinA
	local ry = dx * sinA + dz * cosA
	
	local pixelX = (rx / MAP_RANGE) * MAP_HALF + MAP_HALF
	local pixelY = (ry / MAP_RANGE) * MAP_HALF + MAP_HALF
	
	return pixelX, pixelY
end

local function isInRange(px, py)
	local dist = math.sqrt((px - MAP_HALF)^2 + (py - MAP_HALF)^2)
	return dist < (MAP_HALF - 4)
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
	
	-- Camera Y-angle (rotation horizontale)
	local camCF = camera.CFrame
	local camLook = camCF.LookVector
	local camAngle = math.atan2(-camLook.X, -camLook.Z)
	
	-- Player dot always centered
	playerDot.Position = UDim2.new(0, MAP_HALF - 4, 0, MAP_HALF - 4)
	
	-- Direction indicator (always points "up" = forward in rotated map)
	dirIndicator.Position = UDim2.new(0, MAP_HALF - 2.5, 0, MAP_HALF - 14)
	
	-- Nord indicator rotates with map
	local nordAngle = camAngle
	local nordDist = MAP_HALF - 10
	local nordX = MAP_HALF + math.sin(nordAngle) * nordDist
	local nordY = MAP_HALF - math.cos(nordAngle) * nordDist
	nordLabel.Position = UDim2.new(0, nordX - 8, 0, nordY - 6)
	
	-- Crystal
	local crystal = game.Workspace:FindFirstChild("Crystal")
	if crystal then
		local cPos = crystal.PrimaryPart and crystal.PrimaryPart.Position or crystal:GetPivot().Position
		local cx, cy = worldToMinimap(cPos, playerPos, camAngle)
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
				local mx, my = worldToMinimap(mPos, playerPos, camAngle)
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
		
		local bFolder = game.Workspace:FindFirstChild("Buildings")
		local bChildren = bFolder and bFolder:GetChildren() or {}
		-- Also check workspace root for placeholders
		for _, obj in ipairs(game.Workspace:GetChildren()) do
			if obj:IsA("Model") and (obj.Name:match("^Building_") or obj.Name:match("^Placeholder_")) then
				table.insert(bChildren, obj)
			end
		end
		for _, obj in ipairs(bChildren) do
			if obj:IsA("Model") then
				local pp = obj.PrimaryPart
				if pp then
					local bx, by = worldToMinimap(pp.Position, playerPos, camAngle)
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

print("[Minimap V24] Ready!")
