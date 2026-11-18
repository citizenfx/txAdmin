import { inspect } from 'node:util';
import CircularBuffer from 'mnemonist/circular-buffer';
import * as d3array from 'd3-array';


/**
 * Helper class to count different options
 */
export class MultipleCounter extends Map<string, number> {
    public locked: boolean;
    private _clear: () => void;

    constructor(initialData?: [string, number][] | null | Record<string, number>, locked = false) {
        let initialDataIterable: any;
        if (initialData !== undefined && initialData !== null || typeof initialData === 'object') {
            if (Array.isArray(initialData)) {
                initialDataIterable = initialData;
            } else {
                initialDataIterable = Object.entries(initialData!);
                if (initialDataIterable.some(([k, v]: [string, number]) => typeof k !== 'string' || typeof v !== 'number')) {
                    throw new Error(`Initial data must be an object with only integer values.`)
                }
            }
        }
        super(initialDataIterable ?? initialData);
        this.locked = locked;
        this._clear = super.clear;
    }

    //Clears the counter
    clear() {
        if (this.locked) throw new Error(`This MultipleCounter is locked to modifications.`);
        this._clear();
    };

    //Returns the sum of all values
    sum() {
        return [...this.values()].reduce((a, b) => a + b, 0);
    }

    //Increments the count of a key by a value
    count(key: string, val = 1) {
        if (this.locked) throw new Error(`This MultipleCounter is locked to modifications.`);

        const currentValue = this.get(key);
        if (currentValue !== undefined) {
            const newVal = currentValue + val;
            this.set(key, newVal);
            return newVal;
        } else {
            this.set(key, val);
            return val;
        }
    };

    //Merges another counter into this one
    merge(newData: MultipleCounter | [string, number][] | Record<string, number>) {
        if (this.locked) throw new Error(`This MultipleCounter is locked to modifications.`);
        let iterable;
        if (newData instanceof MultipleCounter || Array.isArray(newData)) {
            iterable = newData;
        } else if (typeof newData === 'object' && newData !== null) {
            iterable = Object.entries(newData);
        } else {
            throw new Error(`Invalid data type for merge`);
        }
        for (const [key, value] of iterable) {
            this.count(key, value);
        }
    }

    //Returns an array with sorted keys in asc or desc order
    toSortedKeysArray(desc?: boolean) {
        return [...this.entries()]
            .sort((a, b) => desc
                ? b[0].localeCompare(a[0])
                : a[0].localeCompare(b[0])
            );
    }

    // Returns an array with sorted values in asc or desc order
    toSortedValuesArray(desc?: boolean) {
        return [...this.entries()]
            .sort((a, b) => desc ? b[1] - a[1] : a[1] - b[1]);
    }

    //Returns an object with sorted keys in asc or desc order
    toSortedKeyObject(desc?: boolean) {
        return Object.fromEntries(this.toSortedKeysArray(desc));
    }

    //Returns an object with sorted values in asc or desc order
    toSortedValuesObject(desc?: boolean) {
        return Object.fromEntries(this.toSortedValuesArray(desc));
    }

    toArray(): [string, number][] {
        return [...this];
    }

    toJSON(): MultipleCounterOutput {
        return Object.fromEntries(this);
    }

    [inspect.custom]() {
        return this.toSortedKeyObject();
    }
}
export type MultipleCounterOutput = Record<string, number>;


/**
 * Helper calculate quantiles out of a circular buffer of numbers
 */
export class QuantileArray {
    readonly #cache: CircularBuffer<number>;
    readonly #minSize: number;

    constructor(sizeLimit: number, minSize = 1) {
        if (typeof sizeLimit !== 'number' || !Number.isInteger(sizeLimit) || sizeLimit < 1) {
            throw new Error(`sizeLimit must be a positive integer over 1.`);
        }
        if (typeof minSize !== 'number' || !Number.isInteger(minSize) || minSize < 1) {
            throw new Error(`minSize must be a positive integer or one.`);
        }
        this.#cache = new CircularBuffer(Array, sizeLimit);
        this.#minSize = minSize;
    }

    /**
     * Clears the cached data (wipe counts).
     */
    clear() {
        this.#cache.clear();
    };

    /**
     * Adds a value to the cache.
     */
    count(value: number) {
        if (typeof value !== 'number') throw new Error(`value must be a number`);
        this.#cache.push(value);
    };

    /**
     * Processes the cache and returns the count and quantiles, if enough data.
     */
    result(round = false): QuantileArrayOutput {
        if (this.#cache.size < this.#minSize) {
            return {
                enoughData: false,
            }
        } else {
            const p5 = d3array.quantile(this.#cache.values(), 0.05)!;
            const p25 = d3array.quantile(this.#cache.values(), 0.25)!;
            const p50 = d3array.quantile(this.#cache.values(), 0.50)!;
            const p75 = d3array.quantile(this.#cache.values(), 0.75)!;
            const p95 = d3array.quantile(this.#cache.values(), 0.95)!;
            return {
                enoughData: true,
                count: this.#cache.size,
                p5: round ? Math.round(p5) : p5,
                p25: round ? Math.round(p25) : p25,
                p50: round ? Math.round(p50) : p50,
                p75: round ? Math.round(p75) : p75,
                p95: round ? Math.round(p95) : p95,
            };
        }
    }

    /**
     * Returns a human readable summary of the data.
     */
    resultSummary(unit = ''): QuantileArraySummary {
        const result = this.result();
        if (!result.enoughData) {
            return {
                ...result,
                summary: 'not enough data available',
            };
        }
        // const a = Object.entries(result)
        const percentiles = (Object.entries(result) as [string, number][])
            .filter((el): el is [string, number] => el[0].startsWith('p'))
            .map(([key, val]) => `${key}:${Math.ceil(val)}${unit}`);
        return {
            ...result,
            summary: percentiles.join('/') + ` (x${this.#cache.size})`,
        };
    }

    toJSON() {
        return this.result(false);
    }

    [inspect.custom]() {
        return this.result(true);
    }
}
type QuantileArrayOutput = {
    enoughData: true;
    count: number;
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
} | {
    //if less than min size
    enoughData: false;
};

type QuantileArraySummary = QuantileArrayOutput & {
    summary: string,
};


/**
 * Helper class to count time durations and convert them to human readable values
 */
export class TimeCounter {
    readonly #timeStart: bigint;
    #timeEnd: bigint | undefined;
    public duration: {
        nanoseconds: number
        milliseconds: number,
        seconds: number,
    } | undefined;

    constructor() {
        this.#timeStart = process.hrtime.bigint();
    }

    stop() {
        this.#timeEnd = process.hrtime.bigint();
        const nanoseconds = this.#timeEnd - this.#timeStart;
        const asNumber = Number(nanoseconds);
        this.duration = {
            nanoseconds: asNumber,
            seconds: asNumber / 1_000_000_000,
            milliseconds: asNumber / 1_000_000,
        };
        return this.duration;
    };

    toJSON() {
        return this.duration;
    }

    [inspect.custom]() {
        return this.toJSON();
    }
}


/**
 * Estimates the JSON size in bytes of an array based on a simple heuristic
 */
export const estimateArrayJsonSize = (srcArray: any[], minLength: number): JsonEstimateResult => {
    // Check if the buffer has enough data
    if (srcArray.length <= minLength) {
        return { enoughData: false };
    }

    // Determine a reasonable sample size:
    // - At least 100 elements
    // - Up to 10% of the buffer length
    // - Capped at 1000 elements to limit CPU usage
    const sourceArrayLength = srcArray.length;
    const sampleSize = Math.min(1000, Math.max(100, Math.floor(sourceArrayLength * 0.1)));
    const sampleArray: any[] = [];

    // Randomly sample elements from the buffer
    for (let i = 0; i < sampleSize; i++) {
        const randomIndex = Math.floor(Math.random() * sourceArrayLength);
        sampleArray.push(srcArray[randomIndex]);
    }

    // Serialize the sample to JSON
    const jsonString = JSON.stringify(sampleArray);
    const sampleSizeBytes = Buffer.byteLength(jsonString, 'utf-8'); // More accurate byte count

    // Estimate the total size based on the sample
    const estimatedTotalBytes = (sampleSizeBytes / sampleSize) * sourceArrayLength;
    const bytesPerElement = estimatedTotalBytes / sourceArrayLength;

    return {
        enoughData: true,
        bytesTotal: Math.round(estimatedTotalBytes),
        bytesPerElement: Math.ceil(bytesPerElement),
    };
};

type JsonEstimateResult = {
    enoughData: false;
} | {
    enoughData: true;
    bytesTotal: number;
    bytesPerElement: number;
};


/**
 * Checks if a value is within a fraction margin of an expected value.
 */
export const isWithinMargin = (value: number, expectedValue: number, marginFraction: number) => {
    const margin = expectedValue * marginFraction;
    return Math.abs(value - expectedValue) <= margin;
}
