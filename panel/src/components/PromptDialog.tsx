import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClosePromptDialog, usePromptDialogState } from "@/hooks/dialogs";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { AutosizeTextarea } from "./ui/autosize-textarea";


export default function PromptDialog() {
    const inputRef = useRef<any>(null);
    const dialogState = usePromptDialogState();
    const closeDialog = useClosePromptDialog();

    const handleSubmit = () => {
        if (!dialogState.isOpen) return;
        closeDialog();
        const input = inputRef.current?.value ?? inputRef.current?.textArea.value ?? '';
        dialogState.onSubmit(input.trim());
    }

    const handleForm = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleSubmit();
    }

    const handleOpenClose = (newOpenState: boolean) => {
        if (!dialogState.isOpen) return;
        if (!newOpenState) {
            closeDialog();
            if (dialogState.onCancel) {
                dialogState.onCancel();
            }
        }
    }

    return (
        <Dialog open={dialogState.isOpen} onOpenChange={handleOpenClose}>
            <DialogContent className={cn(dialogState.isWide && "md:max-w-2xl")}>
                <form onSubmit={handleForm} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>{dialogState.title}</DialogTitle>
                        <DialogDescription>
                            {dialogState.message}
                        </DialogDescription>
                    </DialogHeader>

                    {dialogState.isMultiline ? (
                        <AutosizeTextarea
                            autoFocus
                            ref={inputRef}
                            placeholder={dialogState.placeholder}
                            autoComplete="off"
                            required={dialogState.required}
                            minHeight={100}
                            maxHeight={240}

                            //Remove line breaks from the input value
                            onChange={(e) => {
                                e.target.value = e.target.value.replace(/\n\s*/g, ' ').trimStart();
                            }}
                        />
                    ) : (
                        <Input
                            autoFocus
                            ref={inputRef}
                            placeholder={dialogState.placeholder}
                            autoComplete="off"
                            required={dialogState.required}
                        />
                    )}
                    <DialogFooter className="gap-2 flex-col">
                        <div className="flex flex-col sm:flex-row sm:justify-start gap-2 w-full flex-wrap">
                            {dialogState.suggestions && dialogState.suggestions.map((suggestion, index) => (
                                <Button
                                    key={index}
                                    type="button"
                                    onClick={() => {
                                        inputRef.current!.value = suggestion;
                                        handleSubmit();
                                    }}
                                    variant="outline"
                                >
                                    <span className="sm:hidden mr-auto text-muted-foreground">Suggestion:</span>
                                    {suggestion}
                                </Button>
                            ))}
                        </div>
                        {/* TODO: mock for kick as punishment - consider the alternative of making a "timeout" */}
                        {/* <div className="flex flex-col sm:flex-row sm:justify-start gap-2 w-full flex-wrap">
                            <div className="items-top flex space-x-2">
                                <Checkbox id="terms1" />
                                <div className="grid gap-1.5 leading-none">
                                    <label
                                        htmlFor="terms1"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        This kick is a punishment.
                                    </label>
                                    <p className="text-sm text-muted-foreground">
                                        Show in the player history as a sanction.
                                    </p>
                                </div>
                            </div>
                        </div> */}
                        <Button
                            type="submit"
                            variant={dialogState.submitBtnVariant ?? 'default'}
                        >
                            {dialogState.submitLabel ?? 'Submit'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
