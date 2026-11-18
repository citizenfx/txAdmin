import { PlayerModalPlayerData } from "@shared/playerApiTypes";
import MultiIdsList from "@/components/MultiIdsList";
import { useMemo } from "react";
import type { PlayerModalRefType } from "@/hooks/playerModal";
import { useAdminPerms } from "@/hooks/auth";
import { useBackendApi } from "@/hooks/fetch";
import type { GenericApiOkResp } from "@shared/genericApiTypes";
import { ModalTabInner } from "@/components/modal-tabs";


type PlayerIdsTabProps = {
    playerRef: PlayerModalRefType;
    player: PlayerModalPlayerData;
    refreshModalData: () => void;
}

export default function PlayerIdsTab({ playerRef, player, refreshModalData }: PlayerIdsTabProps) {
    const { hasPerm } = useAdminPerms();
    const hasRemovePerms = useMemo(() => hasPerm('players.remove_ids'), [hasPerm]);
    const removePlayerIdsApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/removeIds`,
    });

    const removePlayerIds = (ids: string[], onError: () => void) => {
        if (!ids.length) throw new Error(`No IDs selected to remove.`);
        removePlayerIdsApi({
            queryParams: playerRef,
            data: { ids },
            toastLoadingMessage: 'Deleting selected IDs/HWIDs...',
            genericHandler: {
                successMsg: 'Player IDs/HWIDs deleted!',
            },
            error: (error, toastId) => onError(),
            success: (data, toastId) => {
                if ('success' in data) {
                    refreshModalData();
                } else {
                    onError();
                }
            },
        });
    }

    return (
        <ModalTabInner className="flex flex-col gap-4">
            <MultiIdsList
                type='id'
                src='player'
                idsOnline={player.idsOnline}
                idsOffline={player.idsOffline}
                onRemoveIds={removePlayerIds}
                canRemoveIds={hasRemovePerms}
            />
            <MultiIdsList
                type='hwid'
                src='player'
                idsOnline={player.hwidsOnline}
                idsOffline={player.hwidsOffline}
                onRemoveIds={removePlayerIds}
                canRemoveIds={hasRemovePerms}
            />
        </ModalTabInner>
    );
}
