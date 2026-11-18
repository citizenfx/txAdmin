import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";
import type { ScrollAreaProps } from "@radix-ui/react-scroll-area";

type StyledDivProps = JSX.IntrinsicElements["div"];

export type ModalTabInfo = {
    title: string;
    icon: JSX.Element;
    className?: string;
}

export function ModalContent({ children, className, ...props }: StyledDivProps & ScrollAreaProps) {
    return (
        <div className={cn('flex flex-col md:flex-row md:px-4 h-full', className)} {...props}>
            {children}
        </div>
    );
}

export function ModalTabsList({ children, className, ...props }: StyledDivProps & ScrollAreaProps) {
    return (
        <div className={cn('flex flex-row md:flex-col gap-1 bg-muted md:bg-transparent p-1 md:p-0 mx-2 md:mx-0 rounded-md', className)} {...props}>
            {children}
        </div>
    );
}

export function ModalTabWrapper({ children, className, ...props }: StyledDivProps & ScrollAreaProps) {
    //FIXME: the number below is based off mobile screen sizes, and should be h-full while the modal content controls the actual height
    return (
        <ScrollArea className={cn('min-h-[16rem] w-full md:max-h-[50vh] px-2 md:px-4 max-md:pt-3', className)} {...props}>
            {children}
        </ScrollArea>
    );
}

export function ModalTabInner({ children, className, ...props }: StyledDivProps) {
    //NOTE: The padding is the minimum required for the input outlines not to get cropped
    return (
        <div className={cn('px-1 pb-1', className)} {...props}>
            {children}
        </div>
    );
}

export function ModalTabMessage({ children, className, ...props }: StyledDivProps) {
    return (
        <div className={cn('min-h-[16rem] p-2 md:p-4 flex items-center justify-center text-xl text-muted-foreground', className)} {...props}>
            {children}
        </div>
    )
}
