local function processDeath(ped)
    local killerPed = GetPedSourceOfDeath(ped)
    local causeHash = GetPedCauseOfDeath(ped)
    local killer = false
    debugPrint(("Death cause: %s / 0x%x"):format(causeHash, causeHash))

    if killerPed == ped then
        killer = false
    else
        if IsEntityAPed(killerPed) and IsPedAPlayer(killerPed) then
            killer = NetworkGetPlayerIndexFromPed(killerPed)
        elseif IsEntityAVehicle(killerPed) then
            local drivingPed = GetPedInVehicleSeat(killerPed, -1)
            if IsEntityAPed(drivingPed) == 1 and IsPedAPlayer(drivingPed) then
                killer = NetworkGetPlayerIndexFromPed(drivingPed)
            end
        end
    end

    local weaponHash = deathHashTable[causeHash] and causeHash or 'unknown'

    if killer then
        killer = GetPlayerServerId(killer)
    end

    TriggerServerEvent('txsv:logger:deathEvent', killer, weaponHash)
end

-- Trigger Event From External Script
-- NOTE: couldn't people just call the txsv:logger:deathEvent event???
RegisterNetEvent('txAdmin:beta:deathLog')
AddEventHandler('txAdmin:beta:deathLog', function(ped)
	processDeath(ped) -- Remember to add a wait function before reviving into an animation.
end)

--[[ Thread ]]--
local deathFlag = false
local IsEntityDead = IsEntityDead
CreateThread(function()
    while true do
        Wait(500)
        local ped = PlayerPedId()
        local isDead = IsEntityDead(ped)
        if isDead and not deathFlag then
            deathFlag = true
            processDeath(ped)
        elseif not isDead then
            deathFlag = false
        end
    end
end)
