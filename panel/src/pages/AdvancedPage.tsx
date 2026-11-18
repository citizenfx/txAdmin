
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SendIcon, DownloadIcon, HelpCircleIcon, AlertCircleIcon, DeleteIcon, CommandIcon, SquareTerminalIcon, Loader2Icon } from "lucide-react";
import { advancedCommands } from "@shared/advancedCommands";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import JsonCodeBlock from "@/components/JsonCodeBlock";
import MarkdownProse from "@/components/MarkdownProse";
import { cn, downloadTextFile } from "@/lib/utils";
import { txToast } from "@/components/TxToaster";
import type {
    RunAdvancedCommandResp,
    RunAdvancedCommandRespSuccess,
    RunAdvancedCommandReq,
} from "@shared/advancedCommands";
import { getUrlSearchParam, setUrlSearchParam } from "@/lib/navigation";
import { useBackendApi } from "@/hooks/fetch";


function HelpPopover({ onCommandClick }: { onCommandClick: (c: string) => void }) {
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    const handleCommandClick = (commandName: string) => {
        onCommandClick(commandName);
        setIsHelpOpen(false);
    }

    return (
        <Popover open={isHelpOpen} onOpenChange={setIsHelpOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" title="Help" size="icon">
                    <HelpCircleIcon className="w-5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[100vw] xs:w-[500px] p-0" align="end">
                <div className="p-4 border-b">
                    <h3 className="font-semibold">Available Commands</h3>
                    <p className="text-sm text-muted-foreground">Click a command to autofill it</p>
                </div>
                <ScrollArea className="h-[500px]">
                    <div className="p-4 space-y-3">
                        {advancedCommands.map((cmd) => (
                            <button
                                key={cmd.name}
                                className="w-full text-left p-3 rounded-lg border bg-black/5 border-transparent hover:border-border transition-all"
                                onClick={() => handleCommandClick(cmd.name)}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono font-bold text-sm text-foreground">
                                            {cmd.name}
                                        </span>
                                        {cmd.args?.map((arg, index) => (
                                            <Badge key={index} variant="outline" className="text-xs font-mono px-2 py-0.5 rounded-md font-light">
                                                {arg}
                                            </Badge>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {cmd.desc}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}


function OutputArea({ output }: { output: RunAdvancedCommandRespSuccess | null }) {
    return (
        <div className="pt-4">
            {output ? (
                'error' in output ? (
                    <Alert variant="destructive">
                        <AlertCircleIcon className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{output.error}</AlertDescription>
                    </Alert>
                ) : output.type === 'md' ? (
                    <div className="bg-muted/40 p-4 rounded-md">
                        <MarkdownProse md={output.data} className="max-w-none" />
                    </div>
                ) : (
                    <div className="bg-muted/40 p-4 rounded-md">
                        <JsonCodeBlock value={output.data} />
                    </div>
                )
            ) : (
                <p className="text-muted-foreground opacity-50">
                    No output yet. Run a command to see the the output here.
                </p>
            )}
        </div>
    )
}

export default function AdvancedPage() {
    const inputRef = useRef<HTMLInputElement>(null);
    const [output, setOutput] = useState<RunAdvancedCommandRespSuccess | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const runCommandApi = useBackendApi<RunAdvancedCommandResp, RunAdvancedCommandReq>({
        method: 'POST',
        path: `/advanced/run`,
    });

    //Get autofill from the url
    useEffect(() => {
        if (!inputRef.current) return;
        const autofill = getUrlSearchParam('cmd');
        if (autofill) {
            inputRef.current.value = autofill;
            inputRef.current.focus();
        }
    }, [inputRef]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading || !inputRef.current) return;
        const cmd = inputRef.current.value.trim();
        if (!cmd) {
            inputRef.current.focus();
            return;
        }

        setUrlSearchParam('cmd', cmd);
        setIsLoading(true);
        runCommandApi({
            data: { cmd },
            finally: () => {
                setIsLoading(false);
                setTimeout(() => inputRef.current?.focus(), 50);
            },
            success: (data) => setOutput(data),
            error: (error) => setOutput({ error }),
        });
    }

    const handleClearOutput = () => {
        setOutput(null);
    }

    const handleSave = () => {
        if (!output) return;
        const content = 'error' in output ? output.error : output.data;
        const command = inputRef.current?.value.trim() || 'command';
        const extension = 'error' in output ? 'txt' : output.type === 'md' ? 'md' : 'json';
        const success = downloadTextFile(content, command, extension);
        if (!success) {
            txToast.error('Failed to download file. Please try again.');
        }
    }

    return (
        <div className="relative flex flex-col h-full w-full space-y-6">
            <div className="flex flex-wrap-reverse gap-6">
                {/* Input Card */}
                <Card className="w-full 2xl:flex-1 2xl:min-w-80">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CommandIcon className="size-6 text-muted-foreground" />
                                Advanced Commands
                            </div>
                            <HelpPopover onCommandClick={(c) => {
                                if (!inputRef.current) return;
                                inputRef.current.value = c + " ";
                                inputRef.current.focus();
                            }} />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <Input
                                ref={inputRef}
                                className="flex-1"
                                disabled={isLoading}
                                placeholder="Type a command or click the help button..."
                            />
                            <Button type="submit" disabled={isLoading} title="Run command" size="icon">
                                {isLoading ? (
                                    <Loader2Icon className="w-5 mt-0.5 mr-0.5 animate-spin" />
                                ) : (
                                    <SendIcon className="w-5 mt-0.5 mr-0.5" />
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Warning Card - appears first when wrapped */}
                <Alert
                    variant="default"
                    className="max-2xl:w-full mx-auto 2xl:w-auto 2xl:flex-shrink-0  2xl:max-w-sm relative bg-warning-hint border-warning dark:opacity-75"
                >
                    <AlertCircleIcon className="h-4 w-4" />
                    <AlertTitle>Caution</AlertTitle>
                    <AlertDescription>
                        This page is meant to be used by advanced users only, and there is no documentation for it. <strong>Use at your own risk.</strong>
                    </AlertDescription>
                </Alert>
            </div>

            {/* Output Area */}
            <div className="flex-1">
                <div className="flex items-center justify-between pb-3 border-b">
                    <div className="flex items-center gap-2">
                        <SquareTerminalIcon className="size-6 text-muted-foreground" />
                        <h2 className="text-lg font-semibold">Output</h2>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearOutput}
                            disabled={!output}
                            title="Clear output"
                        >
                            <DeleteIcon className="w-5 mr-0.5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSave}
                            disabled={!output}
                            title="Save output"
                        >
                            <DownloadIcon className="w-4" />
                        </Button>
                    </div>
                </div>
                <OutputArea output={output} />
            </div>

            {/* txSnaily */}
            <img
                className={cn(
                    "absolute bottom-0 right-0 size-64 opacity-35 pointer-events-none",
                    "border border-transparent",
                    isLoading && "opacity-100 animate-bounce",
                )}
                src="img/txSnaily2anim_320.png"
                alt="Not A Meme"
            />
        </div>
    )
}
