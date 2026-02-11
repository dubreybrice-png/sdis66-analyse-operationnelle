--[[
	WeaponSystem - Système d'armes et capture
	Gère les armes du joueur et les captures
]]

local WeaponSystem = {}

-- Types d'armes
WeaponSystem.WEAPONS = {
	NOVICE_STAFF = {
		id = "novice_staff",
		name = "Bâton de Novice",
		minLevel = 1,
		maxLevel = 9,
		attackPower = 1,
		captureChance = 0,
		icon = "🔱"
	},
	LASER_GUN = {
		id = "laser_gun",
		name = "Pistolet Laser",
		minLevel = 10,
		attackPower = 2,
		captureChance = 0.15, -- 15% de base
		captureSpeed = 1.5, -- Vitesse de lancer (en secondes)
		retryChance = 0, -- 0% de base
		icon = "🔫"
	}
}

-- Obtenir l'arme du joueur selon son niveau
function WeaponSystem:GetWeaponForLevel(level)
	if level >= 10 then
		return self.WEAPONS.LASER_GUN
	else
		return self.WEAPONS.NOVICE_STAFF
	end
end

-- Donner une arme au joueur (ajouter à son inventory/équipe)
function WeaponSystem:GiveWeapon(player, weapon)
	print("[WeaponSystem] Giving", weapon.name, "to", player.Name)
	
	-- Créer/mettre à jour PlayerData
	local playerData = player:FindFirstChild("PlayerData")
	if not playerData then
		playerData = Instance.new("Folder")
		playerData.Name = "PlayerData"
		playerData.Parent = player
	end
	
	-- Sauvegarder l'arme actuelle
	local currentWeapon = Instance.new("StringValue")
	currentWeapon.Name = "CurrentWeapon"
	currentWeapon.Value = weapon.id
	
	local oldWeapon = playerData:FindFirstChild("CurrentWeapon")
	if oldWeapon then oldWeapon:Destroy() end
	currentWeapon.Parent = playerData
	
	-- Sync attribute pour le HUD client
	player:SetAttribute("WeaponName", weapon.name)
	
	print("[WeaponSystem] Player now has:", weapon.name)
	return true
end

-- Calculer la chance de capture (améliorations du shop à venir)
function WeaponSystem:CalculateCaptureChance(weapon, monsterHealth, monsterMaxHealth)
	local baseChance = weapon.captureChance or 0
	
	-- Bonus selon la santé du monstre (plus faible = plus facile)
	local healthPercent = monsterHealth / monsterMaxHealth
	local healthBonus = (1 - healthPercent) * 0.3 -- Jusqu'à +30% si très affaibli
	
	local finalChance = math.min(0.95, baseChance + healthBonus) -- Max 95%
	
	return finalChance
end

return WeaponSystem
