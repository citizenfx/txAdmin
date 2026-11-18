-- Prevent running in monitor mode
if not TX_SERVER_MODE then return end


--[[ Helper Functions ]] --
local function logError(x)
    txPrint("^1" .. x)
end


--[[ Initial Data Cache ]] --
local CLEANUP_INTERVAL = 60 * 1000
local MAX_AGE = 5 * 60 * 1000
local initialDataCache = {}

local function cacheData(data)
    data.ts = GetGameTimer()
    initialDataCache[data.netId] = data
end

local function popData(netId)
    if not initialDataCache[netId] then return nil end
    local data = initialDataCache[netId]
    initialDataCache[netId] = nil
    return data
end

CreateThread(function()
    while true do
        local now = GetGameTimer()
        for netId, data in pairs(initialDataCache) do
            if now - data.ts > MAX_AGE then
                initialDataCache[netId] = nil
            end
        end

        Wait(CLEANUP_INTERVAL)
    end
end)


--[[ Handle Commands/Events ]] --
local function useInitData(data)
    if not data then return end
    if data.pendingWarn ~= nil then
        TX_EVENT_HANDLERS.playerWarned({
            author = data.pendingWarn.author,
            reason = data.pendingWarn.reason,
            actionId = data.pendingWarn.actionId,
            targetNetId = data.pendingWarn.targetNetId,
            targetIds = data.pendingWarn.targetIds, --not used
            targetName = data.pendingWarn.targetName,
        }, false)
    end
end

RegisterCommand('txaInitialData', function(source, args)
    -- sanity check
    if type(args[1]) ~= 'string' then
        return txPrintError('[txaInitialData] invalid argument types', type(args[1]))
    end

    -- prevent execution from admins or resources
    if source ~= 0 then
        return txPrintError('[txaInitialData] unexpected source', source)
    end
    if GetInvokingResource() ~= nil then
        return txPrintError('[txaInitialData] unexpected invoking resource', GetInvokingResource())
    end

    -- processing event
    local initialData = json.decode(replaceSemicolon(args[1]))
    if not initialData or type(initialData.netId) ~= 'number' then
        return txPrintError('[txaInitialData] invalid eventData', args[1])
    end
    cacheData(initialData)
    CancelEvent()
end, true)

--- FIXME: This is triggered when player starts walking, but in the future change so the pendingWarn 
--- is sent when react loads and stored locally, to show when player starts walking, without the need
--- for this event at all.
RegisterNetEvent('txsv:startedWalking', function()
    useInitData(popData(tonumber(source)))
end)
