import { memo, useEffect, useRef, useState } from "react";
import { useIsDarkMode } from "@/hooks/theme";
import { Button } from "@/components/ui/button";
import drawDropsTimeline, { TimelineDropsDatum } from "./drawDropsTimeline";
import { playerDropCategories } from "@/lib/playerDropCategories";
import { PlayerDropsMessage } from "./PlayerDropsGenericSubcards";
import { DrilldownRangeSelectionType } from "./PlayerDropsPage";
import './timeline.css';

export type TimelineDropsChartData = {
    displayLod: string;
    startDate: Date;
    endDate: Date;
    maxDrops: number;
    categoriesSorted: string[];
    log: TimelineDropsDatum[];
}

const ChartLabels = memo(({ categories }: { categories: string[] }) => {
    const categoriesReversed = categories.slice().reverse();
    return categoriesReversed.map((catName) => {
        return (
            <div key={catName} className="flex items-center text-sm">
                <div
                    className="size-4 mr-1 rounded-full border dark:border-0"
                    style={{
                        backgroundColor: playerDropCategories[catName].color,
                        borderColor: playerDropCategories[catName].border,
                    }}
                />
                <span className="tracking-wider">
                    {playerDropCategories[catName].label}:
                </span>
                <div className="flex-grow text-right font-semibold min-w-[3ch] text-muted-foreground">
                    <span data-category={catName} />
                </div>
            </div>
        )
    })
});

type TimelineDropsChartProps = {
    chartData: TimelineDropsChartData;
    chartName: string;
    width: number;
    height: number;
    rangeSelected: DrilldownRangeSelectionType;
    rangeSetter: (range: DrilldownRangeSelectionType) => void;
};

function TimelineDropsChart({ chartData, chartName, width, height, rangeSelected, rangeSetter }: TimelineDropsChartProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const legendRef = useRef<HTMLDivElement>(null);
    const [renderError, setRenderError] = useState('');
    const [errorRetry, setErrorRetry] = useState(0);
    const isDarkMode = useIsDarkMode();
    const margins = {
        top: 8,
        right: 8,
        bottom: 24,
        left: 42,
        axis: 1
    };

    //Redraw chart when data or size changes
    useEffect(() => {
        if (!chartData || !legendRef.current || !svgRef.current || !canvasRef.current || !width || !height) return;
        if (!chartData.log.length) return; //only in case somehow the api returned, but no data found
        try {
            console.groupCollapsed(`Drawing player ${chartName} drops:`);
            console.time(`drawDropsTimeline-${chartName}`);
            drawDropsTimeline({
                chartName,
                legendRef: legendRef.current,
                svgRef: svgRef.current,
                canvasRef: canvasRef.current,
                size: { width, height },
                rangeSelected,
                margins,
                isDarkMode,
                data: chartData,
                setRenderError,
                rangeSetter,
            });
            setErrorRetry(0);
            setRenderError('');
            console.timeEnd(`drawDropsTimeline-${chartName}`);
        } catch (error) {
            setRenderError((error as Error).message ?? 'Unknown error.');
        } finally {
            console.groupEnd();
        }
    }, [
        chartData,
        chartName,
        width,
        height,
        rangeSelected,
        rangeSetter,
        isDarkMode,
        legendRef,
        svgRef,
        canvasRef,
        renderError
    ]);

    if (!width || !height) return null;
    if (renderError) {
        return <div className="absolute inset-0 p-4 flex flex-col gap-4 items-center justify-center text-center text-lg font-mono text-destructive-inline">
            Render Error: {renderError}
            <br />
            <Button
                size={'sm'}
                variant={'outline'}
                className='text-primary'
                onClick={() => {
                    setErrorRetry(c => c + 1);
                    setRenderError('');
                }}
            >
                Retry{errorRetry ? ` (${errorRetry})` : ''}
            </Button>
        </div>
    } else if (!chartData.maxDrops) {
        return <PlayerDropsMessage message="No players disconnected from your server recently." />
    }
    return (<>
        <div
            ref={legendRef}
            style={{
                zIndex: 2,
                position: 'absolute',
                top: `12px`,
                opacity: 0,
            }}
            className="p-2 rounded-md border shadow-lg dark:bg-zinc-800/90 bg-zinc-200/90 pointer-events-none transition-all"
        >
            <ChartLabels categories={chartData.categoriesSorted} />
            <div className="change-flag w-full mt-1 bg-card/75 rounded-md border text-center text-xs tracking-wider" />
        </div>
        <svg
            ref={svgRef}
            width={width}
            height={height}
            style={{
                zIndex: 1,
                position: 'absolute',
                top: '0px',
                left: '0px',
            }}
        />
        <canvas
            ref={canvasRef}
            width={width - margins.left - margins.right}
            height={height - margins.top - margins.bottom}
            style={{
                zIndex: 0,
                position: 'absolute',
                top: `${margins.top}px`,
                left: `${margins.left}px`,
            }}
        />
    </>);
}

export default memo(TimelineDropsChart);
