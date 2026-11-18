import type { SvRtLogFilteredType, SvRtPerfCountsThreadType } from "@shared/otherTypes";
import * as d3 from 'd3';


/**
 * Find which is the last bucket boundary that is less than or equal to the minTickInterval, excluding +Infinity.
 */
export const getMinTickIntervalMarker = (boundaries: (string | number)[], minTickInterval: number) => {
    let found;
    for (const bucketLE of boundaries) {
        if (bucketLE === '+Inf') {
            if (found !== undefined && found < minTickInterval) {
                return undefined; //we reached infinite without finding the threshold
            }
            break;
        } else if (typeof bucketLE !== 'string' && bucketLE <= minTickInterval) {
            found = bucketLE;
        }
    }
    return typeof found === 'number' ? found : undefined;
}


/**
 * Format pewrd tick time buckets boundary values.
 */
export const formatTickBoundary = (value: number | string) => {
    if (value === '+Inf') {
        return '+Inf';
    } else if (typeof value === 'string') {
        return '???';
    } else if (value < 0) {
        return '<0 ms';
    } else if (value === 0) {
        return '0 ms';
    } else if (value < 0.001) {
        return '<1 ms';
    } else if (value >= 0.001 && value < 1) {
        return `${(value * 1000).toFixed(0)} ms`;
    } else if (value < 10) {
        return `${value.toFixed(2)} s`;
    } else if (value < 100) {
        return `${value.toFixed(1)} s`;
    } else {
        return `${value.toFixed(0)} s`;
    }
}


/**
 * Calculates an array of estimated average ticket durations for each bucket, asuming linear distribution,
 * except for the last bucket which is assumed to be 25% higher than the lower boundary.
 * This is inherently wrong, but it's a good enough approximation for coloring the chart.
 * References:
 * https://stackoverflow.com/q/55162093
 * https://stackoverflow.com/q/60962520
 * https://prometheus.io/docs/practices/histograms/#errors-of-quantile-estimation
 */
export const getBucketTicketsEstimatedTime = (boundaries: (string | number)[]) => {
    const estimatedAverageDurations = [];
    for (let i = 0; i < boundaries.length; i++) {
        const prev = boundaries[i - 1] ?? 0;
        if (typeof prev !== 'number') throw new Error(`Invalid prev value: ${prev}`);

        //If last, add a 25% margin as we don't know the actual value
        if (boundaries.length >= 2 && i === boundaries.length - 1) {
            estimatedAverageDurations.push(prev * 1.25);
            break;
        }

        //Otherwise, calculate the median value between the current and the previous
        const curr = boundaries[i];
        if (typeof curr !== 'number') throw new Error(`Invalid current value: ${curr}`);
        estimatedAverageDurations.push((prev + curr) / 2);
    }
    return estimatedAverageDurations;
}


/**
 * Map the performance data from count frequency histogram to time-weighted histogram.
 */
export const getTimeWeightedHistogram = (bucketCounts: number[], bucketEstimatedAverageTimes: number[]) => {
    if (bucketCounts.length !== bucketEstimatedAverageTimes.length) throw new Error('Invalid bucket count');

    //Calculate the total estimated time
    let totalEstimatedTime = 0;
    const bucketEstimatedCumulativeTime = [];
    for (let bucketIndex = 0; bucketIndex < bucketEstimatedAverageTimes.length; bucketIndex++) {
        const bucketTickCount = (typeof bucketCounts[bucketIndex] === 'number') ? bucketCounts[bucketIndex] : 0;
        const calculatedTime = bucketTickCount * bucketEstimatedAverageTimes[bucketIndex];
        bucketEstimatedCumulativeTime.push(calculatedTime);
        totalEstimatedTime += calculatedTime;
    }

    //Normalize the values
    return bucketEstimatedCumulativeTime.map((time) => time / totalEstimatedTime);
}


/**
 * Slicer types
 */
export type PerfSnapType = {
    start: Date;
    end: Date;
    players: number;
    fxsMemory: number | null;
    nodeMemory: number | null;
    weightedPerf: number[];
}
export type PerfLifeSpanType = {
    bootTime?: Date;
    bootDuration?: number;
    closeTime?: Date;
    closeReason?: string;
    log: PerfSnapType[];
}
type PerfProcessorType = (perfLog: SvRtPerfCountsThreadType) => number[];
const minPerfTime = 60 * 1000;
const maxPerfTimeGap = 15 * 60 * 1000; //15 minutes
const getEmptyPerfLifeSpan = (): PerfLifeSpanType => ({
    bootDuration: undefined,
    closeReason: undefined,
    log: [],
});


/**
 * Slices the log into groups representing server lifespan.
 */
export const processPerfLog = (perfLog: SvRtLogFilteredType, perfProcessor: PerfProcessorType) => {
    let dataStart: Date | undefined;
    let dataEnd: Date | undefined;
    let lifespans: PerfLifeSpanType[] = [];

    let currentLifespan: PerfLifeSpanType = getEmptyPerfLifeSpan();
    for (const currEntry of perfLog) {
        if (currentLifespan === undefined) {
            currentLifespan = getEmptyPerfLifeSpan();
        }
        const hasDataLogStarted = currentLifespan?.log?.length;

        if (currEntry.type === 'svBoot') {
            if (hasDataLogStarted) {
                //last lifespan finished without a svClose
                lifespans.push(currentLifespan);
                currentLifespan = getEmptyPerfLifeSpan();
            }
            //start a new lifespan
            currentLifespan.bootTime = new Date(currEntry.ts);
            currentLifespan.bootDuration = currEntry.duration;
        } else if (currEntry.type === 'svClose') {
            if (hasDataLogStarted) {
                //closing gracefully
                currentLifespan.closeTime = new Date(currEntry.ts);
                currentLifespan.closeReason = currEntry.reason;
                lifespans.push(currentLifespan);
                currentLifespan = getEmptyPerfLifeSpan();
            }
        } else if (currEntry.type === 'data') {
            const minAcceptableStartTs = currEntry.ts - maxPerfTimeGap;
            const lastData = hasDataLogStarted ? currentLifespan.log.at(-1) : undefined;
            let perfStartTs = currEntry.ts - minPerfTime;
            if (lastData) {
                const lastDataEndTs = lastData.end.getTime();
                //check if the last data entry is too old
                if (lastDataEndTs >= minAcceptableStartTs) {
                    perfStartTs = lastDataEndTs;
                } else {
                    lifespans.push(currentLifespan);
                    currentLifespan = getEmptyPerfLifeSpan();
                }
            } else if (currentLifespan.bootTime) {
                const currentLifespanBootTs = currentLifespan.bootTime.getTime();
                // if the boot is too old, reset the lifespan
                if (currentLifespanBootTs >= minAcceptableStartTs) {
                    perfStartTs = currentLifespanBootTs;
                } else {
                    currentLifespan = getEmptyPerfLifeSpan();
                }
            }
            const perfStartTime = new Date(perfStartTs);
            const perfEndTime = new Date(currEntry.ts);
            if (!dataStart) dataStart = perfStartTime;
            dataEnd = perfEndTime;

            currentLifespan.log.push({
                start: perfStartTime,
                end: perfEndTime,
                players: currEntry.players,
                fxsMemory: currEntry.fxsMemory,
                nodeMemory: currEntry.nodeMemory,
                weightedPerf: perfProcessor(currEntry.perf),
            });
        }
    }

    //Push the last lifespan if it's not empty
    if (currentLifespan?.log?.length) {
        lifespans.push(currentLifespan);
    }

    //Filter to only lifespans with data
    lifespans = lifespans.filter((lifespan) => lifespan.log.length);

    return (dataStart && dataEnd && lifespans.length)
        ? { dataStart, dataEnd, lifespans }
        : undefined;
}


/**
 * Get thread display name
 */
export const getThreadDisplayName = (thread: string) => {
    switch (thread) {
        case 'svSync': return 'Sync';
        case 'svNetwork': return 'Network';
        case 'svMain': return 'Main';
        default: return thread;
    }
}


/**
 * Process the data to return the median player count and uptime in the last X hours
 */
export const getServerStatsData = (
    lifespans: PerfLifeSpanType[],
    windowHours: number,
    apiDataAge: number,
) => {
    const windowMs = windowHours * 60 * 60 * 1000;
    const windowStart = apiDataAge - windowMs;

    let uptime = 0;
    const playerCounts = [];
    for (const lifespan of lifespans) {
        if (!lifespan.log.length) continue;
        const lifespanEnd = lifespan.log.at(-1)!.end.getTime();
        if (lifespanEnd < windowStart) continue;

        for (const snap of lifespan.log) {
            playerCounts.push(snap.players);
            if (snap.end.getTime() < windowStart) continue;
            if (snap.start.getTime() < windowStart) {
                uptime += snap.end.getTime() - windowStart;
            } else {
                uptime += snap.end.getTime() - snap.start.getTime();
            }
        }
    }

    return {
        uptimePct: apiDataAge
            ? Math.min(100, uptime / windowMs * 100)
            : undefined,
        medianPlayerCount: d3.quantile(playerCounts, 0.5) ?? 0,
    };
}
