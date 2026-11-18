import { DbInstance, SavePriority } from "../instance";
import consoleFactory from '@lib/console';
import { DatabasePlayerType, DatabaseWhitelistApprovalsType, DatabaseWhitelistRequestsType } from '../databaseTypes';
import { now } from '@lib/misc';
import chalk from "chalk";
const console = consoleFactory('DatabaseDao');


/**
 * Data access object for cleaning up the database.
 */
export default class CleanupDao {
    constructor(private readonly db: DbInstance) { }

    private get dbo() {
        if (!this.db.obj || !this.db.isReady) throw new Error(`database not ready yet`);
        return this.db.obj;
    }

    private get chain() {
        if (!this.db.obj || !this.db.isReady) throw new Error(`database not ready yet`);
        return this.db.obj.chain;
    }


    /**
     * Cleans the database by removing every entry that matches the provided filter function.
     * @returns {number} number of removed items
     */
    bulkRemove(
        tableName: 'players' | 'actions' | 'whitelistApprovals' | 'whitelistRequests',
        filterFunc: Function
    ): number {
        if (!Array.isArray(this.dbo.data[tableName])) throw new Error('Table selected isn\'t an array.');
        if (typeof filterFunc !== 'function') throw new Error('filterFunc must be a function.');

        try {
            this.db.writeFlag(SavePriority.HIGH);
            const removed = this.chain.get(tableName)
                .remove(filterFunc as any)
                .value();
            return removed.length;
        } catch (error) {
            const msg = `Failed to clean database with error: ${(error as Error).message}`;
            console.verbose.error(msg);
            throw new Error(msg);
        }
    }


    /**
     * Cleans the hwids from the database.
     * @returns {number} number of removed HWIDs
     */
    wipeHwids(
        fromPlayers: boolean,
        fromBans: boolean,
    ): number {
        if (!Array.isArray(this.dbo.data.players)) throw new Error('Players table isn\'t an array yet.');
        if (!Array.isArray(this.dbo.data.players)) throw new Error('Actions table isn\'t an array yet.');
        if (typeof fromPlayers !== 'boolean' || typeof fromBans !== 'boolean') throw new Error('The parameters should be booleans.');

        try {
            this.db.writeFlag(SavePriority.HIGH);
            let removed = 0;
            if (fromPlayers) {
                this.chain.get('players')
                    .map(player => {
                        removed += player.hwids.length;
                        player.hwids = [];
                        return player;
                    })
                    .value();
            }
            if (fromBans)
                this.chain.get('actions')
                    .map(action => {
                        if (action.type !== 'ban' || !action.hwids) {
                            return action;
                        } else {
                            removed += action.hwids.length;
                            action.hwids = [];
                            return action;
                        }
                    })
                    .value();
            return removed;
        } catch (error) {
            const msg = `Failed to clean database with error: ${(error as Error).message}`;
            console.verbose.error(msg);
            throw new Error(msg);
        }
    }


    /**
     * Cron func to optimize the database removing players and whitelist reqs/approvals
     */
    runDailyOptimizer() {
        const oneDay = 24 * 60 * 60;

        //Optimize players
        //Players that have not joined the last 16 days, and have less than 2 hours of playtime
        let playerRemoved = 0;
        try {
            const sixteenDaysAgo = now() - (16 * oneDay);
            const filter = (p: DatabasePlayerType) => {
                return (p.tsLastConnection < sixteenDaysAgo && p.playTime < 120);
            }
            playerRemoved = this.bulkRemove('players', filter);
        } catch (error) {
            const msg = `Failed to optimize players database with error: ${(error as Error).message}`;
            console.error(msg);
        }

        //Optimize whitelistRequests + whitelistApprovals
        //Removing the ones older than 7 days
        let wlRequestsRemoved = 0;
        let wlApprovalsRemoved = 0;
        const sevenDaysAgo = now() - (7 * oneDay);
        try {
            const wlRequestsFilter = (req: DatabaseWhitelistRequestsType) => {
                return (req.tsLastAttempt < sevenDaysAgo);
            }
            wlRequestsRemoved = txCore.database.whitelist.removeManyRequests(wlRequestsFilter).length;

            const wlApprovalsFilter = (req: DatabaseWhitelistApprovalsType) => {
                return (req.tsApproved < sevenDaysAgo);
            }
            wlApprovalsRemoved = txCore.database.whitelist.removeManyApprovals(wlApprovalsFilter).length;
        } catch (error) {
            const msg = `Failed to optimize players database with error: ${(error as Error).message}`;
            console.error(msg);
        }

        //Skip if failed or nothing was removed
        if (playerRemoved || wlRequestsRemoved || wlApprovalsRemoved) {
            this.db.writeFlag(SavePriority.LOW);
            console.ok(`Internal Database optimized. This applies only for the txAdmin internal database, and does not affect your MySQL or framework (ESX/QBCore/etc) databases.`);
        }
        if (playerRemoved) {
            console.ok(chalk.dim(`- ${playerRemoved} players that haven't connected in the past 16 days and had less than 2 hours of playtime.`));
        }
        if (wlRequestsRemoved) {
            console.ok(chalk.dim(`- ${wlRequestsRemoved} whitelist requests older than a week.`));
        }
        if (wlApprovalsRemoved) {
            console.ok(chalk.dim(`- ${wlApprovalsRemoved} whitelist approvals older than a week.`));
        }
    }
}
