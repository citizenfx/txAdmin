import type { InfoList } from "@shared/diagnosticsTypes";


type DiagnosticsInfoListProps = {
    list: InfoList;
}

export function DiagnosticsInfoList({ list }: DiagnosticsInfoListProps) {
    const linesArray = Object.entries(list);
    const maxLabelLength = Math.max(...linesArray.map(([key]) => key.length));
    return (
        <dl className="attempt-word-wrap">
            <dd className="flex flex-col font-mono text-muted-foreground">
                {linesArray.map(([key, value], i) => <div key={key} className="text-sm">
                    <div
                        className="inline-block text-muted-foreground capitalize shrink-0"
                        style={{ minWidth: `${maxLabelLength + 2}ch` }}
                    >
                        {key}:
                    </div>
                    <span className="font-mono text-primary dark:text-warning-inline font-semibold dark:font-normal">
                        {value}
                    </span>
                </div>)}
            </dd>
        </dl>
    )
}
