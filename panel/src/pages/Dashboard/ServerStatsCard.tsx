import { GaugeIcon, Loader2Icon, MemoryStickIcon, TimerIcon, TrendingUpIcon } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { dashPerfCursorAtom, dashServerStatsAtom, dashSvRuntimeAtom, useGetDashDataAge } from './dashboardHooks';
import { cn } from '@/lib/utils';
import { dateToLocaleDateString, dateToLocaleTimeString, isDateToday } from '@/lib/dateTime';

//NOTE: null and undefined are semantically equal here
type HostStatsDataProps = {
    uptimePct: number | null | undefined;
    medianPlayerCount: number | null | undefined;
    fxsMemory: number | null | undefined;
    nodeMemory: {
        used: number;
        limit: number;
    } | null | undefined;
};

const HostStatsData = memo(({ uptimePct, medianPlayerCount, fxsMemory, nodeMemory }: HostStatsDataProps) => {
    const uptimePart = uptimePct ? uptimePct.toFixed(2) + '%' : '--';
    const medianPlayerPart = medianPlayerCount ? Math.ceil(medianPlayerCount) : '--';
    const fxsPart = fxsMemory ? fxsMemory.toFixed(2) + 'MB' : '--';

    let nodeCustomClass = null;
    let nodePart: React.ReactNode = '--';
    if (nodeMemory) {
        const nodeMemoryUsage = Math.ceil(nodeMemory.used / nodeMemory.limit * 100);
        nodePart = nodeMemory.used.toFixed(2) + 'MB' + ' (' + nodeMemoryUsage + '%)';
        if (nodeMemoryUsage > 85) {
            nodeCustomClass = 'text-destructive';
        } else if (nodeMemoryUsage > 70) {
            nodeCustomClass = 'text-warning';
        }
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-4 h-full pb-2 text-muted-foreground">
            <div className="flex items-center">
                <TimerIcon className="hidden sm:block sm:size-6 md:size-12 mr-2 opacity-75" />
                <div className="flex flex-col mr-auto ml-auto sm:mr-0 sm:ml-auto">
                    <span className="text-center sm:text-right text-xl text-primary">{uptimePart}</span>
                    <span className="text-center sm:text-right text-sm">Uptime 24h</span>
                </div>
            </div>
            <div className="flex items-center">
                <TrendingUpIcon className="hidden sm:block sm:size-6 md:size-12 mr-2 opacity-75" />
                <div className="flex flex-col mr-auto ml-auto sm:mr-0 sm:ml-auto">
                    <span className="text-center sm:text-right text-xl text-primary">{medianPlayerPart}</span>
                    <span className="text-center sm:text-right text-sm">Median Players 24h</span>
                </div>
            </div>
            <div className="flex items-center">
                <MemoryStickIcon className="hidden sm:block sm:size-6 md:size-12 mr-2 opacity-75" />
                <div className="flex flex-col mr-auto ml-auto sm:mr-0 sm:ml-auto">
                    <span className="text-center sm:text-right text-xl text-primary">{fxsPart}</span>
                    <span className="text-center sm:text-right text-sm">FXServer Memory</span>
                </div>
            </div>
            <div
                className={cn("flex items-center", nodeCustomClass ?? 'text-muted-foreground')}
                title={nodeMemory ? `${nodeMemory.used.toFixed(2)}MB / ${nodeMemory.limit}MB` : ''}
            >
                <MemoryStickIcon className="hidden sm:block sm:size-6 md:size-12 mr-2 opacity-75" />
                <div className="flex flex-col mr-auto ml-auto sm:mr-0 sm:ml-auto">
                    <span className={cn("text-center sm:text-right text-xl", nodeCustomClass ?? 'text-primary')}>
                        {nodePart}
                    </span>
                    <span className="text-center sm:text-right text-sm">Node.js Memory</span>
                </div>
            </div>
        </div>
    );
});


export default function ServerStatsCard() {
    const pastStatsData = useAtomValue(dashServerStatsAtom);
    const svRuntimeData = useAtomValue(dashSvRuntimeAtom);
    const perfCursorData = useAtomValue(dashPerfCursorAtom);
    const getDashDataAge = useGetDashDataAge();

    const displayData = useMemo(() => {
        //Data availability & age check
        const dataAge = getDashDataAge();
        if (!svRuntimeData || dataAge.isExpired) return null;

        if (perfCursorData && perfCursorData.snap) {
            const timeStr = dateToLocaleTimeString(perfCursorData.snap.end, '2-digit', '2-digit');
            const dateStr = dateToLocaleDateString(perfCursorData.snap.end, 'short');
            const titleTimeIndicator = isDateToday(perfCursorData.snap.end) ? timeStr : `${timeStr} - ${dateStr}`;
            return {
                fxsMemory: perfCursorData.snap.fxsMemory,
                nodeMemory: svRuntimeData.nodeMemory && perfCursorData.snap.nodeMemory ? {
                    used: perfCursorData.snap.nodeMemory,
                    limit: svRuntimeData.nodeMemory.limit,
                } : null,
                titleTimeIndicator: (<>
                    (<span className="text-xs text-warning-inline font-mono">{titleTimeIndicator}</span>)
                </>)
            };
        } else {
            return {
                fxsMemory: svRuntimeData.fxsMemory,
                nodeMemory: svRuntimeData.nodeMemory,
                titleTimeIndicator: dataAge.isStale ? '(minutes ago)' : '(live)',
            };
        }
    }, [svRuntimeData, perfCursorData]);

    //Rendering
    let titleNode: React.ReactNode = null;
    let contentNode: React.ReactNode = null;
    if (displayData) {
        titleNode = displayData.titleTimeIndicator;
        contentNode = <HostStatsData
            fxsMemory={displayData.fxsMemory}
            medianPlayerCount={pastStatsData?.medianPlayerCount}
            uptimePct={pastStatsData?.uptimePct}
            nodeMemory={displayData.nodeMemory}
        />;
    } else {
        contentNode = (
            <div className="size-full flex flex-col items-center justify-center">
                <Loader2Icon className="animate-spin size-16 text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="col-span-3 sm:col-span-1 3xl:col-span-2 min-w-52 py-2 px-4 flex flex-col md:rounded-xl border shadow-sm bg-card">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 text-muted-foreground">
                <h3 className="tracking-tight text-sm font-medium line-clamp-1">
                    Server stats {titleNode}
                </h3>
                <div className='hidden xs:block'><GaugeIcon /></div>
            </div>
            {contentNode}
        </div>
    );
}
