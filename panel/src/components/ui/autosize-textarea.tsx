//NOTE: this is not part of the original shadcn/ui
// ref: https://shadcnui-expansions.typeart.cc/docs/autosize-textarea

'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { useImperativeHandle } from 'react';

interface UseCharCounterProps {
    textAreaRef: HTMLTextAreaElement | null;
    softMaxLength?: number;
    triggerUpdateVal: string;
}

export type CharCountState = {
    text: string;
    isOverLimit: boolean;
} | null;

export const useCharCounter = ({
    textAreaRef,
    softMaxLength,
    triggerUpdateVal,
}: UseCharCounterProps): CharCountState => {
    //Show the counter once the input reaches this fraction of maxLength
    const COUNTER_VISIBLE_RATIO = 0.8;

    return React.useMemo<CharCountState>(() => {
        if (!textAreaRef) return null;
        if (!softMaxLength) return null;
        // Canonicalize the value (trim it) to get the effective character count
        const currChars = textAreaRef.value.length;
        const isVisible = currChars >= softMaxLength * COUNTER_VISIBLE_RATIO;
        if (!isVisible) return null;

        return {
            text: `${currChars}/${softMaxLength}`,
            isOverLimit: currChars >= softMaxLength,
        };
    }, [textAreaRef, softMaxLength, triggerUpdateVal]);
};


interface UseAutosizeTextAreaProps {
    textAreaRef: HTMLTextAreaElement | null;
    minHeight?: number;
    maxHeight?: number;
    triggerUpdateVal: string;
}

export const useAutosizeTextArea = ({
    textAreaRef,
    triggerUpdateVal,
    maxHeight = Number.MAX_SAFE_INTEGER,
    minHeight = 0,
}: UseAutosizeTextAreaProps) => {
    const [init, setInit] = React.useState(true);
    React.useEffect(() => {
        // We need to reset the height momentarily to get the correct scrollHeight for the textarea
        const offsetBorder = 2;
        if (textAreaRef) {
            if (init) {
                textAreaRef.style.minHeight = `${minHeight + offsetBorder}px`;
                if (maxHeight > minHeight) {
                    textAreaRef.style.maxHeight = `${maxHeight}px`;
                }
                setInit(false);
            }
            textAreaRef.style.height = `${minHeight + offsetBorder}px`;
            const scrollHeight = textAreaRef.scrollHeight;
            // We then set the height directly, outside of the render loop
            // Trying to set this with state or a ref will product an incorrect value.
            if (scrollHeight > maxHeight) {
                textAreaRef.style.height = `${maxHeight}px`;
            } else {
                textAreaRef.style.height = `${scrollHeight + offsetBorder}px`;
            }
        }
    }, [textAreaRef, triggerUpdateVal]);
};

export type AutosizeTextAreaRef = {
    textArea: HTMLTextAreaElement;
    maxHeight: number;
    minHeight: number;
};

type AutosizeTextAreaProps = {
    maxHeight?: number;
    minHeight?: number;
    softMaxLength?: number;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const AutosizeTextarea = React.forwardRef<AutosizeTextAreaRef, AutosizeTextAreaProps>(
    (
        {
            maxHeight = Number.MAX_SAFE_INTEGER,
            minHeight = 52,
            softMaxLength,
            maxLength,
            className,
            onChange,
            value,
            ...props
        }: AutosizeTextAreaProps,
        ref: React.Ref<AutosizeTextAreaRef>,
    ) => {
        const textAreaRef = React.useRef<HTMLTextAreaElement | null>(null);
        const [triggerUpdateVal, triggerUpdate] = React.useState('');

        useAutosizeTextArea({
            textAreaRef: textAreaRef.current,
            triggerUpdateVal,
            maxHeight,
            minHeight,
        });

        useImperativeHandle(ref, () => ({
            textArea: textAreaRef.current as HTMLTextAreaElement,
            maxHeight,
            minHeight,
        }));

        React.useEffect(() => {
            triggerUpdate(value as string);
        }, [value, props?.defaultValue, props?.placeholder]);

        const counter = useCharCounter({
            textAreaRef: textAreaRef.current,
            softMaxLength,
            triggerUpdateVal,
        });

        return (
            <div className="relative w-full">
                {counter && (
                    <span
                        className={cn(
                            "absolute bottom-1 right-4 text-xs tabular-nums pointer-events-none select-none bg-background px-1 py-0.5 rounded-md",
                            counter.isOverLimit ? "text-destructive" : "text-muted-foreground",
                        )}
                    >
                        {counter.text}
                    </span>
                )}
                <textarea
                    {...props}
                    value={value}
                    maxLength={maxLength}
                    ref={textAreaRef}
                    className={cn(
                        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        "bg-black/5 dark:bg-black/30 placeholder:opacity-50", //TX CUSTOM
                        //NOTE: check if already available:
                        // https://developer.mozilla.org/en-US/docs/Web/CSS/field-sizing
                        // https://tailwindcss.com/docs/v4-beta#field-sizing-utilities
                        className,
                    )}
                    onChange={(e) => {
                        triggerUpdate(e.target.value);
                        onChange?.(e);
                    }}
                />
            </div>
        );
    },
);
AutosizeTextarea.displayName = 'AutosizeTextarea';
