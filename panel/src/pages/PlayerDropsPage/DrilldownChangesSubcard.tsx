import { Fragment, useMemo } from "react";
import { PlayerDropsMessage } from "./PlayerDropsGenericSubcards";
import type { PDLChangeEventType } from "@shared/otherTypes";
import { processResourceChanges } from "./utils";
import { cn } from "@/lib/utils";
import { tsToLocaleDateString, tsToLocaleDateTimeString, tsToLocaleTimeString } from "@/lib/dateTime";


function DiffOld({ children }: { children: React.ReactNode }) {
    return (
        <span className="font-mono px-1 text-sm text-primary dark:text-background bg-destructive-inline/60 dark:bg-destructive-inline/90">
            {children}
        </span>
    );
}
function DiffNew({ children }: { children: React.ReactNode }) {
    return (
        <span className="font-mono px-1 text-sm text-primary dark:text-background bg-success-inline/60 dark:bg-success-inline/90">
            {children}
        </span>
    );
}
function DiffUpdated({ children }: { children: React.ReactNode }) {
    return (
        <span className="font-mono px-1 text-sm text-primary dark:text-background bg-warning/60 dark:bg-warning/90">
            {children}
        </span>
    );
}

type ChangedFxsEventProps = { change: Extract<PDLChangeEventType, { type: "fxsChanged" }> };
function ChangedFxsEvent({ change }: ChangedFxsEventProps) {
    return (<>
        Switched from <DiffOld>{change.oldVersion}</DiffOld> to <DiffNew>{change.newVersion}</DiffNew>
    </>);
}

type ChangedGameEventProps = { change: Extract<PDLChangeEventType, { type: "gameChanged" }> };
function ChangedGameEvent({ change }: ChangedGameEventProps) {
    return (<>
        Switched from <DiffOld>{change.oldVersion}</DiffOld> to <DiffNew>{change.newVersion}</DiffNew>
    </>);
}

type ChangedResourcesEventProps = { change: Extract<PDLChangeEventType, { type: "resourcesChanged" }> };
function ChangedResourcesEvent({ change }: ChangedResourcesEventProps) {
    const processedChanges = useMemo(() => {
        return processResourceChanges(change.resRemoved, change.resAdded);
    }, [change.resRemoved, change.resAdded]);

    let removedNode = null;
    if (processedChanges.removed.length) {
        removedNode = (<p>
            Removed: {
                processedChanges.removed.map((item, index, array) => (
                    <Fragment key={item}>
                        <DiffOld>{item}</DiffOld>{index < array.length - 1 ? ', ' : '.'}
                    </Fragment>
                ))
            }
        </p>);
    }

    let addedNode = null;
    if (processedChanges.added.length) {
        addedNode = (<p>
            Added: {
                processedChanges.added.map((item, index, array) => (
                    <Fragment key={item}>
                        <DiffNew>{item}</DiffNew>{index < array.length - 1 ? ', ' : '.'}
                    </Fragment>
                ))
            }
        </p>);
    }

    let updatedNode = null;
    if (processedChanges.updated.length) {
        updatedNode = (<p>
            Updated: {
                processedChanges.updated.map((item, index, array) => (
                    <Fragment key={index}>
                        <DiffUpdated>{item.resName} {item.oldVer} -&gt; {item.newVer}</DiffUpdated>{index < array.length - 1 ? ', ' : '.'}
                    </Fragment>
                ))
            }
        </p>);
    }

    return (<>
        {removedNode}
        {addedNode}
        {updatedNode}
    </>);
}


type DrilldownChangesSubcardProps = {
    changes: PDLChangeEventType[];
};

export default function DrilldownChangesSubcard({ changes }: DrilldownChangesSubcardProps) {
    const eventTitles: Record<string, string> = {
        fxsChanged: 'Changed FXServer version',
        gameChanged: 'Changed game version',
        resourcesChanged: 'Changed boot resources',
    };

    const sortedChanges = useMemo(() => {
        return changes.sort((a, b) => b.ts - a.ts);
    }, [changes]);

    if (!changes.length) {
        return <PlayerDropsMessage message="No environmental changes within this time window." />;
    }

    return (
        <div className="md:grid md:grid-cols-[auto_minmax(0,1fr)] gap-4 md:px-4 pt-2 ">
            {sortedChanges.map((change, index) => (
                <Fragment key={index}>
                    <div className="hidden mx-auto md:flex items-center gap-4 divide-y">
                        <div className="flex flex-col items-center justify-center px-2 py-1 rounded-lg text-xs font-medium bg-muted">
                            <span>{tsToLocaleDateString(change.ts, 'medium')}</span>
                            <span>{tsToLocaleTimeString(change.ts)}</span>
                        </div>
                    </div>
                    <div
                        className={cn(
                            'flex-1 col-span-2 md:col-span-1 px-2 md:px-0 py-2 md:py-0',
                            index % 2 === 0 && 'bg-secondary/25 md:bg-transparent',
                        )}
                    >
                        <div className="flex flex-wrap-reverse justify-between">
                            <h3 className="flex-grow inline text-lg font-semibold">
                                {change.type in eventTitles ? eventTitles[change.type] : change.type}
                            </h3>
                            <div className="md:hidden mx-auto">
                                <span className="border-muted-foreground border rounded px-2 py-0.5 font-normal text-xs text-muted-foreground">
                                    {tsToLocaleDateTimeString(change.ts, 'medium', 'short')}
                                </span>
                            </div>
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                            {change.type === 'fxsChanged' && <ChangedFxsEvent change={change} />}
                            {change.type === 'gameChanged' && <ChangedGameEvent change={change} />}
                            {change.type === 'resourcesChanged' && <ChangedResourcesEvent change={change} />}
                        </div>
                    </div>
                </Fragment>
            ))}
        </div>
    );
}
