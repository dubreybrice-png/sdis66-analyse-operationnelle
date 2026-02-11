-- POPUP VERSION SIMPLE
print("�🔴🔴 [VersionPopup] SCRIPT STARTING! 🔴🔴🔴")

local Players = game:GetService("Players")
local player = Players.LocalPlayer

print("[VersionPopup] LocalPlayer:", player and player.Name or "NIL!")

if not player then
	print("[VersionPopup] 🔴 ERROR: LocalPlayer is nil!")
	return
end

local playerGui = player:WaitForChild("PlayerGui", 10)
if not playerGui then
	print("[VersionPopup] 🔴 ERROR: PlayerGui not found!")
	return
end

print("[VersionPopup] 🟢 Creating version popup...")

local popup = Instance.new("ScreenGui")
popup.Name = "VersionPopup"
popup.ResetOnSpawn = false
popup.Parent = playerGui

local label = Instance.new("TextLabel")
label.Size = UDim2.new(0, 600, 0, 200)
label.Position = UDim2.new(0.5, -300, 0.5, -100)
label.BackgroundColor3 = Color3.fromRGB(255, 0, 0)
label.BorderSizePixel = 10
label.BorderColor3 = Color3.fromRGB(255, 255, 0)
label.Text = "VERSION TEST 20\nMEGA UPDATE: Vagues, Capture, Batiments!"
label.TextColor3 = Color3.fromRGB(255, 255, 255)
label.TextSize = 50
label.Font = Enum.Font.SourceSansBold
label.Parent = popup

print("🔵 POPUP AFFICHÉE À L'ÉCRAN!")

task.delay(10, function()
	popup:Destroy()
	print("🔵 Popup supprimée")
end)
