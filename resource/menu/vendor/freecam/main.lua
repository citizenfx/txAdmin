local Wait = Citizen.Wait
local vector3 = vector3
local IsPauseMenuActive = IsPauseMenuActive
local GetSmartControlNormal = GetSmartControlNormal

local SETTINGS = _G.CONTROL_SETTINGS
local CONTROLS = _G.CONTROL_MAPPING

-------------------------------------------------------------------------------
local function GetSpeedMultiplier()
  local fastNormal = GetSmartControlNormal(CONTROLS.MOVE_FAST)
  local slowNormal = GetSmartControlNormal(CONTROLS.MOVE_SLOW)

  local baseSpeed = SETTINGS.BASE_MOVE_MULTIPLIER
  local fastSpeed = 1 + ((SETTINGS.FAST_MOVE_MULTIPLIER - 1) * fastNormal)
  local slowSpeed = 1 + ((SETTINGS.SLOW_MOVE_MULTIPLIER - 1) * slowNormal)

  local frameMultiplier = GetFrameTime() * 60
  local speedMultiplier = baseSpeed * fastSpeed / slowSpeed

  return speedMultiplier * frameMultiplier
end

local function UpdateCamera()
  if not IsFreecamActive() or IsPauseMenuActive() then
    return
  end

  if not IsFreecamFrozen() then
    local vecX, vecY = GetFreecamMatrix()
    local vecZ = vector3(0, 0, 1)

    local pos = GetFreecamPosition()
    local rot = GetFreecamRotation()

    -- Get speed multiplier for movement
    local speedMultiplier = GetSpeedMultiplier()

    -- Get rotation input
    local lookX = GetSmartControlNormal(CONTROLS.LOOK_X)
    local lookY = GetSmartControlNormal(CONTROLS.LOOK_Y)

    -- Get position input
    local moveX = GetSmartControlNormal(CONTROLS.MOVE_X)
    local moveY = GetSmartControlNormal(CONTROLS.MOVE_Y)
    local moveZ = GetSmartControlNormal(CONTROLS.MOVE_Z)

    -- Calculate new rotation.
    local rotX = rot.x + (-lookY * SETTINGS.LOOK_SENSITIVITY_X)
    local rotZ = rot.z + (-lookX * SETTINGS.LOOK_SENSITIVITY_Y)
    local rotY = rot.y

    -- Adjust position relative to camera rotation.
    pos = pos + (vecX *  moveX * speedMultiplier)
    pos = pos + (vecY * -moveY * speedMultiplier)
    pos = pos + (vecZ *  moveZ * speedMultiplier)

    -- Adjust new rotation
    rot = vector3(rotX, rotY, rotZ)

    -- Update camera
    SetFreecamPosition(pos.x, pos.y, pos.z)
    SetFreecamRotation(rot.x, rot.y, rot.z)

    return pos, rotZ
  end

  -- Trigger a tick event. Resources depending on the freecam position can
  -- make use of this event.
  -- TriggerEvent('freecam:onTick')
end

-------------------------------------------------------------------------------
local keysTable = {
  {'Slower', CONTROLS.MOVE_SLOW},
  {'Faster', CONTROLS.MOVE_FAST},
  {'Down', CONTROLS.MOVE_Z[2]},
  {'Up', CONTROLS.MOVE_Z[1]},
  {'Left/Right', CONTROLS.MOVE_X},
  {'Fwd/Back', CONTROLS.MOVE_Y},
}
local redmInstructionGroup, redmPromptTitle


function StartFreecamThread()
  if IS_REDM then
    redmPromptTitle = CreateVarString(10, 'LITERAL_STRING', 'NoClip')
    redmInstructionGroup = makeRedmInstructionalGroup(keysTable)
  end
  -- Camera/Pos updating thread
  Citizen.CreateThread(function()
    local ped = PlayerPedId()
    local initialPos = GetEntityCoords(ped)
    SetFreecamPosition(initialPos[1], initialPos[2], initialPos[3])
    local veh = GetVehiclePedIsIn(ped, false)
    if IsPedOnMount(ped) then
      veh = GetMount(ped)
    end

    local function updatePos(pos, rotZ)
      if pos ~= nil and rotZ ~= nil then
        -- Update ped
        SetEntityCoords(ped, pos.x, pos.y, pos.z, false, false, false, false)
        SetEntityHeading(ped, rotZ)
        -- Update veh
        if veh and veh > 0 and DoesEntityExist(veh) then
          SetEntityCoords(veh, pos.x, pos.y, pos.z, false, false, false, false)
          SetEntityHeading(veh, rotZ)
        end
      end
    end

    local frameCounter = 0
    local loopPos, loopRotZ
    while IsFreecamActive() do
      loopPos, loopRotZ = UpdateCamera()
      frameCounter = frameCounter + 1
      if frameCounter > 100 then
        frameCounter = 0
        updatePos(loopPos, loopRotZ)
      end
      Wait(0)
    end

    -- One last time due to the optimization
    updatePos(loopPos, loopRotZ)
  end)

  -- Start instructional thread
  CreateThread(function()
    local fivemScaleform = IS_FIVEM and makeFivemInstructionalScaleform(keysTable)
    while IsFreecamActive() do
      if IS_FIVEM then
        DrawScaleformMovieFullscreen(fivemScaleform, 255, 255, 255, 255, 0)
      else
        PromptSetActiveGroupThisFrame(redmInstructionGroup.groupId, redmPromptTitle, 1, 0, 0, 0)
      end
      Wait(0)
    end

    --cleanup of the scaleform movie
    if IS_FIVEM then
      SetScaleformMovieAsNoLongerNeeded()
    else
      for _, prompt in pairs(redmInstructionGroup.prompts) do
        UiPromptDelete(prompt)
      end
    end
  end)
end

--------------------------------------------------------------------------------

-- When the resource is stopped, make sure to return the camera to the player.
local resName = GetCurrentResourceName()
AddEventHandler('onResourceStop', function (resourceName)
  if resourceName == resName then
    SetFreecamActive(false)
  end
end)
