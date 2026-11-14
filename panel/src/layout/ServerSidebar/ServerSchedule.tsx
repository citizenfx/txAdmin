import InlineCode from '@/components/InlineCode';
import { txToast } from '@/components/TxToaster';
import { Button } from '@/components/ui/button';
import { useOpenPromptDialog } from '@/hooks/dialogs';
import { useCloseAllSheets } from '@/hooks/sheets';
import { useGlobalStatus } from '@/hooks/status';
import { useBackendApi } from '@/hooks/fetch';
import { cn } from '@/lib/utils';
import { msToDuration } from '@/lib/dateTime';
import { PenLineIcon, PlayCircleIcon, PlusCircleIcon, XCircleIcon } from 'lucide-react';
import { useAdminPerms } from '@/hooks/auth';

//Prompt props
const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const timezoneDiffMessage = (
    <p className='text-destructive'>
        Server's timezone: <b>{window.txConsts.serverTimezone}</b> <br />
        Your timezone: <b>{browserTimezone}</b> <br />
        Either use relative times, or make sure the scheduled is based on the server timezone.
    </p>
)
const promptCommonProps = {
    suggestions: ['+5', '+10', '+15', '+30'],
    title: 'When should the server restart?',
    message: (<>
        <p>
            Possible formats: <br />
            <ul className='list-disc ml-4'>
                <li>
                    <InlineCode>+MM</InlineCode> relative time in minutes
                    (example: <InlineCode>+15</InlineCode> for 15 minutes from now.)
                </li>
                <li>
                    <InlineCode>HH:MM</InlineCode> absolute 24-hour time
                    (example: <InlineCode>23:30</InlineCode> for 11:30 PM.)
                </li>
            </ul>
        </p>
        {browserTimezone !== window.txConsts.serverTimezone && timezoneDiffMessage}
    </>),
    placeholder: '+15',
    required: true,
    isWide: true,
};

//Validate schedule time input for 24h format or relative time
const validateSchedule = (input: string) => {
    if (input.startsWith('+')) {
        const minutes = parseInt(input.substring(1));
        if (isNaN(minutes) || minutes < 1 || minutes >= 1440) {
            return false;
        }
    } else {
        const [hours, minutes] = input.split(':', 2).map(x => parseInt(x));
        if (
            typeof hours === 'undefined' || isNaN(hours) || hours < 0 || hours > 23
            || typeof minutes === 'undefined' || isNaN(minutes) || minutes < 0 || minutes > 59
        ) {
            return false;
        }
    }
    return true;
}


export default function ServerSchedule() {
    const closeAllSheets = useCloseAllSheets();
    const openPromptDialog = useOpenPromptDialog();
    const { hasPerm } = useAdminPerms();
    const schedulerApi = useBackendApi({
        method: 'POST',
        path: '/fxserver/schedule'
    });

    const globalStatus = useGlobalStatus();
    if (!globalStatus) {
        return <div>
            <h2 className="mb-1 text-lg font-semibold tracking-tight">
                Next Restart:
            </h2>
            <span className='font-light text-muted-foreground italic'>loading...</span>
        </div>
    }

    //Processing status
    const { scheduler } = globalStatus;
    let nextScheduledText = 'nothing scheduled';
    let nextScheduledClasses = 'text-muted-foreground italic';
    let disableAddEditBtn = false;
    let showCancelBtn = false;
    let showEnableBtn = false;
    const hasScheduledRestart = typeof scheduler.nextRelativeMs === 'number';
    if (hasScheduledRestart) {
        const tempFlag = (scheduler.nextIsTemp) ? '(temp)' : '';
        const relativeTime = msToDuration(scheduler.nextRelativeMs, { units: ['h', 'm'] });
        const isLessThanMinute = scheduler.nextRelativeMs < 60_000;
        if (scheduler.nextIsDelayed) {
            disableAddEditBtn = true;
            nextScheduledText = `delayed, waiting for players to leave ${tempFlag}`;
        } else if (isLessThanMinute) {
            disableAddEditBtn = true;
            nextScheduledText = `right now ${tempFlag}`;
        } else {
            nextScheduledText = `in ${relativeTime} ${tempFlag}`;
        }

        if (scheduler.nextSkip) {
            nextScheduledClasses = 'text-muted-foreground line-through';
            if (!isLessThanMinute) {
                showEnableBtn = true;
            }
        } else {
            nextScheduledClasses = 'text-warning-inline';
            if (!isLessThanMinute || scheduler.nextIsDelayed) {
                showCancelBtn = true;
            }
        }
    }


    //Handlers
    const onScheduleSubmit = (input: string) => {
        closeAllSheets();
        if (input.includes(',')) {
            txToast.error({
                title: 'Invalid scheduled restart time.',
                msg: 'It looks like you are trying to schedule multiple restart times, which can only be done in the Settings page.\nThis input is for just the next (not persistent) restart.',
            }, { duration: 10000 });
            return;
        }
        if (!validateSchedule(input)) {
            txToast.error(`Invalid schedule time: ${input}`)
            return;
        }
        schedulerApi({
            data: { action: 'setNextTempSchedule', parameter: input },
            toastLoadingMessage: 'Scheduling server restart...',
        });
    }
    const handleEdit = () => {
        openPromptDialog({
            ...promptCommonProps,
            onSubmit: onScheduleSubmit,
            submitLabel: 'Edit',
        });
    }
    const handleAddSchedule = () => {
        openPromptDialog({
            ...promptCommonProps,
            onSubmit: onScheduleSubmit,
            submitLabel: 'Schedule',
        });
    }
    const handleCancel = () => {
        closeAllSheets();
        schedulerApi({
            data: { action: 'setNextSkip', parameter: true },
            toastLoadingMessage: 'Cancelling next server restart...',
        });
    }
    const handleEnable = () => {
        closeAllSheets();
        schedulerApi({
            data: { action: 'setNextSkip', parameter: false },
            toastLoadingMessage: 'Enabling next server restart...',
        });
    }

    const hasSchedulePerms = hasPerm('control.server');

    return <div>
        <h2 className="mb-1 text-lg font-semibold tracking-tight">
            Next Restart:
        </h2>
        <span className={cn('font-light', nextScheduledClasses)}>{nextScheduledText}</span>
        <div className='flex flex-row justify-between gap-2 mt-2 flex-wrap'>
            {hasScheduledRestart ? (
                <Button
                    size='xs'
                    variant='ghost'
                    className='flex-grow bg-muted border shadow'
                    disabled={!hasSchedulePerms || disableAddEditBtn}
                    onClick={handleEdit}
                >
                    <PenLineIcon className='h-4 w-4 mr-1' /> Edit
                </Button>
            ) : (
                <Button
                    size='xs'
                    variant='ghost'
                    className='flex-grow bg-muted border shadow'
                    disabled={!hasSchedulePerms || disableAddEditBtn}
                    onClick={handleAddSchedule}
                >
                    <PlusCircleIcon className='h-4 w-4 mr-1' /> Schedule Restart
                </Button>
            )}
            {showCancelBtn && (
                <Button
                    size='xs'
                    variant='ghost'
                    className='flex-grow bg-muted border shadow'
                    onClick={handleCancel}
                    disabled={!hasSchedulePerms}
                >
                    <XCircleIcon className='h-4 w-4 mr-1' /> Cancel
                </Button>
            )}
            {showEnableBtn && (
                <Button
                    size='xs'
                    variant='ghost'
                    className='flex-grow bg-muted border'
                    onClick={handleEnable}
                    disabled={!hasSchedulePerms}
                >
                    <PlayCircleIcon className='h-4 w-4 mr-1' /> Enable
                </Button>
            )}
        </div>
    </div>
}
