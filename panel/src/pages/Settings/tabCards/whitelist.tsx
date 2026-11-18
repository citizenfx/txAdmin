import { Input } from "@/components/ui/input"
import TxAnchor from '@/components/TxAnchor'
import InlineCode from '@/components/InlineCode'
import { SettingItem, SettingItemDesc, SettingItemWarningLine } from '../settingsItems'
import { RadioGroup } from "@/components/ui/radio-group"
import BigRadioItem from "@/components/BigRadioItem"
import { useEffect, useRef, useMemo, useReducer } from "react"
import { getConfigEmptyState, getConfigAccessors, SettingsCardProps, getPageConfig, configsReducer, getConfigDiff } from "../utils"
import { AutosizeTextarea, AutosizeTextAreaRef } from "@/components/ui/autosize-textarea"
import SettingsCardShell from "../SettingsCardShell"
import { txToast } from "@/components/TxToaster"
import consts from "@shared/consts"


export const pageConfigs = {
    whitelistMode: getPageConfig('whitelist', 'mode'),
    rejectionMessage: getPageConfig('whitelist', 'rejectionMessage'),
    discordRoles: getPageConfig('whitelist', 'discordRoles'),
} as const;

export default function ConfigCardWhitelist({ cardCtx, pageCtx }: SettingsCardProps) {
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

    //Refs for configs that don't use state
    const rejectionMessageRef = useRef<AutosizeTextAreaRef | null>(null);
    const discordRolesRef = useRef<HTMLInputElement | null>(null);

    //Marshalling Utils
    const inputArrayUtil = {
        toUi: (args?: string[]) => args ? args.join(', ') : '',
        toCfg: (str?: string) => str ? str.split(/[,;]\s*/).map(x => x.trim()).filter(x => x.length) : [],
    }

    //External Read-only Configs
    const isDiscordBotEnabled = pageCtx.apiData?.storedConfigs.discordBot?.enabled === true;

    //Processes the state of the page and sets the card as pending save if needed
    const updatePageState = () => {
        let currDiscordRoles;
        if (discordRolesRef.current) {
            currDiscordRoles = inputArrayUtil.toCfg(discordRolesRef.current.value);
        }
        let currRejectionMessage;
        if (rejectionMessageRef.current) {
            currRejectionMessage = rejectionMessageRef.current.textArea.value.trim();
        }
        const overwrites = {
            rejectionMessage: currRejectionMessage,
            discordRoles: currDiscordRoles,
        };

        const res = getConfigDiff(cfg, states, overwrites, false);
        pageCtx.setCardPendingSave(res.hasChanges ? cardCtx : null);
        return res;
    }

    //Validate changes (for UX only) and trigger the save API
    const handleOnSave = () => {
        const { hasChanges, localConfigs } = updatePageState();
        if (!hasChanges) return;

        const isAllowlistInstructionsRequired = (
            localConfigs.whitelist?.mode !== 'disabled'
            && localConfigs.whitelist?.mode !== 'adminOnly'
        );
        if (isAllowlistInstructionsRequired && !localConfigs.whitelist?.rejectionMessage) {
            return txToast.error('Please fill in the Allowlist Instructions field to be able to enable this allowlist mode.');
        }
        if (
            localConfigs.whitelist?.rejectionMessage
            && localConfigs.whitelist.rejectionMessage.length > 512
        ) {
            return txToast.error({
                title: 'The Allowlist Instructions is too big.',
                md: true,
                msg: 'The message must be 512 characters or less.',
            });
        }
        if (
            localConfigs.whitelist?.mode === 'discordMember'
            || localConfigs.whitelist?.mode === 'discordRoles'
        ) {
            if (!isDiscordBotEnabled) {
                return txToast.warning({
                    title: 'Discord Bot is required.',
                    msg: 'You need to enable the Discord Bot in the Discord tab to use Discord-based allowlist modes.',
                });
            }
            if (
                localConfigs.whitelist?.mode === 'discordRoles'
                && (
                    !Array.isArray(localConfigs.whitelist?.discordRoles)
                    || !localConfigs.whitelist?.discordRoles.length
                )
            ) {
                return txToast.warning({
                    title: 'Discord Roles are required.',
                    msg: 'You need to specify at least one Discord Role ID to use the "Discord Server Roles" allowlist mode.',
                });
            }
        }
        if (Array.isArray(localConfigs.whitelist?.discordRoles)) {
            const invalidRoles = localConfigs.whitelist.discordRoles
                .filter(x => !consts.regexDiscordSnowflake.test(x))
                .map(x => `- \`${x.slice(0, 20)}\``);
            if (invalidRoles.length) {
                return txToast.error({
                    title: 'Invalid Discord Role ID(s).',
                    md: true,
                    msg: 'The following Discord Role ID(s) are invalid: \n' + invalidRoles.join('\n'),
                });
            }
        }
        pageCtx.saveChanges(cardCtx, localConfigs);
    }

    const isPlayerAllowlistEnabled = (
        states.whitelistMode !== 'disabled'
        && states.whitelistMode !== 'adminOnly'
    );

    return (
        <SettingsCardShell
            cardCtx={cardCtx}
            pageCtx={pageCtx}
            onClickSave={handleOnSave}
        >
            <SettingItem label="Allowlist Mode">
                <RadioGroup
                    value={states.whitelistMode}
                    onValueChange={cfg.whitelistMode.state.set as any}
                    disabled={pageCtx.isReadOnly}
                >
                    <BigRadioItem
                        groupValue={states.whitelistMode}
                        value="disabled"
                        title="Disabled"
                        desc={(<>
                            Select this option if your server is public and open for all players to join. When a player connects, txAdmin will only check if they are banned <i>(if that is enabled)</i> and nothing else.
                        </>)}
                    />
                    <BigRadioItem
                        groupValue={states.whitelistMode}
                        value="adminOnly"
                        title="Admin-only (maintenance mode)"
                        desc={(<>
                            Will only allow server join if the player's <InlineCode>fivem:</InlineCode> or <InlineCode>discord:</InlineCode> identifiers are attached to a txAdmin administrator. Also known as maintenance mode.
                        </>)}
                    />
                    <BigRadioItem
                        groupValue={states.whitelistMode}
                        value="discordMember"
                        disableReason={
                            !isDiscordBotEnabled
                                ? "The Discord bot must be enabled in the Discord tab to use this option."
                                : null
                        }
                        title="Discord Server Member"
                        desc={(<>
                            Checks if the player joining has a <InlineCode>discord:</InlineCode> identifier and is present in the Discord server configured in the Discord Tab.
                        </>)}
                    />
                    <BigRadioItem
                        groupValue={states.whitelistMode}
                        value="discordRoles"
                        disableReason={
                            !isDiscordBotEnabled
                                ? "The Discord bot must be enabled in the Discord tab to use this option."
                                : null
                        }
                        title="Discord Server Roles"
                        desc={(<>
                            Checks if the player joining has a <InlineCode>discord:</InlineCode> identifier and is present in the Discord server configured in the Discord Tab and has at least one of the roles specified below.
                        </>)}
                    />
                    <BigRadioItem
                        groupValue={states.whitelistMode}
                        value="approvedLicense"
                        title="Approved License"
                        desc={(<>
                            The player <InlineCode>license:</InlineCode> identifier must be allowlisted by a txAdmin administrator. This can be done through the <TxAnchor href="/allowlist">Allowlist page</TxAnchor>, or the <InlineCode>/allowlist</InlineCode> Discord bot command.
                        </>)}
                    />
                    <BigRadioItem
                        groupValue={states.whitelistMode}
                        value="external"
                        title="External Allowlist Resource"
                        // FIXME:NEXT:UPDATE remove
                        newOptionBadgeFeatName="settingsExternalWhitelist"
                        desc={(<>
                            Select this option if you are using an external allowlist system to manage which players can join the server.
                        </>)}
                    />
                </RadioGroup>
                <SettingItemDesc>
                    <strong>Note:</strong> When enabled, the server list will show a lock icon next to the server name, and on the server page the players will be able to see the Allowlist Instructions.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem
                label="Allowlist Instructions"
                htmlFor={cfg.rejectionMessage.eid}
                required={isPlayerAllowlistEnabled}
            >
                <AutosizeTextarea
                    id={cfg.rejectionMessage.eid}
                    ref={rejectionMessageRef}
                    placeholder='Please join http://discord.gg/example and request to be allowlisted.'
                    defaultValue={cfg.rejectionMessage.initialValue}
                    onInput={updatePageState}
                    autoComplete="off"
                    minHeight={60}
                    maxHeight={180}
                    softMaxLength={512}
                    disabled={pageCtx.isReadOnly || !isPlayerAllowlistEnabled}
                />
                <SettingItemDesc>
                    Explain here how players can apply to be allowlisted to join the server, including any requirements or steps they need to follow, like joining a Discord server or filling out an online form. <br />
                    This message will show on the in-game server page and will also be sent to the player when they try to connect while not being allowlisted.
                    <SettingItemWarningLine visible={!pageCtx.isReadOnly && !isPlayerAllowlistEnabled}>
                        This field requires the Allowlist Mode to be enabled and not in Admin-only mode.
                    </SettingItemWarningLine>
                </SettingItemDesc>
            </SettingItem>
            <SettingItem
                label="Allowlisted Discord Roles"
                htmlFor={cfg.discordRoles.eid}
                required={states.whitelistMode === 'discordRoles'}
            >
                <Input
                    id={cfg.discordRoles.eid}
                    ref={discordRolesRef}
                    defaultValue={inputArrayUtil.toUi(cfg.discordRoles.initialValue)}
                    placeholder="000000000000000000, 000000000000000000"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly || states.whitelistMode !== 'discordRoles'}
                />
                <SettingItemDesc>
                    The ID of the Discord roles that are allowed to join the server. <br />
                    This field supports multiple roles, separated by comma.
                    <SettingItemWarningLine visible={!pageCtx.isReadOnly && states.whitelistMode !== 'discordRoles'}>
                        This field requires the Allowlist Mode to be set to "Discord Server Roles".
                    </SettingItemWarningLine>
                </SettingItemDesc>
            </SettingItem>
        </SettingsCardShell>
    )
}
