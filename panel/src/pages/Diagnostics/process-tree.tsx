import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { CpuIcon, MemoryStickIcon } from "lucide-react";
import type { ProcessInfo } from "@shared/diagnosticsTypes";


type ProcessTreeNode = ProcessInfo & {
    children: ProcessTreeNode[];
}

type ProcessTreeItemProps = {
    process: ProcessTreeNode;
    level: number;
}

function ProcessTreeItem({ process, level }: ProcessTreeItemProps) {
    return (
        <div className={cn(level > 0 ? "ml-6 -mt-[1px] mb-0" : "mb-2")}>
            <div className={cn(
                "border rounded-lg p-3 text-sm",
                level > 0 ? "bg-muted" : "bg-secondary/50"
            )}>
                <div className="flex items-start justify-between">
                    {/* Left side - Process info */}
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground truncate">
                            {process.name}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                            ID:{process.pid}
                        </div>
                    </div>

                    {/* Right side - Metrics */}
                    <div className="flex ml-4">
                        <div className="flex flex-col gap-1 items-end pr-3">
                            <div className="flex items-center gap-1">
                                <MemoryStickIcon className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground text-xs">RAM:</span>
                            </div>
                            <span className="font-mono font-medium text-xs">{process.memory.toFixed(1)} MB</span>
                        </div>
                        <div className="w-px bg-border mx-3"></div>
                        <div className="flex flex-col gap-1 items-end pl-3">
                            <div className="flex items-center gap-1">
                                <CpuIcon className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground text-xs">CPU:</span>
                            </div>
                            <span className="font-mono font-medium text-xs">{process.cpu.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            </div>
            {process.children.length > 0 && process.children.map((child) => (
                <ProcessTreeItem
                    key={child.pid}
                    process={child}
                    level={level + 1}
                />
            ))}
        </div>
    )
}


type ProcessTreeProps = {
    processes: ProcessInfo[];
}

export function ProcessTree({ processes }: ProcessTreeProps) {
    //Order processes by pid in a tree structure
    const processTree = useMemo(() => {
        const processMap = new Map<number, ProcessTreeNode>();
        const rootProcesses: ProcessTreeNode[] = [];

        // First pass: create map of all processes with empty children arrays
        processes.forEach((process) => {
            processMap.set(process.pid, { ...process, children: [] });
        });

        // Second pass: organize into hierarchy
        processes.forEach((process) => {
            const processNode = processMap.get(process.pid)!;
            const parentNode = processMap.get(process.parent);

            if (parentNode) {
                parentNode.children.push(processNode);
            } else {
                rootProcesses.push(processNode);
            }
        });

        return rootProcesses;
    }, [processes]);

    return (
        <div>
            {processTree.map((process) => (
                <ProcessTreeItem
                    key={process.pid}
                    process={process}
                    level={0}
                />
            ))}
        </div>
    );
}
