import { LocalStorageKey } from "@/lib/localStorage";
import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";
import React from "react";


/**
 * Variants
 */
const badgeVariants = cva(
    'rounded bg-accent text-accent-foreground font-semibold self-center',
    {
        variants: {
            size: {
                xs: 'px-1 ml-1 text-[0.5rem] tracking-[0.2em] leading-loose',
                md: 'px-1 ml-1.5 text-2xs tracking-wider',
            },
        },
        defaultVariants: {
            size: 'md',
        },
    }
);


/**
 * A dynamic component that shows its children for the first X days.
 * NOTE: always on for dev mode to make sure I doesn't forget to remove it.
 */
function DynamicNewItemInner({ featName, durationDays, children }: DynamicNewItemProps) {
    const storageKeyName = LocalStorageKey.NewFeatureSeenTs + featName;
    const storedTs = parseInt(localStorage.getItem(storageKeyName) ?? '');
    if (isNaN(storedTs) || window.txConsts.showAdvanced) {
        localStorage.setItem(storageKeyName, Date.now().toString());
    } else {
        const badgeDuration = (durationDays ?? 3) * 24 * 60 * 60 * 1000;

        if (storedTs + badgeDuration < Date.now()) {
            return null;
        }
    }

    return children;
}

export const DynamicNewItem = React.memo(DynamicNewItemInner);


/**
 * A dynamic badge that shows "NEW" for the first X days.
 */
function DynamicNewBadgeInner({ badgeText, featName, durationDays, className, size }: DynamicNewBadgeProps) {
    return (
        <DynamicNewItemInner featName={featName} durationDays={durationDays}>
            <span className={cn(className, badgeVariants({ size }))}>
                {badgeText ?? 'NEW'}
            </span>
        </DynamicNewItemInner>
    );
}

export const DynamicNewBadge = React.memo(DynamicNewBadgeInner);


/**
 * Types
 */
type DynamicNewItemProps = {
    featName: string;
    durationDays?: number; //3d default
    children: React.ReactNode;
};

type DynamicNewBadgeProps = {
    featName: string;
    durationDays?: number; //3d default
    badgeText?: string;
    className?: string;
    size?: VariantProps<typeof badgeVariants>['size'];
};
