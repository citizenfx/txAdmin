import { Settings } from "lucide-react";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import type { LiveConsoleOptionsPopoverProps } from "./OptionsPopover";
import LiveConsoleOptionsPopover from "./OptionsPopover";
import { DynamicNewBadge } from "@/components/DynamicNewBadge";
import { useState } from "react";
import { useContentRefresh } from "@/hooks/pages";


export default function LiveConsoleHeader(popoverProps: Omit<LiveConsoleOptionsPopoverProps, 'setHasPendingRefresh'>) {
    const [hasPendingRefresh, setHasPendingRefresh] = useState(false);
    const refreshPage = useContentRefresh();

    return (
        <div className="flex flex-col flex-shrink px-1 sm:px-4 py-2 space-y-4 border-b">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <svg
                        className="w-4 h-4 text-green-500"
                        fill="none"
                        height="24"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        width="24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <polyline points="4 17 10 11 4 5" />
                        <line x1="12" x2="20" y1="19" y2="19" />
                    </svg>
                    <p className="font-mono text-sm">Live Console</p>
                </div>

                <div className="flex items-center space-x-1">
                    <Popover onOpenChange={(state) => {
                        if (!state && hasPendingRefresh) {
                            refreshPage();
                            setHasPendingRefresh(false);
                        }
                    }}>
                        {/* FIXME:NEXT:UPDATE remove */}
                        <DynamicNewBadge featName="liveConsoleOptions" size="md" />
                        <PopoverTrigger asChild>
                            <button className="p-2 hover:bg-accent rounded-md">
                                <Settings className="w-4 h-4" />
                            </button>
                        </PopoverTrigger>
                        <LiveConsoleOptionsPopover
                            options={popoverProps.options}
                            setOptions={popoverProps.setOptions}
                            setHasPendingRefresh={setHasPendingRefresh}
                        />
                    </Popover>
                </div>
            </div>
        </div>
    )
}
