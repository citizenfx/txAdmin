-- Prevent running in monitor mode
if not TX_SERVER_MODE then return end
-- Prevent running if menu is disabled
if not TX_MENU_ENABLED then return end

RegisterNetEvent('txsv:req:troll:setDrunk', function(id)
    local src = source
    if type(id) ~= 'number' or GetPlayerName(id) == nil then return end
    local allow = PlayerHasTxPermission(src, 'players.troll')
    if allow then
        TriggerClientEvent('txcl:setDrunk', id)
    end
    TriggerEvent('txsv:logger:menuEvent', src, 'drunkEffect', allow, id)
end)

RegisterNetEvent('txsv:req:troll:setOnFire', function(id)
    local src = source
    if type(id) ~= 'number' or GetPlayerName(id) == nil then return end
    local allow = PlayerHasTxPermission(src, 'players.troll')
    if allow then
        TriggerClientEvent('txcl:setOnFire', id)
    end
    TriggerEvent('txsv:logger:menuEvent', src, 'setOnFire', allow, id)
end)

RegisterNetEvent('txsv:req:troll:wildAttack', function(id)
    local src = source
    if type(id) ~= 'number' or GetPlayerName(id) == nil then return end
    local allow = PlayerHasTxPermission(src, 'players.troll')
    if allow then
        TriggerClientEvent('txcl:wildAttack', id)
    end
    TriggerEvent('txsv:logger:menuEvent', src, 'wildAttack', allow, id)
end)
