import { txToast } from "@/components/TxToaster";
import { cn, copyToClipboard } from "@/lib/utils";
import { CopyIcon, ListTodoIcon, Trash2Icon, UndoIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOpenPromptDialog } from "@/hooks/dialogs";
import { shortenId } from "@shared/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";


//MARK: Helpers
//To help ctrl+c'ing with the list selected
const InvisibleNewLine = () => <span className="opacity-0">{'\n'}</span>;

//Sort IDs prioritizing license IDs
const sortIds = (a: string, b: string) => {
    const getPriority = (id: string) => {
        if (id.startsWith('license:')) return 0;
        if (id.startsWith('license2:')) return 1;
        return 2;
    };

    const aPriority = getPriority(a);
    const bPriority = getPriority(b);

    // If same priority, sort alphabetically
    if (aPriority === bPriority) {
        return a.localeCompare(b);
    }

    // Otherwise sort by priority
    return aPriority - bPriority;
};

//Used in the compare prompt dialog
const placeholderIds = [
    'fivem:xxxxxxx',
    'license:xxxxxxxxxxxxxx',
    'discord:xxxxxxxxxxxxxxxxxx',
    'etc...',
].join('\n');
const placeholderHwids = [
    '2:xxxxxxxxxxxxxx...',
    '4:xxxxxxxxxxxxxx...',
    '5:xxxxxxxxxxxxxx...',
    'etc...',
].join('\n');


//MARK: IdLine
type IdLineProps = {
    id: string;
    displayShortenedId: boolean;
    isOnline: boolean;
    highlightOnline: boolean;
    onCopy?: () => void;
    isComparing: boolean;
    isMatch: boolean;
    isRemoving: boolean;
    isMarkedForRemoval?: boolean;
    toggleMarkRemoval?: () => void;
    disableButtons: boolean;
}

function IdLine({
    id,
    displayShortenedId,
    onCopy,
    isOnline,
    highlightOnline,
    isComparing,
    isMatch,
    isRemoving,
    isMarkedForRemoval,
    toggleMarkRemoval,
    disableButtons,
}: IdLineProps) {
    const canBeRemoved = !id.startsWith('license:') && !isOnline; // Only allow removal of old IDs
    const isBold = (isComparing && isMatch)
        || (!isComparing && !highlightOnline)
        || (!isComparing && highlightOnline && isOnline);
    return (
        <div className="relative flex justify-between items-center gap-2 group/line">
            <span
                className={cn(
                    'block px-1',
                    isBold ? 'font-semibold opacity-100' : 'opacity-50',
                    isComparing && isMatch && 'text-success-inline',
                    isMarkedForRemoval && 'line-through text-destructive-inline',
                )}
                title={displayShortenedId ? id : undefined}
            >
                {displayShortenedId ? shortenId(id, 20) : id}<InvisibleNewLine />
            </span>
            {isRemoving ? canBeRemoved && (
                <button
                    className="absolute right-0 top-0 h-full flex items-center bg-background hover:bg-background group/removal"
                    onClick={toggleMarkRemoval}
                    title={isMarkedForRemoval ? 'Undo mark for deletion' : 'Mark for deletion'}
                    disabled={disableButtons}
                >
                    {isMarkedForRemoval ? (
                        <UndoIcon className="h-4 opacity-75 group-hover:opacity-100 group-hover/removal:text-warning" />
                    ) : (
                        <XIcon className="h-4 opacity-75 group-hover:opacity-100 group-hover/removal:text-destructive" />
                    )}
                </button>
            ) : (
                <button
                    className="absolute right-0 top-0 h-full flex items-center opacity-0 group-hover/line:opacity-100 bg-background hover:bg-background group/copy transition-opacity"
                    onClick={onCopy}
                    title='Copy to clipboard'
                    disabled={disableButtons}
                >
                    <CopyIcon className="h-4 opacity-75 group-hover/copy:opacity-100 group-hover/copy:text-primary" />
                </button>
            )}
        </div>
    );
}


//MARK: IdListControls
type IdListControlsProps = {
    hasRemoveIds: boolean;
    canRemoveIds?: boolean;
    handleStartMarkRemoval: () => void;
    handleCompareIds: () => void;
    handleCopyAllIds: () => void;
    typeStr: string;
}

function IdListControls({
    hasRemoveIds,
    canRemoveIds,
    handleStartMarkRemoval,
    handleCompareIds,
    handleCopyAllIds,
    typeStr,
}: IdListControlsProps) {
    return (
        <>
            {hasRemoveIds && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={handleStartMarkRemoval}
                            disabled={!canRemoveIds}
                        >
                            <Trash2Icon className={cn(
                                'h-5 opacity-50',
                                canRemoveIds ? 'hover:opacity-100 hover:text-primary' : 'opacity-35'
                            )} />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent className={cn(!canRemoveIds && 'text-destructive-inline text-center')}>
                        {canRemoveIds ? (
                            <p>{`Mark ${typeStr}s for deletion.`}</p>
                        ) : (
                            <p>
                                You do not have the permission <br />
                                required to remove {typeStr}s
                            </p>
                        )}
                    </TooltipContent>
                </Tooltip>
            )}
            <Tooltip>
                <TooltipTrigger asChild>
                    <button onClick={handleCompareIds}>
                        <ListTodoIcon className="h-6 opacity-50 hover:opacity-100 hover:text-primary" />
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    Compare {typeStr}s
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button onClick={handleCopyAllIds}>
                        <CopyIcon className="h-5 opacity-50 hover:opacity-100 hover:text-primary" />
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    Copy all {typeStr}s
                </TooltipContent>
            </Tooltip>
        </>
    )
}


//MARK: Main Component
type ActionFeedback = {
    msg: string;
    type: 'green' | 'yellow' | 'red';
}

type MultiIdsListProps = {
    idsOnline?: string[];
    idsOffline: string[];
    type: 'hwid' | 'id';
    src: 'player' | 'action';
    isHwids?: boolean;
    onRemoveIds?: (
        ids: string[],
        onError: () => void,
    ) => void;
    canRemoveIds?: boolean;
}

export default function MultiIdsList({ idsOnline, idsOffline, type, src, onRemoveIds, canRemoveIds }: MultiIdsListProps) {
    const openPromptDialog = useOpenPromptDialog();
    const divRef = useRef<HTMLDivElement>(null);
    const msgRef = useRef<any>(null);
    const [compareMatches, setCompareMatches] = useState<string[] | null>(null);
    const [markedForRemoval, setMarkedForRemoval] = useState<string[] | null>(null);
    const [actionFeedback, setActionFeedback] = useState<ActionFeedback | false>(false);
    const [isCommittingDeletions, setIsCommittingDeletions] = useState(false);

    const handleClearState = () => {
        setCompareMatches(null);
        setMarkedForRemoval(null);
        setActionFeedback(false);
        setIsCommittingDeletions(false);
    }

    const hasAnyIdAvailable = idsOnline?.length || idsOffline.length;
    const hasAnyIdOnline = Array.isArray(idsOnline) && !!idsOnline.length;
    const allIds = useMemo(() => {
        const ids: string[] = [];
        idsOnline?.slice().sort(sortIds).forEach((id) => {
            if (!ids.includes(id)) ids.push(id);
        });
        idsOffline.slice().sort(sortIds).forEach((id) => {
            if (!ids.includes(id)) ids.push(id);
        });
        return ids;
    }, [idsOnline, idsOffline]);

    const isHwids = type === 'hwid';
    const typeStr = isHwids ? 'HWID' : 'ID';
    const getPluralizedType = (count: number) => count === 1 ? typeStr : `${typeStr}s`;
    const emptyMessage = `This ${src} has no ${typeStr}s.`;
    const isInCompareMode = Array.isArray(compareMatches);
    const isCompareIdMatch = (id: string) => isInCompareMode && compareMatches.includes(id);
    const isInRemovalMode = Array.isArray(markedForRemoval);
    const isMarkedForRemoval = (id: string) => isInRemovalMode && markedForRemoval.includes(id);

    useEffect(() => {
        msgRef.current?.classList.remove('animate-toastbar-leave');
        msgRef.current?.classList.add('animate-toastbar-enter');
        if (actionFeedback) {
            const timer1 = setTimeout(() => {
                msgRef.current?.classList.remove('animate-toastbar-enter');
                msgRef.current?.classList.add('animate-toastbar-leave');
            }, 2500);
            const timer2 = setTimeout(() => {
                setActionFeedback(false);
            }, 2750);

            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
            };
        } else {

        }
    }, [actionFeedback, isInCompareMode, isInRemovalMode]);


    const handleStartMarkRemoval = () => {
        if (!hasAnyIdAvailable) {
            txToast.warning(`There are no ${typeStr}s to remove.`);
            return;
        }
        if (!idsOffline.length) {
            txToast.warning(`You can only remove ${typeStr}s not being used by this player right now, and all the ${typeStr}s in the list are currently being used.`);
            return;
        }
        setMarkedForRemoval([]);
    }

    const toggleMarkRemoval = (id: string) => {
        console.log(`toggleMarkRemoval(${id})`, markedForRemoval);
        if (!isInRemovalMode) return;
        setMarkedForRemoval((prev) => {
            if (!prev) return [id];
            if (prev.includes(id)) {
                return prev.filter((i) => i !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleCommitRemoval = () => {
        if (!onRemoveIds || !isInRemovalMode || !markedForRemoval?.length) return;
        setActionFeedback({
            msg: 'saving...',
            type: 'yellow',
        });
        setIsCommittingDeletions(true);
        onRemoveIds(markedForRemoval, () => {
            //We don't need to handle success cases because the modal refreshes
            setIsCommittingDeletions(false);
            setActionFeedback({
                msg: 'Error:(',
                type: 'red',
            });
        });
    }

    const handleCompareIds = () => {
        openPromptDialog({
            title: `Compare ${typeStr}s`,
            message: <p>
                Paste in a list of {typeStr}s to compare with the current list. <br />
                Separate each {typeStr} with a new line or comma.
            </p>,
            placeholder: isHwids ? placeholderHwids : placeholderIds,
            submitLabel: 'Compare',
            required: true,
            isMultiline: true,
            isWide: true,
            onSubmit: (input) => {
                const cleanIds = input
                    .split(/[\n\s,;]+/)
                    .map((id) => id.trim())
                    .filter((id) => id.length && allIds.includes(id));
                setCompareMatches(cleanIds);
            }
        });
    };

    const handleCopyString = (strToCopy: string) => {
        if (!divRef.current) throw new Error(`divRef.current undefined`);
        copyToClipboard(strToCopy, divRef.current).then((res) => {
            if (res !== false) {
                setActionFeedback({
                    msg: 'Copied!',
                    type: 'green',
                });
            } else {
                txToast.error('Failed to copy to clipboard :(');
            }
        }).catch((error) => {
            txToast.error({
                title: 'Failed to copy to clipboard:',
                msg: error.message,
            });
            setActionFeedback({
                msg: 'Error :(',
                type: 'red',
            });
        });
    }

    const handleCopyAllIds = () => {
        if (!divRef.current) throw new Error(`divRef.current undefined`);
        if (!hasAnyIdAvailable) return;
        handleCopyString(allIds.join('\r\n'));
    }
    const handleCopySingleId = (id: string) => {
        if (!divRef.current) throw new Error(`divRef.current undefined`);
        if (!id) return;
        handleCopyString(id);
    }

    return <div>
        <div className="flex justify-between items-center pb-1" ref={divRef}>
            <h3 className="text-xl">
                {isHwids ? 'Hardware IDs' : 'Player Identifiers'}
                {isInCompareMode && compareMatches.length ? (
                    <span className="ml-2 text-sm font-normal italic text-success-inline">
                        ({compareMatches.length} matches found)
                    </span>
                ) : null}
            </h3>
            <div
                className={cn(
                    'w-24 min-h-6 flex justify-end gap-2.5',
                    !hasAnyIdAvailable && 'hidden'
                )}
            >
                {actionFeedback ? (
                    <span
                        ref={msgRef}
                        className={cn(
                            "w-full text-right text-sm select-none pointer-events-none",
                            actionFeedback.type === 'green' && "text-success-inline",
                            actionFeedback.type === 'yellow' && "text-warning-inline",
                            actionFeedback.type === 'red' && "text-destructive-inline",
                        )}
                    >
                        {actionFeedback.msg}
                    </span>
                ) : isInCompareMode ? (
                    <span
                        ref={msgRef}
                        onClick={handleClearState}
                        className={cn(
                            "w-full text-right text-sm select-none cursor-pointer"
                        )}
                    >
                        Clear<XIcon className="inline h-5" />
                    </span>
                ) : isInRemovalMode ? (
                    <span
                        ref={msgRef}
                        onClick={handleClearState}
                        className={cn(
                            "w-full text-right text-sm select-none cursor-pointer"
                        )}
                    >
                        Cancel<XIcon className="inline h-5" />
                    </span>
                ) : (
                    <IdListControls
                        hasRemoveIds={!!onRemoveIds}
                        canRemoveIds={canRemoveIds}
                        handleStartMarkRemoval={handleStartMarkRemoval}
                        handleCompareIds={handleCompareIds}
                        handleCopyAllIds={handleCopyAllIds}
                        typeStr={typeStr}
                    />
                )}
            </div>
        </div>
        <div className="relative border rounded">
            <p className='font-mono break-all whitespace-pre-wrap rounded-[inherit] overflow-hidden divide-y divide-border/50 text-muted-foreground text-xs leading-6 tracking-wider'>
                {!hasAnyIdAvailable && <span className="block px-1 opacity-50 italic">{emptyMessage}</span>}
                {allIds.map((id) => (
                    <IdLine
                        key={id}
                        id={id}
                        displayShortenedId={isHwids}
                        onCopy={() => handleCopySingleId(id)}
                        isOnline={idsOnline?.includes(id) ?? false}
                        highlightOnline={hasAnyIdOnline}
                        isComparing={isInCompareMode}
                        isMatch={isCompareIdMatch(id)}
                        isRemoving={isInRemovalMode}
                        isMarkedForRemoval={isMarkedForRemoval(id)}
                        toggleMarkRemoval={() => toggleMarkRemoval(id)}
                        disableButtons={isCommittingDeletions}
                    />
                ))}
                {isInRemovalMode && (
                    <div className="px-2 py-1 flex flex-wrap justify-center xs:justify-between items-center gap-2 bg-destructive text-destructive-foreground font-sans text-xs leading-6 tracking-wider select-none">
                        <span
                            className={cn(
                                'block font-semibold my-[1px]'
                            )}
                        >
                            {markedForRemoval.length
                                ? `Permanently delete ${markedForRemoval.length} ${getPluralizedType(markedForRemoval.length)}?`
                                : 'Click above to mark IDs for deletion.'}
                        </span>
                        <button
                            className={cn(
                                'px-1 border border-transparent hover:bg-background hover:border-background rounded-lg',
                                markedForRemoval.length ? 'block' : 'hidden',
                                isCommittingDeletions && 'opacity-50 cursor-progress'
                            )}
                            onClick={handleCommitRemoval}
                            title={`Confirm removal of marked ${typeStr}s.`}
                            disabled={isCommittingDeletions}
                        >
                            {isCommittingDeletions ? 'saving...' : 'Confirm & Delete'}
                        </button>
                    </div>
                )}
            </p>
            {isInCompareMode && !compareMatches.length && (
                <>
                    <div className="absolute inset-0 dark:bg-black/25 rounded-[inherit] backdrop-blur-sm flex items-center justify-center p-4">
                        <span className="text-xl tracking-wider text-warning-inline">No matching {typeStr} found.</span>
                    </div>
                </>
            )}
        </div>
    </div>
}
