--[[
	ElementSystem V20 - Systeme d'elements avec 3 triangles
	Triangle 1: Feu > Plante > Eau > Feu
	Triangle 2: Electrique > Vol > Sol > Electrique
	Triangle 3: Ange > Demon > Tenebres > Ange
]]

local ElementSystem = {}

-- Tous les elements
ElementSystem.ELEMENTS = {
	"Feu", "Eau", "Plante",
	"Electrique", "Vol", "Sol",
	"Ange", "Demon", "Tenebres",
	"Neutre", -- pour monstres sans element
}

-- Couleurs par element
ElementSystem.COLORS = {
	Feu = Color3.fromRGB(255, 80, 30),
	Eau = Color3.fromRGB(40, 140, 255),
	Plante = Color3.fromRGB(50, 200, 50),
	Electrique = Color3.fromRGB(255, 220, 40),
	Vol = Color3.fromRGB(180, 220, 255),
	Sol = Color3.fromRGB(160, 120, 60),
	Ange = Color3.fromRGB(255, 255, 200),
	Demon = Color3.fromRGB(200, 30, 30),
	Tenebres = Color3.fromRGB(80, 40, 120),
	Neutre = Color3.fromRGB(180, 180, 180),
}

-- Icones par element
ElementSystem.ICONS = {
	Feu = "🔥",
	Eau = "💧",
	Plante = "🌿",
	Electrique = "⚡",
	Vol = "🌪️",
	Sol = "🪨",
	Ange = "😇",
	Demon = "😈",
	Tenebres = "🌑",
	Neutre = "⚪",
}

-- Table d'avantages: ADVANTAGES[attaquant] = {liste des elements faibles contre}
ElementSystem.ADVANTAGES = {
	-- Triangle 1
	Feu = {"Plante"},
	Plante = {"Eau"},
	Eau = {"Feu"},
	-- Triangle 2
	Electrique = {"Vol"},
	Vol = {"Sol"},
	Sol = {"Electrique"},
	-- Triangle 3
	Ange = {"Demon"},
	Demon = {"Tenebres"},
	Tenebres = {"Ange"},
	-- Neutre
	Neutre = {},
}

-- Multiplicateurs
ElementSystem.SUPER_EFFECTIVE = 1.5   -- avantage
ElementSystem.NOT_EFFECTIVE = 0.7     -- desavantage
ElementSystem.NEUTRAL = 1.0           -- neutre

-- Calculer le multiplicateur de degats
function ElementSystem:GetMultiplier(attackElement, defenseElement)
	if not attackElement or not defenseElement then return 1.0 end
	if attackElement == "Neutre" or defenseElement == "Neutre" then return 1.0 end
	
	-- Verifier avantage
	local advantages = self.ADVANTAGES[attackElement]
	if advantages then
		for _, weak in ipairs(advantages) do
			if weak == defenseElement then
				return self.SUPER_EFFECTIVE
			end
		end
	end
	
	-- Verifier desavantage (l'inverse)
	local defAdvantages = self.ADVANTAGES[defenseElement]
	if defAdvantages then
		for _, weak in ipairs(defAdvantages) do
			if weak == attackElement then
				return self.NOT_EFFECTIVE
			end
		end
	end
	
	return self.NEUTRAL
end

-- Obtenir la couleur d'un element
function ElementSystem:GetColor(element)
	return self.COLORS[element] or self.COLORS.Neutre
end

-- Obtenir l'icone
function ElementSystem:GetIcon(element)
	return self.ICONS[element] or "⚪"
end

-- Meteo: element qui donne bonus/malus
ElementSystem.WEATHER_EVENTS = {
	{name = "Canicule", icon = "☀️", bonus = "Feu", malus = "Eau"},
	{name = "Pluie torrentielle", icon = "🌧️", bonus = "Eau", malus = "Feu"},
	{name = "Tempete verte", icon = "🌿", bonus = "Plante", malus = "Sol"},
	{name = "Orage electrique", icon = "⛈️", bonus = "Electrique", malus = "Vol"},
	{name = "Vents violents", icon = "🌪️", bonus = "Vol", malus = "Sol"},
	{name = "Tremblement", icon = "🌋", bonus = "Sol", malus = "Electrique"},
	{name = "Lumiere divine", icon = "✨", bonus = "Ange", malus = "Tenebres"},
	{name = "Nuit demoniaque", icon = "🌑", bonus = "Demon", malus = "Ange"},
	{name = "Eclipse", icon = "🌒", bonus = "Tenebres", malus = "Demon"},
}

return ElementSystem
