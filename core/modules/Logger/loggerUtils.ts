import fsp from 'node:fs/promises';
import path, { sep } from 'node:path';
import bytes from 'bytes';
import { txEnv } from '@core/globalData';


/**
 * Returns an associative array of files in the log folder and it's sizes (human readable)
 */
export const getLogSizes = async (basePath: string, filterRegex: RegExp) => {
    //Reading path
    const files = await fsp.readdir(basePath, { withFileTypes: true });
    const statOps = [];
    const statNames: string[] = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = path.join(basePath, file.name);
        if (!filterRegex.test(file.name) || !file.isFile()) continue;
        statNames.push(file.name);
        statOps.push(fsp.stat(filePath));
    }

    //Processing files
    let totalBytes = 0;
    const fileStatsSizes = await Promise.allSettled(statOps);
    const fileStatsArray = fileStatsSizes.map((op, index) => {
        if (op.status === 'fulfilled') {
            totalBytes += op.value.size;
            return [statNames[index], bytes(op.value.size)!];
        } else {
            return [statNames[index], false];
        }
    }) as [filename: string, size: string | false][];
    return {
        totalBytes: bytes(totalBytes)!,
        fileCount: statNames.length,
        // files: Object.fromEntries(fileStatsArray), //FIXME: unused
    };
};


/**
 * Generates a multiline separator string with 1 line padding
 */
export const getLogDivider = (msg: string) => {
    const sepLine = '='.repeat(64);
    const timestamp = new Date().toLocaleString();
    let out = sepLine + '\n';
    out += `======== ${msg} - ${timestamp}`.padEnd(64, ' ') + '\n';
    out += sepLine + '\n';
    return out;
};


/**
 * Returns the boot divider, with the txAdmin and FXServer versions
 */
export const getBootDivider = () => {
    return getLogDivider(`txAdmin v${txEnv.txaVersion} atop fxserver ${txEnv.fxsVersion} Starting`);
}
