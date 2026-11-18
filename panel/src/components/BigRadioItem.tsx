import { useId } from "react";
import { Label } from "./ui/label";
import { RadioGroupItem } from "./ui/radio-group";
import { DynamicNewBadge } from "./DynamicNewBadge";
import { cn } from "@/lib/utils";


type BigRadioItemProps = {
    value: string;
    title: string;
    desc: React.ReactNode;
    newOptionBadgeFeatName?: string;
    groupValue: string | undefined;
    disableReason?: string | null;
}

export default function BigRadioItem(props: BigRadioItemProps) {
    const radioId = 'radio' + useId();
    const isDisabled = Boolean(props.disableReason);

    return (
        <div className="group">
            <Label
                htmlFor={radioId}
                className={cn(
                    "flex items-center gap-3 border rounded-lg p-3 cursor-pointer hover:bg-card data-[state=checked]:border-primary/50 data-[state=checked]:bg-muted select-none",
                    isDisabled && "cursor-not-allowed opacity-60 hover:bg-transparent"
                )}
                data-state={props.groupValue === props.value ? 'checked' : 'unchecked'}
                aria-disabled={isDisabled}
            >
                <RadioGroupItem value={props.value} id={radioId} disabled={isDisabled} />
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="font-bold">{props.title}</span>
                        {props.newOptionBadgeFeatName && (
                            <DynamicNewBadge
                                featName={props.newOptionBadgeFeatName}
                                className="pb-1 pt-0.5"
                                size="md"
                                durationDays={28} //4 weeks
                            />
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">{props.desc}</p>
                    {props.disableReason && (
                        <p className="text-sm text-warning-inline">{props.disableReason}</p>
                    )}
                </div>
            </Label>
        </div>
    )
}
