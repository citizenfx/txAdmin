-- Prevent running if menu is disabled
if not TX_MENU_ENABLED then return end

-- =============================================
--  This file is for all main page logic not controlled in its
--  own file (mainly simpler logic)
-- =============================================

--[[ NUI CALLBACKS ]]

-- Data is a object with x, y, z
RegisterSecureNuiCallback('tpToCoords', function(data, cb)
    debugPrint(json.encode(data))
    TriggerServerEvent('txsv:req:tpToCoords', data.x + 0.0, data.y + 0.0, data.z + 0.0)
    cb({})
end)
RegisterCommand('txAdmin:menu:tpToCoords', function()
    if not menuIsAccessible then return end
    if not DoesPlayerHavePerm(menuPermissions, 'players.teleport') then
        return sendSnackbarMessage('error', 'nui_menu.misc.no_perms', true)
    end
    toggleMenuVisibility(true)
    SetNuiFocus(true, true)
    sendMenuMessage('openTeleportCoordsDialog', {})
end)


local function reqTpToWaypoint(_, cb)
    TriggerServerEvent('txsv:req:tpToWaypoint')
    if cb then cb({}) end
end
RegisterSecureNuiCallback('tpToWaypoint', reqTpToWaypoint)
RegisterCommand('txAdmin:menu:tpToWaypoint', function()
    if not menuIsAccessible then return end
    if not DoesPlayerHavePerm(menuPermissions, 'players.teleport') then
        return sendSnackbarMessage('error', 'nui_menu.misc.no_perms', true)
    end
    reqTpToWaypoint()
end)


local function reqTpBack(_, cb)
    if lastTpCoords then
        TriggerServerEvent('txsv:req:tpToCoords', lastTpCoords.x, lastTpCoords.y, lastTpCoords.z)
    else
        sendSnackbarMessage('error', 'nui_menu.page_main.teleport.back.error', true)
    end
    if cb then cb({}) end
end
RegisterSecureNuiCallback('tpBack', reqTpBack)
RegisterCommand('txAdmin:menu:tpBack', function()
    if not menuIsAccessible then return end
    if not DoesPlayerHavePerm(menuPermissions, 'players.teleport') then
        return sendSnackbarMessage('error', 'nui_menu.misc.no_perms', true)
    end
    reqTpBack()
end)


RegisterSecureNuiCallback('tpToPlayer', function(data, cb)
    TriggerServerEvent('txsv:req:tpToPlayer', tonumber(data.id))
    cb({})
end)

RegisterSecureNuiCallback('summonPlayer', function(data, cb)
    TriggerServerEvent('txsv:req:bringPlayer', tonumber(data.id))
    cb({})
end)

RegisterSecureNuiCallback('copyCurrentCoords', function(_, cb)
    local ped = PlayerPedId()
    local curCoords = GetEntityCoords(ped)
    local currHeading = GetEntityHeading(ped)
    -- We will cut coords to 4 decimal points
    local stringCoords = ('%.4f, %.4f, %.4f, %.4f'):format(curCoords.x, curCoords.y, curCoords.z, currHeading)
    cb({ coords = stringCoords })
end)

RegisterSecureNuiCallback('clearArea', function(radius, cb)
    TriggerServerEvent('txsv:req:clearArea', radius)
    cb({})
end)
RegisterCommand('txAdmin:menu:clearArea', function()
    if not menuIsAccessible then return end
    if not DoesPlayerHavePerm(menuPermissions, 'menu.clear_area') then
        return sendSnackbarMessage('error', 'nui_menu.misc.no_perms', true)
    end
    toggleMenuVisibility(true)
    SetNuiFocus(true, true)
    sendMenuMessage('openClearAreaDialog', {})
end)

-- [[ Spawn weapon (only in dev, for now) ]]
RegisterSecureNuiCallback('spawnWeapon', function(weapon, cb)
    if not TX_DEBUG_MODE then return end
    debugPrint("Spawning weapon: " .. weapon)
    GiveWeaponToPed(PlayerPedId(), weapon, 500, false, true)
    cb({})
end)

RegisterSecureNuiCallback('healPlayer', function(data, cb)
    TriggerServerEvent('txsv:req:healPlayer', tonumber(data.id))
    cb({})
end)

local healSelfMessage = 0
local function reqHealMyself(_, cb)
    local msg = 'nui_menu.page_main.heal.myself.success_'..healSelfMessage
    sendSnackbarMessage('success', msg, true)
    healSelfMessage = healSelfMessage + 1
    if healSelfMessage > 3 then
        healSelfMessage = 0
    end
    TriggerServerEvent('txsv:req:healMyself')
    if cb then cb({}) end
end
RegisterSecureNuiCallback('healMyself', reqHealMyself)
RegisterCommand('txAdmin:menu:healMyself', function()
    if not menuIsAccessible then return end
    if not DoesPlayerHavePerm(menuPermissions, 'players.heal') then
        return sendSnackbarMessage('error', 'nui_menu.misc.no_perms', true)
    end
    reqHealMyself()
end)

RegisterSecureNuiCallback('healAllPlayers', function(_, cb)
    TriggerServerEvent('txsv:req:healEveryone')
    cb({})
end)

-- Data will be an object with a message attribute
RegisterSecureNuiCallback('sendAnnouncement', function(data, cb)
    TriggerServerEvent('txsv:req:sendAnnouncement', data.message)
    cb({})
end)


--[[ EVENT HANDLERS + FUNCTION LOGIC ]]

--- Finds the ground Z, retrying while the world loads
---@param x number
---@param y number
---@return number|nil
local function resolveGroundZ(x, y)
    local finalZ
    local DELAY = 500
    for i = 1, 5 do
        debugPrint("Z calc attempt #" .. i .. " (" .. (i * DELAY) .. "ms)")
        finalZ = FindZForCoords(x, y)
        if finalZ ~= nil then break end
        debugPrint("Didn't resolve! Trying again in " .. DELAY)
        Wait(DELAY)
    end
    return finalZ
end

local function handleTpNormally(x, y, z)
    local ped = PlayerPedId()
    local veh = GetVehiclePedIsIn(ped, false)
    local horse
    if IS_FIVEM then
        SetPedCoordsKeepVehicle(ped, x, y, 100.0)
    else
        if IsPedOnMount(ped) then
            horse = GetMount(ped)
            SetEntityCoords(horse, x, y, 100.0, false, false, false, false)
            FreezeEntityPosition(horse, true)
        end
        SetEntityCoords(ped, x, y, 100.0, false, false, false, false)
    end

    --Prepare vehicle
    if veh > 0 then
        if IS_REDM then
            SetVehicleCanBreak(veh, false)
            SetVehicleWheelsCanBreak(veh, false)
            SetEntityCollision(veh, false, false)
            SetEntityCoords(veh, x, y, 100.0, false, false, false, false)
            SetPedIntoVehicle(ped, veh, -1)
        end
        FreezeEntityPosition(veh, true)
    else
        FreezeEntityPosition(ped, true)
    end
    while IsEntityWaitingForWorldCollision(ped) do
        debugPrint("waiting for collision...")
        Wait(100)
    end

    -- Automatically calculate ground Z
    if z == 0 then
        z = resolveGroundZ(x, y) or z
    end

    -- Teleport to targert
    ped = PlayerPedId() --update ped id
    if IS_FIVEM then
        SetPedCoordsKeepVehicle(ped, x, y, z)
    else
        if horse then
            SetEntityCoords(horse, x, y, z + 0.5, false, false, false, false)
            FreezeEntityPosition(horse, false)
        end
        SetEntityCoords(ped, x, y, z + 0.5, false, false, false, false)
    end

    -- handle vehicle teleport
    if veh > 0 then
        veh = GetVehiclePedIsIn(ped, false) --update veh id
        SetEntityAlpha(veh, 125)
        SetEntityCoords(veh, x, y, z + 0.5, false, false, false, false)
        SetPedIntoVehicle(ped, veh, -1)
        SetVehicleOnGroundProperly(veh)
        SetEntityCollision(veh, true, true)
        FreezeEntityPosition(veh, false)
        CreateThread(function()
            Wait(2000)
            ResetEntityAlpha(veh)
            SetVehicleCanBreak(veh, true)
            SetVehicleWheelsCanBreak(veh, true)
        end)
    else
        FreezeEntityPosition(ped, false)
    end

    -- point camera to the ped direction
    if IS_FIVEM then
        SetGameplayCamRelativeHeading(0)
    else
        Citizen.InvokeNative(0x14F3947318CA8AD2, 0.0, 0.0) -- SetThirdPersonCamRelativeHeadingLimitsThisUpdate
    end
end

local function handleTpForFreecam(x, y, z)
    debugPrint("Handling TP for freecam")
    local ped = PlayerPedId()
    -- As we allow the freecam to have a vehicle attached. We need to make
    -- sure to teleport this as well
    local veh = GetVehiclePedIsIn(ped, false)
    debugPrint('Freecam has vehicle attached: ' .. tostring(veh))

    -- Automatically calculate ground Z
    if z == 0 then
        SetFreecamPosition(x, y, 100.0)
        SetEntityCoords(ped, x, y, 100.0, false, false, false, false)
        RequestCollisionAtCoord(x, y, 100.0)
        while IsEntityWaitingForWorldCollision(ped) do
            debugPrint("waiting for collision...")
            Wait(100)
        end
        local groundZ = resolveGroundZ(x, y)
        z = groundZ and groundZ + 2.0 or 100.0
    end

    SetEntityCoords(ped, x, y, z, false, false, false, false)
    if veh and veh > 0 then
        SetEntityCoords(veh, x, y, z)
    end
    SetFreecamPosition(x, y, z)
end

local function teleportToCoords(coords)
    if type(coords) ~= 'vector3' then
        return debugPrint("^1Invalid coords")
    end
    local x = coords[1]
    local y = coords[2]
    local z = coords[3]
    local ped = PlayerPedId()

    DoScreenFadeOut(500)
    while not IsScreenFadedOut() do Wait(0) end

    if IsFreecamActive() then
        local curCamPos = GetFreecamPosition()
        lastTpCoords = curCamPos
        handleTpForFreecam(x, y, z)
    else
        lastTpCoords = GetEntityCoords(ped)
        handleTpNormally(x, y, z)
    end

    DoScreenFadeIn(500)
end

--- Teleport the player to the coordinates
---@param x number
---@param y number
---@param z number
RegisterNetEvent('txcl:tpToCoords', function(x, y, z)
    teleportToCoords(vec3(x, y, z))
    return sendSnackbarMessage('success', 'nui_menu.page_main.teleport.generic_success', true)
end)

-- Teleport to the current waypoint
RegisterNetEvent('txcl:tpToWaypoint', function()
    if not IsWaypointActive() then
        return sendSnackbarMessage('error', 'nui_menu.page_main.teleport.waypoint.error', true)
    end

    local destCoords
    if IS_FIVEM then
        local waypoint = GetFirstBlipInfoId(GetWaypointBlipEnumId())
        destCoords = GetBlipInfoIdCoord(waypoint)
    else
        destCoords = GetWaypointCoords()
    end

    teleportToCoords(vec3(destCoords.x, destCoords.y, 0))
    sendSnackbarMessage('success', 'nui_menu.page_main.teleport.generic_success', true)
end)


RegisterNetEvent('txcl:clearArea', function(radius)
    sendSnackbarMessage(
        'success',
        'nui_menu.page_main.clear_area.dialog_success',
        true,
        { radius = radius }
    )
    if IS_REDM then return end
    local curCoords = GetEntityCoords(PlayerPedId())
    local radiusToFloat = radius + 0.0
    debugPrint(('Radius to clear %d'):format(radius))
    -- WTF?: User reports that this native actually clears dead peds compared to
    -- ClearArea? Weird considering Gottfried updated this native from _CLEAR_AREA_OF_EVERYTHING
    -- after found nativedb info. Maybe needs research lmao?
    ClearAreaLeaveVehicleHealth(curCoords.x, curCoords.y, curCoords.z, radiusToFloat, false, false, false, false, false)
end)
