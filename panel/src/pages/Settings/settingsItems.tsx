import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";


function LabelRequired() {
    return (
        <span className="tracking-widest text-2xs text-destructive-inline opacity-65 group-hover/cfgCardItem:opacity-100">REQUIRED</span>
    )
}
function LabelOptional() {
    return (
        <span className="tracking-widest text-2xs text-info-inline opacity-0 group-hover/cfgCardItem:opacity-85 group-hover/cfgCardItem:dark:opacity-35">OPTIONAL</span>
    )
}
function LabelNew() {
    return (
        <span className='rounded-sm bg-accent text-accent-foreground text-2xs tracking-wider font-semibold leading-snug pb-0.5 px-0.5 w-fit mt-0.5'>
            NEW
        </span>
    )
}

/**
 * An optional description line with conditional rendering
 */
export function SettingItemWarningLine({ visible, children, className }: SettingItemWarningLineProps) {
    if (!visible) return null;
    return (
        <div className={cn("text-warning-inline opacity-45 group-hover/cfgCardItem:opacity-100", className)}>
            {children}
        </div>
    );
}

type SettingItemWarningLineProps = {
    visible: boolean;
    children: React.ReactNode;
    className?: string;
}


/**
 * A description for a setting item.
 */
export function SettingItemDesc({ children, className }: SettingItemDescProps) {
    return (
        <div className={cn("text-sm text-muted-foreground", className)}>
            {children}
        </div>
    );
}

type SettingItemDescProps = {
    children: React.ReactNode;
    className?: string;
}


/**
 * A setting item.
 */
export function SettingItem({
    label,
    htmlFor,
    required: isRequired,
    showOptional,
    showNew,
    showIf,
    children
}: SettingItemProps) {
    if (showIf !== undefined && !showIf) return null;
    return (
        <div className='max-w-4xl space-y-2 sm:grid sm:grid-cols-8 sm:gap-4 sm:space-y-0 sm:items-start group/cfgCardItem'>
            <div className="sm:col-span-2">
                <Label className="flex flex-col text-sm font-medium leading-6" htmlFor={htmlFor}>
                    {label}
                    {showNew && <LabelNew />}
                    {isRequired && <LabelRequired />}
                    {showOptional && <LabelOptional />}
                </Label>
            </div>
            <div className="sm:col-span-6 space-y-2">
                {children}
            </div>
        </div>
    )
}

type SettingItemProps = {
    label: string;
    htmlFor?: string;
    required?: boolean;
    showOptional?: boolean;
    showNew?: boolean;
    showIf?: boolean;
    children: React.ReactNode;
}


/**
 * A divider for advanced options.
 */
export function AdvancedDivider() {
    return (
        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <hr className="w-full border-t" />
            </div>
            <div className="relative flex justify-center tracking-wider text-xs">
                <span className="bg-background px-2 text-muted-foreground/75">
                    Advanced Options
                </span>
            </div>
        </div>
    )
}
