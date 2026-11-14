import { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ScrollArea } from '@/components/ui/scroll-area';
import TxAnchor from '@/components/TxAnchor';
import { cn } from '@/lib/utils';
import { convertRowDateTime, msToShortDuration } from '@/lib/dateTime';
import { TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2Icon, ShieldCheckIcon, ActivitySquareIcon, FileTextIcon } from 'lucide-react';
import { useOpenPlayerModal } from "@/hooks/playerModal";
import { PlayersTableSearchResp, PlayersTableFiltersType, PlayersTableSearchType, PlayersTableSortingType, PlayersTablePlayerType } from '@shared/playerApiTypes';
import { useBackendApi } from '@/hooks/fetch';


/**
 * Player row
 */
type PlayerRowProps = {
    rowData: PlayersTablePlayerType;
    modalOpener: ReturnType<typeof useOpenPlayerModal>;
}

function PlayerRow({ rowData, modalOpener }: PlayerRowProps) {
    const openModal = () => {
        modalOpener({ license: rowData.license });
    }

    return (
        <TableRow onClick={openModal} className='cursor-pointer'>
            <TableCell className={'px-4 py-2 flex justify-between border-r'}>
                <span className='text-ellipsis overflow-hidden line-clamp-1 break-all'>
                    {rowData.displayName}
                </span>
                <div className='hidden md:inline-flex items-center gap-1'>
                    <ActivitySquareIcon className={cn('h-5',
                        rowData.isOnline ? 'text-success-inline animate-pulse' : 'text-muted'
                    )} />
                    <ShieldCheckIcon className={cn('h-5',
                        rowData.isAdmin ? 'text-warning-inline' : 'text-muted'
                    )} />
                    <FileTextIcon className={cn('h-5',
                        rowData.notes ? 'text-secondary-foreground' : 'text-muted'
                    )} />
                </div>
            </TableCell>
            <TableCell className='min-w-[8rem] px-4 py-2 border-r'>{msToShortDuration(rowData.playTime * 60_000)}</TableCell>
            <TableCell className='min-w-[10rem] px-4 py-2 border-r'>{convertRowDateTime(rowData.tsJoined)}</TableCell>
            <TableCell className='min-w-[10rem] px-4 py-2'>{convertRowDateTime(rowData.tsLastConnection)}</TableCell>
        </TableRow>
    )
}

/**
 * Last row
 */
type LastRowProps = {
    playersCount: number;
    hasReachedEnd: boolean;
    loadError: string | null;
    isFetching: boolean;
    retryFetch: (_reset?: boolean) => Promise<void>;
}

function LastRow({ playersCount, hasReachedEnd, isFetching, loadError, retryFetch }: LastRowProps) {
    let content: React.ReactNode;
    if (isFetching) {
        content = <Loader2Icon className="mx-auto animate-spin" />
    } else if (loadError) {
        content = <>
            <span className='text-destructive-inline'>Error: {loadError}</span><br />
            <button className='underline' onClick={() => retryFetch()}>Try again?</button>
        </>
    } else if (hasReachedEnd) {
        content = <span className='font-bold text-muted-foreground'>
            {playersCount ? 'You have reached the end of the list.' : 'No players found.'}
        </span>
    } else {
        content = <span>
            You've found the end of the rainbow, but there's no pot of gold here. <br />
            <i>(this is a bug, please report it in <TxAnchor href="https://txadmin.gg/discord" target="_blank" rel="noopener noreferrer">txadmin.gg/discord</TxAnchor>)</i>
        </span>
    }

    return (
        <TableRow>
            <TableCell colSpan={4} className='px-4 py-2 text-center'>
                {content}
            </TableCell>
        </TableRow>
    )
}


/**
 * Sortable table header
 */
type SortableTableHeaderProps = {
    label: string;
    sortKey: 'playTime' | 'tsJoined' | 'tsLastConnection';
    sortingState: PlayersTableSortingType;
    setSorting: (newState: PlayersTableSortingType) => void;
    className?: string;
}

function SortableTableHeader({ label, sortKey, sortingState, setSorting, className }: SortableTableHeaderProps) {
    const isSorted = sortingState.key === sortKey;
    const isDesc = sortingState.desc;
    const sortIcon = isSorted ? (isDesc ? '▼' : '▲') : <></>;
    const onClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        e.preventDefault();
        setSorting({
            key: sortKey,
            desc: isSorted ? (!isDesc) : true
        });
    }
    return (
        <th
            onClick={onClick}
            className={cn(
                'py-2 px-4 text-left font-light tracking-wider cursor-pointer hover:bg-zinc-300 hover:dark:bg-zinc-600',
                isSorted && 'font-medium dark:bg-zinc-700',
                className,
            )}
        >
            {label}
            <div className='ml-1 min-w-[2ch] inline-block'>{sortIcon}</div>
        </th>
    )
}


/**
 * Players table
 */
type PlayersTableProps = {
    search: PlayersTableSearchType;
    filters: PlayersTableFiltersType;
}

export default function PlayersTable({ search, filters }: PlayersTableProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [players, setPlayers] = useState<PlayersTablePlayerType[]>([]);
    const [hasReachedEnd, setHasReachedEnd] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [sorting, setSorting] = useState<PlayersTableSortingType>({ key: 'tsJoined', desc: true });
    const [isResetting, setIsResetting] = useState(false);
    const openPlayerModal = useOpenPlayerModal();

    const playerListingApi = useBackendApi<PlayersTableSearchResp>({
        method: 'GET',
        path: '/player/search',
        abortOnUnmount: true,
    });

    const fetchNextPage = async (resetOffset?: boolean) => {
        setIsFetching(true);
        setLoadError(null);
        if (resetOffset) {
            setIsResetting(true);
        }
        const handleError = (error: string) => {
            setLoadError(error);
            if (resetOffset) {
                setPlayers([]);
            }
        }
        try {
            const queryParams: { [key: string]: string | number | boolean } = {
                sortingKey: sorting.key,
                sortingDesc: sorting.desc,
            };
            if (search.value) {
                queryParams.searchValue = search.value;
                queryParams.searchType = search.type;
            }
            if (filters.length) {
                queryParams.filters = filters.join(',');
            }
            if (!resetOffset && players.length) {
                queryParams.offsetParam = players[players.length - 1][sorting.key];
                queryParams.offsetLicense = players[players.length - 1].license;
            }
            const resp = await playerListingApi({ queryParams });

            //Dealing with errors
            if (resp === undefined) {
                return handleError(`Request failed.`);
            } else if ('error' in resp) {
                return handleError(`Request failed: ${resp.error}`);
            }

            //Setting the states
            setLoadError(null);
            setHasReachedEnd(resp.hasReachedEnd);
            setIsResetting(false);
            if (resp.players.length) {
                setPlayers((prev) => resetOffset ? resp.players : [...prev, ...resp.players]);
            } else {
                setPlayers([]);
            }
        } catch (error) {
            handleError(`Failed to fetch more data: ${(error as Error).message}`);
        } finally {
            setIsFetching(false);
            setIsResetting(false);
        }
    };

    // The virtualizer
    const rowVirtualizer = useVirtualizer({
        isScrollingResetDelay: 0,
        count: players.length + 1,
        getScrollElement: () => (scrollRef.current as HTMLDivElement)?.getElementsByTagName('div')[0],
        estimateSize: () => 38, // border-b
        overscan: 25,
    });
    const virtualItems = rowVirtualizer.getVirtualItems();
    const virtualizerTotalSize = rowVirtualizer.getTotalSize();

    //NOTE: This is required due to how css works on tables
    //ref: https://github.com/TanStack/virtual/issues/585
    let TopRowPad: React.ReactNode = null;
    let BottomRowPad: React.ReactNode = null;
    if (virtualItems.length > 0) {
        const padStart = virtualItems[0].start - rowVirtualizer.options.scrollMargin;
        if (padStart > 0) {
            TopRowPad = <tr><td colSpan={3} style={{ height: padStart }} /></tr>;
        }
        const padEnd = virtualizerTotalSize - virtualItems[virtualItems.length - 1].end;
        if (padEnd > 0) {
            BottomRowPad = <tr><td colSpan={3} style={{ height: padEnd }} /></tr>;
        }
    }

    // Automagically fetch next page when reaching the end
    useEffect(() => {
        if (!players.length || !virtualItems.length) return;
        const lastVirtualItemIndex = virtualItems[virtualItems.length - 1].index;
        if (players.length <= lastVirtualItemIndex && !hasReachedEnd && !isFetching) {
            fetchNextPage()
        }
    }, [players, virtualItems, hasReachedEnd, isFetching]);

    //on state change, reset the list
    useEffect(() => {
        rowVirtualizer.scrollToIndex(0);
        fetchNextPage(true);
    }, [search, filters, sorting]);


    return (
        <div
            className="w-full max-h-full min-h-96 overflow-auto border md:rounded-lg"
            style={{ overflowAnchor: "none" }}
        >
            {/* <div
                className='w-full bg-black p-2'
                style={{ color: createRandomHslColor() }}
            >{JSON.stringify({ search, filters, sorting })}</div> */}
            <ScrollArea className="h-full" ref={scrollRef}>
                <table className='w-full caption-bottom text-sm select-none'>
                    <TableHeader>
                        <tr className='sticky top-0 z-10 bg-zinc-200 dark:bg-muted text-secondary-foreground text-base shadow-md transition-colors'>
                            <th className='py-2 px-4 font-light tracking-wider text-left text-muted-foreground'>
                                Display Name
                            </th>
                            <SortableTableHeader
                                label='Play Time'
                                sortKey='playTime'
                                sortingState={sorting}
                                setSorting={setSorting}
                            />
                            <SortableTableHeader
                                label='First Joined'
                                sortKey='tsJoined'
                                sortingState={sorting}
                                setSorting={setSorting}
                            />
                            <SortableTableHeader
                                label='Last Connection'
                                sortKey='tsLastConnection'
                                sortingState={sorting}
                                setSorting={setSorting}
                            />
                        </tr>
                    </TableHeader>
                    <TableBody className={cn(isResetting && 'opacity-25')}>
                        {TopRowPad}
                        {virtualItems.map((virtualItem) => {
                            const isLastRow = virtualItem.index > players.length - 1;
                            return isLastRow ? (
                                <LastRow
                                    key={virtualItem.key}
                                    playersCount={players.length}
                                    hasReachedEnd={hasReachedEnd}
                                    loadError={loadError}
                                    isFetching={isFetching}
                                    retryFetch={fetchNextPage}
                                />
                            ) : (
                                <PlayerRow
                                    key={virtualItem.key}
                                    rowData={players[virtualItem.index]}
                                    modalOpener={openPlayerModal}
                                />
                            )
                        })}
                        {BottomRowPad}
                    </TableBody>
                </table>
            </ScrollArea>
        </div>
    );
}
