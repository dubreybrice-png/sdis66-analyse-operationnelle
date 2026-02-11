--[[
	MonsterSkinSystem - Ajoute des textures PNG aux monstres
	À utiliser après la création du monstre
]]

local MonsterSkinSystem = {}

-- IDS DES IMAGES UPLOADÉES
local MONSTER_SKINS = {
	"rbxassetid://75555966369836",
	"rbxassetid://74950508933506",
	"rbxassetid://88842105258488"
}

-- Appliquer une texture à un monstre
function MonsterSkinSystem:ApplySkin(monsterBody, skinIndex)
	if not monsterBody then return end
	
	skinIndex = skinIndex or math.random(1, #MONSTER_SKINS)
	local skinId = MONSTER_SKINS[skinIndex]
	
	print("[MonsterSkinSystem] Applying skin #" .. skinIndex .. " to", monsterBody.Parent.Name)
	
	-- Créer une Decal avec l'image
	local decal = Instance.new("Decal")
	decal.Texture = skinId
	decal.Face = Enum.NormalId.Front
	decal.Parent = monsterBody
	
	return true
end

return MonsterSkinSystem
