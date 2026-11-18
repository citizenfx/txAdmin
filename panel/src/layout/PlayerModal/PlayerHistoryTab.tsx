import { cn } from "@/lib/utils";
import { tsToLocaleDateTimeString } from "@/lib/dateTime";
import { PlayerHistoryItem } from "@shared/playerApiTypes";
import InlineCode from "@/components/InlineCode";
import { useOpenActionModal } from "@/hooks/actionModal";
import { ModalTabInner, ModalTabMessage } from "@/components/modal-tabs";


type HistoryItemProps = {
    action: PlayerHistoryItem,
    serverTime: number,
    modalOpener: (actionId: string) => void,
}

function HistoryItem({ action, serverTime, modalOpener }: HistoryItemProps) {
    let footerNote, borderColorClass, actionMessage;
    if (action.type === 'ban') {
        borderColorClass = 'border-destructive';
        actionMessage = `BANNED by ${action.author}`;
    } else if (action.type === 'warn') {
        borderColorClass = 'border-warning';
        actionMessage = `WARNED by ${action.author}`;
    }
    if (action.revokedBy) {
        borderColorClass = '';
        const revocationDate = tsToLocaleDateTimeString(action.revokedAt ?? 0, 'medium', 'short');
        footerNote = `Revoked by ${action.revokedBy} on ${revocationDate}.`;
    } else if (typeof action.exp === 'number') {
        const expirationDate = tsToLocaleDateTimeString(action.exp, 'medium', 'short');
        footerNote = (action.exp < serverTime) ? `Expired on ${expirationDate}.` : `Expires in ${expirationDate}.`;
    }

    return (
        <div
            onClick={() => { modalOpener(action.id) }}
            className={cn(
                'pl-2 border-l-4 hover:bg-muted rounded-r-sm bg-muted/30 cursor-pointer',
                borderColorClass
            )}
        >
            <div className="flex w-full justify-between">
                <strong className="text-sm text-muted-foreground">{actionMessage}</strong>
                <small className="text-right text-2xs space-x-1">
                    <InlineCode className="tracking-widest">{action.id}</InlineCode>
                    <span
                        className="opacity-75 cursor-help"
                        title={tsToLocaleDateTimeString(action.ts, 'long', 'long')}
                    >
                        {tsToLocaleDateTimeString(action.ts, 'medium', 'short')}
                    </span>
                </small>
            </div>
            <span className="text-sm">{action.reason}</span>
            {footerNote && <small className="block text-xs opacity-75">{footerNote}</small>}
        </div>
    );
}


type PlayerHistoryTabProps = {
    actionHistory: PlayerHistoryItem[],
    serverTime: number,
    refreshModalData: () => void,
}

export default function PlayerHistoryTab({ actionHistory, serverTime, refreshModalData }: PlayerHistoryTabProps) {
    const openActionModal = useOpenActionModal();

    if (!actionHistory.length) {
        return <ModalTabMessage>
            No bans/warns found.
        </ModalTabMessage>;
    }

    const doOpenActionModal = (actionId: string) => {
        openActionModal(actionId);
    }

    const reversedActionHistory = [...actionHistory].reverse();
    return (
        <ModalTabInner className="flex flex-col gap-1">
            {reversedActionHistory.map((action) => (
                <HistoryItem
                    key={action.id}
                    action={action}
                    serverTime={serverTime}
                    modalOpener={doOpenActionModal}
                />
            ))}
        </ModalTabInner>
    );
}
