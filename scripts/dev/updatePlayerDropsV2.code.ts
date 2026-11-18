/**
 * This script is used to merge multiple stats_playerDrop files into a single file with the last 336 hours of data.
 * NOTE: use npx tsx scripts/dev/makeOldStatsFile.local.ts to run this script
 */
import fs from 'node:fs';
import { PDLChangeEventType, PDLFileType } from '../../core/modules/Metrics/playerDrop/playerDropSchemas';
import * as d3 from 'd3';

// const hours = d3.timeHour.offset()
const currentHour = d3.timeHour.floor(new Date());
export default (sourceFile: string, targetFileName: string) => {
    const fileData = JSON.parse(fs.readFileSync(sourceFile, 'utf8')) as PDLFileType;

    let lastHour = d3.timeHour.offset(currentHour, -1);
    for (let i = fileData.log.length - 1; i >= 0; i--) {
        const log = fileData.log[i];
        const logHour = new Date(log.hour);
        const newHour = d3.timeHour.offset(lastHour, -1);
        const hourDiff = newHour.getTime() - logHour.getTime();
        log.hour = newHour.toISOString();
        lastHour = newHour;
        for (const change of log.changes) {
            if ('ts' in change) {
                change.ts = change.ts - hourDiff;
            }
        }
        console.log('Updated', logHour.toISOString(), 'to', newHour.toISOString());
    }
    fileData.lastResourceList = [];
    fileData.lastUnknownReasons = [];

    //Write new file
    console.log('Writing file', targetFileName);
    fs.writeFileSync(targetFileName, JSON.stringify(fileData));
}
