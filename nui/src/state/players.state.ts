import {
  atom,
  selector,
  useRecoilState,
  useRecoilValue,
  useSetRecoilState,
} from "recoil";
import { VehicleStatus, PlayerData, LuaPlayerData } from "../hooks/usePlayerListListener";
import { debugData } from "../utils/debugData";
import cleanPlayerName from "@shared/cleanPlayerName";

export enum PlayerDataFilter {
  NoFilter = "noFilter",
  IsAdmin = "isAdmin",
  IsInjured = "isInjured",
  InVehicle = "inVehicle",
}
export enum PlayerDataSort {
  IdJoinedFirst = "idJoinedFirst",
  IdJoinedLast = "idJoinedLast",
  DistanceClosest = "distanceClosest",
  DistanceFarthest = "distanceFarthest",
}

const playersState = {
  playerData: atom<PlayerData[]>({
    default: [],
    key: "playerStates",
  }),
  playerFilterType: atom<PlayerDataFilter | null>({
    default: PlayerDataFilter.NoFilter,
    key: "playerFilterType",
  }),
  playerSortType: atom<PlayerDataSort | null>({
    default: PlayerDataSort.IdJoinedFirst,
    key: "playerSortType",
  }),
  sortedAndFilteredPlayerData: selector({
    key: "sortedAndFilteredPlayerStates",
    get: ({ get }) => {
      const filterType: PlayerDataFilter = get(playersState.playerFilterType) ?? PlayerDataFilter.NoFilter;
      const sortType: PlayerDataSort = get(playersState.playerSortType) ?? PlayerDataSort.IdJoinedFirst;
      const filteredValueInput = get(playersState.filterPlayerDataInput);
      const unfilteredPlayerStates = get(playersState.playerData) as PlayerData[];

      let searchFilter = (p: PlayerData) => true;
      const formattedInput = filteredValueInput.trim();
      if (formattedInput) {
        const searchInput = cleanPlayerName(formattedInput).pureName;
        searchFilter = (p) => {
          return p.pureName.includes(searchInput)
            || p.id.toString().includes(formattedInput)
        };
      }

      let playerFilter = (p: PlayerData) => true;
      if (filterType === PlayerDataFilter.IsAdmin) {
        playerFilter = (p) => p.admin;
      } else if (filterType === PlayerDataFilter.IsInjured) {
        playerFilter = (p) => p.health <= 20;
      } else if (filterType === PlayerDataFilter.InVehicle) {
        playerFilter = (p) => p.vType !== VehicleStatus.Walking;
      }

      const playerStates = unfilteredPlayerStates.filter((p) => {
        return searchFilter(p) && playerFilter(p);
      });

      switch (sortType) {
        case PlayerDataSort.DistanceClosest:
          // Since our distance can come back as -1 when unknown, we need to explicitly
          // move to the end of the sorted array.
          return [...playerStates].sort((a, b) => {
            if (b.dist < 0) return -1;
            if (a.dist < 0) return 1;

            return a.dist > b.dist ? 1 : -1;
          });
        case PlayerDataSort.DistanceFarthest:
          return [...playerStates].sort((a, b) => (a.dist < b.dist ? 1 : -1));
        case PlayerDataSort.IdJoinedFirst:
          return [...playerStates].sort((a, b) => (a.id > b.id ? 1 : -1));
        case PlayerDataSort.IdJoinedLast:
          return [...playerStates].sort((a, b) => (a.id < b.id ? 1 : -1));
        default:
          return playerStates;
      }
    },
  }),
  filterPlayerDataInput: atom({
    key: "filterPlayerDataInput",
    default: "",
  }),
  // If true, player data filter will reset on page switch
  filterPlayerDataIsTemp: atom({
    key: "filterPlayerDataIsTemp",
    default: false,
  }),
};

export const usePlayersState = () => useRecoilValue(playersState.playerData);

export const useSetPlayersState = () =>
  useSetRecoilState(playersState.playerData);

export const useSetPlayerFilter = () =>
  useSetRecoilState(playersState.filterPlayerDataInput);

export const useSetPlayersFilterIsTemp = () =>
  useSetRecoilState(playersState.filterPlayerDataIsTemp);

export const usePlayersSortedValue = () =>
  useRecoilValue(playersState.sortedAndFilteredPlayerData);

export const usePlayersFilterBy = () =>
  useRecoilState(playersState.playerFilterType);

export const usePlayersSortBy = () =>
  useRecoilState(playersState.playerSortType);

export const usePlayersSearch = () =>
  useRecoilState(playersState.filterPlayerDataInput);

export const usePlayersFilterIsTemp = () =>
  useRecoilState(playersState.filterPlayerDataIsTemp);

export const useFilteredSortedPlayers = (): PlayerData[] =>
  useRecoilValue(playersState.sortedAndFilteredPlayerData);

debugData<LuaPlayerData[]>(
  [
    {
      action: "setPlayerList",
      data: [
        {
          vType: VehicleStatus.Walking,
          name: "example",
          x: 200,
          y: -800,
          id: 1,
          dist: 0,
          health: 80,
          admin: false,
        },
        {
          vType: VehicleStatus.Driving,
          name: "example2",
          x: 230,
          y: -810,
          id: 2,
          dist: 20,
          health: 50,
          admin: true,
        },
        {
          vType: VehicleStatus.Boat,
          name: "example3",
          x: -1500,
          y: 4500,
          id: 3,
          dist: 700,
          health: 10,
          admin: true,
        },
      ],
    },
  ],
  750
);
