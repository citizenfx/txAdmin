import MarkdownProse from "@/components/MarkdownProse";
import { cn } from "@/lib/utils";
import { handleExternalLinkClick } from "@/lib/navigation";
import { cva } from "class-variance-authority";
import { AlertCircleIcon, AlertOctagonIcon, CheckCircleIcon, ChevronRightCircle, InfoIcon, Loader2Icon, XIcon } from "lucide-react";
import toast, { Toast, Toaster } from "react-hot-toast";
import { useEffect, useState } from "react";
import { ApiToastResp } from "@shared/genericApiTypes";


//MARK: Types
export const validToastTypes = ['default', 'loading', 'info', 'success', 'warning', 'error'] as const;
type TxToastType = typeof validToastTypes[number];

type TxToastData = string | {
    title?: string;
    md?: boolean
    msg: string;
}

type TxToastOptions = {
    id?: string;
    duration?: number;
}


//MARK: Components
const toastBarVariants = cva(
    `max-w-xl w-full sm:w-auto sm:min-w-[28rem] relative overflow-hidden z-40
    p-3 pr-10 flex items-center justify-between space-x-4
    rounded-xl border shadow-lg transition-all pointer-events-none
    text-black/75 dark:text-white/90`,
    {
        variants: {
            type: {
                default: "dark:border-primary/25 bg-white dark:bg-secondary dark:text-secondary-foreground",
                loading: "dark:border-primary/25 bg-white dark:bg-secondary dark:text-secondary-foreground",
                info: "border-info/70 bg-info-hint",
                success: "border-success/70 bg-success-hint",
                warning: "border-warning/70 bg-warning-hint",
                error: "border-destructive/70 bg-destructive-hint",
            },
        },
        defaultVariants: {
            type: "default",
        },
    }
);

const toastIconMap = {
    default: <ChevronRightCircle className="stroke-muted-foreground animate-toastbar-icon" />,
    loading: <Loader2Icon className="animate-spin" />,
    info: <InfoIcon className="stroke-info animate-toastbar-icon" />,
    success: <CheckCircleIcon className="stroke-success animate-toastbar-icon" />,
    warning: <AlertCircleIcon className="stroke-warning animate-toastbar-icon" />,
    error: <AlertOctagonIcon className="stroke-destructive animate-toastbar-icon" />,
} as const;

type CustomToastProps = {
    t: Toast,
    type: TxToastType,
    data: TxToastData,
}

export const CustomToast = ({ t, type, data }: CustomToastProps) => {
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        const cleanup = () => { timer && clearInterval(timer) };

        if (type === "loading" && t.visible) {
            timer = setInterval(() => {
                setElapsedTime((prevElapsedTime) => prevElapsedTime + 1);
            }, 1000);
        } else if (timer) {
            cleanup();
        }

        return cleanup;
    }, [type, t.visible]);

    return (
        <div
            className={cn(
                toastBarVariants({ type }),
                t.visible ? "animate-toastbar-enter" : "animate-toastbar-leave"
            )}
        >
            <div className="flex-shrink-0 flex flex-col gap-2 items-center">
                {type === "loading" && elapsedTime > 5 ? (
                    <div className="min-w-[2.65rem] text-center bg-muted/75 rounded-full">
                        <span className="text-xs text-secondary-foreground">{elapsedTime}s</span>
                    </div>
                ) : toastIconMap[type]}
            </div>
            <div className="flex-grow">
                {typeof data === "string" ? (
                    <span className="block whitespace-pre-line">{data}</span>
                ) : data.md ? (
                    <>
                        {data.title ? <MarkdownProse md={`**${data.title}**`} isSmall isTitle isToast /> : null}
                        <MarkdownProse md={data.msg} isSmall isToast />
                    </>
                ) : (
                    <>
                        <span className="font-semibold mb-1">{data.title}</span>
                        <span className="block whitespace-pre-line">{data.msg}</span>
                    </>
                )}
                {type === 'error' && (
                    <small className="block text-xs tracking-wide text-muted-foreground">
                        For support, visit&nbsp;
                        <a
                            href="https://discord.gg/uAmsGa2"
                            target="_blank"
                            onClick={handleExternalLinkClick}
                            className="font-semibold no-underline hover:underline m-0"
                        >
                            discord.gg/txAdmin
                        </a>.
                    </small>
                )}
            </div>

            <button onClick={() => toast.dismiss(t.id)} className="absolute right-4 top-4 opacity-70">
                <XIcon className="h-6 sm:w-6 md:h-5 md:w-5" />
                <span className="sr-only">Close</span>
            </button>
        </div>
    );
};


//Element to be added to MainShell
export default function TxToaster() {
    return <Toaster
        reverseOrder={true}
        containerStyle={{
            top: 'var(--content-offset)',
            zIndex: 60,
        }}
    />
}


//MARK: Utilities
/**
 * Returns a toast with the given type
 */
const callToast = (type: TxToastType, data: TxToastData, options: TxToastOptions = {}) => {
    const msg = typeof data === 'string' ? data : data.msg;
    const msgWords = msg.split(/\s+/).length;
    let defaultDuration: number;
    if (msgWords < 15) {
        defaultDuration = 5_000;
    } else if (msgWords < 25) {
        defaultDuration = 7_500;
    } else if (msgWords < 50) {
        defaultDuration = 10_000;
    } else {
        defaultDuration = 15_000;
    }
    options.duration ??= type === 'loading' ? Infinity : defaultDuration;
    return toast.custom((t: Toast) => {
        return <CustomToast t={t} type={type} data={data} />;
    }, options);
}


/**
 * Calls a toast with the given type
 */
const genericToast = (data: ApiToastResp & { title?: string }, options?: TxToastOptions) => {
    return callToast(data.type, data, options);
}


/**
 * Global Toast Caller, as function or as object with specific types.
 */
export const txToast = Object.assign(genericToast, {
    default: (data: TxToastData, options?: TxToastOptions) => callToast('default', data, options),
    loading: (data: TxToastData, options?: TxToastOptions) => callToast('loading', data, options),
    info: (data: TxToastData, options?: TxToastOptions) => callToast('info', data, options),
    success: (data: TxToastData, options?: TxToastOptions) => callToast('success', data, options),
    warning: (data: TxToastData, options?: TxToastOptions) => callToast('warning', data, options),
    error: (data: TxToastData, options?: TxToastOptions) => callToast('error', data, options),
    dismiss: toast.dismiss,
    remove: toast.remove,
});
