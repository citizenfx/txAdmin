import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import SwitchText from '@/components/SwitchText'
import InlineCode from '@/components/InlineCode'
import { SettingItem, SettingItemDesc } from '../settingsItems'
import { useEffect, useMemo, useReducer, useRef } from "react"
import { getConfigEmptyState, getConfigAccessors, SettingsCardProps, getPageConfig, configsReducer, getConfigDiff } from "../utils"
import SettingsCardShell from "../SettingsCardShell"
import { txToast } from "@/components/TxToaster"


export const pageConfigs = {
    updateFileEnabled: getPageConfig('restarter', 'updateFileEnabled'),
    updateFileDelay: getPageConfig('restarter', 'updateFileDelay'),
    updateFileName: getPageConfig('restarter', 'updateFileName'),
} as const;

export default function ConfigCardFxserverCICD({ cardCtx, pageCtx }: SettingsCardProps) {
    const [states, dispatch] = useReducer(
        configsReducer<typeof pageConfigs>,
        null,
        () => getConfigEmptyState(pageConfigs),
    );
    const cfg = useMemo(() => {
        return getConfigAccessors(cardCtx.cardId, pageConfigs, pageCtx.apiData, dispatch);
    }, [pageCtx.apiData, dispatch]);

    //Effects - handle changes
    useEffect(() => {
        updatePageState();
    }, [states]);

    //Refs for configs that don't use state
    const updateFileNameRef = useRef<HTMLInputElement | null>(null);

    //Marshalling Utils
    const selectNumberUtil = {
        toUi: (num?: number) => num ? num.toString() : undefined,
        toCfg: (str?: string) => str ? parseInt(str) : undefined,
    }

    //Processes the state of the page and sets the card as pending save if needed
    const updatePageState = () => {
        const overwrites = {
            updateFileName: updateFileNameRef.current?.value?.trim(),
        };

        const res = getConfigDiff(cfg, states, overwrites, false);
        pageCtx.setCardPendingSave(res.hasChanges ? cardCtx : null);
        return res;
    }

    //Validate changes (for UX only) and trigger the save API
    const handleOnSave = () => {
        const { hasChanges, localConfigs } = updatePageState();
        if (!hasChanges) return;

        if (localConfigs.restarter?.updateFileName !== undefined && !localConfigs.restarter.updateFileName) {
            return txToast.error({
                title: 'The Update File Name is required.',
                md: true,
                msg: 'The value should probably be `.update`.',
            });
        }
        pageCtx.saveChanges(cardCtx, localConfigs);
    }

    return (
        <SettingsCardShell
            cardCtx={cardCtx}
            pageCtx={pageCtx}
            onClickSave={handleOnSave}
        >
            <SettingItem label="Auto-Restart on Update File" showOptional>
                <SwitchText
                    id={cfg.updateFileEnabled.eid}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    checked={states.updateFileEnabled}
                    onCheckedChange={cfg.updateFileEnabled.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    When enabled, <strong>txAdmin</strong> will look for the file configured below in the Server Data folder. If found, the file is deleted and a server restart is scheduled. <br />
                    This is useful for <strong>CI/CD</strong> pipelines: just drop the file in the folder after deploying your update. The file content (if any) is used as the restart message.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Update File Restart Delay" htmlFor={cfg.updateFileDelay.eid}>
                <Select
                    value={selectNumberUtil.toUi(states.updateFileDelay)}
                    onValueChange={(val) => cfg.updateFileDelay.state.set(selectNumberUtil.toCfg(val))}
                    disabled={pageCtx.isReadOnly || !states.updateFileEnabled}
                >
                    <SelectTrigger id={cfg.updateFileDelay.eid}>
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1">1 minute</SelectItem>
                        <SelectItem value="2">2 minutes (default)</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                </Select>
                <SettingItemDesc>
                    How long to wait before restarting after the update file is detected. <br />
                    Players will be warned during this period, just like with a scheduled restart.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Update File Name" htmlFor={cfg.updateFileName.eid}>
                <Input
                    id={cfg.updateFileName.eid}
                    ref={updateFileNameRef}
                    defaultValue={cfg.updateFileName.initialValue}
                    placeholder=".update"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly || !states.updateFileEnabled}
                />
                <SettingItemDesc>
                    The name of the file <strong>txAdmin</strong> looks for, relative to the Server Data folder (next to your <InlineCode>server.cfg</InlineCode>). <br />
                    Defaults to <InlineCode>.update</InlineCode>.
                </SettingItemDesc>
            </SettingItem>
        </SettingsCardShell>
    )
}
