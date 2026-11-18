import { Button } from "@/components/ui/button";
import useWarningBar from "@/hooks/useWarningBar";
import { LocalStorageKey } from "@/lib/localStorage";
import { cn } from "@/lib/utils";
import { BellOffIcon, CloudOffIcon, DownloadCloudIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { FaDiscord } from "react-icons/fa";

const MAJOR_DISMISSAL_TIME = 12 * 60 * 60 * 1000;
const MINOR_DISMISSAL_TIME = 48 * 60 * 60 * 1000;

const getTsUpdateDismissed = () => {
    const stored = localStorage.getItem(LocalStorageKey.UpdateWarningPostponedTs);
    if (!stored) return false;
    const parsed = parseInt(stored);
    if (isNaN(parsed)) return false;
    return parsed;
}

const checkPostponeStatus = (isImportant: boolean) => {
    const tsLastDismissal = getTsUpdateDismissed();
    const tsNow = Date.now();
    const maxTime = isImportant ? MAJOR_DISMISSAL_TIME : MINOR_DISMISSAL_TIME;
    if (!tsLastDismissal || tsLastDismissal + maxTime < tsNow) {
        return true;
    }
    return false;
}

type InnerWarningBarProps = {
    titleIcon: React.ReactNode;
    title: React.ReactNode;
    description: React.ReactNode;
    isImportant: boolean;
    canPostpone: boolean;
};

export function InnerWarningBar({ titleIcon, title, description, isImportant, canPostpone }: InnerWarningBarProps) {
    const [rand, setRand] = useState(0);

    const forceRerender = () => {
        setRand(Math.random());
    }

    const postponeUpdate = () => {
        localStorage.setItem(LocalStorageKey.UpdateWarningPostponedTs, Date.now().toString());
        forceRerender()
    }

    useEffect(() => {
        const interval = setInterval(() => {
            forceRerender()
        }, 60_000);
        return () => clearInterval(interval);
    }, []);

    if (canPostpone && !checkPostponeStatus(isImportant)) return null;
    return (
        <div className='fixed top-navbarvh w-full flex justify-center z-40'>
            <div className={cn(
                "w-full sm:w-[28rem] min-h-9 hover:min-h-32 overflow-hidden sm:rounded-b-md",
                "flex flex-col justify-center items-center p-1",
                "group cursor-default transition-[height] shadow-xl",
                isImportant ? 'bg-destructive text-destructive-foreground' : 'bg-info text-info-foreground'
            )}>
                <h2 className="text-md text-center group-hover:font-medium">
                    {titleIcon}
                    {title}
                </h2>

                <span className='hidden group-hover:block text-center text-sm'>
                    {description}
                    <div className="flex flex-row justify-center items-center mt-3 gap-4">
                        {canPostpone && <Button
                            size="xs"
                            variant="outline"
                            onClick={() => postponeUpdate()}
                            className={isImportant ? "text-foreground border-foreground" : 'dark:border-primary-foreground dark:hover:border-primary'}
                        >
                            <BellOffIcon className="h-[0.9rem] mr-1" /> Postpone
                        </Button>}

                        <Button
                            size="xs"
                            variant="outline"
                            asChild
                            className={isImportant ? "text-foreground border-foreground" : 'dark:border-primary-foreground dark:hover:border-primary'}
                        >
                            <a href="https://discord.gg/uAmsGa2" target="_blank">
                                <FaDiscord size="14" className="mr-1" /> Support
                            </a>
                        </Button>
                    </div>
                </span>
            </div>
        </div>
    );
}


export default function WarningBar() {
    const { offlineWarning, txUpdateData, fxUpdateData } = useWarningBar();

    if (offlineWarning) {
        return <InnerWarningBar
            titleIcon={<CloudOffIcon className="inline h-[1.2rem] -mt-1 mr-1" />}
            title="Socket connection lost."
            description={<>
                The connection to the txAdmin server has been lost. <br />
                If you closed FXServer, please restart it.
            </>}
            isImportant={true}
            canPostpone={false}
        />
    } else if (txUpdateData) {
        return <InnerWarningBar
            titleIcon={<DownloadCloudIcon className="inline h-[1.2rem] -mt-1 mr-1" />}
            title={txUpdateData.isImportant
                ? 'This version of txAdmin is outdated.'
                : 'A patch (bug fix) update is available for txAdmin.'}
            description={txUpdateData.isImportant
                ? `Version v${txUpdateData.version} has been released bringing new features, bug fixes and improvements.`
                : `If you are experiencing any kind of issue, please update to v${txUpdateData.version}.`}
            isImportant={txUpdateData.isImportant}
            canPostpone={true}
        />
    } else if (fxUpdateData) {
        return <InnerWarningBar
            titleIcon={<DownloadCloudIcon className="inline h-[1.2rem] -mt-1 mr-1" />}
            title={fxUpdateData.isImportant
                ? 'This version of FXServer is outdated.'
                : 'An update is available for FXServer.'}
            description={`Please update FXServer to artifact ${fxUpdateData.version}.`}
            isImportant={fxUpdateData.isImportant}
            canPostpone={true}
        />
    } else {
        return null;
    }
}
