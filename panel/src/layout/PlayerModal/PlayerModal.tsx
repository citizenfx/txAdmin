import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { setPlayerModalUrlParam, usePlayerModalStateValue } from "@/hooks/playerModal";
import { InfoIcon, ListIcon, HistoryIcon, GavelIcon } from "lucide-react";
import PlayerInfoTab from "./PlayerInfoTab";
import { useEffect, useState } from "react";
import PlayerIdsTab from "./PlayerIdsTab";
import PlayerHistoryTab from "./PlayerHistoryTab";
import PlayerBanTab from "./PlayerBanTab";
import GenericSpinner from "@/components/GenericSpinner";
import { cn } from "@/lib/utils";
import { useBackendApi } from "@/hooks/fetch";
import { PlayerModalResp, PlayerModalSuccess } from "@shared/playerApiTypes";
import PlayerModalFooter from "./PlayerModalFooter";
import { ModalContent, ModalTabMessage, ModalTabsList, ModalTabWrapper, type ModalTabInfo } from "@/components/modal-tabs";


const modalTabs: ModalTabInfo[] = [
    {
        title: 'Info',
        icon: <InfoIcon className="mr-2 h-5 w-5 hidden xs:block" />,
    },
    {
        title: 'History',
        icon: <HistoryIcon className="mr-2 h-5 w-5 hidden xs:block" />,
    },
    {
        title: 'IDs',
        icon: <ListIcon className="mr-2 h-5 w-5 hidden xs:block" />,
    },
    {
        title: 'Ban',
        icon: <GavelIcon className="mr-2 h-5 w-5 hidden xs:block" />,
        className: 'hover:bg-destructive hover:text-destructive-foreground',
    }
];


export default function PlayerModal() {
    const { isModalOpen, closeModal, playerRef } = usePlayerModalStateValue();
    const [selectedTab, setSelectedTab] = useState(modalTabs[0].title);
    const [currRefreshKey, setCurrRefreshKey] = useState(0);
    const [modalData, setModalData] = useState<PlayerModalSuccess | undefined>(undefined);
    const [modalError, setModalError] = useState('');
    const [tsFetch, setTsFetch] = useState(0);
    const playerQueryApi = useBackendApi<PlayerModalResp>({
        method: 'GET',
        path: `/player`,
        abortOnUnmount: true,
    });

    //Helper for tabs to be able to refresh the modal data
    const refreshModalData = () => {
        setCurrRefreshKey(currRefreshKey + 1);
    };

    //Querying player data when reference is available
    useEffect(() => {
        if (!playerRef) return;
        setModalData(undefined);
        setModalError('');
        playerQueryApi({
            queryParams: playerRef,
            success: (resp) => {
                if ('error' in resp) {
                    setModalError(resp.error);
                } else {
                    setModalData(resp);
                    setTsFetch(Math.round(Date.now() / 1000));
                    //Update the ref param to use a license, if possible
                    if (!('license' in playerRef) && resp.player.license) {
                        setPlayerModalUrlParam(resp.player.license)
                    }
                }
            },
            error: (error) => {
                setModalError(error);
            },
        });
    }, [playerRef, currRefreshKey]);

    //Resetting selected tab when modal is closed
    useEffect(() => {
        if (!isModalOpen) {
            setTimeout(() => {
                setSelectedTab(modalTabs[0].title);
            }, 200);
        }
    }, [isModalOpen]);

    const handleOpenClose = (newOpenState: boolean) => {
        if (isModalOpen && !newOpenState) {
            closeModal();
        }
    };

    //Move to tab up or down
    const handleTabButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const currentIndex = modalTabs.findIndex((tab) => tab.title === selectedTab);
            const nextIndex = e.key === 'ArrowUp' ? currentIndex - 1 : currentIndex + 1;
            const nextTab = modalTabs[nextIndex];
            if (nextTab) {
                setSelectedTab(nextTab.title);
                const nextButton = document.getElementById(`player-modal-tab-${nextTab.title}`);
                if (nextButton) {
                    nextButton.focus();
                }
            }
        }
    }

    let pageTitle: JSX.Element;
    if (modalData) {
        if (modalData.player.netid) {
            pageTitle = <>
                <span className="text-success-inline font-mono mr-2">[{modalData.player.netid}]</span>
                {modalData.player.displayName}
            </>;
        } else {
            pageTitle = <>
                <span className="text-destructive-inline font-mono mr-2">[OFF]</span>
                {modalData.player.displayName}
            </>;
        }
    } else if (modalError) {
        pageTitle = <span className="text-destructive-inline">Error!</span>;
    } else {
        pageTitle = <span className="text-muted-foreground italic">Loading...</span>;
    }

    return (
        <Dialog open={isModalOpen} onOpenChange={handleOpenClose}>
            <DialogContent className="max-w-2xl h-full sm:h-auto max-h-full p-0 gap-1 sm:gap-4 flex flex-col">
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="tracking-wide line-clamp-1 leading-7 break-all mr-6">
                        {pageTitle}
                    </DialogTitle>
                </DialogHeader>

                <ModalContent>
                    <ModalTabsList>
                        {modalTabs.map((tab) => (
                            <Button
                                id={`player-modal-tab-${tab.title}`}
                                key={tab.title}
                                variant={selectedTab === tab.title ? "secondary" : "ghost"}
                                className={cn(
                                    'w-full tracking-wider justify-center md:justify-start',
                                    'h-7 rounded-sm px-2 text-sm',
                                    'md:h-10 md:text-base',
                                    tab.className,
                                )}
                                onClick={() => setSelectedTab(tab.title)}
                                onKeyDown={handleTabButtonKeyDown}
                            >
                                {tab.icon} {tab.title}
                            </Button>
                        ))}
                    </ModalTabsList>
                    
                    <ModalTabWrapper className="max-h-[calc(100vh-3.125rem-4rem-5rem)]">
                        {!modalData ? (
                            <ModalTabMessage>
                                {modalError ? (
                                    <span className="text-destructive-inline">Error: {modalError}</span>
                                ) : (
                                    <GenericSpinner msg="Loading..." />
                                )}
                            </ModalTabMessage>
                        ) : (
                            <>
                                {selectedTab === 'Info' && <PlayerInfoTab
                                    player={modalData.player}
                                    playerRef={playerRef!}
                                    serverTime={modalData.serverTime}
                                    tsFetch={tsFetch}
                                    setSelectedTab={setSelectedTab}
                                    refreshModalData={refreshModalData}
                                />}
                                {selectedTab === 'History' && <PlayerHistoryTab
                                    actionHistory={modalData.player.actionHistory}
                                    serverTime={modalData.serverTime}
                                    refreshModalData={refreshModalData}
                                />}
                                {selectedTab === 'IDs' && <PlayerIdsTab
                                    player={modalData.player}
                                    playerRef={playerRef!}
                                    refreshModalData={refreshModalData}
                                />}
                                {selectedTab === 'Ban' && <PlayerBanTab
                                    banTemplates={modalData.banTemplates}
                                    playerRef={playerRef!}
                                />}
                            </>
                        )}
                    </ModalTabWrapper>
                </ModalContent>
                <PlayerModalFooter
                    playerRef={playerRef!}
                    player={modalData?.player}
                />
            </DialogContent>
        </Dialog>
    );
}
