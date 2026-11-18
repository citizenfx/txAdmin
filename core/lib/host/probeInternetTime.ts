import got from "@lib/got";
import { performance } from "node:perf_hooks";


export type ProbeTimezoneInfo = {
    timezone: string;
    offset: string;
    abbr: string;
};

type ParseResult = {
    time: number;
    timezone?: ProbeTimezoneInfo;
};

type TimeProbe = {
    url: string;
    parse: (body: string) => ParseResult;
};

const getLocalTimezone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        return 'UTC';
    }
};

const buildTimeProbes = (): TimeProbe[] => {
    const localTz = getLocalTimezone();
    return [
        {
            url: "https://time.akamai.com/?ms",
            parse: (b) => ({ time: parseFloat(b.trim()) * 1000 }),
        },
        {
            url: "https://www.cloudflare.com/cdn-cgi/trace",
            parse: (b) => {
                const tsLine = b.split("\n").find((l) => l.startsWith("ts="))!;
                const ts = parseFloat(tsLine.slice(3));        // seconds.frac
                return { time: Math.round(ts * 1000) };
            },
        },
        {
            url: `https://gettimeapi.dev/v1/time?timezone=${encodeURIComponent(localTz)}`,
            parse: (b) => {
                const json = JSON.parse(b);
                return {
                    time: Date.parse(json.iso8601),
                    timezone: {
                        timezone: json.timezone,
                        offset: json.offset,
                        abbr: json.abbr,
                    },
                };
            },
        },
    ];
};


export type ProbeSuccess = {
    url: string;
    success: true;
    serverTime: number;
    rtt: number;
    offset: number;
    timezone?: ProbeTimezoneInfo;
};
export type ProbeFailure = {
    url: string;
    success: false;
    error: string;
};
export type ProbeResult = ProbeSuccess | ProbeFailure;

const runProbe = async ({ url, parse }: TimeProbe): Promise<ProbeResult> => {
    const timeoutMs = 5000;
    try {
        const t0 = performance.now();
        const res = await got(url, {
            retry: { limit: 0 },
            timeout: { request: timeoutMs },
        });
        const t1 = performance.now();
        const parsed = parse(res.body);
        const rtt = t1 - t0;
        const offset = parsed.time + rtt / 2 - Date.now();
        return {
            url,
            success: true,
            serverTime: parsed.time,
            rtt,
            offset,
            timezone: parsed.timezone,
        };
    } catch (error) {
        return { url, success: false, error: (error as Error)?.message ?? 'unknown error' };
    }
}


type RunAllProbesResult = {
    date: Date | null;
    avgTimeMs: number | null;
    avgOffsetMs: number | null;
    avgRttMs: number | null;
    results: ProbeResult[];
}

export default async function probeInternetTime(): Promise<RunAllProbesResult> {
    const results = await Promise.all(buildTimeProbes().map(runProbe));
    const successResults = results.filter((r) => r.success) as ProbeSuccess[];
    const avgTimeMs = successResults.reduce((acc, r) => acc + r.serverTime, 0) / successResults.length;
    const avgOffsetMs = successResults.reduce((acc, r) => acc + r.offset, 0) / successResults.length;
    const avgRttMs = successResults.reduce((acc, r) => acc + r.rtt, 0) / successResults.length;
    return {
        date: avgTimeMs ? new Date(avgTimeMs) : null,
        avgTimeMs: Math.floor(avgTimeMs),
        avgOffsetMs: Math.floor(avgOffsetMs),
        avgRttMs: Math.floor(avgRttMs),
        results,
    };
}
