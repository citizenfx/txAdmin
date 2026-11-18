import * as d3 from 'd3';
import { numberToLocaleString } from '@/lib/utils';
import { msToShortDuration } from '@/lib/dateTime';
import { playerDropCategories } from "@/lib/playerDropCategories";
import { PlayerDropsCategoryCount } from './chartingUtils';
import { TimelineDropsChartData } from './TimelineDropsChart';
import { DrilldownRangeSelectionType } from './PlayerDropsPage';


//Helpers
const translate = (x: number, y: number) => `translate(${x}, ${y})`;

export type TimelineDropsDatum = {
    startDate: Date;
    changes: number;
    drops: PlayerDropsCategoryCount[];
}

type drawDropsTimelineProps = {
    legendRef: HTMLDivElement;
    svgRef: SVGElement;
    canvasRef: HTMLCanvasElement;
    setRenderError: (error: string) => void;
    size: {
        width: number;
        height: number;
    };
    rangeSelected: DrilldownRangeSelectionType;
    rangeSetter: (range: DrilldownRangeSelectionType) => void;
    margins: {
        top: number;
        right: number;
        bottom: number;
        left: number;
        axis: number;
    };
    isDarkMode: boolean;
    chartName: string;
    data: TimelineDropsChartData,
};

export default function drawDropsTimeline({
    legendRef,
    svgRef,
    canvasRef,
    setRenderError,
    size: { width, height },
    rangeSelected,
    rangeSetter,
    margins,
    isDarkMode,
    chartName,
    data,
}: drawDropsTimelineProps) {
    //Clear SVG
    d3.select(svgRef).selectAll('*').remove(); // FIXME: Clear SVG

    //Setup selectors
    const svg = d3.select<SVGElement, TimelineDropsDatum>(svgRef);
    if (svg.empty()) throw new Error('SVG selection failed.');
    const canvas = d3.select(canvasRef)!;
    if (canvas.empty()) throw new Error('Canvas selection failed.');
    if (!canvasRef?.getContext) {
        throw new Error(`Canvas not supported.`);
    }

    let isFirstRender = true;
    console.log('From:', data.startDate.toISOString());
    console.log('To:', data.endDate.toISOString());
    console.log('Window:', msToShortDuration(data.startDate.getTime() - data.endDate.getTime()));
    console.log('Number of intervals:', data.log.length);

    //Setup
    const drawableAreaHeight = height - margins.top - margins.bottom;
    const drawableAreaWidth = width - margins.left - margins.right;
    console.log('Drawable area:', drawableAreaWidth, drawableAreaHeight);

    const chartGroup = svg.append('g')
        .attr('transform', translate(margins.left, margins.top))
        .attr('class', 'interaction-chart')
        .attr('data-selected', 'false');
    const chartGroupData = chartGroup.node()?.dataset;


    //Scales
    const timeScale = d3.scaleTime(
        [data.startDate, data.endDate],
        [0, drawableAreaWidth],
    );
    const countsScaleMaxDomain = data.maxDrops < 10 ? data.maxDrops + 1 : data.maxDrops;
    const countsScale = d3.scaleLinear(
        [0, countsScaleMaxDomain],
        [height - margins.bottom, margins.top],
    );


    //Axis
    const timeAxisTicksScale = d3.scaleLinear([382, 1350], [7, 16]);
    const timeAxis = d3.axisBottom(timeScale)
        .ticks(timeAxisTicksScale(width))
    // .tickFormat(d => d && dateToLocaleTimeString(d as Date, 'numeric', '2-digit'));
    // .tickFormat(d3.timeFormat('%H:%M'));
    const timeAxisGroup = chartGroup.append("g")
        .attr('transform', translate(0, drawableAreaHeight))
        .attr('class', 'time-axis')
        .call(timeAxis);

    const countsAxisTickValues = (countsScaleMaxDomain <= 7) ? d3.range(countsScaleMaxDomain + 1) : null;
    const countsAxis = d3.axisLeft(countsScale)
        .ticks(height > 200 ? 6 : 4)
        .tickFormat(d => numberToLocaleString(d as number))
        .tickValues(countsAxisTickValues as any); //integer values only 
    const countsAxisGroup = svg.append('g')
        .attr('class', 'counts-axis')
        .attr('transform', translate(margins.left - margins.axis, 0))
        .call(countsAxis)


    /**
     * Canvas
     */
    const lodInHours = data.displayLod === 'day' ? 24 : 1;
    const endOfFirstInterval = new Date(data.startDate.getTime() + (lodInHours * 60 * 60 * 1000));
    const intervalWidth = timeScale(endOfFirstInterval) - timeScale(data.startDate);
    const barCenterOffset = Math.floor(intervalWidth / 2);
    const barPadding = data.displayLod === 'day' ? 12 : 0;
    const canvasTicksStyle = isDarkMode ? `rgba(255, 255, 255, 0.15)` : `rgba(0, 0, 0, 0.35)`;
    const canvasBackgroundStyle = isDarkMode ? '#00000035' : '#00000007';
    const changeIndicatorStyle = isDarkMode ? '#FFFFFFE0' : '#000000D0';
    const canvasCountScale = (value: number) => countsScale(value) - margins.top;

    const drawCanvasTimeline = () => {
        //Context preconditions
        const canvasNode = canvas.node();
        if (!canvasNode) return setRenderError('Canvas node not found.');
        const ctx = canvasNode.getContext('2d');
        if (!ctx) return setRenderError('Canvas 2d context not found.');
        if (!intervalWidth) return setRenderError('Cannot render with zero interval width.');

        //Setup
        isFirstRender && console.time('drawing canvas timeline');
        ctx.clearRect(0, 0, drawableAreaWidth, drawableAreaHeight);
        ctx.fillStyle = canvasBackgroundStyle;
        ctx.fillRect(0, 0, drawableAreaWidth, drawableAreaHeight);

        //Drawing horizontal ticks - trycatching because it's a bit fragile
        ctx.strokeStyle = canvasTicksStyle;
        ctx.setLineDash([2, 2]);
        try {
            const tickLines = countsAxisGroup.selectAll("g.tick").nodes();
            for (const tickLine of tickLines) {
                const translation = (tickLine as any)?.getAttribute('transform');
                if (!translation) continue;
                const y = Math.round(+translation.split(',')[1].replace(')', '') - margins.top) + 0.5;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(drawableAreaWidth, y);
                ctx.stroke();
            }
        } catch (error) {
            console.error('Error drawing horizontal ticks:', error);
        }
        ctx.setLineDash([]);

        //Drawing the timeline
        let barsRendered = 0;
        ctx.lineWidth = 1;
        for (const intervalData of data.log) {
            const baseX = timeScale(intervalData.startDate);
            if (baseX < 0 || baseX > drawableAreaWidth) continue;

            const supposedStartX = Math.round(baseX);
            const renderStartX = supposedStartX - barCenterOffset + barPadding;
            const renderOffsetX = baseX - renderStartX;
            const barWidth = Math.round(intervalWidth + renderOffsetX) + 1 - barCenterOffset - barPadding;
            if (barWidth < 1) continue;
            barsRendered++;

            //Draw the count blocks
            let dropSum = 0;
            let lastRenderTopY = drawableAreaHeight + 1;
            for (const [dropCategory, dropCount] of intervalData.drops) {
                if (!dropCount) continue;
                const barBottomY = lastRenderTopY - 1;
                const barTopY = canvasCountScale(dropSum + dropCount) + 1;
                const barHeight = barBottomY - barTopY;
                const barHeightRnd = Math.max(
                    Math.floor(barHeight),
                    barHeight > 0.8 ? 1 : 0
                );

                dropSum += dropCount;
                if (barHeightRnd < 1) continue;
                lastRenderTopY = barBottomY - barHeightRnd;

                //Draw the bar
                ctx.fillStyle = playerDropCategories[dropCategory]?.color ?? 'white';
                ctx.fillRect(
                    renderStartX, barBottomY,
                    barWidth, -barHeightRnd,
                );
                ctx.strokeStyle = playerDropCategories[dropCategory]?.border ?? 'black';
                ctx.strokeRect(
                    renderStartX + 0.5, barBottomY + 0.5,
                    barWidth - 1, -barHeightRnd - 1,
                );
            }

            //Draw the changes indicator
            if (intervalData.changes) {
                ctx.fillStyle = changeIndicatorStyle;
                const centerX = Math.round(renderStartX - 0.5 + barWidth / 2) + 0.5;
                const centerY = lastRenderTopY - 6;
                const halfSize = 3;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY - halfSize);
                ctx.lineTo(centerX + halfSize, centerY);
                ctx.lineTo(centerX, centerY + halfSize);
                ctx.lineTo(centerX - halfSize, centerY);
                ctx.closePath();
                ctx.fill();
            }
        }
        if (isFirstRender) {
            console.timeEnd('drawing canvas timeline');
            console.log('Bars rendered:', barsRendered);
        }
    }
    drawCanvasTimeline();


    /**
     * Cursor + Range selector
     */
    type RangePoint = { x: number, datum: TimelineDropsDatum };
    let rangeStartData: RangePoint | null = null;
    let rangeCrossedThreshold = false;
    let cursorRedrawTimeout: NodeJS.Timeout;
    const maskElmntId = `chartMask-${chartName}`;

    //Cursor line
    const cursorLineVert = chartGroup.append('line')
        .attr('stroke', isDarkMode ? 'rgba(216, 245, 19, 0.75)' : 'rgba(62, 70, 5, 0.75)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');

    const cursorHighlight = chartGroup.append('rect')
        .attr('fill', 'transparent')
        .attr('height', drawableAreaHeight)
        .attr('opacity', '0')
        .attr('class', 'transition-opacity interaction-highlight');

    //Range selector mark
    const defs = chartGroup.append('defs');
    const mask = defs.append('mask')
        .attr('id', maskElmntId);
    const maskArea = mask.append('rect')
        .attr('width', drawableAreaWidth)
        .attr('height', drawableAreaHeight)
        .attr('fill', 'white')
        .attr('class', 'transition-opacity')
        .attr('opacity', '0');
    const maskRect = mask.append('rect')
        .attr('height', drawableAreaHeight)
        .attr('fill', 'black');
    chartGroup.append('rect')
        .attr('width', drawableAreaWidth)
        .attr('height', drawableAreaHeight)
        .attr('fill', isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.35)')
        .attr('mask', `url(#${maskElmntId})`);

    //Helpers
    const getRangeBar = (x1: number, x2: number) => {
        const x1Floor = Math.floor(x1);
        const x2Floor = Math.floor(x2);
        const start = Math.min(x1Floor, x2Floor) + 0.5 - barCenterOffset;
        const width = Math.abs(x2Floor - x1Floor) + intervalWidth + 0.5;
        return { start, width };
    }

    const updateRangeRect = (x1?: number, x2?: number) => {
        //Hide mask
        if (
            (typeof x1 !== 'number' || typeof x2 !== 'number')
            || (x1 < 0 && x2 < 0)
            || (x1 > drawableAreaWidth && x2 > drawableAreaWidth)
        ) {
            maskArea.attr('opacity', '0');
            chartGroup.attr('data-selected', 'false');
            return;
        }

        //Set mask
        const { start, width } = getRangeBar(x1, x2);
        maskRect.attr('x', start).attr('width', width);
        maskArea.attr('opacity', '1');
        chartGroup.attr('data-selected', 'true');
    }
    const setUpstreamRangeState = (range: [date1: Date, date2: Date] | null) => {
        if (!Array.isArray(range) || range.length !== 2) {
            return rangeSetter(null);
        }
        if (range[0].getTime() <= range[1].getTime()) {
            rangeSetter({
                startDate: new Date(range[0]),
                endDate: new Date(range[1]),
            });
        } else {
            rangeSetter({
                startDate: new Date(range[1]),
                endDate: new Date(range[0]),
            });
        }
    }
    const clearRangeData = (hideRect = false) => {
        rangeStartData = null;
        rangeCrossedThreshold = false;
        if (hideRect) {
            updateRangeRect();
            if (rangeSelected) {
                setUpstreamRangeState(null);
            }
        }
    }
    const hideCursor = () => {
        cursorLineVert.attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 0);
        legendRef.style.opacity = '0';
        clearTimeout(cursorRedrawTimeout);
    };
    hideCursor();

    //Setting range if upstream range info available
    if (rangeSelected) {
        console.log('Upsream range selected:', rangeSelected.startDate.toISOString(), rangeSelected.endDate.toISOString());
        updateRangeRect(
            timeScale(rangeSelected.startDate),
            timeScale(rangeSelected.endDate),
        );
    }

    //Find the closest data point for a given X value
    const filteredLog = data.log.filter((datum) => datum.drops.length > 0);
    const timeBisector = d3.bisector((interval: TimelineDropsDatum) => interval.startDate).center;
    const findClosestDatum = (pointerX: number) => {
        // const xPosDate = timeScale.invert(pointerX - intervalWidth / 2);
        const xPosDate = timeScale.invert(pointerX);
        const indexFound = timeBisector(filteredLog, xPosDate);
        if (indexFound === -1) return;
        const datum = filteredLog[indexFound];
        const datumStartTs = datum.startDate.getTime();
        return {
            datum,
            datumStartTs,
            datumStartX: timeScale(datum.startDate),
            dataumIndex: indexFound,
        };
    };

    //Detect mouse over and show timestamp + draw vertical line
    let lastDatumIndex: number | null = null;
    const handleMouseMove = (pointerX: number) => {
        // Find closest data point
        const datumFound = findClosestDatum(pointerX);
        if (!datumFound) {
            cursorHighlight.attr('opacity', '0');
            return;
        }
        const { datum, datumStartX, dataumIndex } = datumFound;
        if (dataumIndex === lastDatumIndex) return;
        lastDatumIndex = dataumIndex;

        //Update range selector if holding click
        if (rangeStartData) {
            rangeCrossedThreshold = true;
            return updateRangeRect(rangeStartData.x, datumStartX);
        }

        if (chartGroupData?.selected === 'true') return;

        //Set legend data
        const allNumEls = legendRef.querySelectorAll<HTMLSpanElement>('span[data-category]');
        for (const numEl of allNumEls) {
            const catName = numEl.getAttribute('data-category');
            if (!catName) continue;
            const catCount = datum.drops.find(([cat]) => cat === catName)?.[1] ?? 0;
            numEl.textContent = numberToLocaleString(catCount);
        }
        const changeFlagEl = legendRef.querySelector<HTMLDivElement>('div.change-flag');
        if (changeFlagEl) {
            if (datum.changes) {
                changeFlagEl.style.display = 'block';
                changeFlagEl.textContent = datum.changes > 1 ? `${datum.changes} CHANGES` : '1 CHANGE';
            } else {
                changeFlagEl.style.display = 'none';
                changeFlagEl.textContent = '';
            }
        }

        //Move legend - only when not holding click
        let wasTransitionDisabled = false;
        if (legendRef.style.opacity === '0') {
            legendRef.style.transitionProperty = 'opacity';
            wasTransitionDisabled = true;
        }
        const legendWidth = legendRef.clientWidth;
        const legendOffset = 36;
        let legendX = datumStartX - legendWidth - legendOffset + margins.left;
        if (legendX < margins.left) legendX = datumStartX + legendOffset + margins.left;
        legendRef.style.left = `${legendX}px`;
        legendRef.style.opacity = '1';
        if (wasTransitionDisabled) {
            setTimeout(() => {
                legendRef.style.transitionProperty = 'all';
            }, 0);
        }

        // Draw cursor
        // const cursorX = Math.round(datumStartX + intervalWidth / 2) + 0.5 - barCenterOffset;
        // cursorLineVert.attr('x1', cursorX).attr('y1', 0).attr('x2', cursorX).attr('y2', drawableAreaHeight);

        // Draw cursor highlight bar
        const barX = getRangeBar(datumStartX, datumStartX);
        cursorHighlight
            .attr('x', barX.start)
            .attr('width', barX.width)
            .attr('opacity', '1');
    };

    const handleMouseDown = (pointerX: number) => {
        const datumFound = findClosestDatum(pointerX);
        if (!datumFound) return;
        chartGroup.attr('data-mousedown', 'true');
        hideCursor();
        rangeStartData = {
            x: datumFound.datumStartX,
            datum: datumFound.datum,
        };
        updateRangeRect(datumFound.datumStartX);
    }

    const handleMouseUp = (pointerX: number) => {
        chartGroup.attr('data-mousedown', 'false');
        if (!rangeStartData) return clearRangeData(true);
        const datumFound = findClosestDatum(pointerX);
        if (!datumFound) return clearRangeData(true);
        // if (!rangeCrossedThreshold && rangeStartData.datum.startDate.getTime() === datumFound.datum.startDate.getTime()) {
        //     return clearRangeData(true);
        // }

        if (rangeSelected && chartGroupData?.selected !== 'true') {
            return clearRangeData(true);
        }

        console.log(
            'PlayerDrops range selected:',
            rangeStartData.datum.startDate,
            datumFound.datum.startDate,
        );
        clearTimeout(cursorRedrawTimeout);
        setUpstreamRangeState([rangeStartData.datum.startDate, datumFound.datum.startDate]);
        clearRangeData();
    }

    const handleMouseLeave = () => {
        chartGroup.attr('data-mousedown', 'false');
        cursorHighlight.attr('opacity', '0');
        setTimeout(() => {
            clearRangeData(!!rangeStartData);
            hideCursor();
        }, 150);
    }

    // Handle svg mouse events
    let isEventInCooldown = false;
    const cooldownTime = 75;
    chartGroup.on('mousemove', function (event) {
        const [pointerX] = d3.pointer(event);
        if (!isEventInCooldown) {
            isEventInCooldown = true;
            handleMouseMove(pointerX);
            setTimeout(() => {
                isEventInCooldown = false;
            }, cooldownTime);
        } else {
            clearTimeout(cursorRedrawTimeout);
            cursorRedrawTimeout = setTimeout(() => {
                handleMouseMove(pointerX);
            }, cooldownTime);
        }
    })
        .on('mousedown', function (event: MouseEvent) {
            if (event.button !== 0) return; //left btn only
            const [pointerX] = d3.pointer(event);
            handleMouseDown(pointerX);
        })
        .on('mouseup', function (event) {
            if (event.button !== 0) return; //left btn only
            const [pointerX] = d3.pointer(event);
            handleMouseUp(pointerX);
        });
    svg.on('mouseleave', handleMouseLeave);

    isFirstRender = false;
}
