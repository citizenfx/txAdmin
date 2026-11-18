import React from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon, Loader2Icon } from "lucide-react"
import { useAutoAnimate } from '@formkit/auto-animate/react'
import CardContentOverlay from '@/components/CardContentOverlay'
import { SettingsCardContext, SettingsPageContext } from './utils'


type SettingsCardShellProps = {
    cardCtx: SettingsCardContext;
    pageCtx: SettingsPageContext;
    advancedVisible?: boolean;
    advancedSetter?: (visible: boolean) => void;
    onClickSave: () => void;
    children: React.ReactNode;
};

export default function SettingsCardShell({
    cardCtx,
    pageCtx,
    advancedVisible,
    advancedSetter,
    onClickSave,
    children,
}: SettingsCardShellProps) {
    const [animationParent] = useAutoAnimate();
    const isCardPendingSave = pageCtx.cardPendingSave?.cardId === cardCtx.cardId;

    // FIXME:NEXT:UPDATE remove
    const visibleTabName = cardCtx.tabName === 'Whitelist' ? 'Allowlist' : cardCtx.tabName;
    const visibleCardName = cardCtx.cardName === 'Whitelist' ? 'Allowlist' : cardCtx.cardName;

    return (
        <div id={`tab-${cardCtx.cardId}`} data-show-advanced={advancedVisible} className='group/card'>
            <Card className="xs:x bg-transparent max-xs:rounded-none max-xs:shadow-none">
                <ol className="bg-muted/50 border-b p-4 flex flex-wrap items-center gap-1 sm:gap-2.5 select-none text-sm text-muted-foreground tracking-wide">
                    {cardCtx.tabName !== cardCtx.cardName ? (
                        <>
                            <li>{cardCtx.tabName}</li>
                            <ChevronRightIcon className='size-3.5 mt-0.5 inline align-text-top opacity-75' />
                            <li>{cardCtx.cardName} Settings</li>
                        </>
                    ) : (
                        <li>{visibleTabName} Settings</li>
                    )}
                    {isCardPendingSave && (
                        // <div className="grow text-right xflex xitems-center xgap-1.5 xbg-lime-300">
                        //     <li className="text-warning-inline italicx tracking-wide">
                        //         You are in read-only mode because you do not have the <InlineCode>Settings: Change</InlineCode> permission.
                        //     </li>
                        //     <li className="text-warning-inline italic tracking-wide">you have unsaved changes</li>
                        // </div>
                        <li className="text-warning-inline italic tracking-wide">(unsaved changes)</li>
                    )}
                </ol>

                <div className='relative rounded-b-[inherit]'>
                    <CardContent
                        className="space-y-6 pt-6 bg-transparent overflow-x-clip"
                        ref={animationParent}
                    >
                        {children}
                        <div className="flex flex-wrap-reverse justify-center xs:justify-start gap-2">
                            <Button
                                size='xs'
                                disabled={!isCardPendingSave || pageCtx.isReadOnly}
                                onClick={onClickSave}
                            >
                                Save {visibleCardName} Settings
                                {pageCtx.isSaving && (
                                    <Loader2Icon className="h-3.5 mt-0.5 inline animate-spin" />
                                )}
                            </Button>
                            {advancedVisible !== undefined && advancedSetter ? (
                                <Button
                                    size='xs'
                                    variant={'muted'}
                                    onClick={() => advancedSetter(!advancedVisible)}
                                >
                                    {advancedVisible ? 'Discard' : 'Show'} Advanced
                                    {advancedVisible
                                        ? <ChevronUpIcon className="size-4 ml-1.5" />
                                        : <ChevronDownIcon className="size-4 ml-1.5" />}
                                </Button>
                            ) : null}
                        </div>
                    </CardContent>
                    <CardContentOverlay
                        loading={pageCtx.isLoading}
                        error={pageCtx.swrError}
                    />
                </div>
            </Card>
        </div>
    )
}
