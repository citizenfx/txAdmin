import { cn } from '@/lib/utils';
import { handleExternalLinkClick } from "@/lib/navigation";
import ServerMenu from './ServerMenu';
import ServerControls from './ServerControls';
import ServerStatus from './ServerStatus';
import ServerSchedule from './ServerSchedule';
import DynamicAdvert from '@/components/DynamicAdvert';


type ServerSidebarProps = {
    isSheet?: boolean;
};
export function ServerSidebar({ isSheet }: ServerSidebarProps) {
    return (
        <aside
            className={cn(
                'flex flex-col gap-4 z-10',
                isSheet ? 'px-4 py-6' : 'tx-sidebar hidden lg:flex',
            )}
        >
            <div className={cn(
                !isSheet && 'rounded-xl border bg-card text-card-foreground shadow-sm p-4',
            )}>
                <ServerMenu />
            </div>
            <hr className={isSheet ? 'block' : 'hidden'} />
            <div className={cn(
                !isSheet && 'rounded-xl border bg-card text-card-foreground shadow-sm p-4',
                'flex flex-col gap-4'
            )}>
                {/* <h2 className="text-lg font-semibold tracking-tight overflow-hidden text-ellipsis">
                    Controls & Status
                </h2> */}
                <ServerControls />
                <ServerStatus />
                <ServerSchedule />
            </div>
            <hr className={isSheet ? 'block' : 'hidden'} />

            <DynamicAdvert placement='sidebar' />

            {window.txConsts.isWebInterface ? (
                <div className='flex flex-col items-center justify-center gap-1 text-sm font-light opacity-85 hover:opacity-100'>
                    <span className={cn(
                        'text-muted-foreground',
                        window.txConsts.txaVersion.includes('-') && 'text-destructive-inline font-semibold',
                    )}>
                        tx: <strong>v{window.txConsts.txaVersion}</strong>
                        &nbsp;|
                        fx: <strong>b{window.txConsts.fxsVersion}</strong>
                    </span>
                </div>
            ) : null}
        </aside>
    );
}
