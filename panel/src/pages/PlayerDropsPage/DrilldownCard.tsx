import { BoxIcon, FolderOpenIcon, ShapesIcon, SkullIcon } from "lucide-react";
import { memo, useState } from "react";
import type { PlayerDropsApiSuccessResp } from "@shared/otherTypes";
import { cn } from "@/lib/utils";
import { dateToLocaleDateString, dateToLocaleTimeString, isDateToday } from "@/lib/dateTime";
import DrilldownCrashesSubcard from "./DrilldownCrashesSubcard";
import { PlayerDropsLoadingSpinner } from "./PlayerDropsGenericSubcards";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DrilldownChangesSubcard from "./DrilldownChangesSubcard";
import DrilldownOverviewSubcard from "./DrilldownOverviewSubcard";
import { DisplayLodType, DrilldownRangeSelectionType } from "./PlayerDropsPage";
import InlineCode from "@/components/InlineCode";
import DrilldownResourcesSubcard from "./DrilldownResourcesSubcard";
import { DynamicNewItem } from "@/components/DynamicNewBadge";


export function DrilldownCardLoading({ isError }: { isError?: boolean }) {
    return (
        <div className="space-y-1">
            <div className="text-center space-x-2 text-sm text-muted-foreground">
                <span>Loading...</span>
            </div>
            <div className="pb-2 md:rounded-xl border bg-cardx shadow-sm flex flex-col">
                <div className="flex flex-col flex-shrink px-1 sm:px-4 py-2 space-y-4 border-b md:rounded-t-[inherit] bg-secondary/35">
                    <div className="flex items-center space-x-2">
                        <div className='hidden xs:block'><FolderOpenIcon className="size-4" /></div>
                        <h2 className="font-mono text-sm">Overview</h2>
                    </div>
                </div>
                <div className="px-4 py-2 flex flex-wrap justify-evenly gap-4 text-muted-foreground">
                    <PlayerDropsLoadingSpinner isError={isError} />
                </div>
                <div className="flex flex-col flex-shrink px-1 sm:px-4 py-2 space-y-4 border-t border-b bg-secondary/35">
                    <div className="flex items-center space-x-2">
                        <div className='hidden xs:block'><ShapesIcon className="size-4" /></div>
                        <h2 className="font-mono text-sm">Environment Changes</h2>
                    </div>
                </div>
                <div className="px-4 pt-2 pb-4">
                    <PlayerDropsLoadingSpinner isError={isError} />
                </div>
                <div className="flex flex-col flex-shrink px-1 sm:px-4 py-2 space-y-4 border-t border-b bg-secondary/35">
                    <div className="flex items-center space-x-2">
                        <div className='hidden xs:block'><SkullIcon className="size-4" /></div>
                        <h2 className="font-mono text-sm">Crash Reasons</h2>
                    </div>
                </div>
                <div className="px-4 pt-2 pb-4 space-y-4">
                    <PlayerDropsLoadingSpinner isError={isError} />
                </div>
            </div>
        </div>
    );
}

type DrilldownCardProps = PlayerDropsApiSuccessResp['detailed'] & {
    rangeSelected: DrilldownRangeSelectionType;
    displayLod: DisplayLodType;
};

const DrilldownCardInner = function DrilldownCard({
    windowStart,
    windowEnd,
    windowData,
    rangeSelected,
    displayLod,
}: DrilldownCardProps) {
    const [crashesTargetLimit, setCrashesTargetLimit] = useState(50);
    const [crashesGroupReasons, setCrashesGroupReasons] = useState(false);

    //Window indicator
    const windowStartDate = new Date(windowStart);
    const windowEndDate = new Date(windowEnd);
    const showDate = !isDateToday(windowStartDate) || !isDateToday(windowStartDate);

    const windowStartTimeStr = dateToLocaleTimeString(windowStartDate, '2-digit', '2-digit');
    const windowStartDateStr = dateToLocaleDateString(windowStartDate, 'short');
    const windowStartStr = showDate ? `${windowStartTimeStr} - ${windowStartDateStr}` : windowStartTimeStr;
    const windowEndTimeStr = dateToLocaleTimeString(windowEndDate, '2-digit', '2-digit');
    const windowEndDateStr = dateToLocaleDateString(windowEndDate, 'short');
    const windowEndStr = showDate ? `${windowEndTimeStr} - ${windowEndDateStr}` : windowEndTimeStr;

    return (
        <div className="space-y-1">
            <div className={cn(
                "text-center space-x-2 text-sm text-muted-foreground",
                rangeSelected && 'font-semibold text-primary'
            )}>
                <span>Period from <InlineCode title={windowStartDate.toISOString()}>{windowStartStr}</InlineCode> to <InlineCode title={windowEndDate.toISOString()}>{windowEndStr}</InlineCode>.</span>
            </div>
            <div className="md:rounded-xl border shadow-sm flex flex-col">
                <div className="rounded-t-[inherit]">
                    <div className="flex flex-col flex-shrink px-1 sm:px-4 py-2 space-y-4 border-b rounded-t-[inherit] bg-secondary/35">
                        <div className="flex items-center space-x-2">
                            <div className='hidden xs:block'><FolderOpenIcon className="size-4" /></div>
                            <h2 className="font-mono text-sm">Period Overview</h2>
                        </div>
                    </div>
                    <DrilldownOverviewSubcard dropTypes={windowData.dropTypes} />
                </div>

                <div className="pb-4">
                    <div className="flex flex-col flex-shrink px-1 sm:px-4 py-2 space-y-4 border-t border-b bg-secondary/35">
                        <div className="flex items-center space-x-2">
                            <div className='hidden xs:block'><BoxIcon className="size-4" /></div>
                            <h2 className="font-mono text-sm">Resource Kicks</h2>
                        </div>
                    </div>
                    <DrilldownResourcesSubcard resKicks={windowData.resKicks} />
                </div>

                <div className="pb-4">
                    <div className="flex flex-col flex-shrink px-1 sm:px-4 py-2 space-y-4 border-t border-b bg-secondary/35">
                        <div className="flex items-center space-x-2">
                            <div className='hidden xs:block'><ShapesIcon className="size-4" /></div>
                            <h2 className="font-mono text-sm">Environment Changes</h2>
                            <DynamicNewItem featName="playerDropsEnvChangesReversed" durationDays={14}>
                                <span className="text-2xs text-warning-inline/80">Note: This list now shows the most recent changes first.</span>
                            </DynamicNewItem>
                        </div>
                    </div>
                    <DrilldownChangesSubcard changes={windowData.changes} />
                </div>

                <div className="">
                    <div className="flex flex-row items-center justify-between flex-shrink px-1 sm:px-4 border-t border-b bg-secondary/35">
                        <div className="flex items-center py-2 space-x-2">
                            <div className='hidden xs:block'><SkullIcon className="size-4" /></div>
                            <h2 className="font-mono text-sm">Crash Reasons</h2>
                        </div>
                        <div className="flex gap-2">
                            <Select
                                value={crashesTargetLimit.toString()}
                                onValueChange={(value) => setCrashesTargetLimit(parseInt(value))}
                            >
                                <SelectTrigger
                                    className="w-32 h-6 px-3 py-1 text-sm"
                                >
                                    <SelectValue placeholder="Filter by admin" />
                                </SelectTrigger>
                                <SelectContent className="px-0">
                                    <SelectItem value={'50'} className="cursor-pointer">
                                        Top ~50
                                    </SelectItem>
                                    <SelectItem value={'100'} className="cursor-pointer">
                                        Top ~100
                                    </SelectItem>
                                    <SelectItem value={'0'} className="cursor-pointer">
                                        Show All
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={crashesGroupReasons.toString()}
                                onValueChange={(value) => setCrashesGroupReasons(value === 'true')}
                            >
                                <SelectTrigger
                                    className="w-36 h-6 px-3 py-1 text-sm"
                                >
                                    <SelectValue placeholder="Filter by admin" />
                                </SelectTrigger>
                                <SelectContent className="px-0">
                                    <SelectItem value={'false'} className="cursor-pointer">
                                        Sort by Count
                                    </SelectItem>
                                    <SelectItem value={'true'} className="cursor-pointer">
                                        Group Reasons
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DrilldownCrashesSubcard
                        crashTypes={windowData.crashTypes}
                        crashesGroupReasons={crashesGroupReasons}
                        crashesTargetLimit={crashesTargetLimit}
                        setCrashesTargetLimit={setCrashesTargetLimit}
                    />
                </div>
            </div>
        </div>
    )
};

export default memo(DrilldownCardInner);
