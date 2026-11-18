import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useActionModalStateValue } from "@/hooks/actionModal";
import { EraserIcon, InfoIcon, ListIcon, Trash2Icon, Undo2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import GenericSpinner from "@/components/GenericSpinner";
import { cn } from "@/lib/utils";
import { useBackendApi } from "@/hooks/fetch";
import { HistoryActionModalResp, HistoryActionModalSuccess } from "@shared/historyApiTypes";
import ActionIdsTab from "./ActionIdsTab";
import ActionInfoTab from "./ActionInfoTab";
import ActionModifyTab from "./ActionModifyTab";
import ActionDeleteTab from "./ActionDeleteTab";
import { ModalContent, ModalTabMessage, ModalTabsList, ModalTabWrapper, type ModalTabInfo } from "@/components/modal-tabs";


const modalTabs: ModalTabInfo[] = [
    {
        title: 'Info',
        icon: <InfoIcon className="mr-2 h-5 w-5 hidden xs:block" />,
    },
    {
        title: 'IDs',
        icon: <ListIcon className="mr-2 h-5 w-5 hidden xs:block" />,
    },
    {
        //In the future, when adding "edit" and "remove" to the modal, join with "revoke" in a tab bellow
        // title: 'Modify',
        // icon: <EraserIcon className="mr-2 h-5 w-5 hidden xs:block" />,
        title: 'Revoke',
        icon: <Undo2Icon className="mr-2 h-5 w-5 hidden xs:block" />,
        className: 'hover:bg-destructive hover:text-destructive-foreground',
    },
]


export default function ActionModal() {
    const { isModalOpen, closeModal, actionRef } = useActionModalStateValue();
    const [selectedTab, setSelectedTab] = useState(modalTabs[0].title);
    const [currRefreshKey, setCurrRefreshKey] = useState(0);
    const [modalData, setModalData] = useState<HistoryActionModalSuccess | undefined>(undefined);
    const [modalError, setModalError] = useState('');
    const [tsFetch, setTsFetch] = useState(0);
    const historyGetActionApi = useBackendApi<HistoryActionModalResp>({
        method: 'GET',
        path: `/history/action`,
        abortOnUnmount: true,
    });

    //Helper for tabs to be able to refresh the modal data
    const refreshModalData = () => {
        setCurrRefreshKey(currRefreshKey + 1);
    };

    //Querying Action data when reference is available
    useEffect(() => {
        if (!actionRef) return;
        setModalData(undefined);
        setModalError('');
        historyGetActionApi({
            queryParams: { id: actionRef },
            success: (resp) => {
                if ('error' in resp) {
                    setModalError(resp.error);
                } else {
                    setModalData(resp);
                    setTsFetch(Math.round(Date.now() / 1000));
                }
            },
            error: (error) => {
                setModalError(error);
            },
        });
    }, [actionRef, currRefreshKey]);

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

    //move to tab up or down
    const handleTabButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const currentIndex = modalTabs.findIndex((tab) => tab.title === selectedTab);
            const nextIndex = e.key === 'ArrowUp' ? currentIndex - 1 : currentIndex + 1;
            const nextTab = modalTabs[nextIndex];
            if (nextTab) {
                setSelectedTab(nextTab.title);
                const nextButton = document.getElementById(`action-modal-tab-${nextTab.title}`);
                if (nextButton) {
                    nextButton.focus();
                }
            }
        }
    }

    let pageTitle: JSX.Element;
    if (modalData) {
        const displayName = modalData.action.playerName !== false
            ? <span>{modalData.action.playerName}</span>
            : <span className="italic opacity-75">unknown player</span>;
        if (modalData.action.type === 'ban') {
            pageTitle = <>
                <span className="text-destructive-inline font-mono mr-2">[{modalData.action.id}]</span>
                Banned {displayName}
            </>;
        } else if (modalData.action.type === 'warn') {
            pageTitle = <>
                <span className="text-warning-inline font-mono mr-2">[{modalData.action.id}]</span>
                Warned {displayName}
            </>;
        } else {
            throw new Error(`Unknown action type: ${modalData.action.type}`);
        }
    } else if (modalError) {
        pageTitle = <span className="text-destructive-inline">Error!</span>;
    } else {
        pageTitle = <span className="text-muted-foreground italic">Loading...</span>;
    }

    return (
        <Dialog open={isModalOpen} onOpenChange={handleOpenClose}>
            <DialogContent className="max-w-2xl h-full sm:h-auto max-h-full p-0 gap-1 sm:gap-4 flex flex-col pb-4">
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="tracking-wide line-clamp-1 leading-7 break-all mr-6">
                        {pageTitle}
                    </DialogTitle>
                </DialogHeader>

                <ModalContent>
                    <ModalTabsList>
                        {modalTabs.map((tab) => (
                            <Button
                                id={`action-modal-tab-${tab.title}`}
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

                    <ModalTabWrapper className="max-h-[calc(100vh-3.125rem-4rem)]">
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
                                {selectedTab === 'Info' && <ActionInfoTab
                                    action={modalData.action}
                                    serverTime={modalData.serverTime}
                                    tsFetch={tsFetch}
                                />}
                                {selectedTab === 'IDs' && <ActionIdsTab
                                    action={modalData.action}
                                />}
                                {selectedTab === 'Revoke' && <ActionModifyTab
                                    action={modalData.action}
                                    refreshModalData={refreshModalData}
                                />}
                            </>
                        )}
                    </ModalTabWrapper>
                </ModalContent>
            </DialogContent>
        </Dialog>
    );
}
