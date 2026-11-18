import type { GenericApiErrorResp } from "genericApiTypes";

export type InfoTree = {
    [key: string]: string | number | { [key: string]: string | number };
}

export type InfoList = {
    [key: string]: string | number;
}

export type ProcessInfo = {
    pid: number;
    parent: number;
    name: string;
    cpu: number;
    memory: number;
}

export type DiagnosticsPageData = {
    runtime: {
        [key: string]: InfoTree;
    };
    host: InfoList;
    server: InfoList;
    processes: ProcessInfo[];
    loadTime: number;
}


export type DiagnosticsDataApiResp = DiagnosticsPageData | GenericApiErrorResp
