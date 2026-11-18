import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { ApiTimeout, useBackendApi } from '@/hooks/fetch';
import InlineCode from '@/components/InlineCode';
import { cn } from '@/lib/utils';
import { handleExternalLinkClick } from '@/lib/navigation';
import TxAnchor from '@/components/TxAnchor';

type SendReportResponse =
    | { reportId: string }
    | { error: string };

interface ReportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const InfoContent = () => (
    <div className="space-y-4 text-sm">
        <p className="text-sm">
            This <u>optional</u> feature sends a diagnostics report to the Cfx.re team, and may be required to diagnose a wide range of server issues.
            After sending the data, you will receive a Report ID you can send in the support channels.
        </p>

        <div className="space-y-4">
            <div>
                <h4 className="font-semibold text-warning-inline">
                    Who can access the data?
                </h4>
                <p>
                    The data will be available for up to 24 hours to the Cfx.re team.
                </p>
            </div>

            <div>
                <h4 className="font-semibold text-warning-inline">Which data will be sent?</h4>
                <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>All diagnostics page data</li>
                    <li>Recent txAdmin (system), live console and server log</li>
                    <li>Environment variables</li>
                    <li>Server performance (dashboard chart) data</li>
                    <li>Player database statistics</li>
                    <li>txAdmin settings (no bot token)</li>
                    <li>List of admins (no passwords/hashes)</li>
                    <li>List of files/folders in server data and monitor folders</li>
                    <li>Config files in server data folder</li>
                </ul>
            </div>

            <div>
                <h4 className="font-semibold text-warning-inline">
                    Sensitive Information Protection:
                </h4>
                <ul className="list-disc list-inside ml-4 space-y-1">
                    <li><strong>Settings:</strong> the Discord Bot Token will be removed</li>
                    <li><strong>Admin List:</strong> the password hashes will not be sent</li>
                    <li>
                        <strong>Env Vars:</strong> parameters with{' '}
                        <span className="text-xs space-x-1">
                            <InlineCode>key</InlineCode>,
                            <InlineCode>license</InlineCode>,
                            <InlineCode>pass</InlineCode>,
                            <InlineCode>private</InlineCode>,
                            <InlineCode>secret</InlineCode>,
                            <InlineCode>token</InlineCode>
                        </span>{' '}
                        in their name will be masked
                    </li>
                    <li>
                        <strong>CFG Files:</strong> known secret parameters will be masked
                        (eg. license, mysql string, tebex secret, webhooks, etc.)
                    </li>
                    <li><strong>Logs:</strong> any identifiable IPv4 address in logs will be masked</li>
                </ul>
            </div>
        </div>
    </div>
);

const LoadingContent = () => (
    <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Sending diagnostics data...</p>
    </div>
);

const SuccessContent = ({ reportId }: { reportId: string }) => (
    <div className="text-center">
        <div className="mb-4 flex flex-wrap gap-4 items-center justify-center text-2xl">
            <h3 className="font-semibold">Report ID:</h3>
            <div className="bg-muted p-2 rounded-lg">
                <span className="font-mono text-accent tracking-[0.35em] -mr-[0.35em] font-bold">
                    {reportId}
                </span>
            </div>
        </div>
        <p className="text-muted-foreground pt-2">
            Please send this ID to the support team in <TxAnchor
                href="https://discord.gg/uAmsGa2"
                className="font-semibold tracking-wide text-primary"
            >
                discord.gg/txAdmin
            </TxAnchor>.
        </p>
    </div>
);

const ErrorContent = ({ error }: { error: string }) => (
    <div className="text-center">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-destructive mb-2">Error</h3>
            <p className="text-destructive">{error}</p>
        </div>
    </div>
);

export const DiscordBadge = ({ className }: { className?: string }) => (
    <a
        href="https://discord.gg/uAmsGa2"
        target="_blank"
        rel="noopener noreferrer"
        className={cn("inline-block ml-1", className)}
        onClick={handleExternalLinkClick}
    >
        <img
            src="https://discordapp.com/api/guilds/577993482761928734/widget.png?style=shield"
            alt="Discord"
            className="h-5 self-end"
        />
    </a>
);

export function ReportDialog({ open, onOpenChange }: ReportDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [reportId, setReportId] = useState('');
    const [error, setError] = useState('');

    //Wipe the state when the dialog is opened
    useEffect(() => {
        if (open) {
            setIsLoading(false);
            setReportId('');
            setError('');
        }
    }, [open]);

    const sendReportApi = useBackendApi<SendReportResponse>({
        method: 'POST',
        path: '/diagnostics/sendReport',
    });

    const handleSend = async () => {
        setIsLoading(true);
        setError('');
        sendReportApi({
            //NOTE: in NUI, empty bodies become GET requests even if you specify POST
            data: { bugfix: true },
            timeout: ApiTimeout.LONG,
            success: (data) => {
                if ('reportId' in data) {
                    setReportId(data.reportId);
                } else {
                    setError(data.error);
                }
            },
            error: (err) => setError(err),
            finally: () => setIsLoading(false),
        });
    };

    const showInitialState = !isLoading && !reportId && !error;
    const showSuccess = !isLoading && !!reportId;
    const showError = !isLoading && !!error;
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Send Diagnostics Data</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    {isLoading && <LoadingContent />}
                    {showInitialState && <InfoContent />}
                    {showSuccess && <SuccessContent reportId={reportId} />}
                    {showError && <ErrorContent error={error} />}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                    {showInitialState && (
                        <Button onClick={handleSend}>
                            Agree & Send Data
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
