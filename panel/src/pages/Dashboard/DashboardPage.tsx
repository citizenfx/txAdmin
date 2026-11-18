import { useEffect, useRef } from 'react';
import ThreadPerfCard from './ThreadPerfCard';
import PlayerDropCard from './PlayerDropCard';
import FullPerfCard from './FullPerfCard';
import { useSetDashboardData } from './dashboardHooks';
import { getSocket } from '@/lib/utils';
import ServerStatsCard from './ServerStatsCard';
import { useAtomValue } from 'jotai';
import { txConfigStateAtom } from '@/hooks/status';
import { useLocation } from 'wouter';
import { TxConfigState } from '@shared/enums';
import { ModalTabMessage } from '@/components/modal-tabs';
import GenericSpinner from '@/components/GenericSpinner';


function DashboardPageInner() {
    const pageSocket = useRef<ReturnType<typeof getSocket> | null>(null);
    const setDashboardData = useSetDashboardData();

    //Runing on mount only
    useEffect(() => {
        pageSocket.current = getSocket(['dashboard']);
        pageSocket.current.on('connect', () => {
            console.log("Dashboard Socket.IO Connected.");
        });
        pageSocket.current.on('disconnect', (message) => {
            console.log("Dashboard Socket.IO Disonnected:", message);
        });
        pageSocket.current.on('error', (error) => {
            console.log('Dashboard Socket.IO', error);
        });
        pageSocket.current.on('dashboard', function (data) {
            setDashboardData(data);
        });

        return () => {
            pageSocket.current?.removeAllListeners();
            pageSocket.current?.disconnect();
        }
    }, []);

    return (
        <div className="w-full min-w-96 flex flex-col gap-4">
            <div className="w-full grid grid-cols-3 3xl:grid-cols-8 gap-4">
                <PlayerDropCard />
                <ServerStatsCard />
                <ThreadPerfCard />
            </div>
            <FullPerfCard />
        </div>
    );
}


export default function DashboardPage() {
    const txConfigState = useAtomValue(txConfigStateAtom);
    const setLocation = useLocation()[1];

    if (txConfigState === TxConfigState.Setup) {
        setLocation('/server/setup');
        return null;
    } else if (txConfigState === TxConfigState.Deployer) {
        setLocation('/server/deployer');
        return null;
    } else if (txConfigState !== TxConfigState.Ready) {
        return <div className='size-full'>
            <ModalTabMessage>
                <GenericSpinner msg={`Unknown Config State: ${String(txConfigState)}`} />
            </ModalTabMessage>
        </div>;
    } else {
        return <DashboardPageInner />;
    }
}
