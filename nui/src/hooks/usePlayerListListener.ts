import { useEffect } from "react";
import { txAdminMenuPage, usePageValue } from "../state/page.state";
import { useNuiEvent } from "./useNuiEvent";
import { useSetPlayersState } from "../state/players.state";
import { fetchNui } from "../utils/fetchNui";
import cleanPlayerName from "@shared/cleanPlayerName";
import { debugLog } from "../utils/debugLog";

export enum VehicleStatus {
  Unknown = "unknown",
  Walking = "walking",
  Driving = "driving",
  Flying = "flying", //planes or heli
  Boat = "boating",
  Biking = "biking",
}

export interface PlayerData {
  /**
   * Players server ID
   **/
  id: number;
  /**
   * Player's display name
   **/
  displayName: string;
  /**
   * Player's name in its pure form, used for searching
   */
  pureName: string;
  /**
   * Player's vehicle status
   **/
  vType: VehicleStatus;
  /**
   * Distance in units between admin and player
   * Unknown distance due to client culling scope is passed as -1
   **/
  dist: number;
  /**
   * A non-normalized player health value
   * Integer between 0-100 or -1 if information is not available
   **/
  health: number;
  /**
   * If this player is an admin
   **/
  admin: boolean;
  /**
   * Player's world X and Y coordinate (onesync only, undefined if unknown)
   **/
  x?: number;
  y?: number;
}

export type LuaPlayerData = Omit<PlayerData, 'displayName' | 'pureName'> & { name: string };

export const usePlayerListListener = (refreshMs = 5000) => {
  const curPage = usePageValue();
  const setPlayerList = useSetPlayersState();

  useNuiEvent<LuaPlayerData[]>("setPlayerList", (playerList) => {
    const newPlayerList = playerList.map((player) => {
      let displayName = 'Unknown';
      let pureName = 'unknown';
      try {
        const res = cleanPlayerName(player.name);
        displayName = res.displayName;
        pureName = res.pureName;
      } catch (error) {
        debugLog('cleanPlayerName', error);
      }
      return {
        id: player.id,
        displayName,
        pureName,
        vType: player.vType,
        dist: player.dist,
        health: player.health,
        admin: player.admin,
        x: player.x,
        y: player.y,
      } satisfies PlayerData;
    });
    setPlayerList(newPlayerList);
  });

  useEffect(() => {
    // Since our player list is never technically unmounted,
    // we target page changes as our interval entrance technique
    if (curPage !== txAdminMenuPage.Players) return;

    // Getting detailed playerlist
    fetchNui("signalPlayersPageOpen");

    // Getting detailed playerlist periodically
    const updaterInterval = window.setInterval(() => {
      fetchNui("signalPlayersPageOpen");
    }, refreshMs);

    return () => {
      window.clearInterval(updaterInterval);
    };
  }, [curPage, refreshMs]);
};
