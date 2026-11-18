-- Prevent running in monitor mode
if not TX_SERVER_MODE then return end

--Helpers
local function logError(x)
    txPrint("^1" .. x)
end
-- function unDeQuote(x)
--     local new, count = string.gsub(x, utf8.char(0xFF02), '"')
--     return new
-- end
function replaceSemicolon(x)
    local new, count = string.gsub(x, utf8.char(0x037E), ';')
    return new
end

if GetCurrentResourceName() ~= "monitor" then
    logError('This resource should not be installed separately, it already comes with fxserver.')
    return
end


-- =============================================
-- MARK: Variables stuff
-- =============================================
TX_ADMINS = {}
TX_PLAYERLIST = {}
TX_LUACOMHOST = GetConvar("txAdmin-luaComHost", "invalid")
TX_LUACOMTOKEN = GetConvar("txAdmin-luaComToken", "invalid")
TX_VERSION = GetResourceMetadata('monitor', 'version') -- for now, only used in the start print
TX_IS_SERVER_SHUTTING_DOWN = false

-- Checking convars
if TX_LUACOMHOST == "invalid" or TX_LUACOMTOKEN == "invalid" then
    txPrint('^1API Host or Pipe Token ConVars not found. Do not start this resource if not using txAdmin.')
    return
end
if TX_LUACOMTOKEN == "removed" then
    txPrint('^1Please do not restart the monitor resource.')
    return
end

-- Erasing the token convar for security reasons, and then restoring it if debug mode.
-- The convar needs to be reset on first tick to prevent other resources from reading it.
-- We actually need to wait two frames: one for convar replication, one for debugPrint.
SetConvar("txAdmin-luaComToken", "removed")
CreateThread(function()
    Wait(0)
    if not TX_DEBUG_MODE then return end
    debugPrint("Restoring txAdmin-luaComToken for next monitor restart")
    SetConvar("txAdmin-luaComToken", TX_LUACOMTOKEN)
end)


-- =============================================
-- MARK: Heartbeat functions
-- =============================================
local httpHbUrl = "http://" .. TX_LUACOMHOST .. "/intercom/monitor"
local httpHbPayload = json.encode({ txAdminToken = TX_LUACOMTOKEN })
local hbReturnData = '{"error": "no data cached in sv_main.lua"}'
local function HTTPHeartBeat()
    PerformHttpRequest(httpHbUrl, function(httpCode, data, resultHeaders)
        local resp = tostring(data)
        if httpCode ~= 200 then
            hbReturnData = "HeartBeat failed with code " .. httpCode .. " and message: " .. resp
            logError(hbReturnData)
        else
            hbReturnData = resp
        end
    end, 'POST', httpHbPayload, { ['Content-Type'] = 'application/json' })
end

local fd3HbPayload = json.encode({ type = 'txAdminHeartBeat' })
local function FD3HeartBeat()
    PrintStructuredTrace(fd3HbPayload)
end

-- HTTP request handler
local notFoundResponse = json.encode({ error = 'route not found' })
local function handleHttp(req, res)
    res.writeHead(200, { ["Content-Type"] = "application/json" })

    if req.path == '/stats.json' then
        return res.send(hbReturnData)
    else
        return res.send(notFoundResponse)
    end
end


-- =============================================
-- MARK: Commands
-- =============================================

--- Simple stdout reply just to make sure the resource is alive
--- this is only used in debug
local function txaPing(source, args)
    txPrint("Pong! (txAdmin resource is running)")
    CancelEvent()
end


--- Get all resources/statuses and report back to txAdmin
local function txaReportResources(source, args)
    --Prepare resources list
    local resources = {}
    local max = GetNumResources() - 1
    for i = 0, max do
        local resName = GetResourceByFindIndex(i)
        local currentRes = {
            name = resName,
            status = GetResourceState(resName),
            author = GetResourceMetadata(resName, 'author'),
            version = GetResourceMetadata(resName, 'version'),
            description = GetResourceMetadata(resName, 'description'),
            path = GetResourcePath(resName)
        }
        resources[#resources+1] = currentRes
    end

    --Send to txAdmin
    local url = "http://"..TX_LUACOMHOST.."/intercom/resources"
    local exData = {
        txAdminToken = TX_LUACOMTOKEN,
        resources = resources
    }
    txPrint('Sending resources list to txAdmin.')
    PerformHttpRequest(url, function(httpCode, data, resultHeaders)
        local resp = tostring(data)
        if httpCode ~= 200 then
            logError("ReportResources failed with code "..httpCode.." and message: "..resp)
        end
    end, 'POST', json.encode(exData), {['Content-Type']='application/json'})
end


--- Setter for the txAdmin-debugMode convar and TX_DEBUG_MODE global variable
local function txaSetDebugMode(source, args)
    -- prevent execution from admins or resources
    if source ~= 0 or GetInvokingResource() ~= nil then return end
    -- validating argument
    if args[1] == nil then return end

    -- changing mode
    if args[1] == '1' then
        TX_DEBUG_MODE = true
        txPrint("^1!! Debug Mode enabled via console !!")
    elseif args[1] == '0' then
        TX_DEBUG_MODE = false
        txPrint("^1!! Debug Mode disabled via console !!")
    else
        txPrint("^1!! txaSetDebugMode only accepts '1' or '0' as input. !!")
    end
    SetConvarReplicated('txAdmin-debugMode', tostring(TX_DEBUG_MODE))
    TriggerClientEvent('txcl:setDebugMode', -1, TX_DEBUG_MODE)
end


-- =============================================
-- MARK: Events handling
-- =============================================
local txServerName = GetConvar("txAdmin-serverName", "txAdmin")
local cvHideAdminInPunishments = GetConvarBool('txAdmin-hideAdminInPunishments')
local cvHideAdminInMessages = GetConvarBool('txAdmin-hideAdminInMessages')
local cvHideAnnouncement = GetConvarBool('txAdmin-hideDefaultAnnouncement')
local cvHideDirectMessage = GetConvarBool('txAdmin-hideDefaultDirectMessage')
local cvHideWarning = GetConvarBool('txAdmin-hideDefaultWarning')
local cvHideScheduledRestartWarning = GetConvarBool('txAdmin-hideDefaultScheduledRestartWarning')
-- Adding all known events to the list so txaEvent can do whitelist checking
TX_EVENT_HANDLERS = {
    -- Handled by another file
    adminsUpdated = false, -- sv_admins.lua
    configChanged = false, -- sv_ctx.lua

    -- Known NO-OP
    actionRevoked = false,
    adminAuth = false,
    consoleCommand = false,
    healedPlayer = false,
    playerHealed = false,
    playerWhitelisted = false,
    skippedNextScheduledRestart = false,
    scheduledRestartSkipped = false,
    whitelistPlayer = false,
    whitelistPreApproval = false,
    whitelistRequest = false,
}

--- Handler for announcement events
--- Broadcast admin message to all players
TX_EVENT_HANDLERS.announcement = function(eventData)
    local authorName = cvHideAdminInMessages and txServerName or eventData.author or 'anonym'
    if not cvHideAnnouncement then
        TriggerClientEvent('txcl:showAnnouncement', -1, eventData.message, authorName)
    end
    TriggerEvent('txsv:logger:addChatMessage', 'tx', '(Broadcast) '..authorName, eventData.message)
end


--- Handler for scheduled restarts event
--- Broadcast through an announcement that the server will restart in XX minutes
TX_EVENT_HANDLERS.scheduledRestart = function(eventData)
    if not cvHideScheduledRestartWarning then
        TriggerClientEvent('txcl:showAnnouncement', -1, eventData.translatedMessage, 'txAdmin')
    end
    TriggerEvent('txsv:logger:addChatMessage', 'tx', '(Broadcast) txAdmin', eventData.translatedMessage)
end


--- Handler for player DM event
--- Sends a direct message from an admin to a player
TX_EVENT_HANDLERS.playerDirectMessage = function(eventData)
    local authorName = cvHideAdminInMessages and txServerName or eventData.author or 'anonym'
    if not cvHideDirectMessage then
        TriggerClientEvent('txcl:showDirectMessage', eventData.target, eventData.message, authorName)
    end
    TriggerEvent('txsv:logger:addChatMessage', 'tx', '(DM) '..authorName, eventData.message)
end


--- Handler for player kicked event
TX_EVENT_HANDLERS.playerKicked = function(eventData)
    Wait(0) -- give other resources a chance to read player data

    -- sanity check
    if
        type(eventData.target) ~= 'number'
        or type(eventData.reason) ~= 'string'
        or type(eventData.dropMessage) ~= 'string'
    then
        return txPrintError('[playerKicked] invalid eventData', eventData)
    end

    -- kicking
    if eventData.target == -1 then
        txPrint("Kicking everyone: "..eventData.reason)
        for _, pid in pairs(GetPlayers()) do
            DropPlayer(pid, '[txAdmin] ' .. eventData.dropMessage)
        end
    else
        txPrint("Kicking: #"..eventData.target..": "..eventData.reason)
        DropPlayer(eventData.target, '[txAdmin] ' .. eventData.dropMessage)
    end
end


--- Handler for player warned event
--- Warn specific player via server ID
local pendingWarnings = {}
TX_EVENT_HANDLERS.playerWarned = function(eventData, isWarningNew)
    if isWarningNew == nil then isWarningNew = true end
    if cvHideWarning then return end
    if eventData.targetNetId == nil then return end

    if not DoesPlayerExist(eventData.targetNetId) then
        txPrint(string.format(
            '[handleWarnEvent] ignoring warning for disconnected player (#%s) %s',
            eventData.targetNetId,
            eventData.targetName
        ))
        return
    end

    pendingWarnings[tostring(eventData.targetNetId)] = eventData.actionId
    local authorName = cvHideAdminInPunishments and txServerName or eventData.author or 'anonym'
    TriggerClientEvent(
        'txcl:showWarning',
        eventData.targetNetId,
        authorName,
        eventData.reason,
        eventData.actionId,
        isWarningNew
    )
    txPrint(string.format(
        'Warning player (#%s) %s for %s',
        eventData.targetNetId,
        eventData.targetName,
        eventData.reason
    ))
end

-- Event so the client can ack the warning
RegisterNetEvent('txsv:ackWarning', function(actionId)
    if type(actionId) ~= 'string' then return end
    local srcStr = tostring(source)
    if pendingWarnings[srcStr] == actionId then
        PrintStructuredTrace(json.encode({
            type = 'txAdminAckWarning',
            actionId = actionId,
        }))
        pendingWarnings[srcStr] = nil
    end
end)

-- Remove any pending warnings when a player leaves
AddEventHandler('playerDropped', function()
    local srcStr = tostring(source)
    local pendingActionId = pendingWarnings[srcStr]
    if pendingActionId ~= nil then
        pendingWarnings[srcStr] = nil
        txPrint(string.format(
            'Player #%s left without accepting the warning [%s]',
            srcStr,
            pendingActionId
        ))
    end
end)


--- Handler for the player banned event
--- Ban player(s) via netid or identifiers
TX_EVENT_HANDLERS.playerBanned = function(eventData)
    Wait(0) -- give other resources a chance to read player data
    local kickCount = 0
    for _, playerID in pairs(GetPlayers()) do
        local identifiers = GetPlayerIdentifiers(playerID)
        if identifiers ~= nil then
            local found = false
            for _, searchIdentifier in pairs(eventData.targetIds) do
                if found then break end

                for _, playerIdentifier in pairs(identifiers) do
                    if searchIdentifier == playerIdentifier then
                        txPrint("[handleBanEvent] Kicking #"..playerID..": "..eventData.reason)
                        kickCount = kickCount + 1
                        DropPlayer(playerID, '[txAdmin] ' .. eventData.kickMessage)
                        found = true
                        break
                    end
                end
            end
        end
    end

    if kickCount == 0 then
        txPrint("[handleBanEvent] No players found to kick")
    end
end


--- Handler for the imminent shutdown event
--- Kicks all players and lock joins in preparation for server shutdown
TX_EVENT_HANDLERS.serverShuttingDown = function(eventData)
    txPrint('Server shutting down. Kicking all players.')
    TX_IS_SERVER_SHUTTING_DOWN = true
    local players = GetPlayers()
    for _, serverID in pairs(players) do
        DropPlayer(serverID, '[txAdmin] ' .. eventData.message)
    end
end


--- Command that receives all incoming tx events and dispatches
--- it to the respective event handler
local function txaEvent(source, args)
    -- sanity check
    if type(args[1]) ~= 'string' or type(args[2]) ~= 'string' then
        return txPrintError('[txaEvent] invalid argument types', type(args[1]), type(args[2]))
    end

    -- prevent execution from admins or resources
    if source ~= 0 then
        return txPrintError('[txaEvent] unexpected source', source)
    end
    if GetInvokingResource() ~= nil then
        return txPrintError('[txaEvent] unexpected invoking resource', GetInvokingResource())
    end

    -- processing event
    local eventName = args[1]
    local eventHandler = TX_EVENT_HANDLERS[eventName]
    if eventHandler == nil then
        return txPrintError("[txaEvent] No event handler exists for \"" .. eventName .. "\" event")
    end
    local eventData = json.decode(replaceSemicolon(args[2]))
    if type(eventData) ~= 'table' then
        return txPrintError('[txaEvent] invalid eventData', type(eventData))
    end

    -- print('~~~~~~~~~~~~~~~~~~~~~ txaEvent')
    -- print('Name:', eventName)
    -- print('Source:', json.encode(source))
    -- print('Resource:', json.encode(GetInvokingResource()))
    -- print('Data:', json.encode(eventData))
    -- print('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')

    -- need to trigger the event first, call handler after
    TriggerEvent('txAdmin:events:' .. eventName, eventData)
    if eventHandler ~= false then
        eventHandler(eventData)
    end
end


-- =============================================
-- MARK: Player connecting handler
-- =============================================
local function handleConnections(name, setKickReason, d)
    -- if server is shutting down
    if TX_IS_SERVER_SHUTTING_DOWN then
        CancelEvent()
        setKickReason("[txAdmin] Server is shutting down, try again in a few seconds.")
        return
    end

    local player = source
    if GetConvarBool("txAdmin-checkPlayerJoin") then
        d.defer()
        Wait(0)

        --Preparing vars and making sure we do have indentifiers
        local url = "http://"..TX_LUACOMHOST.."/player/checkJoin"
        local exData = {
            txAdminToken = TX_LUACOMTOKEN,
            playerIds = GetPlayerIdentifiers(player),
            playerHwids = GetPlayerTokens(player),
            playerName = name
        }
        if #exData.playerIds <= 1 then
            d.done("\n[txAdmin] This server has bans or whitelisting enabled, which requires every player to have at least one identifier, but you have none.\nIf you own this server, make sure sv_lan is disabled in your server.cfg.")
            return
        end

        --Attempt to validate the user
        d.update("\n[txAdmin] Checking banlist/whitelist... (0/5)")
        CreateThread(function()
            local attempts = 0
            local isDone = false;
            --Do 5 attempts (2.5 mins)
            while isDone == false and attempts < 5 do
                attempts = attempts + 1
                d.update("\n[txAdmin] Checking banlist/whitelist... ("..attempts.."/5)")
                PerformHttpRequest(url, function(httpCode, rawData, resultHeaders)
                    if isDone then return end
                    -- rawData = nil
                    -- httpCode = 408

                    if not rawData or httpCode ~= 200 then
                        logError("Checking banlist/whitelist failed with code "..httpCode.." and message: "..tostring(rawData))
                    else
                        local respStr = tostring(rawData)
                        local respObj = json.decode(respStr)
                        if not respObj or type(respObj.allow) ~= "boolean" then
                            logError("Checking banlist/whitelist failed with invalid response: "..respStr)
                        else
                            if respObj.allow == true then
                                d.done()
                                isDone = true
                            else
                                local reason = respObj.reason or "\n[txAdmin] no reason provided"
                                d.done("\n"..reason)
                                isDone = true
                            end
                        end
                    end
                end, 'POST', json.encode(exData), {['Content-Type']='application/json'})
                Wait(30000) --30s
            end

            --Block client if failed
            if not isDone then
                d.done("\n[txAdmin] Failed to validate your banlist/whitelist status. Try again in a few minutes.")
                isDone = true
            end
        end)

    end
end


-- =============================================
-- MARK: Setup threads and commands & main stuff
-- =============================================

-- All commands & handlers
RegisterCommand("txaPing", txaPing, true)
RegisterCommand("txaEvent", txaEvent, true)
RegisterCommand("txaReportResources", txaReportResources, true)
RegisterCommand("txaSetDebugMode", txaSetDebugMode, true)
AddEventHandler('playerConnecting', handleConnections)
SetHttpHandler(handleHttp)

-- HeartBeat functions are separated in case one hangs
CreateThread(function()
    while true do
        HTTPHeartBeat()
        Wait(3000)
    end
end)
CreateThread(function()
    while true do
        FD3HeartBeat()
        Wait(3000)
    end
end)

txPrint("Resource v"..TX_VERSION.." threads and commands set up. All Ready.")
