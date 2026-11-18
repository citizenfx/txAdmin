import { numberToLocaleString } from "@/lib/utils";
import type { InfoTree } from "@shared/diagnosticsTypes";


type DiagnosticsInfoTreeLineProps = {
    label: string;
    content: InfoTree[string] ;
    isLast: boolean;
    maxLabelLength: number;
}

function DiagnosticsInfoTreeLine({ label, content, isLast, maxLabelLength }: DiagnosticsInfoTreeLineProps) {
    const prefix = isLast ? "└─" : "├─";
    let textContent: React.ReactNode;
    if (typeof content === 'object' && content !== null) {
        textContent = Object.entries(content).map(([key, value], i) => (
            <code key={key} className="inline-block rounded-sm font-mono px-[0.25rem] border bg-secondary/35">
                <span className="text-muted-foreground">{key}:</span>
                <span className="text-primary dark:text-warning-inline font-bold">{value}</span>
            </code>
        ));
    } else {
        textContent = <code className="font-mono text-primary dark:text-warning-inline font-semibold dark:font-normal">
            {typeof content === 'number' ? numberToLocaleString(content) : content}
        </code>;
    }

    const padSize = maxLabelLength - label.length;
    return (
        <div className="attempt-word-wrap leading-none my-0">
            <span
                className="inline-block text-sm"
                style={{ minWidth: `${padSize + 2}ch` }}
            >
                {prefix}{'─'.repeat(padSize)}
            </span>
            <span className="inline-block text-sm mr-0.5">
                {label}:
            </span>
            <span className="text-xs space-x-1">
                {textContent}
            </span>
        </div>
    )
}


type DiagnosticsInfoTreeProps = {
    title: string
    tree: InfoTree;
}

export function DiagnosticsInfoTree({ title, tree }: DiagnosticsInfoTreeProps) {
    const linesArray = Object.entries(tree);
    const maxLabelLength = Math.max(...linesArray.map(([key]) => key.length));
    return (
        <div className="attempt-word-wrap">
            <div className="font-bold">{title}:</div>
            <div className="flex flex-col font-mono text-muted-foreground">
                {linesArray.map(([key, value], i) => <DiagnosticsInfoTreeLine
                    key={key}
                    label={key}
                    maxLabelLength={maxLabelLength}
                    content={value}
                    isLast={i === linesArray.length - 1}
                />)}
            </div>
        </div>
    )
}
