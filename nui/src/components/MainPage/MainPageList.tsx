import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, List, styled } from "@mui/material";
import { MenuListItem, MenuListItemMulti } from "./MenuListItem";
import {
  AccessibilityNew,
  Announcement,
  Build,
  CenterFocusWeak,
  ControlCamera,
  DirectionsCar,
  ExpandMore,
  Favorite,
  FileCopy,
  GpsFixed,
  LocalHospital,
  PersonPinCircle,
  Groups,
  Restore,
  Security,
  DeleteForever,
  RocketLaunch,
  AirlineStops,
  // Stream //Spawn Weapon action
} from "@mui/icons-material";
import { useKeyboardNavigation } from "../../hooks/useKeyboardNavigation";
import { useDialogContext } from "../../provider/DialogProvider";
import { fetchNui } from "../../utils/fetchNui";
import { useTranslate } from "react-polyglot";
import { useSnackbar } from "notistack";
import { PlayerMode, usePlayerMode } from "../../state/playermode.state";
import { useIsMenuVisibleValue } from "../../state/visibility.state";
import { TeleportMode, useTeleportMode } from "../../state/teleportmode.state";
import { HealMode, useHealMode } from "../../state/healmode.state";
import { copyToClipboard } from "../../utils/copyToClipboard";
import { useServerCtxValue } from "../../state/server.state";
import { VehicleMode, useVehicleMode } from "../../state/vehiclemode.state";
import { useIsRedmValue } from "@nui/src/state/isRedm.state";
import { getVehicleSpawnDialogData, vehiclePlaceholderReplacer } from "@nui/src/utils/vehicleSpawnDialogHelper";
import { useNuiEvent } from "@nui/src/hooks/useNuiEvent";
import { usePlayerModalContext } from "@nui/src/provider/PlayerModalProvider";

const fadeHeight = 20;
const listHeight = 402;

const BoxFadeTop = styled(Box)(({ theme }) => ({
  backgroundImage: `linear-gradient(to top, transparent, ${theme.palette.background.default})`,
  position: "relative",
  bottom: listHeight + fadeHeight - 4,
  height: fadeHeight,
}));

const BoxFadeBottom = styled(Box)(({ theme }) => ({
  backgroundImage: `linear-gradient(to bottom, transparent, ${theme.palette.background.default})`,
  position: "relative",
  height: fadeHeight,
  bottom: fadeHeight * 2,
}));

const BoxIcon = styled(Box)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginTop: -(fadeHeight * 2),
  display: "flex",
  justifyContent: "center",
}));

const StyledList = styled(List)({
  maxHeight: listHeight,
  overflow: "auto",
  "&::-webkit-scrollbar": {
    display: "none",
  },
});

// TODO: This component is kinda getting out of hand, might want to split it somehow
export const MainPageList: React.FC = () => {
  const { openDialog } = useDialogContext();
  const [curSelected, setCurSelected] = useState(0);
  const t = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const [playerMode, setPlayerMode] = usePlayerMode();
  const [teleportMode, setTeleportMode] = useTeleportMode();
  const [vehicleMode, setVehicleMode] = useVehicleMode();
  const [healMode, setHealMode] = useHealMode();
  const serverCtx = useServerCtxValue();
  const menuVisible = useIsMenuVisibleValue();
  const isRedm = useIsRedmValue()
  const { closeMenu } = usePlayerModalContext();
  const [lastVehicleSpawned, setLastVehicleSpawned] = useState<string | null>(null);

  //FIXME: this is so the menu resets multi selectors when we close it
  // but it is not working, and when I do this the first time we press
  // noclip it will actually think we are changing back to normal.
  // We need to review handlePlayermodeToggle()
  useEffect(() => {
    if (menuVisible) return;
    setCurSelected(0);
    // setPlayerMode(PlayerMode.NOCLIP);
    // setTeleportMode(TeleportMode.WAYPOINT);
    // setVehicleMode(VehicleMode.SPAWN);
    // setHealMode(HealMode.SELF);
  }, [menuVisible]);

  //=============================================
  const handleArrowDown = useCallback(() => {
    const next = curSelected + 1;
    fetchNui("playSound", "move").catch();
    setCurSelected(next >= menuListItems.length ? 0 : next);
  }, [curSelected]);

  const handleArrowUp = useCallback(() => {
    const next = curSelected - 1;
    fetchNui("playSound", "move").catch();
    setCurSelected(next < 0 ? menuListItems.length - 1 : next);
  }, [curSelected]);

  useKeyboardNavigation({
    onDownDown: handleArrowDown,
    onUpDown: handleArrowUp,
    disableOnFocused: true,
  });

  //=============================================
  const handlePlayermodeToggle = (targetMode: PlayerMode) => {
    if (targetMode === playerMode || targetMode === PlayerMode.DEFAULT) {
      setPlayerMode(PlayerMode.DEFAULT);
      fetchNui("playerModeChanged", PlayerMode.DEFAULT);
      enqueueSnackbar(t("nui_menu.page_main.player_mode.normal.success"), {
        variant: "success",
      });
    } else {
      setPlayerMode(targetMode);
      fetchNui("playerModeChanged", targetMode);
    }
  };

  //=============================================
  const handleTeleportCoords = (autoClose = false) => {
    openDialog({
      title: t("nui_menu.page_main.teleport.coords.dialog_title"),
      description: t("nui_menu.page_main.teleport.coords.dialog_desc"),
      placeholder: "340, 480, 12",
      onSubmit: (coords: string) => {
        // Testing examples:
        // {x: -1; y: 2; z:3}
        // {x = -1.01; y= 2.02; z=3.03}
        // -1, 2, 3
        // 474.08966064453, -1718.7073974609, 29.329517364502
        let [x, y, z] = Array.from(
          coords.matchAll(/-?\d{1,4}(?:\.\d+)?/g),
          (m) => parseFloat(m[0])
        );
        if (typeof x !== 'number' || typeof y !== 'number') {
          return enqueueSnackbar(
            t("nui_menu.page_main.teleport.coords.dialog_error"),
            { variant: "error" }
          );
        }
        if (typeof z !== 'number') {
          z = 0;
        }

        enqueueSnackbar(
          t("nui_menu.page_main.teleport.generic_success"),
          { variant: "success" }
        );
        fetchNui("tpToCoords", { x, y, z });
        if (autoClose) {
          closeMenu()
        }
      },
    });
  };
  useNuiEvent("openTeleportCoordsDialog", () => {
    handleTeleportCoords(true);
  });

  const handleTeleportBack = () => {
    fetchNui("tpBack");
  };

  const handleCopyCoords = () => {
    fetchNui<{ coords: string }>("copyCurrentCoords").then(({ coords }) => {
      copyToClipboard(coords);
      enqueueSnackbar(t("nui_menu.common.copied"), { variant: "success" });
    });
  };

  //=============================================
  const handleSpawnVehicle = (autoClose = false) => {
    // Requires onesync because the vehicle is spawned on the server
    if (!serverCtx.oneSync.status) {
      return enqueueSnackbar(t("nui_menu.misc.onesync_error"), {
        variant: "error",
      });
    }

    const dialogData = getVehicleSpawnDialogData(isRedm);
    openDialog({
      title: t("nui_menu.page_main.vehicle.spawn.dialog_title"),
      description: t("nui_menu.page_main.vehicle.spawn.dialog_desc"),
      placeholder: 'any vehicle model or ' + dialogData.shortcuts.join(', '),
      suggestions: lastVehicleSpawned ? [lastVehicleSpawned, ...dialogData.shortcuts] : dialogData.shortcuts,
      onSubmit: (modelInput: string) => {
        const { modelName } = vehiclePlaceholderReplacer(modelInput, dialogData.shortcutsData);
        setLastVehicleSpawned(modelName);
        fetchNui("spawnVehicle", { model: modelName });
        if (autoClose) {
          closeMenu()
        }
      },
    });
  };
  useNuiEvent("openSpawnVehicleDialog", () => {
    handleSpawnVehicle(true);
  });

  const handleFixVehicle = () => {
    fetchNui("fixVehicle");
  };

  const handleDeleteVehicle = () => {
    // If onesync is disabled, show an error due to server side entity handling
    if (!serverCtx.oneSync.status) {
      return enqueueSnackbar(t("nui_menu.misc.onesync_error"), {
        variant: "error",
      });
    }
    fetchNui("deleteVehicle").then(({ success }) => {
      //NOTE: since there is no client action for deleting the car, the success message is triggered here
      if (success) {
        return enqueueSnackbar(t("nui_menu.page_main.vehicle.delete.success"), {
          variant: "info",
        });
      }
    });
  };

  const handleBoostVehicle = () => {
    fetchNui("boostVehicle");
  };

  //=============================================
  const handleHealMyself = () => {
    fetchNui("healMyself");
  };

  const handleHealAllPlayers = () => {
    fetchNui("healAllPlayers");
    enqueueSnackbar(t("nui_menu.page_main.heal.everyone.success"), {
      variant: "info",
    });
  };

  //=============================================
  const handleAnnounceMessage = () => {
    openDialog({
      title: t("nui_menu.page_main.announcement.title"),
      description: t("nui_menu.page_main.announcement.dialog_desc"),
      placeholder: t("nui_menu.page_main.announcement.dialog_placeholder"),
      onSubmit: (message: string) => {
        enqueueSnackbar(t("nui_menu.page_main.announcement.dialog_success"), {
          variant: "success",
        });
        fetchNui("sendAnnouncement", { message });
      },
    });
  };

  const handleClearArea = (autoClose = false) => {
    if (isRedm) {
      return enqueueSnackbar(
        'This option is not yet available for RedM.',
        { variant: "error" }
      );
    }
    openDialog({
      title: t("nui_menu.page_main.clear_area.title"),
      description: t("nui_menu.page_main.clear_area.dialog_desc"),
      placeholder: "300",
      suggestions: ['50', '150', '300'],
      onSubmit: (msg) => {
        const parsedRadius = parseInt(msg);

        if (isNaN(parsedRadius) || parsedRadius > 300 || parsedRadius < 0) {
          return enqueueSnackbar(
            t("nui_menu.page_main.clear_area.dialog_error"),
            { variant: "error" }
          );
        }

        fetchNui("clearArea", parsedRadius);
        if (autoClose) {
          closeMenu()
        }
      },
    });
  };
  useNuiEvent("openClearAreaDialog", () => {
    handleClearArea(true);
  });

  const handleTogglePlayerIds = () => {
    fetchNui("togglePlayerIDs");
  };

  // This is here for when I am bored developing
  // const handleSpawnWeapon = () => {
  //   openDialog({
  //     title: "Spawn Weapon",
  //     placeholder: "WEAPON_ASSAULTRIFLE",
  //     description: "Type in the model name for the weapon you want to spawn.",
  //     onSubmit: (inputValue) => {
  //       fetchNui("spawnWeapon", inputValue);
  //     },
  //   });
  // };

  // This is where we keep a memoized list of all actions, can be dynamically
  // set in the future for third party resource integration. For now here for
  // simplicity
  const menuListItems = useMemo(
    () => [
      //PLAYER MODE
      {
        title: t("nui_menu.page_main.player_mode.title"),
        requiredPermission: "players.playermode",
        isMultiAction: true,
        initialValue: playerMode,
        actions: [
          {
            name: t("nui_menu.page_main.player_mode.noclip.title"),
            label: t("nui_menu.page_main.player_mode.noclip.label"),
            value: PlayerMode.NOCLIP,
            icon: <ControlCamera />,
            onSelect: () => {
              handlePlayermodeToggle(PlayerMode.NOCLIP);
            },
          },
          {
            name: t("nui_menu.page_main.player_mode.godmode.title"),
            label: t("nui_menu.page_main.player_mode.godmode.label"),
            value: PlayerMode.GOD_MODE,
            icon: <Security />,
            onSelect: () => {
              handlePlayermodeToggle(PlayerMode.GOD_MODE);
            },
          },
          {
            name: t("nui_menu.page_main.player_mode.superjump.title"),
            label: t("nui_menu.page_main.player_mode.superjump.label"),
            value: PlayerMode.SUPER_JUMP,
            icon: <AirlineStops />,
            onSelect: () => {
              handlePlayermodeToggle(PlayerMode.SUPER_JUMP);
            },
          },
          {
            name: t("nui_menu.page_main.player_mode.normal.title"),
            label: t("nui_menu.page_main.player_mode.normal.label"),
            value: PlayerMode.DEFAULT,
            icon: <AccessibilityNew />,
            onSelect: () => {
              handlePlayermodeToggle(PlayerMode.DEFAULT);
            },
          },
        ],
      },

      //TELEPORT
      {
        title: t("nui_menu.page_main.teleport.title"),
        requiredPermission: "players.teleport",
        isMultiAction: true,
        initialValue: teleportMode,
        actions: [
          {
            name: t("nui_menu.page_main.teleport.waypoint.title"),
            label: t("nui_menu.page_main.teleport.waypoint.label"),
            value: TeleportMode.WAYPOINT,
            icon: <PersonPinCircle />,
            onSelect: () => {
              setTeleportMode(TeleportMode.WAYPOINT);
              fetchNui("tpToWaypoint", {});
            },
          },
          {
            name: t("nui_menu.page_main.teleport.coords.title"),
            label: t("nui_menu.page_main.teleport.coords.label"),
            value: TeleportMode.COORDINATES,
            icon: <GpsFixed />,
            onSelect: () => {
              setTeleportMode(TeleportMode.COORDINATES);
              handleTeleportCoords();
            },
          },
          {
            name: t("nui_menu.page_main.teleport.back.title"),
            label: t("nui_menu.page_main.teleport.back.label"),
            value: TeleportMode.PREVIOUS,
            icon: <Restore />,
            onSelect: handleTeleportBack,
          },
          {
            name: t("nui_menu.page_main.teleport.copy.title"),
            label: t("nui_menu.page_main.teleport.copy.label"),
            value: TeleportMode.COPY,
            icon: <FileCopy />,
            onSelect: handleCopyCoords,
          },
        ],
      },

      //VEHICLE
      {
        title: t("nui_menu.page_main.vehicle.title"),
        requiredPermission: "menu.vehicle",
        isMultiAction: true,
        initialValue: vehicleMode,
        actions: [
          {
            name: t("nui_menu.page_main.vehicle.spawn.title"),
            label: t("nui_menu.page_main.vehicle.spawn.label"),
            value: VehicleMode.SPAWN,
            icon: <DirectionsCar />,
            onSelect: () => {
              setVehicleMode(VehicleMode.SPAWN);
              handleSpawnVehicle();
            },
          },
          {
            name: t("nui_menu.page_main.vehicle.fix.title"),
            label: t("nui_menu.page_main.vehicle.fix.label"),
            value: VehicleMode.FIX,
            icon: <Build />,
            onSelect: () => {
              setVehicleMode(VehicleMode.FIX);
              handleFixVehicle();
            },
          },
          {
            name: t("nui_menu.page_main.vehicle.delete.title"),
            label: t("nui_menu.page_main.vehicle.delete.label"),
            value: VehicleMode.DELETE,
            icon: <DeleteForever />,
            onSelect: () => {
              setVehicleMode(VehicleMode.DELETE);
              handleDeleteVehicle();
            },
          },
          {
            name: t("nui_menu.page_main.vehicle.boost.title"),
            label: t("nui_menu.page_main.vehicle.boost.label"),
            value: VehicleMode.BOOST,
            icon: <RocketLaunch />,
            onSelect: () => {
              setVehicleMode(VehicleMode.BOOST);
              handleBoostVehicle();
            },
          },
        ],
      },

      //HEAL
      {
        title: t("nui_menu.page_main.heal.title"),
        requiredPermission: "players.heal",
        isMultiAction: true,
        initialValue: healMode,
        actions: [
          {
            name: t("nui_menu.page_main.heal.myself.title"),
            label: t("nui_menu.page_main.heal.myself.label"),
            value: HealMode.SELF,
            icon: <Favorite />,
            onSelect: () => {
              setHealMode(HealMode.SELF);
              handleHealMyself();
            },
          },
          {
            name: t("nui_menu.page_main.heal.everyone.title"),
            label: t("nui_menu.page_main.heal.everyone.label"),
            value: HealMode.ALL,
            icon: <LocalHospital />,
            onSelect: () => {
              setHealMode(HealMode.ALL);
              handleHealAllPlayers();
            },
          },
        ],
      },

      //MISC
      {
        title: t("nui_menu.page_main.announcement.title"),
        label: t("nui_menu.page_main.announcement.label"),
        requiredPermission: "announcement",
        icon: <Announcement />,
        onSelect: handleAnnounceMessage,
      },
      {
        title: t("nui_menu.page_main.clear_area.title"),
        label: t("nui_menu.page_main.clear_area.label"),
        requiredPermission: "menu.clear_area",
        icon: <CenterFocusWeak />,
        onSelect: handleClearArea,
      },
      {
        title: t("nui_menu.page_main.player_ids.title"),
        label: t("nui_menu.page_main.player_ids.label"),
        requiredPermission: "menu.viewids",
        icon: <Groups />,
        onSelect: handleTogglePlayerIds,
      },
      // {
      //   title: "Spawn Weapon",
      //   icon: <Stream />,
      //   onSelect: handleSpawnWeapon,
      // },
    ],
    [playerMode, teleportMode, vehicleMode, healMode, serverCtx, isRedm, lastVehicleSpawned]
  );

  return (
    // add pb={2} if we don't have that arrow at the bottom
    (<Box sx={{ pointerEvents: 'none' }}>
      <StyledList>
        {menuListItems.map((item, index) =>
          item.isMultiAction ? (
            // @ts-ignore
            (<MenuListItemMulti
              key={index}
              selected={curSelected === index}
              {...item}
            />)
          ) : (
            // @ts-ignore
            (<MenuListItem
              key={index}
              selected={curSelected === index}
              {...item}
            />)
          )
        )}
      </StyledList>
      <BoxFadeTop style={{ opacity: curSelected <= 1 ? 0 : 1 }} />
      <BoxFadeBottom style={{ opacity: curSelected >= 6 ? 0 : 1 }} />
      <BoxIcon display="flex" justifyContent="center">
        <ExpandMore />
      </BoxIcon>
      {/* <Typography
        color="textSecondary"
        style={{
          fontWeight: 500,
          marginTop: -20,
          textAlign: "left",
          fontSize: 12,
        }}
      >
        v{serverCtx.txAdminVersion}
      </Typography>  */}
    </Box>)
  );
};
