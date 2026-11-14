-- Prevent running in monitor mode
if not TX_SERVER_MODE then return end
-- Prevent running if menu is disabled
if not TX_MENU_ENABLED then return end

local frozenPlayers = {}

local function isPlayerFrozen(targetId)
  return frozenPlayers[targetId] or false
end

local function setPlayerFrozenInMap(targetId, status)
  frozenPlayers[targetId] = status or nil
end

RegisterNetEvent('txsv:req:freezePlayer', function(targetId)
  local src = source
  if type(targetId) ~= 'number' or GetPlayerName(targetId) == nil then return end
  local allow = PlayerHasTxPermission(src, 'players.freeze')
  TriggerEvent('txsv:logger:menuEvent', src, 'freezePlayer', allow, targetId)
  if allow then
    local newFrozenStatus = not isPlayerFrozen(targetId)
    setPlayerFrozenInMap(targetId, newFrozenStatus)

    TriggerClientEvent('txcl:freezePlayerOk', src, newFrozenStatus)
    TriggerClientEvent('txcl:setFrozen', targetId, newFrozenStatus)
  end
end)
