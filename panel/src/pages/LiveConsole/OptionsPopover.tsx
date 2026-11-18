import { PopoverContent } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollbackSizes } from "./xtermOptions";
import type { TerminalOptions, ScrollbackSize, DensityMode, TimestampMode } from "./xtermOptions";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export type LiveConsoleOptionsPopoverProps = {
    options: TerminalOptions;
    setOptions: (options: Partial<TerminalOptions>) => void;
    setHasPendingRefresh: (hasPendingRefresh: boolean) => void;
}

export default function LiveConsoleOptionsPopover({
    options,
    setOptions,
    setHasPendingRefresh,
}: LiveConsoleOptionsPopoverProps) {
    return (
        <PopoverContent className="w-96">
            <div className="grid gap-6">
                {/* Header */}
                <div className="space-y-1.5">
                    <h4 className="font-medium leading-none">Live Console Settings</h4>
                    <p className="text-sm text-muted-foreground">
                        Customize the appearance and behavior of your live console. These settings will be saved.
                    </p>
                </div>

                {/* Display Settings */}
                <div className="space-y-4">
                    <h5 className="text-sm font-medium leading-none">Display Options</h5>
                    <div className="grid gap-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="density" className="col-span-1">Font Size</Label>
                            <div className="col-span-3">
                                <Select
                                    value={options.density}
                                    onValueChange={(value) => setOptions({ density: value as DensityMode })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select density" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SPACIOUS">Large</SelectItem>
                                        <SelectItem value="COMFORTABLE">Medium</SelectItem>
                                        <SelectItem value="COMPACT">Small</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="timestamp" className="col-span-1">Timestamp</Label>
                                <div className="col-span-3">
                                    <Select
                                        value={options.timestamp}
                                        onValueChange={(value) => {
                                            setHasPendingRefresh(true);
                                            setOptions({ timestamp: value as TimestampMode });
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select timestamp mode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DEFAULT">System Default</SelectItem>
                                            <SelectItem value="FORCE12H">Force 12h Mode</SelectItem>
                                            <SelectItem value="FORCE24H">Force 24h Mode</SelectItem>
                                            <SelectItem value="DISABLED">Disabled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="scrollback" className="col-span-1">Scrollback</Label>
                            <div className="col-span-3">
                                <Select
                                    value={options.scrollback.toString()}
                                    onValueChange={(value) => setOptions({ scrollback: Number(value) as ScrollbackSize })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select size" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ScrollbackSizes.LARGE.toString()}>10k lines</SelectItem>
                                        <SelectItem value={ScrollbackSizes.MEDIUM.toString()}>5k lines (default)</SelectItem>
                                        <SelectItem value={ScrollbackSizes.SMALL.toString()}>2.5k lines</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>

                <Separator className="my-1" />

                {/* Copy Settings */}
                <div className="space-y-4">
                    <h5 className="text-sm font-medium leading-none">Copy Options</h5>
                    <div className="grid gap-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="copyTimestamp">Include Timestamp</Label>
                            <Switch
                                id="copyTimestamp"
                                checked={options.copyTimestamp}
                                onCheckedChange={(checked) => setOptions({ copyTimestamp: checked })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="copyChannel">Include Channel</Label>
                            <Switch
                                id="copyChannel"
                                checked={options.copyChannel}
                                onCheckedChange={(checked) => setOptions({ copyChannel: checked })}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </PopoverContent>
    )
}
