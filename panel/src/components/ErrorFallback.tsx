import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/components/ui/card"
import { FallbackProps } from "react-error-boundary";
import { FiAlertOctagon } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect } from "react";
import { LocalStorageKey } from "@/lib/localStorage";

//Used for global errors
export function AppErrorFallback({ error }: FallbackProps) {
    const refreshPage = () => {
        window.location.reload();
    }
    return (
        <div className="w-screen h-screen flex flex-col items-center justify-center">
            <GenericErrorBoundaryCard
                title="App Error:"
                description="Due to an unexpected error, the panel has crashed."
                error={error}
                resetButton={<Button variant="outline" onClick={refreshPage}>Refresh</Button>}
            />
        </div>
    );
}

//Used for page errors (inside the shell)
export function PageErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
    return (
        <div className="w-full flex flex-col items-center justify-center">
            <GenericErrorBoundaryCard
                title="Page Error:"
                description="There was an error rendering this page."
                error={error}
                resetButton={<Button variant="outline" onClick={resetErrorBoundary}>Go Back</Button>}
            />
        </div>
    );
}


type GenericErrorBoundaryCardProps = {
    title: string;
    description: string;
    error: Error;
    resetButton: React.ReactNode;
}

export function GenericErrorBoundaryCard(props: GenericErrorBoundaryCardProps) {
    //Auto refresh the page if the error is related to removeChild - dev mode only
    if (window.txConsts.showAdvanced) {
        useEffect(() => {
            if (props.error.message?.includes("Failed to execute 'removeChild' on 'Node'")) {
                console.warn('Detected removeChild error, scheduling reload');
                // Use a flag in sessionStorage to prevent infinite reload loops
                const lastReloadRaw = localStorage.getItem(LocalStorageKey.ErrorFallbackLastReload);
                const now = Date.now();
                const lastReload = lastReloadRaw ? parseInt(lastReloadRaw) : 0;
                if (now - lastReload > 30_000) {
                    localStorage.setItem(LocalStorageKey.ErrorFallbackLastReload, now.toString());
                    setTimeout(() => window.location.reload(), 500);
                }
            }
        }, [props.error]);
    }

    return (
        <Card className="max-w-xl">
            <CardHeader>
                <h1 className="text-3xl text-red-500 pb-0 flex flex-row justify-start items-center">
                    <FiAlertOctagon className="inline-block mr-2" />
                    {props.title}
                </h1>
                <span className="text-sm text-muted-foreground pt-0">{props.description}</span>
            </CardHeader>
            <CardContent>
                <p className="truncate">
                    Page:&nbsp;
                    <code className="text-muted-foreground ">
                        {window.location.pathname ?? 'unknown'}
                        {window.location.search ?? ''}
                    </code>
                </p>
                <p>
                    Versions:&nbsp;
                    <code className="text-muted-foreground">
                        txAdmin v{window.txConsts.txaVersion} atop FXServer b{window.txConsts.fxsVersion}
                    </code>
                </p>
                <p>
                    Message:&nbsp;
                    <code className="text-muted-foreground">{props.error.message ?? 'unknown'}</code>
                </p>
                <p>Stack:</p>
                <pre className="mt-1">
                    <ScrollArea
                        className="p-2 border border-red-800 rounded-sm 
                                font-mono text-muted-foreground text-xs text-red-800
                                h-32 w-full"
                    >{props.error.stack}</ScrollArea>
                </pre>
            </CardContent>
            <CardFooter className="flex flex-row justify-between">
                {props.resetButton}
                <Button
                    asChild
                    variant="outline"
                    className="bg-discord hover:bg-discord-active animate-pulse hover:animate-none"
                >
                    <a href="http://discord.gg/txAdmin" target="_blank" rel="noopener noreferrer">
                        Support Discord
                    </a>
                </Button>
            </CardFooter>
        </Card>
    );
}
