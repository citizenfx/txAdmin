/**
 * This script is used to update the timestamps of a stats_playerDrop.json v2 file
 * 
 * NOTE: RENAME TO updatePlayerDropsV2.local.ts
 * NOTE: THEN RUN npx tsx scripts/dev/updatePlayerDropsV2.local.ts
 * NOTE: Add --overwrite to overwrite the actual stats_playerDrop.json file instead of creating a timestamped copy
 */
import updatePlayerDropsV2 from "./updatePlayerDropsV2.code";

const sourceFile = 'xxxxx/stats_playerDrop.json';
const baseTargetPath = 'xxxxxxxx/txData/default/data/stats_playerDrop.json';
const overwrite = process.argv.includes('--overwrite');
const formattedTimestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const targetFileName = overwrite ? baseTargetPath : `${baseTargetPath}.${formattedTimestamp}`;
updatePlayerDropsV2(sourceFile, targetFileName);
