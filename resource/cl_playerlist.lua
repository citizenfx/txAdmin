-- Prevent running if menu is disabled
if not TX_MENU_ENABLED then return end

-- =============================================
--  Client PlayerList handler
-- =============================================

-- Optimizations
local tonumber = tonumber
local tostring = tostring
local floor = math.floor

-- Variables & Consts
LOCAL_PLAYERLIST = {} -- available globally in tx
local requirePlayerNames = false
local vTypeMap = {
    ["0"] = "walking",
    ["1"] = "driving", --automobile
    ["2"] = "biking",
    ["3"] = "boating",
    ["4"] = "flying", --heli
    ["5"] = "flying", --plane
    ["6"] = "boating", --submarine
    ["7"] = "driving", --trailer
    ["8"] = "driving", --train
}


-- Transforms the playerlist and sends to react
-- The playerlist is converted to an object array to save refactor time
function sendReactPlayerlist()
    local upload = {}
    for pids, playerData in pairs(LOCAL_PLAYERLIST) do
        upload[#upload + 1] = {
            id = tonumber(pids),
            name = playerData.name or "unknown",
            health = playerData.health,
            dist = playerData.dist,
            vType = playerData.vType,
            admin = playerData.admin,
            x = playerData.x,
            y = playerData.y,
        }
    end
    -- print("========== function sendReactPlayerlist()")
    -- print(json.encode(upload))
    -- print("------------------------------------")
    sendMenuMessage('setPlayerList', upload)
end


-- Triggered when the admin authenticates
-- Replaces current playerlist
RegisterNetEvent('txcl:plist:setInitial', function(payload)
    -- print("========== EVENT setInitialPlayerlist")
    -- print(json.encode(payload)) -- [[id, name]]
    -- print("------------------------------------")
    LOCAL_PLAYERLIST = {}
    for _, playerData in pairs(payload) do
        local pids = tostring(playerData[1])
        LOCAL_PLAYERLIST[pids] = {
            name = playerData[2],
            health = 0,
            dist = -1,
            vType = "unknown",
            admin = false
        }
    end
    -- print("------------------------------------")
    -- print(json.encode(LOCAL_PLAYERLIST, {indent = true}))
    -- print("------------------------------------")
    sendReactPlayerlist()
end)


-- Triggered on the return of "getDetailedPlayerlist"
--  > run through inbound playerlist updating existing data
--  > try to get the dist from all players (onesync only)
RegisterNetEvent('txcl:plist:setDetailed', function(players, admins)
    -- print("========== EVENT setDetailedPlayerlist")
    -- print(json.encode(players)) -- [[id, health, vType, xCoord, yCoord, name]]
    -- print("------------------------------------")
    local myID = GetPlayerServerId(PlayerId())
    local myPed = PlayerPedId()
    local myCoords = GetEntityCoords(myPed)

    for _, playerData in pairs(players) do
        local pid = playerData[1]
        local pidStr = tostring(playerData[1])
        local localPlayer = LOCAL_PLAYERLIST[pidStr]
        -- Set inbound data
        if localPlayer == nil then
            debugPrint("Playerlist: received detailed info for player "..pidStr.." not present in local playerlist")
            requirePlayerNames = true
            LOCAL_PLAYERLIST[pidStr] = {
                name = "unknown",
                health = playerData[2],
                vType = vTypeMap[tostring(playerData[3])] or "unknown",
                admin = false
            }
        else
            LOCAL_PLAYERLIST[pidStr].health = playerData[2]
            LOCAL_PLAYERLIST[pidStr].vType = vTypeMap[tostring(playerData[3])] or "unknown"
            -- Set the player name if available - used when the playerJoining (txcl:plist:updatePlayer) was missed
            if playerData[6] then
                LOCAL_PLAYERLIST[pidStr].name = playerData[6]
            end
        end

        --Mark as updated
        LOCAL_PLAYERLIST[pidStr].inLastUpdate = true
        -- Map position (onesync only, nil otherwise)
        LOCAL_PLAYERLIST[pidStr].x = playerData[4]
        LOCAL_PLAYERLIST[pidStr].y = playerData[5]

        -- Getting distance + health for RedM
        -- NOTE: RedM doesn't save ped health data on server, so need to get locally
        if pid == myID then
            LOCAL_PLAYERLIST[pidStr].dist = 0
            if IS_REDM then
                LOCAL_PLAYERLIST[pidStr].health = GetPedHealthPercent(myPed)
            end
        else
            --calc distance (onesync only, 2d only)
            if playerData[4] == nil or playerData[5] == nil then
                LOCAL_PLAYERLIST[pidStr].dist = -1
            else
                local remoteCoords = vector3(playerData[4], playerData[5], myCoords.z)
                LOCAL_PLAYERLIST[pidStr].dist = floor(#(myCoords - remoteCoords))
            end

            --get health locally
            if IS_REDM then
                local remotePlayer = GetPlayerFromServerId(pid)
                if remotePlayer == -1 then
                    LOCAL_PLAYERLIST[pidStr].health = -1
                else
                    local remotePed = GetPlayerPed(remotePlayer)
                    LOCAL_PLAYERLIST[pidStr].health = GetPedHealthPercent(remotePed)
                end
            end
        end
    end

    --Check if player disconnected and the playerDropped (txcl:plist:updatePlayer) was missed
    for playerID, playerData in pairs(LOCAL_PLAYERLIST) do
        if playerData.inLastUpdate == true then
            playerData.inLastUpdate = false
        else
            debugPrint("Playerlist: did not receive detailed info for player "..playerID.." present in local playerlist")
            LOCAL_PLAYERLIST[playerID] = nil
        end
    end

    -- Mark admins
    for _, adminID in pairs(admins) do
        local id = tostring(adminID)
        if LOCAL_PLAYERLIST[id] ~= nil then
            LOCAL_PLAYERLIST[id].admin = true
        end
    end

    -- print("------------------------------------")
    -- print(json.encode(LOCAL_PLAYERLIST, {indent = true}))
    -- print("------------------------------------")
    sendReactPlayerlist()
end)


-- Triggered on player join/leave
-- add/remove specific id to playerlist
RegisterNetEvent('txcl:plist:updatePlayer', function(id, data)
    local pids = tostring(id)
    if data == false then
        debugPrint("^2txcl:plist:updatePlayer: ^3"..id.."^2 disconnected")
        LOCAL_PLAYERLIST[pids] = nil
    else
        debugPrint("^2txcl:plist:updatePlayer: ^3"..id.."^2 connected")
        LOCAL_PLAYERLIST[pids] = {
            name = data,
            health = 0,
            dist = -1,
            vType = "unknown",
            admin = false
        }
    end
    sendReactPlayerlist()
end)


-- Triggered when the "player" tab opens in the menu, and every 5s after that
RegisterSecureNuiCallback('signalPlayersPageOpen', function(_, cb)
    TriggerServerEvent('txsv:req:plist:getDetailed', requirePlayerNames)
    requirePlayerNames = false
    cb({})
end)


-- DEBUG only
-- RegisterCommand('tnew', function()
--     TriggerServerEvent('txsv:req:plist:getDetailed')
-- end)
-- RegisterCommand('tprint', function()
--     print("------------------------------------")
--     print(json.encode(LOCAL_PLAYERLIST, {indent = true}))
--     print("------------------------------------")
-- end)
