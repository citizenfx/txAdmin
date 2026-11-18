import InlineCode from "@/components/InlineCode";
import { useAdminPerms } from "@/hooks/auth";
import { useRef, useState } from "react";
import { ApiAddLegacyBanReqSchema, GetBanTemplatesSuccessResp, SaveBanTemplatesReq } from "@shared/otherTypes";
import { useBackendApi } from "@/hooks/fetch";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import BanForm, { BanFormType } from "@/components/BanForm";
import { txToast } from "@/components/TxToaster";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import useSWR from "swr";


export default function AddLegacyBanPage() {
    const idsTextareaRef = useRef<HTMLTextAreaElement>(null);
    const banFormRef = useRef<BanFormType>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { hasPerm } = useAdminPerms();

    const getBanTemplatesApi = useBackendApi<GetBanTemplatesSuccessResp>({
        method: 'GET',
        path: `/settings/banTemplates`,
        throwGenericErrors: true,
    });

    const legacyBanApi = useBackendApi<GenericApiOkResp, ApiAddLegacyBanReqSchema>({
        method: 'POST',
        path: `/history/addLegacyBan`,
        throwGenericErrors: true,
    });


    const handleSave = () => {
        if (!idsTextareaRef.current || !banFormRef.current) return;
        const { reason, duration } = banFormRef.current.getData();

        if (!reason || reason.length < 3) {
            txToast.warning(`The reason must be at least 3 characters long.`);
            banFormRef.current.focusReason();
            return;
        }
        const rawIds = idsTextareaRef.current.value;
        if (!rawIds) {
            txToast.warning(`You must enter at least one identifier.`);
            idsTextareaRef.current.focus();
            return;
        }
        const identifiers = rawIds
            .toLowerCase()
            .split(/[,;\s\n]+/g)
            .map(id => id.trim())
            .filter(Boolean);
        if (!identifiers.length) {
            txToast.warning(`You must enter at least one valid identifier.`);
            idsTextareaRef.current.focus();
            return;
        }

        setIsSaving(true);
        legacyBanApi({
            data: { identifiers, reason, duration },
            toastLoadingMessage: 'Banning identifiers...',
            genericHandler: {
                successMsg: 'Identifiers banned.',
            },
            finally: () => setIsSaving(false),
            success: (data) => {
                idsTextareaRef.current!.value = '';
                idsTextareaRef.current!.focus();
            },
            error: (error) => {
                idsTextareaRef.current!.focus();
            },
        });
    };

    const swrBanTemplates = useSWR('/settings/banTemplates', async () => {
        const data = await getBanTemplatesApi({});
        if (!data) throw new Error('No data returned');
        return data;
    });

    const canBan = hasPerm('players.ban');
    return (
        <div className="space-y-4 w-full max-w-screen-lg mx-auto px-2 md:px-0">
            <div className="px-2 md:px-0">
                <h1 className="text-3xl mb-2">Ban Identifiers</h1>
                <p>
                    Here you can ban specific player identifiers (like <InlineCode>license</InlineCode> and <InlineCode>discord</InlineCode>) without having to search for a registered player.<br />
                    Bans without a single <InlineCode>license</InlineCode> identifier are considered <em>Legacy Bans</em> and should be avoided if possible. <br />
                    {!canBan ? (
                        <span className="text-warning-inline">
                            You need the <InlineCode className="text-warning-inline">Player: Ban</InlineCode> permission to use this feature.
                        </span>
                    ) : null}
                </p>
            </div>
            <div className="grid lg:grid-cols-2 gap-4 border bg-card p-4 rounded-lg">
                <div className="flex flex-col gap-3">
                    <Label htmlFor="banIdentifiers">
                        Identifiers
                    </Label>
                    <Textarea
                        ref={idsTextareaRef}
                        className="h-full"
                        disabled={isSaving || !canBan}
                        placeholder="discord:xxxx, fivem:xxxx, license:xxxx, steam:xxxx, etc..."
                    />
                </div>
                <BanForm
                    ref={banFormRef}
                    banTemplates={swrBanTemplates.data}
                    disabled={isSaving || !canBan}
                />
            </div>
            <div className="flex place-content-center gap-4">
                <Button
                    size="sm"
                    variant='outline'
                    disabled={isSaving || !canBan}
                    onClick={() => {
                        banFormRef.current?.clearData()
                    }}
                >
                    Clear
                </Button>
                <Button
                    size="sm"
                    variant="destructive"
                    disabled={isSaving || !canBan}
                    onClick={handleSave}
                >
                    {isSaving ? (
                        <span className="flex items-center leading-relaxed">
                            <Loader2Icon className="inline animate-spin h-4" /> Banning...
                        </span>
                    ) : 'Apply Ban'}
                </Button>
            </div>
        </div>
    );
}
