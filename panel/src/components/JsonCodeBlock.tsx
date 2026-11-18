import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | { [key: string]: JsonValue };

type JsonCodeBlockProps = {
    value: string;
    className?: string;
};

type ParseResult =
    | { ok: true; value: JsonValue }
    | { ok: false };

const tokenClass = {
    bracket: "text-muted-foreground",
    key: "text-sky-600 dark:text-sky-300",
    string: "text-emerald-600 dark:text-emerald-300",
    number: "text-amber-600 dark:text-amber-300",
    boolean: "text-violet-600 dark:text-violet-300",
    null: "text-rose-600 dark:text-rose-300",
};

const parseJson = (value: string): ParseResult => {
    try {
        return { ok: true, value: JSON.parse(value) as JsonValue };
    } catch {
        return { ok: false };
    }
};

const renderPrimitive = (value: string | number | boolean | null): ReactNode => {
    if (typeof value === "string") {
        return <span className={tokenClass.string}>{JSON.stringify(value)}</span>;
    }
    if (typeof value === "number") {
        return <span className={tokenClass.number}>{String(value)}</span>;
    }
    if (typeof value === "boolean") {
        return <span className={tokenClass.boolean}>{String(value)}</span>;
    }
    return <span className={tokenClass.null}>null</span>;
};

const renderJson = (value: JsonValue, depth = 0, path = "root"): ReactNode => {
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return <span className={tokenClass.bracket}>[]</span>;
        }

        return (
            <Fragment>
                <span className={tokenClass.bracket}>[</span>
                {"\n"}
                {value.map((item, index) => (
                    <Fragment key={`${path}[${index}]`}>
                        {"  ".repeat(depth + 1)}
                        {renderJson(item, depth + 1, `${path}[${index}]`)}
                        {index < value.length - 1 ? "," : ""}
                        {"\n"}
                    </Fragment>
                ))}
                {"  ".repeat(depth)}
                <span className={tokenClass.bracket}>]</span>
            </Fragment>
        );
    }

    if (value && typeof value === "object") {
        const entries = Object.entries(value);
        if (entries.length === 0) {
            return <span className={tokenClass.bracket}>{"{}"}</span>;
        }

        return (
            <Fragment>
                <span className={tokenClass.bracket}>{"{"}</span>
                {"\n"}
                {entries.map(([key, item], index) => (
                    <Fragment key={`${path}.${key}`}>
                        {"  ".repeat(depth + 1)}
                        <span className={tokenClass.key}>{JSON.stringify(key)}</span>
                        <span className={tokenClass.bracket}>{": "}</span>
                        {renderJson(item, depth + 1, `${path}.${key}`)}
                        {index < entries.length - 1 ? "," : ""}
                        {"\n"}
                    </Fragment>
                ))}
                {"  ".repeat(depth)}
                <span className={tokenClass.bracket}>{"}"}</span>
            </Fragment>
        );
    }

    return renderPrimitive(value);
};

export default function JsonCodeBlock({ value, className }: JsonCodeBlockProps) {
    const parsed = parseJson(value);

    return (
        <pre className={cn("whitespace-pre-wrap attempt-word-wrap font-mono text-sm leading-6", className)}>
            {parsed.ok ? renderJson(parsed.value) : value}
        </pre>
    );
}
