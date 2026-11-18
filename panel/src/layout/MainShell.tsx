import { useEventListener } from 'usehooks-ts';
import MainRouter from "./MainRouter";
import { useExpireAuthData } from '../hooks/auth';
import { Header } from './Header';
import { ServerSidebar } from './ServerSidebar/ServerSidebar';
import { PlayerlistSidebar } from './PlayerlistSidebar/PlayerlistSidebar';
import MainSheets from './MainSheets';
import WarningBar from './WarningBar';
import ConfirmDialog from '@/components/ConfirmDialog';
import PromptDialog from '@/components/PromptDialog';
import TxToaster from '@/components/TxToaster';
import AccountDialog from './AccountDialog';
import { useOpenAccountModal } from '@/hooks/dialogs';
import PlayerModal from './PlayerModal/PlayerModal';
import { playerModalUrlParam, useOpenPlayerModal } from '@/hooks/playerModal';
import { navigate as setLocation } from 'wouter/use-browser-location';
import MainSocket from './MainSocket';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToggleTheme } from '@/hooks/theme';
import { hotkeyEventListener } from '@/lib/hotkeyEventListener';
import BreakpointDebugger from './BreakpointDebugger';
import ActionModal from './ActionModal/ActionModal';
import { useEffect } from 'react';
import { actionModalUrlParam, useOpenActionModal } from '@/hooks/actionModal';


export default function MainShell() {
    const expireSession = useExpireAuthData();
    const openAccountModal = useOpenAccountModal();
    const openPlayerModal = useOpenPlayerModal();
    const openActionModal = useOpenActionModal();
    const toggleTheme = useToggleTheme();

    //Listener for messages from child iframes (legacy routes) or other sources
    useEventListener('message', (e: TxMessageEvent) => {
        if (e.data.type === 'logoutNotice') {
            expireSession('child iframe', 'got logoutNotice');
        } else if (e.data.type === 'openAccountModal') {
            openAccountModal();
        } else if (e.data.type === 'openPlayerModal') {
            openPlayerModal(e.data.ref);
        } else if (e.data.type === 'navigateToPage') {
            setLocation(e.data.href);
        } else if (e.data.type === 'globalHotkey' && e.data.action === 'toggleLightMode') {
            toggleTheme();
        }
    });

    //auto open the player or action modals
    useEffect(() => {
        const pageUrl = new URL(window.location.toString());
        const playerModalRef = pageUrl.searchParams.get(playerModalUrlParam);
        const actionModalRef = pageUrl.searchParams.get(actionModalUrlParam);
        if (!playerModalRef && !actionModalRef) return;

        if (playerModalRef) {
            if (playerModalRef.includes('#')) {
                const [mutex, rawNetid] = playerModalRef.split('#');
                const netid = parseInt(rawNetid);
                if (mutex.length && rawNetid.length && !isNaN(netid)) {
                    return openPlayerModal({ mutex, netid });
                }
            } else if (playerModalRef.length) {
                return openPlayerModal({ license: playerModalRef });
            }
        } else if (actionModalRef && actionModalRef.length) {
            return openActionModal(actionModalRef);
        }

        //Remove the query params
        pageUrl.searchParams.delete(playerModalUrlParam);
        pageUrl.searchParams.delete(actionModalUrlParam);
        window.history.replaceState({}, '', pageUrl);
    }, []);

    //Listens to hotkeys (doesn't work if the focus is on an iframe)
    useEventListener('keydown', hotkeyEventListener);

    return <>
        <TooltipProvider delayDuration={300} disableHoverableContent={true}>
            <Header />
            <div className="md:px-3 min-h-full pt-[var(--page-pt)] pb-[var(--page-pb)] w-full max-w-[1920px] mx-auto flex flex-row gap-4">
                <ServerSidebar />
                <main className="flex flex-1 min-h-contentvh min-w-[360px]">
                    <MainRouter />
                </main>
                {window.txConsts.isWebInterface && <PlayerlistSidebar />}
            </div>

            <MainSheets />
            <WarningBar />
            <ConfirmDialog />
            <PromptDialog />
            <TxToaster />
            <AccountDialog />
            <PlayerModal />
            <ActionModal />
            <MainSocket />
            {/* <BreakpointDebugger /> */}

            {/* 1080p monitor screen height indicator */}
            {/* <div className="fixed inset-0 select-none pointer-events-none z-50">
                <div className="mx-auto h-[932px] w-[1920px] border-b-[1px] border-red-500/50" />
            </div> */}
        </TooltipProvider>
    </>;
}
