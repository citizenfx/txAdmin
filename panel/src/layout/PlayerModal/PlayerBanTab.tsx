import { Button } from "@/components/ui/button";
import { useAdminPerms } from "@/hooks/auth";
import { PlayerModalRefType, useClosePlayerModal } from "@/hooks/playerModal";
import { Loader2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { useBackendApi } from "@/hooks/fetch";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import type { BanTemplatesDataType } from "@shared/otherTypes";
import BanForm, { BanFormType } from "@/components/BanForm";
import { txToast } from "@/components/TxToaster";
import { ModalTabInner, ModalTabMessage } from "@/components/modal-tabs";


type PlayerBanTabProps = {
    banTemplates: BanTemplatesDataType[];
    playerRef: PlayerModalRefType;
};

export default function PlayerBanTab({ playerRef, banTemplates }: PlayerBanTabProps) {
    const banFormRef = useRef<BanFormType>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { hasPerm } = useAdminPerms();
    const closeModal = useClosePlayerModal();
    const playerBanApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/ban`,
        throwGenericErrors: true,
    });

    if (!hasPerm('players.ban')) {
        return <ModalTabMessage>
            You don't have permission to ban players.
        </ModalTabMessage>;
    }

    const handleSave = () => {
        if (!banFormRef.current) return;
        const { reason, duration } = banFormRef.current.getData();

        if (!reason || reason.length < 3) {
            txToast.warning(`The reason must be at least 3 characters long.`);
            banFormRef.current.focusReason();
            return;
        }

        setIsSaving(true);
        playerBanApi({
            queryParams: playerRef,
            data: {reason, duration},
            toastLoadingMessage: 'Banning player...',
            genericHandler: {
                successMsg: 'Player banned.',
            },
            finally: () => setIsSaving(false),
            success: () => closeModal(),
        });
    };

    return (
        <ModalTabInner className="grid gap-4">
            <BanForm
                ref={banFormRef}
                banTemplates={banTemplates}
                disabled={isSaving}
                onNavigateAway={() => { closeModal(); }}
            />
            <div className="flex place-content-end">
                <Button
                    size="sm"
                    variant="destructive"
                    disabled={isSaving}
                    onClick={handleSave}
                >
                    {isSaving ? (
                        <span className="flex items-center leading-relaxed">
                            <Loader2Icon className="inline animate-spin h-4" /> Banning...
                        </span>
                    ) : 'Apply Ban'}
                </Button>
            </div>
        </ModalTabInner>
    );
}
