import { usePushPlayerDropEvent } from "@/pages/Dashboard/dashboardHooks";
import { PlayerlistEventType, PlayerlistPlayerType } from "@shared/socketioTypes";
import { atom, useSetAtom } from "jotai";


/**
 * Atoms
 */
export const playerlistAtom = atom<PlayerlistPlayerType[]>([]);
export const playerCountAtom = atom((get) => get(playerlistAtom).length);
export const serverMutexAtom = atom<string | null>(null);


/**
 * Hooks
 */
export const useProcessPlayerlistEvents = () => {
    const pushPlayerDropEvent = usePushPlayerDropEvent();
    const setPlayerlist = useSetAtom(playerlistAtom);
    const setServerMutex = useSetAtom(serverMutexAtom);

    return (events: PlayerlistEventType[]) => {
        //If there is a fullPlayerlist, skip everything before it
        const fullListIndex = events.findIndex(e => e.type === 'fullPlayerlist');
        if (fullListIndex > 0) events = events.slice(fullListIndex);

        //Process events
        for (const event of events) {
            if (event.type === 'fullPlayerlist') {
                setPlayerlist(event.playerlist);
                setServerMutex(event.mutex);
            } else if (event.type === 'playerJoining') {
                setPlayerlist((oldList) => [...oldList, event]);
            } else if (event.type === 'playerDropped') {
                setPlayerlist((oldList) => oldList.filter(p => p.netid !== event.netid));
                if (event.reasonCategory) pushPlayerDropEvent(event.reasonCategory);
            } else if (event.type === 'playerNameChanged') {
                setPlayerlist((oldList) => oldList.map((p) => {
                    if (p.netid !== event.netid) return p;
                    return { ...p, displayName: event.displayName, pureName: event.pureName };
                }));
            } else {
                console.error('Unknown playerlist event type', event);
            }
        }
    }
};

//Getter for the server mutex
// const getCurrentMutex = useAtomCallback(
//     useCallback((get) => {
//         return get(serverMutexAtom)
//     }, []),
// );
