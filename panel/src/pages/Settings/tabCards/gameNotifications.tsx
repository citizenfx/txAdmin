import TxAnchor from '@/components/TxAnchor';
import SwitchText from '@/components/SwitchText';
import InlineCode from '@/components/InlineCode';
import { SettingItem, SettingItemDesc } from '../settingsItems';
import { useEffect, useMemo, useReducer } from "react";
import { getConfigEmptyState, getConfigAccessors, SettingsCardProps, getPageConfig, configsReducer, getConfigDiff } from "../utils";
import SettingsCardShell from '../SettingsCardShell';


export const pageConfigs = {
    hideAdminInPunishments: getPageConfig('gameFeatures', 'hideAdminInPunishments'),
    hideAdminInMessages: getPageConfig('gameFeatures', 'hideAdminInMessages'),
    hideDefaultAnnouncement: getPageConfig('gameFeatures', 'hideDefaultAnnouncement'),
    hideDefaultDirectMessage: getPageConfig('gameFeatures', 'hideDefaultDirectMessage'),
    hideDefaultWarning: getPageConfig('gameFeatures', 'hideDefaultWarning'),
    hideScheduledRestartWarnings: getPageConfig('gameFeatures', 'hideDefaultScheduledRestartWarning'),
} as const;

export default function ConfigCardGameNotifications({ cardCtx, pageCtx }: SettingsCardProps) {
    const [states, dispatch] = useReducer(
        configsReducer<typeof pageConfigs>,
        null,
        () => getConfigEmptyState(pageConfigs),
    );
    const cfg = useMemo(() => {
        return getConfigAccessors(cardCtx.cardId, pageConfigs, pageCtx.apiData, dispatch);
    }, [pageCtx.apiData, dispatch]);

    //Effects - handle changes and reset advanced settings
    useEffect(() => {
        updatePageState();
    }, [states]);

    //Processes the state of the page and sets the card as pending save if needed
    const updatePageState = () => {
        const overwrites = {};

        const res = getConfigDiff(cfg, states, overwrites, false);
        pageCtx.setCardPendingSave(res.hasChanges ? cardCtx : null);
        return res;
    }

    //Validate changes (for UX only) and trigger the save API
    const handleOnSave = () => {
        const { hasChanges, localConfigs } = updatePageState();
        if (!hasChanges) return;
        //NOTE: nothing to validate
        pageCtx.saveChanges(cardCtx, localConfigs);
    }

    return (
        <SettingsCardShell
            cardCtx={cardCtx}
            pageCtx={pageCtx}
            onClickSave={handleOnSave}
        >
            <SettingItem label="Hide Admin Name In Punishments">
                <SwitchText
                    id={cfg.hideAdminInPunishments.eid}
                    checkedLabel="Hidden"
                    uncheckedLabel="Visible"
                    checked={states.hideAdminInPunishments}
                    onCheckedChange={cfg.hideAdminInPunishments.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Never show to the players the admin name on <strong>Bans</strong> or <strong>Warns</strong>. <br />
                    This information will still be available in the history and logs.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Hide Admin Name In Messages">
                <SwitchText
                    id={cfg.hideAdminInMessages.eid}
                    checkedLabel="Hidden"
                    uncheckedLabel="Visible"
                    checked={states.hideAdminInMessages}
                    onCheckedChange={cfg.hideAdminInMessages.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Do not show the admin name on <strong>Announcements</strong> or <strong>DMs</strong>. <br />
                    This information will still be available in the live console and logs.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Hide Announcement Notifications">
                <SwitchText
                    id={cfg.hideDefaultAnnouncement.eid}
                    checkedLabel="Hidden"
                    uncheckedLabel="Visible"
                    checked={states.hideDefaultAnnouncement}
                    onCheckedChange={cfg.hideDefaultAnnouncement.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Suppresses the display of announcements, allowing you to implement your own announcement via the event <InlineCode>txAdmin:events:announcement</InlineCode>.
                    &nbsp;<TxAnchor href="https://aka.cfx.re/txadmin-events#txadmineventsannouncement">Documentation</TxAnchor>
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Hide Direct Message Notification">
                <SwitchText
                    id={cfg.hideDefaultDirectMessage.eid}
                    checkedLabel="Hidden"
                    uncheckedLabel="Visible"
                    checked={states.hideDefaultDirectMessage}
                    onCheckedChange={cfg.hideDefaultDirectMessage.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Suppresses the display of direct messages, allowing you to implement your own direct message notification via the event <InlineCode>txAdmin:events:playerDirectMessage</InlineCode>.
                    &nbsp;<TxAnchor href="https://aka.cfx.re/txadmin-events#txadmineventsplayerdirectmessage">Documentation</TxAnchor>
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Hide Warning Notification">
                <SwitchText
                    id={cfg.hideDefaultWarning.eid}
                    checkedLabel="Hidden"
                    uncheckedLabel="Visible"
                    checked={states.hideDefaultWarning}
                    onCheckedChange={cfg.hideDefaultWarning.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Suppresses the display of warnings, allowing you to implement your own warning via the event <InlineCode>txAdmin:events:playerWarned</InlineCode>.
                    &nbsp;<TxAnchor href="https://aka.cfx.re/txadmin-events#txadmineventsplayerwarned">Documentation</TxAnchor>
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Hide Scheduled Restart Warnings">
                <SwitchText
                    id={cfg.hideScheduledRestartWarnings.eid}
                    checkedLabel="Hidden"
                    uncheckedLabel="Visible"
                    checked={states.hideScheduledRestartWarnings}
                    onCheckedChange={cfg.hideScheduledRestartWarnings.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Suppresses the display of scheduled restart warnings, allowing you to implement your own warning via the event <InlineCode>txAdmin:events:scheduledRestart</InlineCode>.
                    &nbsp;<TxAnchor href="https://aka.cfx.re/txadmin-events#txadmineventsscheduledrestart">Documentation</TxAnchor>
                </SettingItemDesc>
            </SettingItem>
        </SettingsCardShell>
    )
}
