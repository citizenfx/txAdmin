-- =============================================
--  Truly global
-- =============================================

function GetConvarBool(cvName, defaultConvarValue)
  if not cvName then
    return false
  elseif defaultConvarValue then
    return (GetConvar(cvName, 'true') == 'true')
  else
    return (GetConvar(cvName, 'false') == 'true')
  end
end

-- -- Tests for GetConvarBool
-- print("==========================")
-- print('unknown convar')
-- print(GetConvarBool2('xxx', true)) -- true
-- print(GetConvarBool2('xxx', false)) -- false
-- print(GetConvarBool2('xxx')) -- false
-- print('known convar')
-- SetConvar('yyy', 'true')
-- print(GetConvarBool2('yyy', true)) -- true
-- print(GetConvarBool2('yyy', false)) -- true
-- print(GetConvarBool2('yyy')) -- true 
-- print('known convar, but with a false value')
-- SetConvar('yyy', 'false')
-- print(GetConvarBool2('yyy', false)) -- false
-- print(GetConvarBool2('yyy', true)) -- false
-- print(GetConvarBool2('yyy')) -- false
-- print("==========================")

-- Setting game-specific global vars
local envName = GetGameName()
IS_REDM = false
IS_FIVEM_GEN8 = false
IS_FIVEM_GEN9 = false
if envName == 'fxserver' then
  local gameConvar = GetConvar('gamename', 'gta5')
  if gameConvar == 'redm' then
    GAME_NAME = 'redm'
  elseif gameConvar == 'gta5' then
    IS_FIVEM_GEN8 = true
    GAME_NAME = 'fivem'
  elseif gameConvar == 'gta5enhanced' then
    IS_FIVEM_GEN9 = true
    GAME_NAME = 'fivem'
  else
    error("Unknown gamename convar: " .. gameConvar)
  end
else
  GAME_NAME = envName
  if GAME_NAME == 'fivem' then
    IS_FIVEM_GEN9 = type(IsGameEnhancedVersion) == "function" and IsGameEnhancedVersion()
    IS_FIVEM_GEN8 = not IS_FIVEM_GEN9
  end
end
IS_FIVEM = GAME_NAME == 'fivem'
IS_REDM = GAME_NAME == 'redm'

-- print("Shared vars:", json.encode({
--   envName=envName,
--   gameConvar=GetConvar('gamename', 'invalid'),
--   GAME_NAME=GAME_NAME,
--   IS_REDM=IS_REDM,
--   IS_FIVEM_GEN8=IS_FIVEM_GEN8,
--   IS_FIVEM_GEN9=IS_FIVEM_GEN9,
--   IS_FIVEM=IS_FIVEM,
-- }, {indent=true}))

-- Setting global enable/disable variable for all sv_*.lua files
-- NOTE: not available on client
TX_SERVER_MODE = GetConvarBool('txAdminServerMode')

-- Setting global enable/disable variable for all menu-related files
TX_MENU_ENABLED = GetConvarBool('txAdmin-menuEnabled')

-- Setting global debug variable for all files
-- On the client, this is updated by receiving a `txcl:setDebugMode` event.
-- On the server, this is updated by running txaSetDebugMode on Live Console
TX_DEBUG_MODE = GetConvarBool('txAdmin-debugMode')
-- TX_DEBUG_MODE = true --DEBUG:remove

--- Internal helper to format txAdmin console messages
local function _formatTxString(args)
  local appendedStr = ''
  for _, v in ipairs(args) do
    appendedStr = appendedStr .. ' ' .. (type(v)=="table" and json.encode(v) or tostring(v))
  end
  return appendedStr
end

--- Prints formatted string to console
function txPrint(...)
  local msg = ('^5[txAdmin]^0%s^0'):format(_formatTxString({...}))
  print(msg)
end

function txPrintError(...)
  local msg = ('^5[txAdmin]^1%s^0'):format(_formatTxString({...}))
  print(msg)
end

--- Prints formatted string to console if debug mode is enabled
function debugPrint(...)
  if TX_DEBUG_MODE then
    txPrint(...)
  end
end


--- Finds the index of a table element
---@param tgtTable table
---@param value any
---@return integer
function tableIndexOf(tgtTable, value)
  for i=1, #tgtTable do
    debugPrint(('tgtTableVal: %s, value: %s'):format(tgtTable[i], value))
    if tgtTable[i] == value then
      return i
    end
  end
  return -1
end


---Shortcut for calculating a ped % health
---@param ped any
---@return integer
function GetPedHealthPercent(ped)
  return math.floor((GetEntityHealth(ped) / GetEntityMaxHealth(ped)) * 100)
end

-- Death reasons
-- https://docs.fivem.net/docs/game-references/weapon-models/
local fivemDeathHashTable = {
  [GetHashKey('WEAPON_ANIMAL')] = 'Animal',
  [GetHashKey('WEAPON_COUGAR')] = 'Cougar',
  [GetHashKey('WEAPON_ADVANCEDRIFLE')] = 'Advanced Rifle',
  [GetHashKey('WEAPON_APPISTOL')] = 'AP Pistol',
  [GetHashKey('WEAPON_ASSAULTRIFLE')] = 'Assault Rifle',
  [GetHashKey('WEAPON_ASSAULTRIFLE_MK2')] = 'Assault Rifke Mk2',
  [GetHashKey('WEAPON_ASSAULTSHOTGUN')] = 'Assault Shotgun',
  [GetHashKey('WEAPON_ASSAULTSMG')] = 'Assault SMG',
  [GetHashKey('WEAPON_AUTOSHOTGUN')] = 'Sweeper Shotgun',
  [GetHashKey('WEAPON_BULLPUPRIFLE')] = 'Bullpup Rifle',
  [GetHashKey('WEAPON_BULLPUPRIFLE_MK2')] = 'Bullpup Rifle Mk2',
  [GetHashKey('WEAPON_BULLPUPSHOTGUN')] = 'Bullpup Shotgun',
  [GetHashKey('WEAPON_CARBINERIFLE')] = 'Carbine Rifle',
  [GetHashKey('WEAPON_CARBINERIFLE_MK2')] = 'Carbine Rifle Mk2',
  [GetHashKey('WEAPON_COMBATMG')] = 'Combat MG',
  [GetHashKey('WEAPON_COMBATMG_MK2')] = 'Combat MG Mk2',
  [GetHashKey('WEAPON_COMBATPDW')] = 'Combat PDW',
  [GetHashKey('WEAPON_COMBATPISTOL')] = 'Combat Pistol',
  [GetHashKey('WEAPON_COMPACTRIFLE')] = 'Compact Rifle',
  [GetHashKey('WEAPON_DBSHOTGUN')] = 'Double Barrel Shotgun',
  [GetHashKey('WEAPON_DOUBLEACTION')] = 'Double Action Revolver',
  [GetHashKey('WEAPON_GUSENBERG')] = 'Gusenberg Sweeper',
  [GetHashKey('WEAPON_HEAVYPISTOL')] = 'Heavy Pistol',
  [GetHashKey('WEAPON_HEAVYSHOTGUN')] = 'Heavy Shotgun',
  [GetHashKey('WEAPON_HEAVYSNIPER')] = 'Heavy Sniper',
  [GetHashKey('WEAPON_HEAVYSNIPER_MK2')] = 'Heavy Sniper',
  [GetHashKey('WEAPON_MACHINEPISTOL')] = 'Machine Pistol',
  [GetHashKey('WEAPON_MARKSMANPISTOL')] = 'Marksman Pistol',
  [GetHashKey('WEAPON_MARKSMANRIFLE')] = 'Marksman Rifle',
  [GetHashKey('WEAPON_MARKSMANRIFLE_MK2')] = 'Marksman Rifle Mk2',
  [GetHashKey('WEAPON_MG')] = 'MG',
  [GetHashKey('WEAPON_MICROSMG')] = 'Micro SMG',
  [GetHashKey('WEAPON_MINIGUN')] = 'Minigun',
  [GetHashKey('WEAPON_MINISMG')] = 'Mini SMG',
  [GetHashKey('WEAPON_MUSKET')] = 'Musket',
  [GetHashKey('WEAPON_PISTOL')] = 'Pistol',
  [GetHashKey('WEAPON_PISTOL_MK2')] = 'Pistol Mk2',
  [GetHashKey('WEAPON_PISTOL50')] = 'Pistol .50',
  [GetHashKey('WEAPON_PUMPSHOTGUN')] = 'Pump Shotgun',
  [GetHashKey('WEAPON_PUMPSHOTGUN_MK2')] = 'Pump Shotgun Mk2',
  [GetHashKey('WEAPON_RAILGUN')] = 'Railgun',
  [GetHashKey('WEAPON_REVOLVER')] = 'Revolver',
  [GetHashKey('WEAPON_REVOLVER_MK2')] = 'Revolver Mk2',
  [GetHashKey('WEAPON_SAWNOFFSHOTGUN')] = 'Sawed-Off Shotgun',
  [GetHashKey('WEAPON_SMG')] = 'SMG',
  [GetHashKey('WEAPON_SMG_MK2')] = 'SMG Mk2',
  [GetHashKey('WEAPON_SNIPERRIFLE')] = 'Sniper Rifle',
  [GetHashKey('WEAPON_SNSPISTOL')] = 'SNS Pistol',
  [GetHashKey('WEAPON_SNSPISTOL_MK2')] = 'SNS Pistol Mk2',
  [GetHashKey('WEAPON_SPECIALCARBINE')] = 'Special Carbine',
  [GetHashKey('WEAPON_SPECIALCARBINE_MK2')] = 'Special Carbine Mk2',
  [GetHashKey('WEAPON_STINGER')] = 'Stinger',
  [GetHashKey('WEAPON_STUNGUN')] = 'Stungun',
  [GetHashKey('WEAPON_VINTAGEPISTOL')] = 'Vintage Pistol',
  [GetHashKey('VEHICLE_WEAPON_PLAYER_LASER')] = 'Vehicle Lasers',
  [GetHashKey('WEAPON_FIRE')] = 'Fire',
  [GetHashKey('WEAPON_FLARE')] = 'Flare',
  [GetHashKey('WEAPON_FLAREGUN')] = 'Flaregun',
  [GetHashKey('WEAPON_MOLOTOV')] = 'Molotov',
  [GetHashKey('WEAPON_PETROLCAN')] = 'Jerry Can',
  [GetHashKey('WEAPON_HELI_CRASH')] = 'Helicopter Crash',
  [GetHashKey('WEAPON_RAMMED_BY_CAR')] = 'Rammed by Vehicle',
  [GetHashKey('WEAPON_RUN_OVER_BY_CAR')] = 'Ranover by Vehicle',
  [GetHashKey('VEHICLE_WEAPON_SPACE_ROCKET')] = 'Vehicle Space Rocket',
  [GetHashKey('VEHICLE_WEAPON_TANK')] = 'Tank',
  [GetHashKey('WEAPON_AIRSTRIKE_ROCKET')] = 'Airstrike Rocket',
  [GetHashKey('WEAPON_AIR_DEFENCE_GUN')] = 'Air Defence Gun',
  [GetHashKey('WEAPON_COMPACTLAUNCHER')] = 'Compact Launcher',
  [GetHashKey('WEAPON_EXPLOSION')] = 'Explosion',
  [GetHashKey('WEAPON_FIREWORK')] = 'Firework',
  [GetHashKey('WEAPON_GRENADE')] = 'Grenade',
  [GetHashKey('WEAPON_GRENADELAUNCHER')] = 'Grenade Launcher',
  [GetHashKey('WEAPON_HOMINGLAUNCHER')] = 'Homing Launcher',
  [GetHashKey('WEAPON_PASSENGER_ROCKET')] = 'Passenger Rocket',
  [GetHashKey('WEAPON_PIPEBOMB')] = 'Pipe bomb',
  [GetHashKey('WEAPON_PROXMINE')] = 'Proximity Mine',
  [GetHashKey('WEAPON_RPG')] = 'RPG',
  [GetHashKey('WEAPON_STICKYBOMB')] = 'Sticky Bomb',
  [GetHashKey('WEAPON_VEHICLE_ROCKET')] = 'Vehicle Rocket',
  [GetHashKey('WEAPON_BZGAS')] = 'BZ Gas',
  [GetHashKey('WEAPON_FIREEXTINGUISHER')] = 'Fire Extinguisher',
  [GetHashKey('WEAPON_SMOKEGRENADE')] = 'Tear Gas',
  [GetHashKey('WEAPON_BATTLEAXE')] = 'Battle Axe',
  [GetHashKey('WEAPON_BOTTLE')] = 'Bottle',
  [GetHashKey('WEAPON_KNIFE')] = 'Knife',
  [GetHashKey('WEAPON_MACHETE')] = 'Machete',
  [GetHashKey('WEAPON_SWITCHBLADE')] = 'Switch Blade',
  [GetHashKey('OBJECT')] = 'Object',
  [GetHashKey('VEHICLE_WEAPON_ROTORS')] = 'Vehicle Rotors',
  [GetHashKey('WEAPON_BALL')] = 'Ball',
  [GetHashKey('WEAPON_BAT')] = 'Baseball Bat',
  [GetHashKey('WEAPON_CROWBAR')] = 'Crowbar',
  [GetHashKey('WEAPON_FLASHLIGHT')] = 'Flashlight',
  [GetHashKey('WEAPON_GOLFCLUB')] = 'Golfclub',
  [GetHashKey('WEAPON_HAMMER')] = 'Hammer',
  [GetHashKey('WEAPON_HATCHET')] = 'Hatchet',
  [GetHashKey('WEAPON_HIT_BY_WATER_CANNON')] = 'Water Cannon',
  [GetHashKey('WEAPON_KNUCKLE')] = 'Knuckle Duster',
  [GetHashKey('WEAPON_NIGHTSTICK')] = 'Night Stick',
  [GetHashKey('WEAPON_POOLCUE')] = 'Pool Cue',
  [GetHashKey('WEAPON_SNOWBALL')] = 'Snowball',
  [GetHashKey('WEAPON_UNARMED')] = 'Fist',
  [GetHashKey('WEAPON_WRENCH')] = 'Pipe Wrench',
  [GetHashKey('WEAPON_DROWNING')] = 'Drowned',
  [GetHashKey('WEAPON_DROWNING_IN_VEHICLE')] = 'Drowned in Vehicle',
  [GetHashKey('WEAPON_BARBED_WIRE')] = 'Barbed Wire',
  [GetHashKey('WEAPON_BLEEDING')] = 'Bleed',
  [GetHashKey('WEAPON_ELECTRIC_FENCE')] = 'Electric Fence',
  [GetHashKey('WEAPON_EXHAUSTION')] = 'Exhaustion',
  [GetHashKey('WEAPON_FALL')] = 'Falling',
  [GetHashKey('WEAPON_RAYPISTOL')] = 'Up-n-Atomizer',
  [GetHashKey('WEAPON_RAYCARBINE')] = 'Unholy Hellbringer',
  [GetHashKey('WEAPON_RAYMINIGUN')] = 'Widowmaker',
  [GetHashKey('WEAPON_STONE_HATCHET')] = 'Stone Hatchet',
  [GetHashKey('WEAPON_DAGGER')] = "Antique Cavalry Dagger", -- MPHIPSTER
  -- MPHEIST3 DLC (v 1868)
  [GetHashKey('WEAPON_CERAMICPISTOL')] = 'Ceramic Pistol',
  [GetHashKey('WEAPON_NAVYREVOLVER')] = 'Navy Revolver',
  [GetHashKey('WEAPON_HAZARDCAN')] = 'Hazardous Jerry Can',
  -- MPHEIST4 DLC (v 2189)
  [GetHashKey('WEAPON_GADGETPISTOL')] = 'Perico Pistol',
  [GetHashKey('WEAPON_MILITARYRIFLE')] = 'Military Rifle',
  [GetHashKey('WEAPON_COMBATSHOTGUN')] = 'Combat Shotgun',
  -- MPSECURITY DLC (v 2545)
  [GetHashKey('WEAPON_EMPLAUNCHER')] = 'EMP Launcher',
  [GetHashKey('WEAPON_HEAVYRIFLE')] = 'Heavy Rifle',
  [GetHashKey('WEAPON_FERTILIZERCAN')] = 'Fertilizer Can',
  [GetHashKey('WEAPON_STUNGUN_MP')] = 'Stungun MP',
  -- MPSUM2 DLC (V 2699)
  [GetHashKey('WEAPON_TACTICALRIFLE')] = 'Tactical Rifle',
  [GetHashKey('WEAPON_PRECISIONRIFLE')] = 'Precision Rifle',
  -- MPCHRISTMAS3 DLC (V 2802)
  [GetHashKey('WEAPON_PISTOLXM3')] = 'WM 29 Pistol',
  [GetHashKey('WEAPON_CANDYCANE')] = 'Candy Cane',
  [GetHashKey('WEAPON_RAILGUNXM3')] = 'Railgun XM3',
  [GetHashKey('WEAPON_ACIDPACKAGE')] = 'Acid Package',
  -- MP2023_01 DLC (V 2944)
  [GetHashKey('WEAPON_TECPISTOL')] = 'Tactical SMG',
  -- MP2023_02 DLC (V 3095)
  [GetHashKey('WEAPON_BATTLERIFLE')] = 'Battle Rifle',
  [GetHashKey('WEAPON_SNOWLAUNCHER')] = 'Snowball Launcher',
  [GetHashKey('WEAPON_HACKINGDEVICE')] = 'Hacking Device',
  -- MP2024_01 DLC (V 3258)
  [GetHashKey('weapon_stunrod')] = 'The Shocker',
}

-- https://github.com/femga/rdr3_discoveries/blob/master/weapons/weapons.lua
local redmDeathHashTable = {
  [GetHashKey('WEAPON_MELEE_HATCHET_MELEEONLY')] = 'Melee Hatchet Meleeonly',
  [GetHashKey('WEAPON_MELEE_KNIFE_MINER')] = 'Melee Knife Miner',
  [GetHashKey('WEAPON_MELEE_KNIFE_JAWBONE')] = 'Melee Knife Jawbone',
  [GetHashKey('WEAPON_MELEE_KNIFE_VAMPIRE')] = 'Melee Knife Vampire',
  [GetHashKey('WEAPON_MELEE_KNIFE_JOHN')] = 'Melee Knife John',
  [GetHashKey('WEAPON_MELEE_MACHETE')] = 'Melee Machete',
  [GetHashKey('WEAPON_MELEE_KNIFE_BEAR')] = 'Melee Knife Bear',
  [GetHashKey('WEAPON_MELEE_KNIFE_DUTCH')] = 'Melee Knife Dutch',
  [GetHashKey('WEAPON_MELEE_KNIFE_KIERAN')] = 'Melee Knife Kieran',
  [GetHashKey('WEAPON_MELEE_KNIFE_UNCLE')] = 'Melee Knife Uncle',
  [GetHashKey('WEAPON_MELEE_KNIFE_SEAN')] = 'Melee Knife Sean',
  [GetHashKey('WEAPON_MELEE_TORCH')] = 'Melee Torch',
  [GetHashKey('WEAPON_MELEE_KNIFE_LENNY')] = 'Melee Knife Lenny',
  [GetHashKey('WEAPON_MELEE_KNIFE_SADIE')] = 'Melee Knife Sadie',
  [GetHashKey('WEAPON_MELEE_KNIFE_CHARLES')] = 'Melee Knife Charles',
  [GetHashKey('WEAPON_MELEE_KNIFE_HOSEA')] = 'Melee Knife Hosea',
  [GetHashKey('WEAPON_MELEE_TORCH_CROWD')] = 'Melee Torch Crowd',
  [GetHashKey('WEAPON_MELEE_KNIFE_BILL')] = 'Melee Knife Bill',
  [GetHashKey('WEAPON_MELEE_KNIFE_CIVIL_WAR')] = 'Melee Knife Civil War',
  [GetHashKey('WEAPON_MELEE_KNIFE')] = 'Melee Knife',
  [GetHashKey('WEAPON_MELEE_KNIFE_MICAH')] = 'Melee Knife Micah',
  [GetHashKey('WEAPON_MELEE_BROKEN_SWORD')] = 'Melee Broken Sword',
  [GetHashKey('WEAPON_MELEE_KNIFE_JAVIER')] = 'Melee Knife Javier',
  [GetHashKey('WEAPON_PISTOL_VOLCANIC')] = 'Pistol Volcanic',
  [GetHashKey('WEAPON_PISTOL_MAUSER_DRUNK')] = 'Pistol Mauser Drunk',
  [GetHashKey('WEAPON_PISTOL_M1899')] = 'Pistol M1899',
  [GetHashKey('WEAPON_PISTOL_SEMIAUTO')] = 'Pistol Semiauto',
  [GetHashKey('WEAPON_PISTOL_MAUSER')] = 'Pistol Mauser',
  [GetHashKey('WEAPON_REPEATER_EVANS')] = 'Repeater Evans',
  [GetHashKey('WEAPON_REPEATER_CARBINE_SADIE')] = 'Repeater Carbine Sadie',
  [GetHashKey('WEAPON_REPEATER_HENRY')] = 'Repeater Henry',
  [GetHashKey('WEAPON_REPEATER_WINCHESTER')] = 'Repeater Winchester',
  [GetHashKey('WEAPON_REPEATER_WINCHESTER_JOHN')] = 'Repeater Winchester John',
  [GetHashKey('WEAPON_REPEATER_CARBINE')] = 'Repeater Carbine',
  [GetHashKey('WEAPON_REVOLVER_DOUBLEACTION_MICAH_DUALWIELD')] = 'Revolver Doubleaction Micah Dualwield',
  [GetHashKey('WEAPON_REVOLVER_DOUBLEACTION_MICAH')] = 'Revolver Doubleaction Micah',
  [GetHashKey('WEAPON_REVOLVER_SCHOFIELD_CALLOWAY')] = 'Revolver Schofield Calloway',
  [GetHashKey('WEAPON_REVOLVER_DOUBLEACTION')] = 'Revolver Doubleaction',
  [GetHashKey('WEAPON_REVOLVER_CATTLEMAN')] = 'Revolver Cattleman',
  [GetHashKey('WEAPON_REVOLVER_CATTLEMAN_MEXICAN')] = 'Revolver Cattleman Mexican',
  [GetHashKey('WEAPON_REVOLVER_CATTLEMAN_HOSEA_DUALWIELD')] = 'Revolver Cattleman Hosea Dualwield',
  [GetHashKey('WEAPON_REVOLVER_DOUBLEACTION_EXOTIC')] = 'Revolver Doubleaction Exotic',
  [GetHashKey('WEAPON_REVOLVER_CATTLEMAN_SEAN')] = 'Revolver Cattleman Sean',
  [GetHashKey('WEAPON_REVOLVER_CATTLEMAN_SADIE')] = 'Revolver Cattleman Sadie',
  [GetHashKey('WEAPON_REVOLVER_DOUBLEACTION_JAVIER')] = 'Revolver Doubleaction Javier',
  [GetHashKey('WEAPON_REVOLVER_LEMAT')] = 'Revolver Lemat',
  [GetHashKey('WEAPON_REVOLVER_SCHOFIELD_BILL')] = 'Revolver Schofield Bill',
  [GetHashKey('WEAPON_REVOLVER_SCHOFIELD')] = 'Revolver Schofield',
  [GetHashKey('WEAPON_REVOLVER_CATTLEMAN_SADIE_DUALWIELD')] = 'Revolver Cattleman Sadie Dualwield',
  [GetHashKey('WEAPON_REVOLVER_DOUBLEACTION_GAMBLER')] = 'Revolver Doubleaction Gambler',
  [GetHashKey('WEAPON_REVOLVER_CATTLEMAN_KIERAN')] = 'Revolver Cattleman Kieran',
  [GetHashKey('WEAPON_REVOLVER_SCHOFIELD_UNCLE')] = 'Revolver Schofield Uncle',
  [GetHashKey('WEAPON_REVOLVER_CATTLEMAN_HOSEA')] = 'Revolver Cattleman Hosea',
  [GetHashKey('WEAPON_REVOLVER_CATTLEMAN_LENNY')] = 'Revolver Cattleman Lenny',
  [GetHashKey('WEAPON_REVOLVER_CATTLEMAN_JOHN')] = 'Revolver Cattleman John',
  [GetHashKey('WEAPON_REVOLVER_SCHOFIELD_DUTCH_DUALWIELD')] = 'Revolver Schofield Dutch Dualwield',
  [GetHashKey('WEAPON_REVOLVER_SCHOFIELD_GOLDEN')] = 'Revolver Schofield Golden',
  [GetHashKey('WEAPON_REVOLVER_CATTLEMAN_PIG')] = 'Revolver Cattleman Pig',
  [GetHashKey('WEAPON_REVOLVER_SCHOFIELD_DUTCH')] = 'Revolver Schofield Dutch',
  [GetHashKey('WEAPON_RIFLE_SPRINGFIELD')] = 'Rifle Springfield',
  [GetHashKey('WEAPON_RIFLE_BOLTACTION')] = 'Rifle Boltaction',
  [GetHashKey('WEAPON_RIFLE_BOLTACTION_BILL')] = 'Rifle Boltaction Bill',
  [GetHashKey('WEAPON_RIFLE_VARMINT')] = 'Rifle Varmint',
  [GetHashKey('WEAPON_SHOTGUN_SAWEDOFF')] = 'Shotgun Sawedoff',
  [GetHashKey('WEAPON_SHOTGUN_DOUBLEBARREL_EXOTIC')] = 'Shotgun Doublebarrel Exotic',
  [GetHashKey('WEAPON_SHOTGUN_PUMP')] = 'Shotgun Pump',
  [GetHashKey('WEAPON_SHOTGUN_REPEATING')] = 'Shotgun Repeating',
  [GetHashKey('WEAPON_SHOTGUN_SEMIAUTO')] = 'Shotgun Semiauto',
  [GetHashKey('WEAPON_SHOTGUN_DOUBLEBARREL')] = 'Shotgun Doublebarrel',
  [GetHashKey('WEAPON_SHOTGUN_DOUBLEBARREL_UNCLE')] = 'Shotgun Doublebarrel Uncle',
  [GetHashKey('WEAPON_SHOTGUN_SAWEDOFF_CHARLES')] = 'Shotgun Sawedoff Charles',
  [GetHashKey('WEAPON_SHOTGUN_SEMIAUTO_HOSEA')] = 'Shotgun Semiauto Hosea',
  [GetHashKey('WEAPON_SNIPERRIFLE_ROLLINGBLOCK_LENNY')] = 'Sniperrifle Rollingblock Lenny',
  [GetHashKey('WEAPON_SNIPERRIFLE_ROLLINGBLOCK_EXOTIC')] = 'Sniperrifle Rollingblock Exotic',
  [GetHashKey('WEAPON_SNIPERRIFLE_CARCANO')] = 'Sniperrifle Carcano',
  [GetHashKey('WEAPON_SNIPERRIFLE_ROLLINGBLOCK')] = 'Sniperrifle Rollingblock',
  [GetHashKey('WEAPON_MELEE_HATCHET')] = 'Melee Hatchet',
  [GetHashKey('WEAPON_MELEE_HATCHET_HEWING')] = 'Melee Hatchet Hewing',
  [GetHashKey('WEAPON_MELEE_ANCIENT_HATCHET')] = 'Melee Ancient Hatchet',
  [GetHashKey('WEAPON_MELEE_HATCHET_HUNTER')] = 'Melee Hatchet Hunter',
  [GetHashKey('WEAPON_THROWN_THROWING_KNIVES_JAVIER')] = 'Thrown Throwing Knives Javier',
  [GetHashKey('WEAPON_THROWN_MOLOTOV')] = 'Thrown Molotov',
  [GetHashKey('WEAPON_MELEE_HATCHET_VIKING')] = 'Melee Hatchet Viking',
  [GetHashKey('WEAPON_THROWN_TOMAHAWK_ANCIENT')] = 'Thrown Tomahawk Ancient',
  [GetHashKey('WEAPON_MELEE_HATCHET_DOUBLE_BIT_RUSTED')] = 'Melee Hatchet Double Bit Rusted',
  [GetHashKey('WEAPON_THROWN_TOMAHAWK')] = 'Thrown Tomahawk',
  [GetHashKey('WEAPON_THROWN_DYNAMITE')] = 'Thrown Dynamite',
  [GetHashKey('WEAPON_MELEE_HATCHET_DOUBLE_BIT')] = 'Melee Hatchet Double Bit',
  [GetHashKey('WEAPON_THROWN_THROWING_KNIVES')] = 'Thrown Throwing Knives',
  [GetHashKey('WEAPON_MELEE_HATCHET_HUNTER_RUSTED')] = 'Melee Hatchet Hunter Rusted',
  [GetHashKey('WEAPON_MELEE_CLEAVER')] = 'Melee Cleaver',
  [GetHashKey('WEAPON_MELEE_LANTERN')] = 'Melee Lantern',
  [GetHashKey('WEAPON_MELEE_DAVY_LANTERN')] = 'Melee Davy Lantern',
  [GetHashKey('WEAPON_MELEE_LANTERN_ELECTRIC')] = 'Melee Lantern Electric',
  [GetHashKey('WEAPON_KIT_BINOCULARS')] = 'Kit Binoculars',
  [GetHashKey('WEAPON_KIT_CAMERA')] = 'Kit Camera',
  [GetHashKey('WEAPON_KIT_DETECTOR')] = 'Kit Detector',
  [GetHashKey('WEAPON_BOW_CHARLES')] = 'Bow Charles',
  [GetHashKey('WEAPON_BOW')] = 'Bow',
  [GetHashKey('WEAPON_FISHINGROD')] = 'Fishingrod',
  [GetHashKey('WEAPON_LASSO')] = 'Lasso',
  [GetHashKey('WEAPON_WOLF')] = 'Wolf',
  [GetHashKey('WEAPON_WOLF_MEDIUM')] = 'Wolf Medium',
  [GetHashKey('WEAPON_WOLF_SMALL')] = 'Wolf Small',
  [GetHashKey('WEAPON_ALLIGATOR')] = 'Alligator',
  [GetHashKey('WEAPON_ANIMAL')] = 'Animal',
  [GetHashKey('WEAPON_BADGER')] = 'Badger',
  [GetHashKey('WEAPON_BEAR')] = 'Bear',
  [GetHashKey('WEAPON_BEAVER')] = 'Beaver',
  [GetHashKey('WEAPON_COUGAR')] = 'Cougar',
  [GetHashKey('WEAPON_COYOTE')] = 'Coyote',
  [GetHashKey('WEAPON_DEER')] = 'Deer',
  [GetHashKey('WEAPON_FOX')] = 'Fox',
  [GetHashKey('WEAPON_HORSE')] = 'Horse',
  [GetHashKey('WEAPON_MUSKRAT')] = 'Muskrat',
  [GetHashKey('WEAPON_RACCOON')] = 'Raccoon',
  [GetHashKey('WEAPON_SNAKE')] = 'Snake',
  [GetHashKey('WEAPON_FALL')] = 'Fall',
  [GetHashKey('WEAPON_FIRE')] = 'Fire',
  [GetHashKey('WEAPON_BLEEDING')] = 'Bleeding',
  [GetHashKey('WEAPON_DROWNING')] = 'Drowning',
  [GetHashKey('WEAPON_DROWNING_IN_VEHICLE')] = 'Drowning In Vehicle',
  [GetHashKey('WEAPON_EXPLOSION')] = 'Explosion',
  [GetHashKey('WEAPON_RAMMED_BY_CAR')] = 'Rammed By Car',
  [GetHashKey('WEAPON_RUN_OVER_BY_CAR')] = 'Run Over By Car',

  --  Weapons from game version 1207.80 till 1311.1212
  [GetHashKey('WEAPON_KIT_CAMERA_ADVANCED')] = 'Kit Camera Advanced',
  [GetHashKey('WEAPON_MELEE_MACHETE_HORROR')] = 'Melee Machete Horror',
  [GetHashKey('WEAPON_BOW_IMPROVED')] = 'Bow Improved',
  [GetHashKey('WEAPON_RIFLE_ELEPHANT')] = 'Rifle Elephant',
  [GetHashKey('WEAPON_REVOLVER_NAVY')] = 'Revolver Navy',
  [GetHashKey('WEAPON_LASSO_REINFORCED')] = 'Lasso Reinforced',
  [GetHashKey('WEAPON_KIT_BINOCULARS_IMPROVED')] = 'Kit Binoculars Improved',
  [GetHashKey('WEAPON_MELEE_KNIFE_TRADER')] = 'Melee Knife Trader',
  [GetHashKey('WEAPON_MELEE_MACHETE_COLLECTOR')] = 'Melee Machete Collector',
  [GetHashKey('WEAPON_MOONSHINEJUG_MP')] = 'Moonshinejug Mp',
  [GetHashKey('WEAPON_THROWN_BOLAS')] = 'Thrown Bolas',
  [GetHashKey('WEAPON_THROWN_POISONBOTTLE')] = 'Thrown Poisonbottle',

  --  Weapons from game version 1311.12 till 1355.18
  [GetHashKey('WEAPON_KIT_METAL_DETECTOR')] = 'Kit Metal Detector',
  [GetHashKey('WEAPON_REVOLVER_NAVY_CROSSOVER')] = 'Revolver Navy Crossover',
  [GetHashKey('WEAPON_THROWN_BOLAS_HAWKMOTH')] = 'Thrown Bolas Hawkmoth',
  [GetHashKey('WEAPON_THROWN_BOLAS_IRONSPIKED')] = 'Thrown Bolas Ironspiked',
  [GetHashKey('WEAPON_THROWN_BOLAS_INTERTWINED')] = 'Thrown Bolas Intertwined',

  --  Weapons from game version 1355.18 till 1436.26
  [GetHashKey('WEAPON_MELEE_KNIFE_HORROR')] = 'Melee Knife Horror',
  [GetHashKey('WEAPON_MELEE_KNIFE_RUSTIC')] = 'Melee Knife Rustic',
  [GetHashKey('WEAPON_MELEE_LANTERN_HALLOWEEN')] = 'Melee Lantern Halloween',
}
deathHashTable = IS_FIVEM and fivemDeathHashTable or redmDeathHashTable